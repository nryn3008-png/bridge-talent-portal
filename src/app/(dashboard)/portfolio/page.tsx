import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { VcCard } from '@/components/portfolio/vc-card'
import { SyncPortfolioJobsButton } from '@/components/portfolio/sync-portfolio-jobs-button'

export default async function PortfolioPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const domains = session.networkDomains ?? []

  if (domains.length === 0) {
    return (
      <div className="px-8 pt-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="page-header">
            <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No VC networks found</h3>
            <p className="text-sm text-muted-foreground">
              Your account is not connected to any VC networks. Portfolio data will appear here once you join a network.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Read VC networks + portfolio counts from local DB (fast, single query)
  const vcRecords = prisma
    ? await prisma.vcNetwork.findMany({
        where: { domain: { in: domains }, isVc: true },
        include: { _count: { select: { portfolioCompanies: true } } },
      })
    : []

  const vcs = vcRecords.map((vc) => ({
    domain: vc.domain,
    title: vc.title,
    description: vc.description,
    industries: vc.industries,
    location: vc.location,
    portfolioCount: vc._count.portfolioCompanies,
  }))

  return (
    <div className="px-8 pt-6 pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="page-header flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
            <p className="text-muted-foreground mt-1">
              {vcs.length > 0
                ? `${vcs.length} VC network${vcs.length !== 1 ? 's' : ''} in your Bridge account`
                : 'VC networks and their portfolio companies'}
            </p>
          </div>
          {vcs.length > 0 && (
            <SyncPortfolioJobsButton role={session.role} />
          )}
        </div>

        {vcs.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No VC networks available</h3>
            <p className="text-sm text-muted-foreground">
              Your connected networks don&apos;t have portfolio data yet. An admin can trigger a portfolio sync to populate this data.
            </p>
          </div>
        )}

        {vcs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
            {vcs.map((vc) => (
              <VcCard
                key={vc.domain}
                domain={vc.domain}
                title={vc.title}
                description={vc.description}
                industries={vc.industries}
                location={vc.location}
                portfolioCount={vc.portfolioCount}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
