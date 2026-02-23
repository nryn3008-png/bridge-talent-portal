// Ashby public Job Posting API client
// Endpoint: GET https://api.ashbyhq.com/posting-api/job-board/{boardName}?includeCompensation=true
// No authentication required (public API)

export interface AshbyResponse {
  apiVersion: string
  jobs: AshbyJob[]
}

export interface AshbyJob {
  id: string
  title: string
  department: string | null
  team: string | null
  employmentType: string // "FullTime", "PartTime", "Intern", "Contract"
  location: string
  secondaryLocations: string[]
  isRemote: boolean
  isListed: boolean
  workplaceType: string // "Hybrid", "Remote", "On-site"
  publishedAt: string
  jobUrl: string
  applyUrl: string
  descriptionHtml: string
  descriptionPlain: string
  compensation?: {
    compensationTierSummary: string
    scrapeableCompensationSalarySummary: string
  }
}

export async function fetchAshbyJobs(boardName: string): Promise<AshbyJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${boardName}?includeCompensation=true`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Ashby API error ${response.status} for board ${boardName}`)
  }

  const data: AshbyResponse = await response.json()
  // Only return listed jobs
  return (data.jobs ?? []).filter((j) => j.isListed)
}

/**
 * Try to discover if a company uses Ashby by testing slug patterns.
 */
export async function tryAshbyDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: AshbyJob[] } | null> {
  const baseName = companyDomain.replace(/\.\w+$/, '')
  const slugs = [...new Set([
    baseName,
    baseName.replace(/[^a-z0-9]/gi, ''),
    baseName.replace(/[^a-z0-9]/gi, '-'),
  ])]

  for (const slug of slugs) {
    try {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (response.ok) {
        const data: AshbyResponse = await response.json()
        const jobs = (data.jobs ?? []).filter((j) => j.isListed)
        if (jobs.length > 0) {
          return { slug, jobs }
        }
      }
    } catch {
      // Not an Ashby account
    }
  }

  return null
}

function mapEmploymentType(ashbyType: string): string {
  switch (ashbyType) {
    case 'FullTime': return 'full_time'
    case 'PartTime': return 'part_time'
    case 'Intern': return 'internship'
    case 'Contract': return 'contract'
    default: return 'full_time'
  }
}

function mapWorkplaceType(type: string, isRemote: boolean): string | null {
  if (isRemote) return 'remote'
  switch (type?.toLowerCase()) {
    case 'remote': return 'remote'
    case 'hybrid': return 'hybrid'
    case 'on-site':
    case 'onsite': return 'onsite'
    default: return null
  }
}

export function mapAshbyJobToJobData(job: AshbyJob, companyDomain: string) {
  const description = job.descriptionPlain
    ? job.descriptionPlain.slice(0, 2000)
    : `Apply for ${job.title} at ${companyDomain}.`

  return {
    title: job.title,
    description,
    department: job.department || null,
    location: job.location || null,
    workType: mapWorkplaceType(job.workplaceType, job.isRemote),
    employmentType: mapEmploymentType(job.employmentType),
    applyUrl: job.applyUrl || job.jobUrl,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'ashby',
    status: 'active',
    visibility: 'network',
    externalId: `ashby:${job.id}`,
  }
}
