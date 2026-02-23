import { prisma } from '@/lib/db/prisma'
import { getWorkableConfigs } from './ats-config'
import { fetchWorkableJobs, mapWorkableJobToJobData, tryWorkableDiscovery, WorkableJob } from './workable-client'

interface JobSyncResult {
  created: number
  updated: number
  deactivated: number
  discovered: number
  errors: number
  details: Array<{ company: string; created: number; updated: number; deactivated: number; error?: string }>
}

/**
 * Sync Workable jobs for a single company domain.
 * Returns per-company result stats.
 */
async function syncWorkableJobsForCompany(
  companyDomain: string,
  workableJobs: WorkableJob[],
): Promise<{ created: number; updated: number; deactivated: number }> {
  if (!prisma) throw new Error('Database not available')

  const stats = { created: 0, updated: 0, deactivated: 0 }

  // Get existing active jobs for this company from Workable
  const existingJobs = await prisma.job.findMany({
    where: { companyDomain, source: 'workable', status: 'active' },
    select: { id: true, externalId: true },
  })
  const freshExternalIds = new Set(workableJobs.map((j) => `workable:${j.shortcode}`))

  // Upsert each job
  for (const wJob of workableJobs) {
    const data = mapWorkableJobToJobData(wJob, companyDomain)
    const existing = await prisma.job.findUnique({ where: { externalId: data.externalId } })

    if (existing) {
      await prisma.job.update({
        where: { externalId: data.externalId },
        data: {
          title: data.title,
          department: data.department,
          location: data.location,
          workType: data.workType,
          applyUrl: data.applyUrl,
          status: 'active',
        },
      })
      stats.updated++
    } else {
      await prisma.job.create({ data })
      stats.created++
    }
  }

  // Deactivate jobs that no longer appear on Workable
  for (const existingJob of existingJobs) {
    if (existingJob.externalId && !freshExternalIds.has(existingJob.externalId)) {
      await prisma.job.update({
        where: { id: existingJob.id },
        data: { status: 'closed' },
      })
      stats.deactivated++
    }
  }

  return stats
}

/**
 * Sync jobs from statically configured ATS companies (ats-config.ts).
 */
export async function syncJobsFromAts(): Promise<JobSyncResult> {
  if (!prisma) throw new Error('Database not available — check DATABASE_URL')

  const result: JobSyncResult = { created: 0, updated: 0, deactivated: 0, discovered: 0, errors: 0, details: [] }
  const workableConfigs = getWorkableConfigs()

  for (const config of workableConfigs) {
    const companyResult = { company: config.companyDomain, created: 0, updated: 0, deactivated: 0, error: undefined as string | undefined }

    try {
      const workableJobs = await fetchWorkableJobs(config.accountSlug!)
      console.log(`[job-sync] ${config.companyName}: ${workableJobs.length} jobs from Workable`)

      const stats = await syncWorkableJobsForCompany(config.companyDomain, workableJobs)
      companyResult.created = stats.created
      companyResult.updated = stats.updated
      companyResult.deactivated = stats.deactivated
      result.created += stats.created
      result.updated += stats.updated
      result.deactivated += stats.deactivated
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[job-sync] ${config.companyName} failed: ${message}`)
      companyResult.error = message
      result.errors++
    }

    result.details.push(companyResult)
  }

  // Log the sync
  await prisma.bridgeSyncLog.create({
    data: {
      syncType: 'bulk',
      entityType: 'jobs',
      lastSyncedAt: new Date(),
      recordsSynced: result.created + result.updated,
      status: 'completed',
      errorMessage: result.errors > 0
        ? result.details.filter((d) => d.error).map((d) => `${d.company}: ${d.error}`).join('; ')
        : null,
    },
  })

  console.log(`[job-sync] Complete: ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated, ${result.errors} errors`)
  return result
}

/**
 * Auto-discover Workable accounts from portfolio company domains and sync their jobs.
 * Processes companies in batches of 5 to avoid overwhelming Workable's API.
 */
export async function syncJobsFromPortfolioCompanies(
  companyDomains: string[],
): Promise<JobSyncResult> {
  if (!prisma) throw new Error('Database not available — check DATABASE_URL')

  const result: JobSyncResult = { created: 0, updated: 0, deactivated: 0, discovered: 0, errors: 0, details: [] }

  // Skip domains already in static config to avoid duplicate syncing
  const staticDomains = new Set(getWorkableConfigs().map((c) => c.companyDomain))
  const domainsToCheck = companyDomains.filter((d) => !staticDomains.has(d))

  console.log(`[portfolio-job-sync] Checking ${domainsToCheck.length} portfolio companies for Workable accounts...`)

  // Process in batches of 5
  const batchSize = 5
  for (let i = 0; i < domainsToCheck.length; i += batchSize) {
    const batch = domainsToCheck.slice(i, i + batchSize)

    const results = await Promise.allSettled(
      batch.map(async (domain) => {
        const discovery = await tryWorkableDiscovery(domain)
        if (!discovery) return null

        console.log(`[portfolio-job-sync] Discovered Workable for ${domain} (slug: ${discovery.slug}, ${discovery.jobs.length} jobs)`)
        result.discovered++

        const stats = await syncWorkableJobsForCompany(domain, discovery.jobs)
        return { domain, ...stats }
      }),
    )

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        const { domain, created, updated, deactivated } = r.value
        result.created += created
        result.updated += updated
        result.deactivated += deactivated
        result.details.push({ company: domain, created, updated, deactivated })
      } else if (r.status === 'rejected') {
        result.errors++
        const message = r.reason instanceof Error ? r.reason.message : String(r.reason)
        console.error(`[portfolio-job-sync] Error:`, message)
      }
    }
  }

  // Log the sync
  await prisma.bridgeSyncLog.create({
    data: {
      syncType: 'bulk',
      entityType: 'portfolio_jobs',
      lastSyncedAt: new Date(),
      recordsSynced: result.created + result.updated,
      status: 'completed',
      errorMessage: result.errors > 0
        ? result.details.filter((d) => d.error).map((d) => `${d.company}: ${d.error}`).join('; ')
        : null,
    },
  })

  console.log(`[portfolio-job-sync] Complete: ${result.discovered} Workable accounts found, ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated`)
  return result
}
