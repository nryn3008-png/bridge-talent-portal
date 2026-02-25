// Paylocity public Job Feed API client (undocumented but functional)
// Endpoint: GET https://recruiting.paylocity.com/recruiting/v2/api/feed/jobs/{guid}
// No authentication required (public job feed)
// Slug format stored in cache: the company GUID
// Discovery: Fetch company's careers page HTML, extract GUID from Paylocity embed URL

export interface PaylocityJob {
  id: string | number
  requisitionId: string | null
  title: string
  description: string | null // HTML
  requirements: string | null // HTML
  department: string | null
  location: string | null
  employmentType: string | null
  url: string | null
}

export interface PaylocityFeedResponse {
  jobs?: PaylocityJob[]
  // Feed may return different formats; handle array or object
}

export async function fetchPaylocityJobs(guid: string): Promise<PaylocityJob[]> {
  const url = `https://recruiting.paylocity.com/recruiting/v2/api/feed/jobs/${guid}`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Paylocity API error ${response.status} for GUID ${guid}`)
  }

  const data = await response.json()

  // Handle different response shapes
  if (Array.isArray(data)) return data
  if (data.jobs && Array.isArray(data.jobs)) return data.jobs
  return []
}

/**
 * Try to discover if a company uses Paylocity by fetching their careers page
 * and extracting the Paylocity embed GUID from the HTML.
 */
export async function tryPaylocityDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: PaylocityJob[] } | null> {
  const careersPaths = ['/careers', '/jobs', '/join-us', '/open-positions', '/career']

  // Try both bare domain and www prefix
  const domainVariants = [companyDomain, `www.${companyDomain}`]

  for (const domain of domainVariants) {
    for (const path of careersPaths) {
      try {
        const pageUrl = `https://${domain}${path}`
        const response = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BridgeTalentBot/1.0)',
            Accept: 'text/html',
          },
          cache: 'no-store',
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) continue

        const html = await response.text()
        const guid = extractPaylocityGuid(html)
        if (!guid) continue

        // Verify the GUID works
        try {
          const jobs = await fetchPaylocityJobs(guid)
          if (jobs.length > 0) {
            return { slug: guid, jobs }
          }
        } catch {
          // Invalid GUID, try next
        }
      } catch {
        // Page not reachable or timeout
      }
    }
  }

  return null
}

/**
 * Extract Paylocity company GUID from embedded iframes or script URLs in careers page HTML.
 * Paylocity embeds typically look like:
 *   <iframe src="https://recruiting.paylocity.com/recruiting/jobs/All/{GUID}/..." />
 * or:
 *   recruiting.paylocity.com/recruiting/jobs/All/abc123-def456-...
 */
function extractPaylocityGuid(html: string): string | null {
  // Pattern 1: Full Paylocity recruiting URL with GUID
  const urlMatch = html.match(
    /recruiting\.paylocity\.com\/recruiting\/[^"'\s]*?\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  )
  if (urlMatch) return urlMatch[1]

  // Pattern 2: Jobs feed URL
  const feedMatch = html.match(
    /recruiting\.paylocity\.com\/recruiting\/v2\/api\/feed\/jobs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  )
  if (feedMatch) return feedMatch[1]

  // Pattern 3: Simpler GUID-like pattern near "paylocity"
  const genericMatch = html.match(
    /paylocity[^"']*?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  )
  if (genericMatch) return genericMatch[1]

  return null
}

function mapEmploymentType(type: string | null): string {
  const lower = type?.toLowerCase() ?? ''
  if (lower.includes('intern')) return 'internship'
  if (lower.includes('contract') || lower.includes('freelance') || lower.includes('temporary')) return 'contract'
  if (lower.includes('part')) return 'part_time'
  return 'full_time'
}

export function mapPaylocityJobToJobData(job: PaylocityJob, companyDomain: string) {
  // Combine description + requirements
  let description = job.description || ''
  if (job.requirements) {
    description += (description ? '\n' : '') + job.requirements
  }
  if (!description) {
    description = `Apply for ${job.title} at ${companyDomain}.`
  }

  // Use requisitionId for external ID if available, fall back to id
  const idValue = job.requisitionId || String(job.id)

  return {
    title: job.title,
    description,
    department: job.department || null,
    location: job.location || null,
    workType: null as string | null,
    employmentType: mapEmploymentType(job.employmentType),
    applyUrl: job.url || null,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'paylocity',
    status: 'active',
    visibility: 'network',
    externalId: `paylocity:${idValue}`,
  }
}
