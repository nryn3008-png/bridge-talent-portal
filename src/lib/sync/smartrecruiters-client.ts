// SmartRecruiters public Posting API client
// Endpoint: GET https://api.smartrecruiters.com/v1/companies/{companyIdentifier}/postings
// No authentication required for public postings

export interface SmartRecruitersJob {
  id: string
  name: string
  uuid: string
  refNumber: string
  releasedDate: string
  location: {
    city: string
    region: string
    country: string
    remote: boolean
  }
  industry: { id: string; label: string }
  department: { id: string; label: string }
  function: { id: string; label: string }
  typeOfEmployment: { id: string; label: string }
  experienceLevel: { id: string; label: string }
  customField: Array<{ fieldId: string; fieldLabel: string; valueId: string; valueLabel: string }>
  ref_url: string
  company: {
    identifier: string
    name: string
  }
  jobAd: {
    sections: {
      companyDescription?: { title: string; text: string }
      jobDescription?: { title: string; text: string }
      qualifications?: { title: string; text: string }
      additionalInformation?: { title: string; text: string }
    }
  }
}

export interface SmartRecruitersResponse {
  offset: number
  limit: number
  totalFound: number
  content: SmartRecruitersJob[]
}

export async function fetchSmartRecruitersJobs(companySlug: string): Promise<SmartRecruitersJob[]> {
  const allJobs: SmartRecruitersJob[] = []
  let offset = 0
  const limit = 100

  // Paginate through all jobs
  while (true) {
    const url = `https://api.smartrecruiters.com/v1/companies/${companySlug}/postings?offset=${offset}&limit=${limit}`

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`SmartRecruiters API error ${response.status} for company ${companySlug}`)
    }

    const data: SmartRecruitersResponse = await response.json()
    const jobs = data.content ?? []
    allJobs.push(...jobs)

    if (allJobs.length >= data.totalFound || jobs.length < limit) {
      break
    }
    offset += limit
  }

  return allJobs
}

/**
 * Try to discover if a company uses SmartRecruiters by testing slug patterns.
 */
export async function trySmartRecruitersDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: SmartRecruitersJob[] } | null> {
  const baseName = companyDomain.replace(/\.\w+$/, '')
  const slugs = [...new Set([
    baseName,
    baseName.replace(/[^a-z0-9]/gi, ''),
    baseName.replace(/[^a-z0-9]/gi, '-'),
  ])]

  for (const slug of slugs) {
    try {
      const url = `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=10`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (response.ok) {
        const data: SmartRecruitersResponse = await response.json()
        const jobs = data.content ?? []
        if (jobs.length > 0) {
          // Refetch all jobs if discovery found results
          const allJobs = await fetchSmartRecruitersJobs(slug)
          return { slug, jobs: allJobs }
        }
      }
    } catch {
      // Not a SmartRecruiters account
    }
  }

  return null
}

function mapEmploymentType(type: { label: string } | undefined): string {
  const label = type?.label?.toLowerCase() ?? ''
  if (label.includes('intern')) return 'internship'
  if (label.includes('contract') || label.includes('freelance') || label.includes('temporary')) return 'contract'
  if (label.includes('part')) return 'part_time'
  return 'full_time'
}

function mapLocation(loc: SmartRecruitersJob['location']): string | null {
  const parts = [loc.city, loc.region, loc.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

function mapWorkType(loc: SmartRecruitersJob['location']): string | null {
  if (loc.remote) return 'remote'
  return null
}

export function mapSmartRecruitersJobToJobData(job: SmartRecruitersJob, companyDomain: string) {
  // Build description from jobAd sections (HTML)
  const sections = job.jobAd?.sections ?? {}
  const descParts = [
    sections.jobDescription?.text,
    sections.qualifications?.text,
    sections.additionalInformation?.text,
  ].filter(Boolean)

  const description = descParts.length > 0
    ? descParts.join('\n')
    : `Apply for ${job.name} at ${companyDomain}.`

  return {
    title: job.name,
    description,
    department: job.department?.label || null,
    location: mapLocation(job.location),
    workType: mapWorkType(job.location),
    employmentType: mapEmploymentType(job.typeOfEmployment),
    applyUrl: job.ref_url || null,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'smartrecruiters',
    status: 'active',
    visibility: 'network',
    externalId: `smartrecruiters:${job.id}`,
  }
}
