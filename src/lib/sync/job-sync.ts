import { prisma } from '@/lib/db/prisma'
import { getStaticAtsConfigs } from './ats-config'
import { fetchWorkableJobs, mapWorkableJobToJobData } from './workable-client'
import { fetchGreenhouseJobs, mapGreenhouseJobToJobData } from './greenhouse-client'
import { fetchLeverJobs, mapLeverJobToJobData } from './lever-client'
import { fetchAshbyJobs, mapAshbyJobToJobData } from './ashby-client'
import { fetchRecruiteeJobs, mapRecruiteeJobToJobData } from './recruitee-client'
import { fetchSmartRecruitersJobs, mapSmartRecruitersJobToJobData } from './smartrecruiters-client'
import { fetchPersonioJobs, mapPersonioJobToJobData } from './personio-client'
import { fetchPinpointJobs, mapPinpointJobToJobData } from './pinpoint-client'
import { fetchRipplingJobs, mapRipplingJobToJobData } from './rippling-client'
import { fetchWorkdayJobs, mapWorkdayJobToJobData } from './workday-client'
import { fetchSuccessFactorsJobs, mapSuccessFactorsJobToJobData } from './successfactors-client'
import { fetchComeetJobs, mapComeetJobToJobData } from './comeet-client'
import { fetchPaylocityJobs, mapPaylocityJobToJobData } from './paylocity-client'
import { discoverAtsJobs, type AtsProvider, type MappedJobData } from './ats-discovery'

interface JobSyncResult {
  created: number
  updated: number
  deactivated: number
  discovered: number
  errors: number
  details: Array<{ company: string; provider?: string; created: number; updated: number; deactivated: number; error?: string }>
}

/**
 * Sync pre-mapped ATS jobs for a single company domain (works with any ATS provider).
 * Accepts already-mapped job data from any provider's mapper function.
 */
