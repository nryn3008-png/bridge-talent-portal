import { prisma } from '@/lib/db/prisma'
import { getWorkableConfigs } from './ats-config'
import { fetchWorkableJobs, mapWorkableJobToJobData } from './workable-client'

interface JobSyncResult {
  created: number
  updated: number
  deactivated: number
  errors: number
  details: Array<{ company: string; created: number; updated: number; deactivated: number; error?: string }>
}

export async function syncJobsFromAts(): Promise<JobSyncResult> {
  if (!prisma) throw new Error('Database not available — check DATABASE_URL')

  const result: JobSyncResult = { created: 0, updated: 0, deactivated: 0, errors: 0, details: [] }
  const workableConfigs = getWorkableConfigs()

  for (const config of workableConfigs) {
    const companyResult = { company: config.companyDomain, created: 0, updated: 0, deactivated: 0, error: undefined as string | undefined }

    try {
      const workableJobs = await fetchWorkableJobs(config.accountSlug!)
      console.log(`[job-sync] ${config.companyName}: ${workableJobs.length} jobs from Workable`)

      // Get existing active jobs for this company from Workable
      const existingJobs = await prisma.job.findMany({
        where: { companyDomain: config.companyDomain, source: 'workable', status: 'active' },
        select: { id: true, externalId: true },
      })
      const freshExternalIds = new Set(workableJobs.map((j) => `workable:${j.shortcode}`))

      // Upsert each job
      for (const wJob of workableJobs) {
        const data = mapWorkableJobToJobData(wJob, config.companyDomain)
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
          companyResult.updated++
          result.updated++
        } else {
          await prisma.job.create({ data })
          companyResult.created++
          result.created++
        }
      }

      // Deactivate jobs that no longer appear on Workable
      for (const existingJob of existingJobs) {
        if (existingJob.externalId && !freshExternalIds.has(existingJob.externalId)) {
          await prisma.job.update({
            where: { id: existingJob.id },
            data: { status: 'closed' },
          })
          companyResult.deactivated++
          result.deactivated++
        }
      }
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
