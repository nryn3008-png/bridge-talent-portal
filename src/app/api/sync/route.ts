import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { bulkSyncBridgeMembers, deltaSyncBridgeMembers } from '@/lib/sync/profile-sync'
import { syncJobsFromAts } from '@/lib/sync/job-sync'

// POST /api/sync — trigger a sync (admin/vc only)
// Body: { type?: "profiles" | "jobs", mode?: "bulk" | "delta" }
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !['vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { mode, type = 'profiles' } = await request.json().catch(() => ({ mode: 'delta', type: 'profiles' }))

  try {
    if (type === 'jobs') {
      const result = await syncJobsFromAts()
      return NextResponse.json({ success: true, type: 'jobs', ...result })
    }

    // Default: profile sync
    const result = mode === 'bulk'
      ? await bulkSyncBridgeMembers()
      : await deltaSyncBridgeMembers()

    return NextResponse.json({ success: true, type: 'profiles', ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    console.error('Sync error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