async function syncAtsJobsForCompany(
  companyDomain: string,
  source: AtsProvider,
  mappedJobs: MappedJobData[],
): Promise<{ created: number; updated: number; deactivated: number }> {
  if (!prisma) throw new Error('Database not available')

  const stats = { created: 0, updated: 0, deactivated: 0 }

  // Get existing active jobs for this company + source
  const existingJobs = await prisma.job.findMany({
    where: { companyDomain, source, status: 'active' },
    select: { id: true, externalId: true },
  })
  const freshExternalIds = new Set(mappedJobs.map((j) => j.externalId))

  // Upsert each job
  for (const data of mappedJobs) {
    const existing = await prisma.job.findUnique({ where: { externalId: data.externalId } })

    if (existing) {
      await prisma.job.update({
        where: { externalId: data.externalId },
        data: {
          title: data.title,
          description: data.description,
          department: data.department,
          location: data.location,
          workType: data.workType,
          employmentType: data.employmentType,
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

  // Deactivate jobs that no longer appear in source
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
 * Handles all providers (Workable, Personio, etc.) via the generic fetchJobsFromProvider.
 */
export async function syncJobsFromAts(): Promise<JobSyncResult> {
  if (!prisma) throw new Error('Database not available — check DATABASE_URL')

  const result: JobSyncResult = { created: 0, updated: 0, deactivated: 0, discovered: 0, errors: 0, details: [] }
  const staticConfigs = getStaticAtsConfigs()

  for (const config of staticConfigs) {
    const companyResult = { company: config.companyDomain, provider: config.provider, created: 0, updated: 0, deactivated: 0, error: undefined as string | undefined }

    try {
      const mappedJobs = await fetchJobsFromProvider(config.provider as AtsProvider, config.accountSlug!, config.companyDomain)
      console.log(`[job-sync] ${config.companyName}: ${mappedJobs.length} jobs from ${config.provider}`)

      const stats = await syncAtsJobsForCompany(config.companyDomain, config.provider as AtsProvider, mappedJobs)
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
 * Auto-discover ATS accounts (Workable, Greenhouse, Lever, Ashby) from portfolio
 * company domains and sync their jobs.
 * Processes companies in batches of 3 to respect rate limits (especially Lever's 2 req/sec).
 */
export async function syncJobsFromPortfolioCompanies(
  companyDomains: string[],
): Promise<JobSyncResult> {
  if (!prisma) throw new Error('Database not available — check DATABASE_URL')

  const result: JobSyncResult = { created: 0, updated: 0, deactivated: 0, discovered: 0, errors: 0, details: [] }

  // Skip domains already in static config to avoid duplicate syncing
  const staticDomains = new Set(getStaticAtsConfigs().map((c) => c.companyDomain))
  const domainsToCheck = companyDomains.filter((d) => !staticDomains.has(d))

  console.log(`[portfolio-job-sync] Checking ${domainsToCheck.length} portfolio companies across 7 ATS providers...`)

  // Process in batches of 3 (each domain probes 4 APIs, so 3×4 = 12 concurrent requests)
  const batchSize = 3
  for (let i = 0; i < domainsToCheck.length; i += batchSize) {
    const batch = domainsToCheck.slice(i, i + batchSize)

    const results = await Promise.allSettled(
      batch.map(async (domain) => {
        const discovery = await discoverAtsJobs(domain)
        if (!discovery) return null

        console.log(`[portfolio-job-sync] Discovered ${discovery.provider} for ${domain} (slug: ${discovery.slug}, ${discovery.jobCount} jobs)`)
        result.discovered++

        const stats = await syncAtsJobsForCompany(domain, discovery.provider, discovery.mappedJobs)

        // Cache the discovery so future cron runs can skip probing
        if (prisma) {
          await prisma.portfolioAtsCache.upsert({
            where: { companyDomain: domain },
            create: {
              companyDomain: domain,
              provider: discovery.provider,
              slug: discovery.slug,
              lastSyncedAt: new Date(),
              jobCount: discovery.jobCount,
              lastCheckedAt: new Date(),
            },
            update: {
              provider: discovery.provider,
              slug: discovery.slug,
              lastSyncedAt: new Date(),
              jobCount: discovery.jobCount,
              lastCheckedAt: new Date(),
            },
          })
        }

        return { domain, provider: discovery.provider, ...stats }
      }),
    )

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        const { domain, provider, created, updated, deactivated } = r.value
        result.created += created
        result.updated += updated
        result.deactivated += deactivated
        result.details.push({ company: domain, provider, created, updated, deactivated })
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

  console.log(`[portfolio-job-sync] Complete: ${result.discovered} ATS accounts found, ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated`)
  return result
}

/**
 * Fetch jobs directly from all cached ATS accounts (no discovery probing needed).
 * Used by the scheduled cron job for fast, frequent refreshes.
 * Reads PortfolioAtsCache → fetches jobs from known provider → upserts into DB.
 */
export async function syncJobsFromCache(): Promise<JobSyncResult> {
  if (!prisma) throw new Error('Database not available — check DATABASE_URL')
  const db = prisma // Non-null local ref for use in closures

  const result: JobSyncResult = { created: 0, updated: 0, deactivated: 0, discovered: 0, errors: 0, details: [] }

  // Get all cached ATS mappings
  const cachedAccounts = await db.portfolioAtsCache.findMany()
  console.log(`[cron-job-sync] Refreshing jobs from ${cachedAccounts.length} cached ATS accounts...`)

  if (cachedAccounts.length === 0) {
    console.log('[cron-job-sync] No cached ATS accounts found. Run discovery first.')
    return result
  }

  // Process in batches of 5 (direct fetches, no probing — so we can be more aggressive)
  const batchSize = 5
  for (let i = 0; i < cachedAccounts.length; i += batchSize) {
    const batch = cachedAccounts.slice(i, i + batchSize)

    const batchResults = await Promise.allSettled(
      batch.map(async (cached) => {
        const mappedJobs = await fetchJobsFromProvider(cached.provider as AtsProvider, cached.slug, cached.companyDomain)
        const stats = await syncAtsJobsForCompany(cached.companyDomain, cached.provider as AtsProvider, mappedJobs)

        // Update cache with latest sync info
        await db.portfolioAtsCache.update({
          where: { companyDomain: cached.companyDomain },
          data: { lastSyncedAt: new Date(), jobCount: mappedJobs.length },
        })

        return { domain: cached.companyDomain, provider: cached.provider, ...stats }
      }),
    )

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        const { domain, provider, created, updated, deactivated } = r.value
        result.created += created
        result.updated += updated
        result.deactivated += deactivated
        result.details.push({ company: domain, provider, created, updated, deactivated })
      } else {
        result.errors++
        const message = r.reason instanceof Error ? r.reason.message : String(r.reason)
        console.error(`[cron-job-sync] Error:`, message)
      }
    }
  }

  // Also sync static ATS configs (e.g., Quantive via Workable)
  const staticResult = await syncJobsFromAts()
  result.created += staticResult.created
  result.updated += staticResult.updated
  result.deactivated += staticResult.deactivated
  result.details.push(...staticResult.details)

  // Log the sync
  await db.bridgeSyncLog.create({
    data: {
      syncType: 'delta',
      entityType: 'jobs',
      lastSyncedAt: new Date(),
      recordsSynced: result.created + result.updated,
      status: 'completed',
      errorMessage: result.errors > 0
        ? `${result.errors} errors during cron job sync`
        : null,
    },
  })

  console.log(`[cron-job-sync] Complete: ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated from ${cachedAccounts.length} cached accounts`)
  return result
}

/**
 * Discover new ATS accounts from portfolio company domains that aren't yet cached.
 * Used by the weekly cron job. Processes in chunks to stay within timeout limits.
 */
export async function discoverNewAtsAccounts(
  companyDomains: string[],
  maxToCheck: number = 150,
): Promise<JobSyncResult> {
  if (!prisma) throw new Error('Database not available — check DATABASE_URL')
  const db = prisma // Non-null local ref for use in closures

  const result: JobSyncResult = { created: 0, updated: 0, deactivated: 0, discovered: 0, errors: 0, details: [] }

  // Get already-cached domains to skip them
  const cachedDomains = new Set(
    (await db.portfolioAtsCache.findMany({ select: { companyDomain: true } }))
      .map((c) => c.companyDomain),
  )
  const staticDomains = new Set(getStaticAtsConfigs().map((c) => c.companyDomain))

  // Filter to only unchecked domains
  const uncheckedDomains = companyDomains.filter(
    (d) => !cachedDomains.has(d) && !staticDomains.has(d),
  )

  // Limit to maxToCheck per run to stay within Vercel timeout
  const domainsToCheck = uncheckedDomains.slice(0, maxToCheck)
  console.log(`[cron-discovery] Probing ${domainsToCheck.length} unchecked domains (${uncheckedDomains.length} total unchecked, ${cachedDomains.size} already cached)...`)

  if (domainsToCheck.length === 0) {
    console.log('[cron-discovery] All portfolio company domains have been checked.')
    return result
  }

  // Process in batches of 3 (same as portfolio sync — probing is heavier)
  const batchSize = 3
  for (let i = 0; i < domainsToCheck.length; i += batchSize) {
    const batch = domainsToCheck.slice(i, i + batchSize)

    const batchResults = await Promise.allSettled(
      batch.map(async (domain) => {
        const discovery = await discoverAtsJobs(domain)
        if (!discovery) return null

        console.log(`[cron-discovery] Found ${discovery.provider} for ${domain} (slug: ${discovery.slug}, ${discovery.jobCount} jobs)`)
        result.discovered++

        const stats = await syncAtsJobsForCompany(domain, discovery.provider, discovery.mappedJobs)

        // Cache the discovery
        await db.portfolioAtsCache.upsert({
          where: { companyDomain: domain },
          create: {
            companyDomain: domain,
            provider: discovery.provider,
            slug: discovery.slug,
            lastSyncedAt: new Date(),
            jobCount: discovery.jobCount,
            lastCheckedAt: new Date(),
          },
          update: {
            provider: discovery.provider,
            slug: discovery.slug,
            lastSyncedAt: new Date(),
            jobCount: discovery.jobCount,
            lastCheckedAt: new Date(),
          },
        })

        return { domain, provider: discovery.provider, ...stats }
      }),
    )

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        const { domain, provider, created, updated, deactivated } = r.value
        result.created += created
        result.updated += updated
        result.deactivated += deactivated
        result.details.push({ company: domain, provider, created, updated, deactivated })
      } else if (r.status === 'rejected') {
        result.errors++
      }
    }
  }

  // Log the discovery
  await db.bridgeSyncLog.create({
    data: {
      syncType: 'bulk',
      entityType: 'portfolio_jobs',
      lastSyncedAt: new Date(),
      recordsSynced: result.discovered,
      status: 'completed',
      errorMessage: result.errors > 0
        ? `${result.errors} errors during cron discovery`
        : null,
    },
  })

  console.log(`[cron-discovery] Complete: ${result.discovered} new ATS accounts found from ${domainsToCheck.length} checked`)
  return result
}

/**
 * Fetch jobs from a known ATS provider and slug (no discovery probing).
 * Used by syncJobsFromCache for fast direct fetching.
 */
async function fetchJobsFromProvider(
  provider: AtsProvider,
  slug: string,
  companyDomain: string,
): Promise<MappedJobData[]> {
  switch (provider) {
    case 'workable': {
      const jobs = await fetchWorkableJobs(slug)
      return jobs.map((j) => mapWorkableJobToJobData(j, companyDomain))
    }
    case 'greenhouse': {
      const jobs = await fetchGreenhouseJobs(slug)
      return jobs.map((j) => mapGreenhouseJobToJobData(j, companyDomain))
    }
    case 'lever': {
      const jobs = await fetchLeverJobs(slug)
      return jobs.map((j) => mapLeverJobToJobData(j, companyDomain))
    }
    case 'ashby': {
      const jobs = await fetchAshbyJobs(slug)
      return jobs.map((j) => mapAshbyJobToJobData(j, companyDomain))
    }
    case 'recruitee': {
      const jobs = await fetchRecruiteeJobs(slug)
      return jobs.map((j) => mapRecruiteeJobToJobData(j, companyDomain))
    }
    case 'smartrecruiters': {
      const jobs = await fetchSmartRecruitersJobs(slug)
      return jobs.map((j) => mapSmartRecruitersJobToJobData(j, companyDomain))
    }
    case 'personio': {
      const jobs = await fetchPersonioJobs(slug)
      return jobs.map((j) => mapPersonioJobToJobData(j, companyDomain))
    }
    case 'pinpoint': {
      const jobs = await fetchPinpointJobs(slug)
      return jobs.map((j) => mapPinpointJobToJobData(j, companyDomain))
    }
    case 'rippling': {
      const jobs = await fetchRipplingJobs(slug)
      return jobs.map((j) => mapRipplingJobToJobData(j, companyDomain))
    }
    case 'workday': {
      const jobs = await fetchWorkdayJobs(slug)
      return jobs.map((j) => mapWorkdayJobToJobData(j, companyDomain, slug))
    }
    case 'successfactors': {
      const jobs = await fetchSuccessFactorsJobs(slug)
      return jobs.map((j) => mapSuccessFactorsJobToJobData(j, companyDomain))
    }
    case 'comeet': {
      const jobs = await fetchComeetJobs(slug)
      return jobs.map((j) => mapComeetJobToJobData(j, companyDomain))
    }
    case 'paylocity': {
      const jobs = await fetchPaylocityJobs(slug)
      return jobs.map((j) => mapPaylocityJobToJobData(j, companyDomain))
    }
    default:
      throw new Error(`Unknown ATS provider: ${provider}`)
  }
}
