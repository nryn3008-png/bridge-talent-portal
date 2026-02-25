// Workday public Job Search API client (undocumented but functional)
// Endpoint: POST https://{company}.{wd#}.myworkdayjobs.com/wday/cxs/{company}/{siteName}/jobs
// No authentication required (public external career site)
// Slug format stored in cache: "{company}|{wd#}|{siteName}"
// Note: Workday uses 5 datacenters (wd1–wd5) — we probe all during discovery.

const WORKDAY_DATACENTERS = ['wd1', 'wd3', 'wd5'] as const // Most common; wd2/wd4 are rare
const COMMON_SITE_NAMES = ['External', 'External_Career_Site', 'Careers'] as const

export interface WorkdayJob {
  title: string
  externalPath: string
  locationsText: string | null
  postedOn: string | null
  bulletFields: string[] // Often contains requisition ID
  subtitles: Array<{ instances: Array<{ text: string }> }> // Category/department info
}

export interface WorkdaySearchResponse {
  total: number
  jobPostings: WorkdayJob[]
}

/**
 * Parse a compound slug "company|wd#|siteName" into parts.
 */
function parseWorkdaySlug(slug: string): { company: string; datacenter: string; siteName: string } {
  const parts = slug.split('|')
  if (parts.length !== 3) {
    throw new Error(`Invalid Workday slug format: ${slug} (expected "company|wd#|siteName")`)
  }
  return { company: parts[0], datacenter: parts[1], siteName: parts[2] }
}

export async function fetchWorkdayJobs(slug: string): Promise<WorkdayJob[]> {
  const { company, datacenter, siteName } = parseWorkdaySlug(slug)
  const allJobs: WorkdayJob[] = []
  const pageSize = 20
  let offset = 0

  // Paginate through all results
  while (true) {
    const url = `https://${company}.${datacenter}.myworkdayjobs.com/wday/cxs/${company}/${siteName}/jobs`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        limit: pageSize,
        offset,
        searchText: '',
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Workday API error ${response.status} for ${company} (${datacenter}/${siteName})`)
    }

    const data: WorkdaySearchResponse = await response.json()
    const jobs = data.jobPostings ?? []
    allJobs.push(...jobs)

    // Stop if we've fetched all or got an empty page
    if (allJobs.length >= data.total || jobs.length === 0) break
    offset += pageSize

    // Safety cap at 500 jobs to prevent runaway loops
    if (allJobs.length >= 500) {
      console.warn(`[workday] Capping at 500 jobs for ${company} (total: ${data.total})`)
      break
    }
  }

  return allJobs
}

/**
 * Try to discover if a company uses Workday by probing datacenters and site names.
 * This is heavier than other providers since Workday doesn't have a standard slug format.
 * Tries multiple datacenters × slug guesses × site names in parallel per datacenter.
 */
export async function tryWorkdayDiscovery(
  companyDomain: string,
): Promise<{ slug: string; jobs: WorkdayJob[] } | null> {
  const baseName = companyDomain.replace(/\.\w+$/, '')
  const stripped = baseName.replace(/[^a-z0-9]/gi, '')
  const hyphenated = baseName.replace(/[^a-z0-9]/gi, '-')
  const capitalized = stripped.charAt(0).toUpperCase() + stripped.slice(1)

  const companyGuesses = [...new Set([
    stripped,
    hyphenated,
    baseName,
    capitalized,
  ])]

  // Probe each datacenter × company × site name — try in parallel per datacenter
  for (const dc of WORKDAY_DATACENTERS) {
    const probes: Promise<{ slug: string; jobs: WorkdayJob[] } | null>[] = []

    for (const companyGuess of companyGuesses) {
      for (const siteName of COMMON_SITE_NAMES) {
        probes.push(
          probeWorkday(companyGuess, dc, siteName).catch(() => null),
        )
      }
    }

    const results = await Promise.all(probes)
    const found = results.find((r) => r !== null)
    if (found) return found
  }

  return null
}

async function probeWorkday(
  company: string,
  datacenter: string,
  siteName: string,
): Promise<{ slug: string; jobs: WorkdayJob[] } | null> {
  try {
    const url = `https://${company}.${datacenter}.myworkdayjobs.com/wday/cxs/${company}/${siteName}/jobs`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ limit: 5, offset: 0, searchText: '' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000), // 5s timeout per probe
    })

    if (!response.ok) return null

    const data: WorkdaySearchResponse = await response.json()
    const jobs = data.jobPostings ?? []

    if (jobs.length > 0) {
      const slug = `${company}|${datacenter}|${siteName}`
      return { slug, jobs }
    }
  } catch {
    // Not a valid Workday endpoint
  }
  return null
}

function extractDepartment(job: WorkdayJob): string | null {
  // Subtitles often contain category/department info
  if (job.subtitles && job.subtitles.length > 0) {
    const firstSubtitle = job.subtitles[0]
    if (firstSubtitle.instances && firstSubtitle.instances.length > 0) {
      return firstSubtitle.instances[0].text || null
    }
  }
  return null
}

function extractExternalId(job: WorkdayJob): string {
  // bulletFields often contains requisition ID as first element
  if (job.bulletFields && job.bulletFields.length > 0 && job.bulletFields[0]) {
    return `workday:${job.bulletFields[0]}`
  }
  // Fall back to path-based ID
  return `workday:${job.externalPath.replace(/\//g, '_')}`
}

export function mapWorkdayJobToJobData(job: WorkdayJob, companyDomain: string, slug: string) {
  const { company, datacenter, siteName } = parseWorkdaySlug(slug)
  const applyUrl = `https://${company}.${datacenter}.myworkdayjobs.com/en-US/${siteName}${job.externalPath}`

  return {
    title: job.title,
    description: `Apply for ${job.title} at ${companyDomain}.`,
    department: extractDepartment(job),
    location: job.locationsText || null,
    workType: null as string | null,
    employmentType: 'full_time' as const,
    applyUrl,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'workday',
    status: 'active',
    visibility: 'network',
    externalId: extractExternalId(job),
  }
}
