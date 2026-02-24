import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { VcCard } from '@/components/portfolio/vc-card'
import { SyncPortfolioJobsButton } from '@/components/portfolio/sync-portfolio-jobs-button'
import { Building2 } from 'lucide-react'

export default async function PortfolioPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const domains = session.networkDomains ?? []

  if (domains.length === 0) {
    return (
      <div className="px-6 pt-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header — Bridge pattern */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-[12px] bg-[#0038FF] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-[18px] h-[18px] text-white" />
              </div>
              <h1 className="text-[18px] font-bold text-[#0D1531]">Portfolio</h1>
            </div>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon">
              <Building2 className="w-6 h-6 text-[#81879C]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#0D1531] mb-2">No VC networks found</h3>
            <p className="text-[14px] text-[#81879C]">
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
    <div className="px-6 pt-6 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header — Bridge pattern: icon + title inline, subtitle below */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-[12px] bg-[#0038FF] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-[18px] h-[18px] text-white" />
              </div>
              <h1 className="text-[18px] font-bold text-[#0D1531]">Portfolio</h1>
            </div>
            <p className="text-[14px] text-[#81879C] tracking-[0.4px]">
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
              <Building2 className="w-6 h-6 text-[#81879C]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#0D1531] mb-2">No VC networks available</h3>
            <p className="text-[14px] text-[#81879C]">
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
