// Recruitee public Careers Site API client
// Endpoint: GET https://{company}.recruitee.com/api/offers/
// No authentication required (public Careers Site API)

export interface RecruiteeOffer {
  id: number
  slug: string
  title: string
  description: string  // HTML
  requirements: string // HTML
  location: string
  department: string
  remote: boolean
  hybrid: boolean
  on_site: boolean
  created_at: string
  careers_url: string
  careers_apply_url: string
}

export interface RecruiteeResponse {
  offers: RecruiteeOffer[]
}

export async function fetchRecruiteeJobs(companySlug: string): Promise<RecruiteeOffer[]> {
  const url = `https://${companySlug}.recruitee.com/api/offers/`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Recruitee API error ${response.status} for company ${companySlug}`)
  }

  const data: RecruiteeResponse = await response.json()
  return data.offers ?? []
}

/**
 * Try to discover if a company uses Recruitee by testing slug patterns.
 */
export async function tryRecruiteeDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: RecruiteeOffer[] } | null> {
  const baseName = companyDomain.replace(/\.\w+$/, '')
  const slugs = [...new Set([
    baseName,
    baseName.replace(/[^a-z0-9]/gi, ''),
    baseName.replace(/[^a-z0-9]/gi, '-'),
  ])]

  for (const slug of slugs) {
    try {
      const url = `https://${slug}.recruitee.com/api/offers/`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (response.ok) {
        const data: RecruiteeResponse = await response.json()
        const offers = data.offers ?? []
        if (offers.length > 0) {
          return { slug, jobs: offers }
        }
      }
    } catch {
      // Not a Recruitee account
    }
  }

  return null
}

function mapWorkType(offer: RecruiteeOffer): string | null {
  if (offer.remote) return 'remote'
  if (offer.hybrid) return 'hybrid'
  if (offer.on_site) return 'onsite'
  return null
}

export function mapRecruiteeJobToJobData(offer: RecruiteeOffer, companyDomain: string) {
  // Combine description + requirements into a single HTML block
  let description = offer.description || ''
  if (offer.requirements) {
    description += (description ? '\n' : '') + offer.requirements
  }
  if (!description) {
    description = `Apply for ${offer.title} at ${companyDomain}.`
  }

  return {
    title: offer.title,
    description,
    department: offer.department || null,
    location: offer.location || null,
    workType: mapWorkType(offer),
    employmentType: 'full_time' as const,
    applyUrl: offer.careers_apply_url || offer.careers_url || null,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'recruitee',
    status: 'active',
    visibility: 'network',
    externalId: `recruitee:${offer.id}`,
  }
}
