// SAP SuccessFactors public job feed client (undocumented but functional)
// Endpoint: GET https://jobs.{domain}/sitemal.xml (RSS 2.0 XML)
//        or GET https://careers.{domain}/sitemal.xml
// No authentication required (public XML sitemap/feed)
// Slug format stored in cache: the base URL prefix (e.g., "jobs.sap.com")
// Note: Uses regex-based XML parsing (same approach as personio-client.ts)

const SUBDOMAIN_PREFIXES = ['jobs', 'careers'] as const

export interface SuccessFactorsJob {
  title: string
  link: string
  description: string
  guid: string
  location: string | null
  department: string | null
  pubDate: string | null
}

/**
 * Fetch jobs from a known SuccessFactors feed URL slug.
 * Slug format: "jobs.example.com" or "careers.example.com"
 */
export async function fetchSuccessFactorsJobs(feedSlug: string): Promise<SuccessFactorsJob[]> {
  const url = `https://${feedSlug}/sitemal.xml`

  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`SuccessFactors XML feed error ${response.status} for ${feedSlug}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('xml') && !contentType.includes('text') && !contentType.includes('html')) {
    throw new Error(`SuccessFactors feed for ${feedSlug} returned non-XML content: ${contentType}`)
  }

  const xml = await response.text()
  return parseSuccessFactorsXml(xml)
}

/**
 * Try to discover if a company uses SAP SuccessFactors by probing known feed URLs.
 */
export async function trySuccessFactorsDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: SuccessFactorsJob[] } | null> {
  // Try subdomains of the company domain
  for (const prefix of SUBDOMAIN_PREFIXES) {
    const feedSlug = `${prefix}.${companyDomain}`
    try {
      const url = `https://${feedSlug}/sitemal.xml`
      const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) continue

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('xml') && !contentType.includes('text') && !contentType.includes('html')) continue

      const xml = await response.text()
      const jobs = parseSuccessFactorsXml(xml)

      if (jobs.length > 0) {
        return { slug: feedSlug, jobs }
      }
    } catch {
      // Not a SuccessFactors feed
    }
  }

  return null
}

/**
 * Parse SuccessFactors RSS 2.0 XML feed into structured job objects.
 * Uses regex extraction to avoid external XML parser dependencies.
 */
function parseSuccessFactorsXml(xml: string): SuccessFactorsJob[] {
  const jobs: SuccessFactorsJob[] = []

  // Match each <item> block in RSS
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    if (!title) continue

    // Try Google job extensions first, then standard RSS tags
    const location = extractTag(block, 'g:location') || extractTag(block, 'location')
    const department = extractTag(block, 'g:job_functions') || extractTag(block, 'category')
    const guid = extractTag(block, 'guid') || link || ''
    const description = extractCdata(block, 'description') || extractTag(block, 'description') || ''
    const pubDate = extractTag(block, 'pubDate')

    jobs.push({
      title: decodeXmlEntities(title),
      link: link || '',
      description: decodeXmlEntities(description),
      guid,
      location: location ? decodeXmlEntities(location) : null,
      department: department ? decodeXmlEntities(department) : null,
      pubDate,
    })
  }

  return jobs
}

function extractTag(xml: string, tag: string): string | null {
  // Handle namespaced tags (e.g., g:location)
  const escapedTag = tag.replace(/:/g, '\\:')
  const regex = new RegExp(`<${escapedTag}>([\\s\\S]*?)</${escapedTag}>`)
  const match = regex.exec(xml)
  if (!match) return null
  const value = match[1].trim()
  return value || null
}

function extractCdata(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`)
  const match = regex.exec(xml)
  if (!match) return null
  return match[1].trim() || null
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

/**
 * Generate a stable external ID from a job's GUID or link.
 * Uses a simple hash if the GUID is a full URL to keep IDs manageable.
 */
function generateExternalId(job: SuccessFactorsJob): string {
  const identifier = job.guid || job.link
  if (!identifier) return `successfactors:unknown_${job.title.replace(/\s+/g, '_').slice(0, 50)}`

  // If it looks like a short ID, use it directly
  if (identifier.length < 100 && !identifier.startsWith('http')) {
    return `successfactors:${identifier}`
  }

  // For URLs, extract the last path segment or query param as a more readable ID
  try {
    const url = new URL(identifier)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const lastSegment = pathParts[pathParts.length - 1]
    if (lastSegment) return `successfactors:${lastSegment}`
  } catch {
    // Not a valid URL
  }

  // Fall back to a simple hash
  let hash = 0
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit integer
  }
  return `successfactors:${Math.abs(hash)}`
}

export function mapSuccessFactorsJobToJobData(job: SuccessFactorsJob, companyDomain: string) {
  const description = job.description || `Apply for ${job.title} at ${companyDomain}.`

  return {
    title: job.title,
    description,
    department: job.department || null,
    location: job.location || null,
    workType: null as string | null,
    employmentType: 'full_time' as const,
    applyUrl: job.link || null,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'successfactors',
    status: 'active',
    visibility: 'network',
    externalId: generateExternalId(job),
  }
}
