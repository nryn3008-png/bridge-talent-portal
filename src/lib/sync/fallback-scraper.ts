// Fallback job scraper for careers pages that don't use a known ATS.
// 4-step strategy: static HTML (cheerio) → network interception (playwright) →
// DOM heuristic (playwright) → graceful empty return.
//
// This module is standalone. The calling orchestrator handles normalization
// of RawJob[] into MappedJobData[] for the sync pipeline.

import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RawJob {
  title: string
  location: string | null
  department: string | null
  url: string | null
  rawHtml: string | null // raw HTML snippet for debugging
}

interface ScoredElement {
  score: number
  title: string
  location: string | null
  department: string | null
  url: string | null
  rawHtml: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LOG_PREFIX = '[fallback-scraper]'
const STATIC_FETCH_TIMEOUT_MS = 10_000
const PLAYWRIGHT_PAGE_TIMEOUT_MS = 15_000
const MIN_DELAY_MS = 1_500
const MAX_DELAY_MS = 3_000
const MAX_HTML_SIZE_BYTES = 5 * 1024 * 1024 // 5MB — bail on very large pages

const REALISTIC_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

const JOB_TITLE_SIGNALS = [
  'engineer', 'developer', 'designer', 'manager', 'analyst', 'director',
  'lead', 'senior', 'junior', 'intern', 'head of', 'vp ', 'chief',
  'coordinator', 'specialist', 'consultant', 'architect', 'scientist',
  'recruiter', 'operations', 'marketing', 'sales', 'product', 'data',
  'software', 'frontend', 'backend', 'fullstack', 'full-stack', 'devops',
]

const LOCATION_SIGNALS = [
  'remote', 'hybrid', 'on-site', 'onsite', 'new york', 'san francisco',
  'london', 'berlin', 'worldwide', 'usa', 'europe', 'apac',
]

const CAREERS_CONTAINER_SELECTORS = [
  '[class*="job"]', '[class*="career"]', '[class*="position"]',
  '[class*="opening"]', '[class*="vacancy"]', '[class*="posting"]',
  '[data-testid*="job"]', '[data-testid*="career"]',
  '[id*="job"]', '[id*="career"]', '[id*="position"]',
]

const CAREERS_LINK_SELECTORS = [
  'a[href*="/job"]', 'a[href*="/career"]', 'a[href*="/position"]',
  'a[href*="/opening"]', 'a[href*="/apply"]', 'a[href*="lever.co"]',
  'a[href*="greenhouse.io"]', 'a[href*="workable.com"]',
  'a[href*="ashbyhq.com"]', 'a[href*="recruitee.com"]',
]

// Signals that indicate a soft 404 / error page (HTTP 200 but "not found" content)
const SOFT_404_SIGNALS = [
  '404', 'not found', 'page not found', "page doesn't exist",
  'page does not exist', 'no longer available', "couldn't find",
  'could not find', "doesn't exist", 'does not exist',
]

// Minimum fraction of extracted titles that must match job keywords to be considered real
const MIN_JOB_TITLE_MATCH_RATIO = 0.25

// ── Soft 404 Detection ──────────────────────────────────────────────────────

/**
 * Detect "soft 404" pages — HTTP 200 responses that render error/not-found content.
 * Checks <title>, <h1>/<h2> headings, and short body text for error signals.
 */
function isSoft404Page(html: string): boolean {
  const $ = cheerio.load(html)

  // Check <title> tag
  const title = $('title').first().text().toLowerCase().trim()
  if (SOFT_404_SIGNALS.some((s) => title.includes(s))) return true

  // Check <h1> and <h2> headings
  const headings: string[] = []
  $('h1, h2').each((_, el) => {
    headings.push($(el).text().toLowerCase().trim())
  })
  if (headings.some((h) => SOFT_404_SIGNALS.some((s) => h.includes(s)))) return true

  // Short body text + error keywords = likely error page
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  if (bodyText.length < 500) {
    const lower = bodyText.toLowerCase()
    if (SOFT_404_SIGNALS.some((s) => lower.includes(s))) return true
  }

  return false
}

// ── Post-Extraction Validation ──────────────────────────────────────────────

/**
 * Check that extracted jobs have plausible job titles (not random page elements).
 * Returns true if at least MIN_JOB_TITLE_MATCH_RATIO of titles match job keywords.
 * Prevents non-careers pages (e.g. company homepages at /careers) from producing junk.
 */
function hasPlausibleJobTitles(jobs: RawJob[]): boolean {
  if (jobs.length === 0) return false

  let matchCount = 0
  for (const job of jobs) {
    if (looksLikeJobTitle(job.title)) matchCount++
  }

  const ratio = matchCount / jobs.length
  return ratio >= MIN_JOB_TITLE_MATCH_RATIO
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

/**
 * Best-effort scraper for arbitrary careers pages.
 * Tries 4 strategies in order and returns early on first success.
 * NEVER throws — always returns RawJob[] (empty on failure).
 */
export async function scrapeWithFallback(
  careersUrl: string,
  companyName: string,
): Promise<RawJob[]> {
  const warnings: string[] = []

  // ── Step 1: Static HTML fetch + cheerio ──────────────────────────────────
  try {
    console.log(`${LOG_PREFIX} Step 1: Static HTML fetch for ${companyName} (${careersUrl})`)
    const jobs = await scrapeStaticHtml(careersUrl)
    if (jobs.length > 0) {
      if (!hasPlausibleJobTitles(jobs)) {
        console.warn(`${LOG_PREFIX} Step 1: Extracted ${jobs.length} items but none look like real job titles — skipping`)
      } else {
        console.log(`${LOG_PREFIX} Step 1 succeeded: ${jobs.length} jobs from static HTML`)
        return deduplicateJobs(jobs)
      }
    } else {
      console.log(`${LOG_PREFIX} Step 1: No jobs found in static HTML`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(`Step 1 (static HTML) failed: ${msg}`)
    console.warn(`${LOG_PREFIX} Step 1 failed: ${msg}`)
  }

  // ── Steps 2-3: Playwright (gated by env var + import availability) ──────
  if (await isPlaywrightAvailable()) {
    // Step 2: Network interception
    try {
      console.log(`${LOG_PREFIX} Step 2: Playwright network interception for ${companyName}`)
      const jobs = await scrapeViaNetworkIntercept(careersUrl)
      if (jobs.length > 0) {
        if (!hasPlausibleJobTitles(jobs)) {
          console.warn(`${LOG_PREFIX} Step 2: Intercepted ${jobs.length} items but none look like real job titles — skipping`)
        } else {
          console.log(`${LOG_PREFIX} Step 2 succeeded: ${jobs.length} jobs from intercepted API responses`)
          return deduplicateJobs(jobs)
        }
      } else {
        console.log(`${LOG_PREFIX} Step 2: No job-like API responses intercepted`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      warnings.push(`Step 2 (network intercept) failed: ${msg}`)
      console.warn(`${LOG_PREFIX} Step 2 failed: ${msg}`)
    }

    // Step 3: DOM heuristic extraction
    try {
      console.log(`${LOG_PREFIX} Step 3: Playwright DOM heuristic for ${companyName}`)
      const jobs = await scrapeViaDomHeuristic(careersUrl)
      if (jobs.length > 0) {
        if (!hasPlausibleJobTitles(jobs)) {
          console.warn(`${LOG_PREFIX} Step 3: Extracted ${jobs.length} items but none look like real job titles — skipping`)
        } else {
          console.log(`${LOG_PREFIX} Step 3 succeeded: ${jobs.length} jobs from DOM heuristics`)
          return deduplicateJobs(jobs)
        }
      } else {
        console.log(`${LOG_PREFIX} Step 3: No jobs found via DOM heuristics`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      warnings.push(`Step 3 (DOM heuristic) failed: ${msg}`)
      console.warn(`${LOG_PREFIX} Step 3 failed: ${msg}`)
    }
  } else {
    warnings.push('Playwright not available — skipped Steps 2-3')
    console.log(`${LOG_PREFIX} Playwright not available, skipping Steps 2-3`)
  }

  // ── Step 4: Graceful failure ──────────────────────────────────────────────
  console.warn(JSON.stringify({
    level: 'warn',
    company: companyName,
    url: careersUrl,
    reason: 'fallback_scraper_no_results',
    warnings,
  }))

  return []
}

// ── Step 1: Static HTML Fetch + Cheerio ───────────────────────────────────────

async function scrapeStaticHtml(careersUrl: string): Promise<RawJob[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STATIC_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(careersUrl, {
      headers: {
        'User-Agent': REALISTIC_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${careersUrl}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('html') && !contentType.includes('text')) {
      throw new Error(`Unexpected content-type: ${contentType}`)
    }

    // Bail on very large pages to prevent memory issues
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_HTML_SIZE_BYTES) {
      throw new Error(`Page too large (${contentLength} bytes)`)
    }

    const html = await response.text()
    if (html.length > MAX_HTML_SIZE_BYTES) {
      throw new Error(`Page HTML too large (${html.length} chars)`)
    }

    // Detect soft 404 pages (HTTP 200 but "not found" content)
    if (isSoft404Page(html)) {
      throw new Error(`Soft 404 detected on ${careersUrl}`)
    }

    return extractJobsFromHtml(html, careersUrl)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Extract jobs from raw HTML using cheerio.
 * Tries JSON-LD first, then scored DOM elements, then link-based extraction.
 */
function extractJobsFromHtml(html: string, baseUrl: string): RawJob[] {
  const $ = cheerio.load(html)
  const baseOrigin = new URL(baseUrl).origin

  // Strategy A: JSON-LD structured data (most reliable when present)
  const jsonLdJobs = extractFromJsonLd($)
  if (jsonLdJobs.length > 0) return jsonLdJobs

  // Strategy B: Score repeating DOM elements that look like job cards
  const candidateSelectors = [
    ...CAREERS_CONTAINER_SELECTORS,
    'li', 'article', 'div[role="listitem"]', 'tr',
  ]

  for (const selector of candidateSelectors) {
    const elements = $(selector)
    if (elements.length < 2 || elements.length > 500) continue

    const scored: ScoredElement[] = []
    elements.each((_, el) => {
      const $el = $(el)
      const result = scoreCheerioElement($, $el, baseOrigin)
      if (result.score > 0) {
        scored.push(result)
      }
    })

    // Need 2+ positively scored elements from the same selector
    if (scored.length >= 2) {
      const jobs: RawJob[] = []
      for (const item of scored) {
        if (item.title && item.title.trim().length > 0) {
          jobs.push({
            title: item.title.trim(),
            location: item.location,
            department: item.department,
            url: item.url ? resolveUrl(item.url, baseOrigin) : null,
            rawHtml: item.rawHtml,
          })
        }
      }
      if (jobs.length > 0) return jobs
    }
  }

  // Strategy C: Link-based extraction as last resort
  const linkJobs: RawJob[] = []
  for (const linkSel of CAREERS_LINK_SELECTORS) {
    $(linkSel).each((_, el) => {
      const $a = $(el)
      const text = $a.text().trim()
      const href = $a.attr('href')

      if (text && text.length > 5 && text.length < 200 && looksLikeJobTitle(text)) {
        linkJobs.push({
          title: text,
          location: null,
          department: null,
          url: href ? resolveUrl(href, baseOrigin) : null,
          rawHtml: null,
        })
      }
    })
    if (linkJobs.length > 0) break // use first selector that yields results
  }

  return linkJobs
}

/** Extract JobPosting entries from JSON-LD structured data. */
function extractFromJsonLd($: cheerio.CheerioAPI): RawJob[] {
  const jobs: RawJob[] = []

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html()
      if (!raw) return
      const data = JSON.parse(raw) as Record<string, unknown>
      const items = Array.isArray(data) ? data : [data]

      for (const item of items) {
        extractJobPostingsFromJsonLdItem(item as Record<string, unknown>, jobs)
      }
    } catch {
      // Malformed JSON-LD — skip
    }
  })

  return jobs
}

function extractJobPostingsFromJsonLdItem(
  item: Record<string, unknown>,
  jobs: RawJob[],
): void {
  if (item['@type'] === 'JobPosting' && item.title) {
    const loc = item.jobLocation as Record<string, unknown> | undefined
    const address = loc?.address as Record<string, unknown> | undefined
    jobs.push({
      title: item.title as string,
      location: (address?.addressLocality as string)
        ?? (loc?.name as string)
        ?? null,
      department: (item.occupationalCategory as string) ?? null,
      url: (item.url as string) ?? null,
      rawHtml: (item.description as string) ?? null,
    })
  }

  // Handle @graph arrays (common in schema.org markup)
  if (Array.isArray(item['@graph'])) {
    for (const graphItem of item['@graph'] as Record<string, unknown>[]) {
      extractJobPostingsFromJsonLdItem(graphItem, jobs)
    }
  }
}

// ── Step 2: Playwright Network Interception ───────────────────────────────────

async function scrapeViaNetworkIntercept(careersUrl: string): Promise<RawJob[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { chromium } = await import('playwright-core')
  const interceptedPayloads: unknown[] = []

  const browser = await launchBrowser(chromium)
  if (!browser) return []

  try {
    const context = await browser.newContext({
      userAgent: REALISTIC_USER_AGENT,
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()

    // Intercept XHR/fetch responses BEFORE navigating
    page.on('response', async (response: { url: () => string; headers: () => Record<string, string>; json: () => Promise<unknown> }) => {
      const url = response.url()
      const contentType = response.headers()['content-type'] ?? ''

      if (!contentType.includes('json')) return
      // Skip known non-job endpoints
      if (url.includes('analytics') || url.includes('tracking') || url.includes('consent') || url.includes('segment')) return

      try {
        const body = await response.json()
        if (looksLikeJobArray(body)) {
          interceptedPayloads.push(body)
        }
      } catch {
        // Non-JSON or failed to parse — ignore
      }
    })

    // Randomized delay before navigation
    await randomDelay()

    await page.goto(careersUrl, {
      waitUntil: 'networkidle',
      timeout: PLAYWRIGHT_PAGE_TIMEOUT_MS,
    })

    // Wait a bit more for lazy-loaded API calls
    await page.waitForTimeout(2000)

    // Parse all intercepted payloads
    const jobs: RawJob[] = []
    for (const payload of interceptedPayloads) {
      jobs.push(...extractJobsFromJson(payload))
    }

    await context.close()
    return jobs
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`${LOG_PREFIX} Network intercept error: ${msg}`)
    return []
  } finally {
    await browser.close()
  }
}

/** Check if a JSON response looks like an array of job objects. */
function looksLikeJobArray(data: unknown): boolean {
  const candidates = Array.isArray(data)
    ? data
    : (typeof data === 'object' && data !== null)
      ? findNestedArray(data as Record<string, unknown>)
      : null

  if (!candidates || !Array.isArray(candidates) || candidates.length < 1) return false

  // Check if ≥50% of items (sample first 10) have a title-like field
  let jobLikeCount = 0
  const sample = candidates.slice(0, 10)
  for (const item of sample) {
    if (typeof item !== 'object' || item === null) continue
    const obj = item as Record<string, unknown>
    const hasTitle = 'title' in obj || 'name' in obj || 'job_title' in obj
      || 'jobTitle' in obj || 'position' in obj
    if (hasTitle) jobLikeCount++
  }

  return jobLikeCount >= Math.ceil(sample.length * 0.5)
}

/** Unwrap common JSON response wrappers to find the job array. */
function findNestedArray(obj: Record<string, unknown>): unknown[] | null {
  const arrayKeys = [
    'jobs', 'data', 'results', 'items', 'postings', 'positions',
    'openings', 'records', 'content', 'offers', 'vacancies',
  ]
  for (const key of arrayKeys) {
    if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
      return obj[key] as unknown[]
    }
  }
  // Fallback: first array property with 2+ items
  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length >= 2) return value
  }
  return null
}

/** Extract RawJob[] from an intercepted JSON payload. */
function extractJobsFromJson(data: unknown): RawJob[] {
  const jobs: RawJob[] = []
  const items = Array.isArray(data)
    ? data
    : (typeof data === 'object' && data !== null)
      ? findNestedArray(data as Record<string, unknown>) ?? []
      : []

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue
    const obj = item as Record<string, unknown>

    const title = (obj.title ?? obj.name ?? obj.job_title ?? obj.jobTitle ?? obj.position) as string | undefined
    if (!title || typeof title !== 'string' || title.trim().length === 0) continue

    const rawLocation = obj.location ?? obj.city ?? obj.office
    const location = typeof rawLocation === 'string'
      ? rawLocation
      : (typeof rawLocation === 'object' && rawLocation !== null)
        ? extractLocationFromObject(rawLocation as Record<string, unknown>)
        : null

    const department = typeof obj.department === 'string' ? obj.department
      : typeof obj.team === 'string' ? obj.team
      : typeof obj.category === 'string' ? obj.category
      : null

    const url = (obj.url ?? obj.apply_url ?? obj.applyUrl ?? obj.absolute_url
      ?? obj.hostedUrl ?? obj.jobUrl) as string | undefined

    jobs.push({
      title: title.trim(),
      location: location?.trim() || null,
      department: department?.trim() || null,
      url: typeof url === 'string' ? url : null,
      rawHtml: null,
    })
  }

  return jobs
}

/** Extract a readable location string from a nested location object. */
function extractLocationFromObject(loc: Record<string, unknown>): string | null {
  const parts = [loc.city, loc.name, loc.region, loc.country]
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
  return parts.length > 0 ? parts.join(', ') : null
}

// ── Step 3: Playwright DOM Heuristic Extraction ───────────────────────────────

async function scrapeViaDomHeuristic(careersUrl: string): Promise<RawJob[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { chromium } = await import('playwright-core')

  const browser = await launchBrowser(chromium)
  if (!browser) return []

  try {
    const context = await browser.newContext({
      userAgent: REALISTIC_USER_AGENT,
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()

    await randomDelay()

    await page.goto(careersUrl, {
      waitUntil: 'domcontentloaded',
      timeout: PLAYWRIGHT_PAGE_TIMEOUT_MS,
    })

    // Wait for dynamic JS content to render
    await page.waitForTimeout(3000)

    // Get fully rendered HTML (after JS execution)
    const renderedHtml = await page.content() as string

    await context.close()

    // Detect soft 404 pages (HTTP 200 but "not found" content)
    if (isSoft404Page(renderedHtml)) {
      throw new Error(`Soft 404 detected (rendered) on ${careersUrl}`)
    }

    // Feed rendered HTML through the same cheerio pipeline from Step 1
    // This catches SPA careers pages that render empty server-side HTML
    return extractJobsFromHtml(renderedHtml, careersUrl)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`${LOG_PREFIX} DOM heuristic error: ${msg}`)
    return []
  } finally {
    await browser.close()
  }
}

// ── Scoring Heuristic ─────────────────────────────────────────────────────────

/**
 * Score a DOM element on how likely it is to be a job listing.
 * 7 signals: link presence, title keywords, location keywords, CSS classes,
 * card structure, employment type keywords, URL patterns.
 */
function scoreCheerioElement(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
  baseOrigin: string,
): ScoredElement {
  const empty: ScoredElement = { score: -1, title: '', location: null, department: null, url: null, rawHtml: null }

  let score = 0
  const text = $el.text().trim()
  const html = $el.html() ?? ''

  // ── Disqualifiers ───────────────────────────────────────────────────────
  if (text.length < 10 || text.length > 2000) return empty

  // ── Signal 1: Contains a link (+2) ──────────────────────────────────────
  const $links = $el.find('a')
  const firstLink = $links.first()
  const href = firstLink.attr('href') ?? null
  if ($links.length > 0) score += 2

  // ── Signal 2: Title-like text matches job keywords (+3) ─────────────────
  const primaryText = firstLink.text().trim()
    || $el.find('h1,h2,h3,h4,h5,h6').first().text().trim()
    || ''
  const lowerPrimary = primaryText.toLowerCase()
  for (const signal of JOB_TITLE_SIGNALS) {
    if (lowerPrimary.includes(signal)) {
      score += 3
      break
    }
  }

  // ── Signal 3: Contains location-like text (+1) ──────────────────────────
  const lowerText = text.toLowerCase()
  let locationText: string | null = null
  for (const signal of LOCATION_SIGNALS) {
    if (lowerText.includes(signal)) {
      score += 1
      locationText = extractNearbyText($, $el, signal)
      break
    }
  }

  // ── Signal 4: CSS class/id contains job-related terms (+2) ──────────────
  const className = ($el.attr('class') ?? '').toLowerCase()
  const id = ($el.attr('id') ?? '').toLowerCase()
  const attrText = `${className} ${id}`
  const attrSignals = ['job', 'career', 'position', 'opening', 'vacancy', 'posting', 'listing']
  for (const signal of attrSignals) {
    if (attrText.includes(signal)) {
      score += 2
      break
    }
  }

  // ── Signal 5: Has heading + span children (card structure) (+1) ─────────
  const hasHeading = $el.find('h1,h2,h3,h4,h5,h6').length > 0
  const hasSpan = $el.find('span').length > 0
  if (hasHeading && hasSpan) score += 1

  // ── Signal 6: Employment type keywords (+2) ─────────────────────────────
  const employmentKeywords = ['full-time', 'full time', 'part-time', 'part time', 'contract', 'intern', 'freelance']
  for (const kw of employmentKeywords) {
    if (lowerText.includes(kw)) {
      score += 2
      break
    }
  }

  // ── Signal 7: Link points to a job-like URL (+3) ───────────────────────
  if (href) {
    const lowerHref = href.toLowerCase()
    if (lowerHref.includes('/job') || lowerHref.includes('/position')
      || lowerHref.includes('/opening') || lowerHref.includes('/apply')) {
      score += 3
    }
  }

  // ── Extract structured data ─────────────────────────────────────────────
  const title = primaryText || extractTitleFromElement($, $el)
  const department = extractDepartment($, $el)
  const location = locationText ?? extractLocation($, $el)

  return {
    score,
    title,
    location,
    department,
    url: href ? resolveUrl(href, baseOrigin) : null,
    rawHtml: html.length < 5000 ? html : null, // don't store huge blobs
  }
}

// ── Helper Functions ──────────────────────────────────────────────────────────

function looksLikeJobTitle(text: string): boolean {
  const lower = text.toLowerCase()
  return JOB_TITLE_SIGNALS.some((signal) => lower.includes(signal))
}

function extractTitleFromElement(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
): string {
  // Priority: heading > first link > bold text > first line
  const heading = $el.find('h1,h2,h3,h4,h5,h6').first().text().trim()
  if (heading) return heading

  const link = $el.find('a').first().text().trim()
  if (link) return link

  const bold = $el.find('b,strong').first().text().trim()
  if (bold) return bold

  const fullText = $el.text().trim()
  const firstLine = fullText.split('\n')[0].trim()
  return firstLine.slice(0, 200)
}

function extractLocation(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
): string | null {
  const selectors = [
    '[class*="location"]', '[class*="city"]', '[class*="region"]',
    '[data-testid*="location"]', '[aria-label*="location"]',
  ]
  for (const sel of selectors) {
    const text = $el.find(sel).first().text().trim()
    if (text && text.length < 100) return text
  }
  return null
}

function extractDepartment(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
): string | null {
  const selectors = [
    '[class*="department"]', '[class*="team"]', '[class*="category"]',
    '[data-testid*="department"]', '[data-testid*="team"]',
  ]
  for (const sel of selectors) {
    const text = $el.find(sel).first().text().trim()
    if (text && text.length < 100) return text
  }
  return null
}

function extractNearbyText(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
  keyword: string,
): string | null {
  let result: string | null = null
  $el.find('span, p, div, small').each((_, span) => {
    const spanText = $(span).text().trim()
    if (spanText.toLowerCase().includes(keyword) && spanText.length < 100) {
      result = spanText
      return false // break each loop
    }
  })
  return result
}

function resolveUrl(href: string, baseOrigin: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  if (href.startsWith('//')) return `https:${href}`
  if (href.startsWith('/')) return `${baseOrigin}${href}`
  return `${baseOrigin}/${href}`
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function deduplicateJobs(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>()
  const unique: RawJob[] = []

  for (const job of jobs) {
    if (!job.title || job.title.trim().length === 0) continue

    const key = normalizeDedupeKey(job.title, job.location)
    if (seen.has(key)) continue

    seen.add(key)
    unique.push({
      ...job,
      title: job.title.trim(),
      location: job.location?.trim() || null,
      department: job.department?.trim() || null,
    })
  }

  return unique
}

function normalizeDedupeKey(title: string, location: string | null): string {
  const t = title.toLowerCase().replace(/\s+/g, ' ').trim()
  const l = (location ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
  return `${t}|${l}`
}

// ── Playwright Utilities ──────────────────────────────────────────────────────

/** Check if Playwright is available (env var gate + import check). */
async function isPlaywrightAvailable(): Promise<boolean> {
  if (process.env.ENABLE_PLAYWRIGHT !== 'true') return false

  try {
    await import('playwright-core')
    return true
  } catch {
    return false
  }
}

/**
 * Launch a browser instance.
 * Tries PLAYWRIGHT_WS_ENDPOINT (remote service) first, then local launch.
 */
async function launchBrowser(
  chromium: {
    connect: (wsEndpoint: string) => Promise<PlaywrightBrowser>
    launch: (opts: Record<string, unknown>) => Promise<PlaywrightBrowser>
  },
): Promise<PlaywrightBrowser | null> {
  try {
    const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT
    if (wsEndpoint) {
      return await chromium.connect(wsEndpoint)
    }

    return await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`${LOG_PREFIX} Failed to launch browser: ${msg}`)
    return null
  }
}

/** Randomized delay (1.5–3s) to let JS-rendered content settle. */
async function randomDelay(): Promise<void> {
  const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
  await new Promise((r) => setTimeout(r, delay))
}

// ── Minimal Playwright type definitions ───────────────────────────────────────
// Avoids requiring @playwright/test as a dependency. Only the methods we use.

interface PlaywrightBrowser {
  newContext: (opts: {
    userAgent: string
    viewport: { width: number; height: number }
  }) => Promise<PlaywrightBrowserContext>
  close: () => Promise<void>
}

interface PlaywrightBrowserContext {
  newPage: () => Promise<PlaywrightPage>
  close: () => Promise<void>
}

interface PlaywrightPage {
  on: (event: string, handler: (response: PlaywrightResponse) => void) => void
  goto: (url: string, opts: { waitUntil: string; timeout: number }) => Promise<void>
  waitForTimeout: (ms: number) => Promise<void>
  content: () => Promise<string>
}

interface PlaywrightResponse {
  url: () => string
  headers: () => Record<string, string>
  json: () => Promise<unknown>
}
