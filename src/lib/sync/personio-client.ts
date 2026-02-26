// Personio public XML job feed client
// Endpoint: GET https://{company}.jobs.personio.de/xml?language=en
//        or GET https://{company}.jobs.personio.com/xml?language=en
// No authentication required (public XML feed, must be enabled by company)
// Note: Personio hosts on BOTH .personio.de and .personio.com — we probe both.

const PERSONIO_DOMAINS = ['personio.de', 'personio.com'] as const

export interface PersonioJob {
  id: string
  name: string
  department: string | null
  office: string | null
  employmentType: string | null
  schedule: string | null
  description: string // HTML
  recruitingCategory: string | null
  occupationCategory: string | null
  createdAt: string | null
  applyUrl: string
}

export async function fetchPersonioJobs(companySlug: string): Promise<PersonioJob[]> {
  // Try both .personio.de and .personio.com domains
  for (const domain of PERSONIO_DOMAINS) {
    // Try XML feed first (preferred when enabled by company)
    try {
      const xmlUrl = `https://${companySlug}.jobs.${domain}/xml?language=en`
      const response = await fetch(xmlUrl, { cache: 'no-store' })

      if (response.ok) {
        const text = await response.text()
        const xmlJobs = parsePersonioXml(text, companySlug, domain)
        if (xmlJobs.length > 0) return xmlJobs
      }
    } catch {
      // Try HTML fallback
    }

    // Fall back to HTML careers page (when XML feed is disabled)
    try {
      const htmlUrl = `https://${companySlug}.jobs.${domain}/?language=en`
      const response = await fetch(htmlUrl, { cache: 'no-store' })

      if (response.ok) {
        const html = await response.text()
        const htmlJobs = parsePersonioHtml(html, companySlug, domain)
        if (htmlJobs.length > 0) return htmlJobs
      }
    } catch {
      // Try next domain
    }
  }

  throw new Error(`Personio API: no jobs found for ${companySlug} on either .de or .com`)
}

/**
 * Parse Personio XML feed into structured job objects.
 * Uses regex extraction to avoid external XML parser dependencies.
 */
function parsePersonioXml(xml: string, companySlug: string, personioDomain: string = 'personio.de'): PersonioJob[] {
  const jobs: PersonioJob[] = []

  // Match each <position> block
  const positionRegex = /<position>([\s\S]*?)<\/position>/g
  let match: RegExpExecArray | null

  while ((match = positionRegex.exec(xml)) !== null) {
    const block = match[1]

    const id = extractTag(block, 'id')
    const name = extractTag(block, 'name')
    if (!id || !name) continue

    // Extract job descriptions — may have multiple <jobDescription> blocks
    const descriptions: string[] = []
    const descRegex = /<jobDescription>[\s\S]*?<value>([\s\S]*?)<\/value>[\s\S]*?<\/jobDescription>/g
    let descMatch: RegExpExecArray | null
    while ((descMatch = descRegex.exec(block)) !== null) {
      const val = descMatch[1].trim()
      if (val) descriptions.push(val)
    }

    jobs.push({
      id,
      name: decodeXmlEntities(name),
      department: extractTag(block, 'department'),
      office: extractTag(block, 'office'),
      employmentType: extractTag(block, 'employmentType'),
      schedule: extractTag(block, 'schedule'),
      description: descriptions.join('\n') || `Apply for ${decodeXmlEntities(name)} at ${companySlug}.`,
      recruitingCategory: extractTag(block, 'recruitingCategory'),
      occupationCategory: extractTag(block, 'occupationCategory'),
      createdAt: extractTag(block, 'createdAt'),
      applyUrl: `https://${companySlug}.jobs.${personioDomain}/job/${id}`,
    })
  }

  return jobs
}

/**
 * Parse Personio HTML careers page into structured job objects.
 * Fallback for companies that haven't enabled the XML feed.
 * Extracts from data-job-position-* attributes on .job-box elements.
 */
