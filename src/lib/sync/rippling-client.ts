// Rippling public ATS Board API client
// Endpoint: GET https://api.rippling.com/platform/api/ats/v1/board/{board_slug}/jobs
// No authentication required (public job board endpoint)

export interface RipplingJob {
  uuid: string
  name: string
  department: string | null
  url: string | null
  workLocation: string | null
  description: string | null // HTML (may not always be available)
}

export interface RipplingResponse {
  jobs: RipplingJob[]
}

export async function fetchRipplingJobs(boardSlug: string): Promise<RipplingJob[]> {
  const url = `https://api.rippling.com/platform/api/ats/v1/board/${boardSlug}/jobs`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Rippling API error ${response.status} for board ${boardSlug}`)
  }

  const data: RipplingResponse = await response.json()
  return data.jobs ?? []
}

/**
 * Try to discover if a company uses Rippling by testing board slug patterns.
 */
export async function tryRipplingDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: RipplingJob[] } | null> {
  const baseName = companyDomain.replace(/\.\w+$/, '')
  const stripped = baseName.replace(/[^a-z0-9]/gi, '')
  const hyphenated = baseName.replace(/[^a-z0-9]/gi, '-')
  const domainHyphenated = companyDomain.replace(/\./g, '-')

  const slugs = [...new Set([
    `${baseName}-jobs`,
    `${hyphenated}-jobs`,
    baseName,
    stripped,
    hyphenated,
    domainHyphenated,
  ])]

  for (const slug of slugs) {
    try {
      const url = `https://api.rippling.com/platform/api/ats/v1/board/${slug}/jobs`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (response.ok) {
        const data: RipplingResponse = await response.json()
        const jobs = data.jobs ?? []
        if (jobs.length > 0) {
          return { slug, jobs }
        }
      }
    } catch {
      // Not a Rippling board
    }
  }

  return null
}

export function mapRipplingJobToJobData(job: RipplingJob, companyDomain: string) {
  const description = job.description || `Apply for ${job.name} at ${companyDomain}.`

  return {
    title: job.name,
    description,
    department: job.department || null,
    location: job.workLocation || null,
    workType: null as string | null,
    employmentType: 'full_time' as const,
    applyUrl: job.url || null,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'rippling',
    status: 'active',
    visibility: 'network',
    externalId: `rippling:${job.uuid}`,
  }
}
