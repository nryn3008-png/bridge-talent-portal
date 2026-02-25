// Unified ATS discovery — probes Workable, Greenhouse, Lever, Ashby, Recruitee,
// SmartRecruiters, and Personio for a given company domain and returns the first
// provider with active jobs.

import { tryWorkableDiscovery, mapWorkableJobToJobData, type WorkableJob } from './workable-client'
import { tryGreenhouseDiscovery, mapGreenhouseJobToJobData, type GreenhouseJob } from './greenhouse-client'
import { tryLeverDiscovery, mapLeverJobToJobData, type LeverJob } from './lever-client'
import { tryAshbyDiscovery, mapAshbyJobToJobData, type AshbyJob } from './ashby-client'
import { tryRecruiteeDiscovery, mapRecruiteeJobToJobData, type RecruiteeOffer } from './recruitee-client'
import { trySmartRecruitersDiscovery, mapSmartRecruitersJobToJobData, type SmartRecruitersJob } from './smartrecruiters-client'
import { tryPersonioDiscovery, mapPersonioJobToJobData, type PersonioJob } from './personio-client'

export type AtsProvider = 'workable' | 'greenhouse' | 'lever' | 'ashby' | 'recruitee' | 'smartrecruiters' | 'personio'

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
 * Discover which ATS a company uses by probing all 7 providers in parallel.
 * Returns the first provider that returns jobs, or null if none found.
 */
export async function discoverAtsJobs(companyDomain: string): Promise<DiscoveryResult | null> {
  // Probe all 7 providers in parallel — first one with jobs wins
  const [workable, greenhouse, lever, ashby, recruitee, smartrecruiters, personio] = await Promise.allSettled([
    tryWorkableDiscovery(companyDomain),
    tryGreenhouseDiscovery(companyDomain),
    tryLeverDiscovery(companyDomain),
    tryAshbyDiscovery(companyDomain),
    tryRecruiteeDiscovery(companyDomain),
    trySmartRecruitersDiscovery(companyDomain),
    tryPersonioDiscovery(companyDomain),
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

  return null
}
