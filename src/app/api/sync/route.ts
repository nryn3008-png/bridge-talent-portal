import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { bulkSyncBridgeMembers, deltaSyncBridgeMembers } from '@/lib/sync/profile-sync'
import { syncJobsFromAts, syncJobsFromPortfolioCompanies } from '@/lib/sync/job-sync'
import { syncPortfolioData } from '@/lib/sync/portfolio-sync'
import { prisma } from '@/lib/db/prisma'

// POST /api/sync — trigger a sync (admin/vc only)
// Body: { type?: "profiles" | "jobs" | "portfolio_jobs" | "portfolio", mode?: "bulk" | "delta", vcDomain?: string }
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

    if (type === 'portfolio') {
      // Sync VC network details + portfolio companies to local DB
      const vcDomainsStr = process.env.PORTFOLIO_VC_DOMAINS ?? ''
      const envDomains = vcDomainsStr.split(',').map((d) => d.trim()).filter(Boolean)
      const sessionDomains = session.networkDomains ?? []
      const allDomains = [...new Set([...envDomains, ...sessionDomains])]

      if (allDomains.length === 0) {
        return NextResponse.json({ error: 'No VC domains configured or in session' }, { status: 400 })
      }

      const result = await syncPortfolioData(allDomains)
      return NextResponse.json({ success: true, type: 'portfolio', ...result })
    }

    if (type === 'portfolio_jobs') {
      // Sync jobs by auto-discovering ATS accounts from portfolio companies
      // Read from cached portfolio companies in DB (fast) instead of Bridge API
      const domains: string[] = []

      if (prisma) {
        if (vcDomain) {
          const companies = await prisma.portfolioCompany.findMany({
            where: { vcDomain },
            select: { domain: true },
          })
          domains.push(...companies.map((c) => c.domain))
        } else {
          const networkDomains = session.networkDomains ?? []
          if (networkDomains.length > 0) {
            const companies = await prisma.portfolioCompany.findMany({
              where: { vcDomain: { in: networkDomains } },
              select: { domain: true },
            })
            domains.push(...companies.map((c) => c.domain))
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
