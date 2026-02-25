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
    try {
      const url = `https://${companySlug}.jobs.${domain}/xml?language=en`
      const response = await fetch(url, { cache: 'no-store' })

      if (!response.ok) continue

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('xml') && !contentType.includes('text')) continue

      const xml = await response.text()
      const jobs = parsePersonioXml(xml, companySlug, domain)
      if (jobs.length > 0) return jobs
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
      try {
        const url = `https://${slug}.jobs.${domain}/xml?language=en`
        const response = await fetch(url, { cache: 'no-store' })

        if (response.ok) {
          const contentType = response.headers.get('content-type') ?? ''
          if (contentType.includes('xml') || contentType.includes('text')) {
            const xml = await response.text()
            const jobs = parsePersonioXml(xml, slug, domain)
            if (jobs.length > 0) {
              return { slug, jobs }
            }
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
