// Unified ATS discovery — probes Workable, Greenhouse, Lever, Ashby, Recruitee,
// SmartRecruiters, Personio, Pinpoint, Rippling, Workday, SAP SuccessFactors,
// Comeet, and Paylocity for a given company domain and returns the first
// provider with active jobs.

import { tryWorkableDiscovery, mapWorkableJobToJobData, type WorkableJob } from './workable-client'
import { tryGreenhouseDiscovery, mapGreenhouseJobToJobData, type GreenhouseJob } from './greenhouse-client'
import { tryLeverDiscovery, mapLeverJobToJobData, type LeverJob } from './lever-client'
import { tryAshbyDiscovery, mapAshbyJobToJobData, type AshbyJob } from './ashby-client'
import { tryRecruiteeDiscovery, mapRecruiteeJobToJobData, type RecruiteeOffer } from './recruitee-client'
import { trySmartRecruitersDiscovery, mapSmartRecruitersJobToJobData, type SmartRecruitersJob } from './smartrecruiters-client'
import { tryPersonioDiscovery, mapPersonioJobToJobData, type PersonioJob } from './personio-client'
import { tryPinpointDiscovery, mapPinpointJobToJobData, type PinpointJob } from './pinpoint-client'
import { tryRipplingDiscovery, mapRipplingJobToJobData, type RipplingJob } from './rippling-client'
import { tryWorkdayDiscovery, mapWorkdayJobToJobData, type WorkdayJob } from './workday-client'
import { trySuccessFactorsDiscovery, mapSuccessFactorsJobToJobData, type SuccessFactorsJob } from './successfactors-client'
import { tryComeetDiscovery, mapComeetJobToJobData, type ComeetPosition } from './comeet-client'
import { tryPaylocityDiscovery, mapPaylocityJobToJobData, type PaylocityJob } from './paylocity-client'
import { scrapeWithFallback, type RawJob } from './fallback-scraper'

export type AtsProvider = 'workable' | 'greenhouse' | 'lever' | 'ashby' | 'recruitee' | 'smartrecruiters' | 'personio' | 'pinpoint' | 'rippling' | 'workday' | 'successfactors' | 'comeet' | 'paylocity' | 'fallback'

/** Common shape for all ATS-mapped job data, ready for DB upsert */
export interface MappedJobData {
  title: string
  description: string
  department: string | null
  location: string | null
  workType: string | null
  employmentType: string
  applyUrl: string | null
  companyDomain: string
  postedBy: string
  source: string
  status: string
  visibility: string
  externalId: string
  salaryMin?: number | null
  salaryMax?: number | null
  salaryCurrency?: string
}

export interface DiscoveryResult {
  provider: AtsProvider
  slug: string
  jobCount: number
  /** Mapped job data ready for DB upsert */
  mappedJobs: MappedJobData[]
}

/**
 * Discover which ATS a company uses by probing all 13 providers in parallel.
 * Returns the first provider that returns jobs, or null if none found.
 */
