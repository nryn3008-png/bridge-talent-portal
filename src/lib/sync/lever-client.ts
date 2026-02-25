// Lever public Postings API client
// Endpoint: GET https://api.lever.co/v0/postings/{company}?mode=json
// No authentication required (public API)
// Rate limit: 2 requests/second

export interface LeverJob {
  id: string
  text: string // job title
  categories: {
    commitment: string   // "Full-time", "Part-time", "Intern", "Contract"
    department: string
    location: string
    team: string
    allLocations: string[]
  }
  country: string
  workplaceType: string // "remote", "on-site", "hybrid", "unspecified"
  createdAt: number // Unix timestamp in ms
  descriptionPlain: string
  description: string // HTML
  hostedUrl: string
  applyUrl: string
  salaryRange?: {
    currency: string
    interval: string
    min: number
    max: number
  }
}

export async function fetchLeverJobs(companySlug: string): Promise<LeverJob[]> {
  const url = `https://api.lever.co/v0/postings/${companySlug}?mode=json`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Lever API error ${response.status} for company ${companySlug}`)
  }

  // Lever returns a bare array, not wrapped in an object
  const jobs: LeverJob[] = await response.json()
  return jobs ?? []
}

/**
 * Try to discover if a company uses Lever by testing slug patterns.
 * Includes 500ms delay between attempts to respect Lever's 2 req/sec rate limit.
 */
export async function tryLeverDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: LeverJob[] } | null> {
  const baseName = companyDomain.replace(/\.\w+$/, '')
  const domainHyphenated = companyDomain.replace(/\./g, '-') // "lemon.markets" → "lemon-markets"
  const slugs = [...new Set([
    baseName,
    baseName.replace(/[^a-z0-9]/gi, ''),
    baseName.replace(/[^a-z0-9]/gi, '-'),
    domainHyphenated,
  ])]

  for (const slug of slugs) {
    try {
      const url = `https://api.lever.co/v0/postings/${slug}?mode=json`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (response.ok) {
        const jobs: LeverJob[] = await response.json()
        if (Array.isArray(jobs) && jobs.length > 0) {
          return { slug, jobs }
        }
      }

      // Rate limit: wait 500ms between attempts
      await new Promise((r) => setTimeout(r, 500))
    } catch {
      // Not a Lever account
    }
  }

  return null
}

function mapCommitmentToEmploymentType(commitment: string): string {
  const lower = commitment?.toLowerCase() ?? ''
  if (lower.includes('intern')) return 'internship'
  if (lower.includes('contract') || lower.includes('freelance')) return 'contract'
  if (lower.includes('part')) return 'part_time'
  return 'full_time'
}

function mapWorkplaceType(type: string): string | null {
  switch (type?.toLowerCase()) {
    case 'remote': return 'remote'
    case 'hybrid': return 'hybrid'
    case 'on-site':
    case 'onsite': return 'onsite'
    default: return null
  }
}

export function mapLeverJobToJobData(job: LeverJob, companyDomain: string) {
  const description = job.description || job.descriptionPlain || `Apply for ${job.text} at ${companyDomain}.`

  return {
    title: job.text,
    description,
    department: job.categories?.department || null,
    location: job.categories?.location || null,
    workType: mapWorkplaceType(job.workplaceType),
    employmentType: mapCommitmentToEmploymentType(job.categories?.commitment),
    applyUrl: job.applyUrl || job.hostedUrl,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'lever',
    status: 'active',
    visibility: 'network',
    externalId: `lever:${job.id}`,
    salaryMin: job.salaryRange?.min ?? null,
    salaryMax: job.salaryRange?.max ?? null,
    salaryCurrency: job.salaryRange?.currency ?? 'USD',
  }
}
