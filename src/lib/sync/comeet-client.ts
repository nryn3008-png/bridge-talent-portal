// Comeet public Careers API client (undocumented but functional)
// Endpoint: GET https://www.comeet.co/careers-api/2.0/company/{uid}/positions?token={token}&details=true
// No authentication required (public Careers API, but requires company UID + token)
// Slug format stored in cache: "{uid}|{token}"
// Discovery: Fetch company's careers page HTML, extract uid/token from embedded Comeet JS

export interface ComeetPosition {
  uid: string
  name: string
  department: string | null
  location: {
    name: string | null
    city: string | null
    country: string | null
  } | null
  employment_type: string | null
  experience_level: string | null
  workplace_type: string | null // remote, hybrid, onsite
  description: string | null // HTML
  requirements: string | null // HTML
  url_active_page: string | null
  time_updated: string | null
}

export interface ComeetResponse {
  positions?: ComeetPosition[]
  details?: ComeetPosition[]
}

/**
 * Parse a compound slug "uid|token" into parts.
 */
function parseComeetSlug(slug: string): { uid: string; token: string } {
  const parts = slug.split('|')
  if (parts.length !== 2) {
    throw new Error(`Invalid Comeet slug format: ${slug} (expected "uid|token")`)
  }
  return { uid: parts[0], token: parts[1] }
}

export async function fetchComeetJobs(slug: string): Promise<ComeetPosition[]> {
  const { uid, token } = parseComeetSlug(slug)
  const url = `https://www.comeet.co/careers-api/2.0/company/${uid}/positions?token=${token}&details=true`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Comeet API error ${response.status} for company ${uid}`)
  }

  const data: ComeetResponse = await response.json()
  // API may return positions or details depending on format
  return data.details ?? data.positions ?? (Array.isArray(data) ? data : [])
}

/**
 * Try to discover if a company uses Comeet by fetching their careers page
 * and extracting the embedded Comeet company_uid and token.
 */
export async function tryComeetDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: ComeetPosition[] } | null> {
  // Common careers page paths to check
  const careersPaths = ['/careers', '/jobs', '/join-us', '/open-positions', '/career']

  for (const path of careersPaths) {
    try {
      const pageUrl = `https://${companyDomain}${path}`
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

      // Look for Comeet embed patterns in the HTML
      const credentials = extractComeetCredentials(html)
      if (!credentials) continue

      // Verify the credentials work by fetching positions
      const slug = `${credentials.uid}|${credentials.token}`
      try {
        const jobs = await fetchComeetJobs(slug)
        if (jobs.length > 0) {
          return { slug, jobs }
        }
      } catch {
        // Invalid credentials, try next path
      }
    } catch {
      // Page not reachable or timeout
    }
  }

  // Also try www. prefix
  for (const path of careersPaths) {
    try {
      const pageUrl = `https://www.${companyDomain}${path}`
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
      const credentials = extractComeetCredentials(html)
      if (!credentials) continue

      const slug = `${credentials.uid}|${credentials.token}`
      try {
        const jobs = await fetchComeetJobs(slug)
        if (jobs.length > 0) {
          return { slug, jobs }
        }
      } catch {
        // Invalid credentials
      }
    } catch {
      // Not reachable
    }
  }

  return null
}

/**
 * Extract Comeet company_uid and token from embedded JavaScript in careers page HTML.
 * Comeet embeds typically look like:
 *   COMEET_COMPANY_UID = "abc123"
 *   COMEET_TOKEN = "xyz789"
 * or in a script tag:
 *   comeet_init({company_uid: "abc123", token: "xyz789"})
 */
function extractComeetCredentials(html: string): { uid: string; token: string } | null {
  // Pattern 1: COMEET_COMPANY_UID / COMEET_TOKEN variables
  const uidMatch = html.match(/COMEET_COMPANY_UID\s*[=:]\s*["']([^"']+)["']/i)
  const tokenMatch = html.match(/COMEET_TOKEN\s*[=:]\s*["']([^"']+)["']/i)
  if (uidMatch && tokenMatch) {
    return { uid: uidMatch[1], token: tokenMatch[1] }
  }

  // Pattern 2: comeet_init({company_uid: "...", token: "..."})
  const initMatch = html.match(/comeet_init\s*\(\s*\{[^}]*company_uid\s*:\s*["']([^"']+)["'][^}]*token\s*:\s*["']([^"']+)["']/i)
  if (initMatch) {
    return { uid: initMatch[1], token: initMatch[2] }
  }

  // Pattern 3: Comeet script URL with uid and token as params
  const scriptMatch = html.match(/comeet\.co\/[^"']*[?&]company_uid=([^&"']+)[^"']*[?&]token=([^&"']+)/i)
  if (scriptMatch) {
    return { uid: scriptMatch[1], token: scriptMatch[2] }
  }

  // Pattern 4: data attributes on embed elements
  const dataUidMatch = html.match(/data-company-uid=["']([^"']+)["']/i)
  const dataTokenMatch = html.match(/data-token=["']([^"']+)["']/i)
  if (dataUidMatch && dataTokenMatch) {
    return { uid: dataUidMatch[1], token: dataTokenMatch[1] }
  }

  return null
}

function formatLocation(loc: ComeetPosition['location']): string | null {
  if (!loc) return null
  const parts = [loc.city || loc.name, loc.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

function mapEmploymentType(type: string | null): string {
  const lower = type?.toLowerCase() ?? ''
  if (lower.includes('intern')) return 'internship'
  if (lower.includes('contract') || lower.includes('freelance') || lower.includes('temporary')) return 'contract'
  if (lower.includes('part')) return 'part_time'
  return 'full_time'
}

function mapWorkType(workplace: string | null): string | null {
  const lower = workplace?.toLowerCase() ?? ''
  if (lower.includes('remote')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (lower.includes('onsite') || lower.includes('on-site') || lower.includes('office')) return 'onsite'
  return null
}

export function mapComeetJobToJobData(position: ComeetPosition, companyDomain: string) {
  // Combine description + requirements
  let description = position.description || ''
  if (position.requirements) {
    description += (description ? '\n' : '') + position.requirements
  }
  if (!description) {
    description = `Apply for ${position.name} at ${companyDomain}.`
  }

  return {
    title: position.name,
    description,
    department: position.department || null,
    location: formatLocation(position.location),
    workType: mapWorkType(position.workplace_type),
    employmentType: mapEmploymentType(position.employment_type),
    applyUrl: position.url_active_page || null,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'comeet',
    status: 'active',
    visibility: 'network',
    externalId: `comeet:${position.uid}`,
  }
}
