import { NextResponse } from 'next/server'
import { deltaSyncBridgeMembers } from '@/lib/sync/profile-sync'
import { syncJobsFromCache, discoverNewAtsAccounts } from '@/lib/sync/job-sync'
import { fetchPortfolioCompanies } from '@/lib/bridge-api/portfolio'

// GET /api/cron?type=profiles|jobs|discovery
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
  const type = searchParams.get('type') ?? 'profiles'

  try {
    switch (type) {
      // ── Profile Delta Sync ───────────────────────────────────────────
      case 'profiles': {
        console.log('[cron] Starting profile delta sync...')
        const result = await deltaSyncBridgeMembers()
        return NextResponse.json({ success: true, type: 'profiles', ...result })
      }

      // ── Job Refresh from Cached ATS Accounts ────────────────────────
      case 'jobs': {
        console.log('[cron] Starting job refresh from cached ATS accounts...')
        const result = await syncJobsFromCache()
        return NextResponse.json({ success: true, type: 'jobs', ...result })
      }

      // ── ATS Discovery (find new ATS accounts) ──────────────────────
      case 'discovery': {
        console.log('[cron] Starting ATS discovery for portfolio companies...')

        // Get portfolio company domains from configured VC networks
        const vcDomainsStr = process.env.PORTFOLIO_VC_DOMAINS ?? ''
        const vcDomains = vcDomainsStr.split(',').map((d) => d.trim()).filter(Boolean)

        if (vcDomains.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'PORTFOLIO_VC_DOMAINS not configured. Set it to a comma-separated list of VC domains.',
          }, { status: 400 })
        }

        // Collect all portfolio company domains from all VCs
        const allDomains: string[] = []
        for (const vcDomain of vcDomains) {
          try {
            const companies = await fetchPortfolioCompanies(vcDomain)
            allDomains.push(...companies.map((c) => c.domain))
          } catch (err) {
            console.error(`[cron] Failed to fetch portfolio for ${vcDomain}:`, err)
          }
        }

        const uniqueDomains = [...new Set(allDomains)]
        console.log(`[cron] Collected ${uniqueDomains.length} unique portfolio company domains from ${vcDomains.length} VCs`)

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
