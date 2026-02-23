import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { bulkSyncBridgeMembers, deltaSyncBridgeMembers } from '@/lib/sync/profile-sync'
import { syncJobsFromAts, syncJobsFromPortfolioCompanies } from '@/lib/sync/job-sync'
import { fetchPortfolioCompanies } from '@/lib/bridge-api/portfolio'

// POST /api/sync — trigger a sync (admin/vc only)
// Body: { type?: "profiles" | "jobs" | "portfolio_jobs", mode?: "bulk" | "delta", vcDomain?: string }
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !['vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { mode, type = 'profiles', vcDomain } = await request.json().catch(() => ({ mode: 'delta', type: 'profiles', vcDomain: undefined }))

  try {
    if (type === 'jobs') {
      const result = await syncJobsFromAts()
      return NextResponse.json({ success: true, type: 'jobs', ...result })
    }

    if (type === 'portfolio_jobs') {
      // Sync jobs by auto-discovering Workable accounts from portfolio companies
      const domains: string[] = []

      if (vcDomain) {
        // Sync jobs for a specific VC's portfolio companies
        const companies = await fetchPortfolioCompanies(vcDomain)
        domains.push(...companies.map((c) => c.domain))
      } else {
        // Sync jobs across all user's VC networks
        const networkDomains = session.networkDomains ?? []
        for (const nd of networkDomains) {
          try {
            const companies = await fetchPortfolioCompanies(nd)
            domains.push(...companies.map((c) => c.domain))
          } catch {
            // Skip networks that fail to load
          }
        }
      }

      const uniqueDomains = [...new Set(domains)]
      const result = await syncJobsFromPortfolioCompanies(uniqueDomains)
      return NextResponse.json({ success: true, type: 'portfolio_jobs', ...result })
    }

    // Default: profile sync
    const result = mode === 'bulk'
      ? await bulkSyncBridgeMembers()
      : await deltaSyncBridgeMembers()

    return NextResponse.json({ success: true, type: 'profiles', ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    console.error('Sync error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