export async function discoverAtsJobs(companyDomain: string): Promise<DiscoveryResult | null> {
  // Probe all 13 providers in parallel — first one with jobs wins
  const [
    workable, greenhouse, lever, ashby, recruitee, smartrecruiters, personio,
    pinpoint, rippling, workday, successfactors, comeet, paylocity,
  ] = await Promise.allSettled([
    tryWorkableDiscovery(companyDomain),
    tryGreenhouseDiscovery(companyDomain),
    tryLeverDiscovery(companyDomain),
    tryAshbyDiscovery(companyDomain),
    tryRecruiteeDiscovery(companyDomain),
    trySmartRecruitersDiscovery(companyDomain),
    tryPersonioDiscovery(companyDomain),
    tryPinpointDiscovery(companyDomain),
    tryRipplingDiscovery(companyDomain),
    tryWorkdayDiscovery(companyDomain),
    trySuccessFactorsDiscovery(companyDomain),
    tryComeetDiscovery(companyDomain),
    tryPaylocityDiscovery(companyDomain),
  ])

  // Check Workable
  if (workable.status === 'fulfilled' && workable.value) {
    const { slug, jobs } = workable.value
    return {
      provider: 'workable',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: WorkableJob) => mapWorkableJobToJobData(j, companyDomain)),
    }
  }

  // Check Greenhouse
  if (greenhouse.status === 'fulfilled' && greenhouse.value) {
    const { slug, jobs } = greenhouse.value
    return {
      provider: 'greenhouse',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: GreenhouseJob) => mapGreenhouseJobToJobData(j, companyDomain)),
    }
  }

  // Check Lever
  if (lever.status === 'fulfilled' && lever.value) {
    const { slug, jobs } = lever.value
    return {
      provider: 'lever',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: LeverJob) => mapLeverJobToJobData(j, companyDomain)),
    }
  }

  // Check Ashby
  if (ashby.status === 'fulfilled' && ashby.value) {
    const { slug, jobs } = ashby.value
    return {
      provider: 'ashby',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: AshbyJob) => mapAshbyJobToJobData(j, companyDomain)),
    }
  }

  // Check Recruitee
  if (recruitee.status === 'fulfilled' && recruitee.value) {
    const { slug, jobs } = recruitee.value
    return {
      provider: 'recruitee',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: RecruiteeOffer) => mapRecruiteeJobToJobData(j, companyDomain)),
    }
  }

  // Check SmartRecruiters
  if (smartrecruiters.status === 'fulfilled' && smartrecruiters.value) {
    const { slug, jobs } = smartrecruiters.value
    return {
      provider: 'smartrecruiters',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: SmartRecruitersJob) => mapSmartRecruitersJobToJobData(j, companyDomain)),
    }
  }

  // Check Personio
  if (personio.status === 'fulfilled' && personio.value) {
    const { slug, jobs } = personio.value
    return {
      provider: 'personio',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: PersonioJob) => mapPersonioJobToJobData(j, companyDomain)),
    }
  }

  // Check Pinpoint
  if (pinpoint.status === 'fulfilled' && pinpoint.value) {
    const { slug, jobs } = pinpoint.value
    return {
      provider: 'pinpoint',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: PinpointJob) => mapPinpointJobToJobData(j, companyDomain)),
    }
  }

  // Check Rippling
  if (rippling.status === 'fulfilled' && rippling.value) {
    const { slug, jobs } = rippling.value
    return {
      provider: 'rippling',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: RipplingJob) => mapRipplingJobToJobData(j, companyDomain)),
    }
  }

  // Check Workday
  if (workday.status === 'fulfilled' && workday.value) {
    const { slug, jobs } = workday.value
    return {
      provider: 'workday',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: WorkdayJob) => mapWorkdayJobToJobData(j, companyDomain, slug)),
    }
  }

  // Check SAP SuccessFactors
  if (successfactors.status === 'fulfilled' && successfactors.value) {
    const { slug, jobs } = successfactors.value
    return {
      provider: 'successfactors',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: SuccessFactorsJob) => mapSuccessFactorsJobToJobData(j, companyDomain)),
    }
  }

  // Check Comeet
  if (comeet.status === 'fulfilled' && comeet.value) {
    const { slug, jobs } = comeet.value
    return {
      provider: 'comeet',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: ComeetPosition) => mapComeetJobToJobData(j, companyDomain)),
    }
  }

  // Check Paylocity
  if (paylocity.status === 'fulfilled' && paylocity.value) {
    const { slug, jobs } = paylocity.value
    return {
      provider: 'paylocity',
      slug,
      jobCount: jobs.length,
      mappedJobs: jobs.map((j: PaylocityJob) => mapPaylocityJobToJobData(j, companyDomain)),
    }
  }

  // ── Fallback: scrape careers page directly ──────────────────────────────
  // If none of the 13 ATS providers matched, try scraping the company's
  // careers page as a last resort using cheerio + optional Playwright.
  console.log(`[ats-discovery] No ATS provider found for ${companyDomain}, trying fallback scraper...`)
  const fallbackResult = await tryFallbackScraper(companyDomain)
  if (fallbackResult) {
    return fallbackResult
  }

  return null
}

/**
 * Try the fallback scraper on common careers page URLs for a domain.
 * Returns a DiscoveryResult with provider='fallback' or null.
 */
async function tryFallbackScraper(companyDomain: string): Promise<DiscoveryResult | null> {
  const careersUrls = [
    `https://${companyDomain}/careers`,
    `https://${companyDomain}/jobs`,
    `https://www.${companyDomain}/careers`,
    `https://www.${companyDomain}/jobs`,
    `https://${companyDomain}/career`,
    `https://${companyDomain}/join-us`,
    `https://www.${companyDomain}/en/career`,
    `https://www.${companyDomain}/en/careers`,
  ]

  for (const url of careersUrls) {
    try {
      const rawJobs = await scrapeWithFallback(url, companyDomain)
      if (rawJobs.length > 0) {
        console.log(`[ats-discovery] Fallback scraper found ${rawJobs.length} jobs at ${url}`)
        const mappedJobs = rawJobs.map((j) => mapFallbackJobToJobData(j, companyDomain))
        return {
          provider: 'fallback',
          slug: companyDomain,
          jobCount: rawJobs.length,
          mappedJobs,
        }
      }
    } catch {
      // Fallback scraper never throws, but guard just in case
    }
  }

  return null
}

/**
 * Map a RawJob from the fallback scraper to MappedJobData for DB upsert.
 * Exported so job-sync.ts can reuse it for cache-based refresh.
 */
export function mapFallbackJobToJobData(rawJob: RawJob, companyDomain: string): MappedJobData {
  const description = rawJob.rawHtml || `Apply for ${rawJob.title} at ${companyDomain}.`

  return {
    title: rawJob.title,
    description,
    department: rawJob.department || null,
    location: rawJob.location || null,
    workType: null,
    employmentType: 'full_time',
    applyUrl: rawJob.url || null,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'fallback',
    status: 'active',
    visibility: 'network',
    externalId: `fallback:${simpleHash(rawJob.title + '|' + companyDomain)}`,
  }
}

/** Simple string hash for generating stable external IDs from title+domain. */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
