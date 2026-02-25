import { NextResponse } from 'next/server'
import { syncJobsFromCache, discoverNewAtsAccounts } from '@/lib/sync/job-sync'
import { syncPortfolioData } from '@/lib/sync/portfolio-sync'
import { prisma } from '@/lib/db/prisma'

// GET /api/cron?type=jobs|discovery|portfolio
// Called by Vercel Cron — authenticated via CRON_SECRET
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[cron] CRON_SECRET not configured')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (!type) {
    return NextResponse.json({ error: 'Missing required query param: type' }, { status: 400 })
  }

  try {
    switch (type) {
      // ── Job Refresh from Cached ATS Accounts ────────────────────────
      case 'jobs': {
        console.log('[cron] Starting job refresh from cached ATS accounts...')
        const result = await syncJobsFromCache()
        return NextResponse.json({ success: true, type: 'jobs', ...result })
      }

      // ── Portfolio Data Sync ───────────────────────────────────────────
      case 'portfolio': {
        console.log('[cron] Starting portfolio data sync...')

        const vcDomainsStr = process.env.PORTFOLIO_VC_DOMAINS ?? ''
        const vcDomains = vcDomainsStr.split(',').map((d) => d.trim()).filter(Boolean)

        if (vcDomains.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'PORTFOLIO_VC_DOMAINS not configured.',
          }, { status: 400 })
        }

        const result = await syncPortfolioData(vcDomains)
        return NextResponse.json({ success: true, type: 'portfolio', ...result })
      }

      // ── ATS Discovery (find new ATS accounts) ──────────────────────
      case 'discovery': {
        console.log('[cron] Starting ATS discovery for portfolio companies...')

        if (!prisma) {
          return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
        }

        // Read cached portfolio company domains from DB (fast, no Bridge API calls)
        const companies = await prisma.portfolioCompany.findMany({
          select: { domain: true },
        })
        const allDomains = companies.map((c) => c.domain)

        if (allDomains.length === 0) {
          // Fallback: if no portfolio data cached yet, log and skip
          return NextResponse.json({
            success: false,
            error: 'No portfolio companies cached. Run portfolio sync first: ?type=portfolio',
          }, { status: 400 })
        }

        const uniqueDomains = [...new Set(allDomains)]
        console.log(`[cron] ${uniqueDomains.length} unique portfolio company domains from cache`)

        // Discover new ATS accounts (limited to 150 per run to stay within timeout)
        const result = await discoverNewAtsAccounts(uniqueDomains, 150)
        return NextResponse.json({ success: true, type: 'discovery', ...result })
      }

      default:
        return NextResponse.json({ error: `Unknown cron type: ${type}` }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron job failed'
    console.error(`[cron] Error (type=${type}):`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
