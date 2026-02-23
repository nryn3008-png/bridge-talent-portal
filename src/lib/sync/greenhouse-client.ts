// Greenhouse public Job Board API client
// Endpoint: GET https://boards-api.greenhouse.io/v1/boards/{boardToken}/jobs?content=true
// No authentication required (public API)

export interface GreenhouseResponse {
  jobs: GreenhouseJob[]
  meta: { total: number }
}

export interface GreenhouseJob {
  id: number
  internal_job_id: number
  title: string
  updated_at: string
  requisition_id: string | null
  location: { name: string }
  absolute_url: string
  content: string // HTML description (requires ?content=true)
  departments: Array<{ id: number; name: string }>
  offices: Array<{ id: number; name: string; location: string }>
}

export async function fetchGreenhouseJobs(boardToken: string): Promise<GreenhouseJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Greenhouse API error ${response.status} for board ${boardToken}`)
  }

  const data: GreenhouseResponse = await response.json()
  return data.jobs ?? []
}

/**
 * Try to discover if a company uses Greenhouse by testing slug patterns.
 */
export async function tryGreenhouseDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: GreenhouseJob[] } | null> {
  const baseName = companyDomain.replace(/\.\w+$/, '')
  const slugs = [...new Set([
    baseName,
    baseName.replace(/[^a-z0-9]/gi, ''),
    baseName.replace(/[^a-z0-9]/gi, '-'),
  ])]

  for (const slug of slugs) {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (response.ok) {
        const data: GreenhouseResponse = await response.json()
        const jobs = data.jobs ?? []
        if (jobs.length > 0) {
          return { slug, jobs }
        }
      }
    } catch {
      // Not a Greenhouse account
    }
  }

  return null
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

export function mapGreenhouseJobToJobData(job: GreenhouseJob, companyDomain: string) {
  const description = job.content ? stripHtml(job.content).slice(0, 2000) : `Apply for ${job.title} at ${companyDomain}.`
  const department = job.departments?.[0]?.name || null

  return {
    title: job.title,
    description,
    department,
    location: job.location?.name || null,
    workType: null as string | null, // Greenhouse doesn't provide remote/onsite info
    employmentType: 'full_time' as const,
    applyUrl: job.absolute_url,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'greenhouse',
    status: 'active',
    visibility: 'network',
    externalId: `greenhouse:${job.id}`,
  }
}
