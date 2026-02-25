// Pinpoint public Job Board API client
// Endpoint: GET https://{subdomain}.pinpointhq.com/postings.json
// No authentication required (public Careers Site JSON feed)

export interface PinpointJob {
  id: number
  title: string
  description: string // HTML
  location: {
    city: string | null
    country: string | null
    country_code: string | null
    region: string | null
  } | null
  department: {
    name: string | null
  } | null
  employment_type: string | null
  url: string
  application_url: string | null
  created_at: string
  updated_at: string
}

export interface PinpointResponse {
  data: PinpointJob[]
}

export async function fetchPinpointJobs(companySlug: string): Promise<PinpointJob[]> {
  const url = `https://${companySlug}.pinpointhq.com/postings.json`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Pinpoint API error ${response.status} for company ${companySlug}`)
  }

  const data: PinpointResponse = await response.json()
  return data.data ?? []
}

/**
 * Try to discover if a company uses Pinpoint by testing slug patterns.
 */
export async function tryPinpointDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: PinpointJob[] } | null> {
  const baseName = companyDomain.replace(/\.\w+$/, '')
  const stripped = baseName.replace(/[^a-z0-9]/gi, '')
  const hyphenated = baseName.replace(/[^a-z0-9]/gi, '-')
  const domainHyphenated = companyDomain.replace(/\./g, '-')

  const slugs = [...new Set([
    baseName,
    stripped,
    hyphenated,
    domainHyphenated,
    'workwithus', // common Pinpoint pattern
    `${hyphenated}-careers`,
  ])]

  for (const slug of slugs) {
    try {
      const url = `https://${slug}.pinpointhq.com/postings.json`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (response.ok) {
        const data: PinpointResponse = await response.json()
        const jobs = data.data ?? []
        if (jobs.length > 0) {
          return { slug, jobs }
        }
      }
    } catch {
      // Not a Pinpoint account
    }
  }

  return null
}

function formatLocation(loc: PinpointJob['location']): string | null {
  if (!loc) return null
  const parts = [loc.city, loc.region, loc.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

function mapEmploymentType(type: string | null): string {
  const lower = type?.toLowerCase() ?? ''
  if (lower.includes('intern')) return 'internship'
  if (lower.includes('contract') || lower.includes('freelance') || lower.includes('temporary')) return 'contract'
  if (lower.includes('part')) return 'part_time'
  return 'full_time'
}

export function mapPinpointJobToJobData(job: PinpointJob, companyDomain: string) {
  const description = job.description || `Apply for ${job.title} at ${companyDomain}.`

  return {
    title: job.title,
    description,
    department: job.department?.name || null,
    location: formatLocation(job.location),
    workType: null as string | null,
    employmentType: mapEmploymentType(job.employment_type),
    applyUrl: job.application_url || job.url || null,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'pinpoint',
    status: 'active',
    visibility: 'network',
    externalId: `pinpoint:${job.id}`,
  }
}