function parsePersonioHtml(html: string, companySlug: string, personioDomain: string = 'personio.de'): PersonioJob[] {
  const jobs: PersonioJob[] = []
  const seenIds = new Set<string>()

  // Match job-box elements with data attributes using regex
  // Each job box has: data-job-position-id, data-job-position-name, etc.
  const jobBoxRegex = /data-job-position-id="(\d+)"[\s\S]*?data-job-position-name="([^"]*)"[\s\S]*?data-job-position-department="([^"]*)"[\s\S]*?data-job-position-office="([^"]*)"[\s\S]*?data-job-position-employment="([^"]*)"/g
  let match: RegExpExecArray | null

  while ((match = jobBoxRegex.exec(html)) !== null) {
    const id = match[1]
    if (!id || seenIds.has(id)) continue
    seenIds.add(id)

    const name = decodeXmlEntities(match[2])
    const department = match[3] || null
    const office = match[4] || null
    const employment = match[5] || null

    if (!name) continue

    jobs.push({
      id,
      name,
      department,
      office,
      employmentType: employment,
      schedule: null,
      description: `Apply for ${name} at ${companySlug}.`,
      recruitingCategory: null,
      occupationCategory: null,
      createdAt: null,
      applyUrl: `https://${companySlug}.jobs.${personioDomain}/job/${id}`,
    })
  }

  return jobs
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)
  const match = regex.exec(xml)
  if (!match) return null
  const value = match[1].trim()
  return value || null
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
 * Try to discover if a company uses Personio by testing slug patterns
 * across both .personio.de and .personio.com domains.
 */
export async function tryPersonioDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: PersonioJob[] } | null> {
  const baseName = companyDomain.replace(/\.\w+$/, '')
  const stripped = baseName.replace(/[^a-z0-9]/gi, '')
  const hyphenated = baseName.replace(/[^a-z0-9]/gi, '-')
  const domainHyphenated = companyDomain.replace(/\./g, '-') // "lemon.markets" → "lemon-markets"

  // Also try common suffixes like -gmbh (common in Personio slugs)
  // and full domain with dots→hyphens for non-standard TLDs
  const slugs = [...new Set([
    baseName,
    stripped,
    hyphenated,
    domainHyphenated,
    `${hyphenated}-gmbh`,
    `${stripped}-gmbh`,
  ])]

  for (const slug of slugs) {
    for (const domain of PERSONIO_DOMAINS) {
      // Try XML feed first
      try {
        const xmlUrl = `https://${slug}.jobs.${domain}/xml?language=en`
        const response = await fetch(xmlUrl, { cache: 'no-store' })

        if (response.ok) {
          const text = await response.text()
          const xmlJobs = parsePersonioXml(text, slug, domain)
          if (xmlJobs.length > 0) {
            return { slug, jobs: xmlJobs }
          }
        }
      } catch {
        // Try HTML fallback
      }

      // Fall back to HTML careers page
      try {
        const htmlUrl = `https://${slug}.jobs.${domain}/?language=en`
        const response = await fetch(htmlUrl, { cache: 'no-store' })

        if (response.ok) {
          const html = await response.text()
          const htmlJobs = parsePersonioHtml(html, slug, domain)
          if (htmlJobs.length > 0) {
            return { slug, jobs: htmlJobs }
          }
        }
      } catch {
        // Not a Personio account on this domain
      }
    }
  }

  return null
}

function mapEmploymentType(type: string | null): string {
  const lower = type?.toLowerCase() ?? ''
  if (lower.includes('intern')) return 'internship'
  if (lower.includes('contract') || lower.includes('freelance') || lower.includes('temporary')) return 'contract'
  if (lower.includes('part')) return 'part_time'
  return 'full_time'
}

export function mapPersonioJobToJobData(job: PersonioJob, companyDomain: string) {
  return {
    title: job.name,
    description: job.description,
    department: job.department || null,
    location: job.office || null,
    workType: null as string | null, // Personio doesn't expose remote/hybrid info in XML
    employmentType: mapEmploymentType(job.employmentType),
    applyUrl: job.applyUrl,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'personio',
    status: 'active',
    visibility: 'network',
    externalId: `personio:${job.id}`,
  }
}
