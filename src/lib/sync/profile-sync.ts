// Profile sync service — imports Bridge member profiles into talent_profiles
//
// Strategy:
//  1. GET /api/v1/contacts/bridge_members_ids → all member UUIDs
//  2. GET /api/v1/contacts/:id (per member) → full profile data
//  3. Upsert into talent_profiles with name, company, position, bio, etc.
//
// Performance: ~1s per contact. At 10 concurrent → ~36 min for 21,720 members.

import { prisma } from '@/lib/db/prisma'
import { getBridgeMemberIds, getContactById } from '@/lib/bridge-api/users'
import type { BridgeContact } from '@/lib/bridge-api/types'

const CONCURRENCY = 10 // parallel API requests

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  const firstName = parts[0] ?? ''
  const lastName = parts.slice(1).join(' ')
  return { firstName, lastName }
}

function contactToUpsertData(contact: BridgeContact) {
  const { firstName, lastName } = splitName(contact.name ?? '')
  return {
    firstName,
    lastName,
    email: contact.email ?? null,
    company: contact.company ?? null,
    position: contact.position ?? null,
    location: contact.location || null,
    bio: contact.bio ?? null,
    profilePicUrl: contact.profile_pic_url ?? null,
    linkedinUrl: contact.linkedin_profile_url ?? null,
    username: contact.username ?? null,
    isSuperConnector: contact.is_super_connector ?? false,
    openToRoles: contact.icp?.roles ?? [],
    skills: contact.icp?.industries ?? [],
    profileCompleteness: contact.name ? 1 : 0,
    profileSyncedAt: new Date(),
  }
}

async function fetchAndUpsert(memberId: string): Promise<boolean> {
  try {
    const contact = await getContactById(memberId)
    const data = contactToUpsertData(contact)
    await prisma!.talentProfile.upsert({
      where: { bridgeUserId: memberId },
      create: { bridgeUserId: memberId, ...data },
      update: data,
    })
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes('Timeout') && !msg.includes('ECONNRESET')) {
      console.warn(`[profile-sync] Failed ${memberId}: ${msg}`)
    }
    return false
  }
}

// Process an array of IDs with limited concurrency
async function processInBatches(
  ids: string[],
): Promise<{ synced: number; errors: number }> {
  let synced = 0
  let errors = 0

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(fetchAndUpsert))

    for (const ok of results) {
      if (ok) synced++
      else errors++
    }

    const total = synced + errors
    if (total % 100 === 0 || total === ids.length) {
      console.log(`[profile-sync] Progress: ${total}/${ids.length} (${synced} synced, ${errors} errors)`)
    }
  }

  return { synced, errors }
}

// Bulk sync — fetch ALL member profiles from Bridge API
export async function bulkSyncBridgeMembers(): Promise<{ synced: number; errors: number }> {
  if (!prisma) throw new Error('Database not available — check DATABASE_URL')

  const { list: memberIds } = await getBridgeMemberIds()
  if (!memberIds?.length) {
    console.warn('[profile-sync] No member IDs returned from Bridge API')
    return { synced: 0, errors: 0 }
  }

  console.log(`[profile-sync] Starting bulk sync of ${memberIds.length} members (concurrency: ${CONCURRENCY})…`)

  const result = await processInBatches(memberIds)

  await prisma.bridgeSyncLog.create({
    data: {
      syncType: 'bulk',
      entityType: 'users',
      lastSyncedAt: new Date(),
      recordsSynced: result.synced,
      status: 'completed',
    },
  })

  console.log(`[profile-sync] Bulk sync complete: ${result.synced} synced, ${result.errors} errors`)
  return result
}

// Delta sync — only fetch profiles that haven't been synced yet
export async function deltaSyncBridgeMembers(): Promise<{ synced: number; errors: number }> {
  if (!prisma) throw new Error('Database not available — check DATABASE_URL')

  const { list: memberIds } = await getBridgeMemberIds()
  if (!memberIds?.length) return { synced: 0, errors: 0 }

  // Find IDs not yet synced (no profileSyncedAt)
  const unsynced = await prisma.talentProfile.findMany({
    where: { profileSyncedAt: null },
    select: { bridgeUserId: true },
  })
  const unsyncedIds = new Set(unsynced.map((p) => p.bridgeUserId))

  // Also find brand new IDs not in DB at all
  const existing = await prisma.talentProfile.findMany({
    select: { bridgeUserId: true },
  })
  const existingIds = new Set(existing.map((p) => p.bridgeUserId))
  const newIds = memberIds.filter((id) => !existingIds.has(id))

  const idsToSync = [...new Set([...newIds, ...Array.from(unsyncedIds)])]

  if (idsToSync.length === 0) {
    console.log('[profile-sync] Delta sync: everything is up to date')
    return { synced: 0, errors: 0 }
  }

  console.log(`[profile-sync] Delta sync: ${idsToSync.length} profiles to fetch`)
  const result = await processInBatches(idsToSync)

  await prisma.bridgeSyncLog.create({
    data: {
      syncType: 'delta',
      entityType: 'users',
      lastSyncedAt: new Date(),
      recordsSynced: result.synced,
      status: 'completed',
    },
  })

  return result
}
