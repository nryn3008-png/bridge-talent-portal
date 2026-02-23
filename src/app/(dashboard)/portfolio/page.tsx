import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { fetchVcDetails, fetchPortfolioCompanies } from '@/lib/bridge-api/portfolio'
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
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Portfolio</h1>
          <div className="text-center py-16 max-w-lg mx-auto">
            <h3 className="text-lg font-semibold mb-2">No VC networks found</h3>
            <p className="text-sm text-muted-foreground">
              Your account is not connected to any VC networks. Portfolio data will appear here once you join a network.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Fetch VC details + portfolio counts for all user networks in parallel
  const results = await Promise.allSettled(
    domains.map(async (domain) => {
      const [details, companies] = await Promise.all([
        fetchVcDetails(domain),
        fetchPortfolioCompanies(domain),
      ])
      return { details, portfolioCount: companies.length }
    }),
  )

  // Filter to only VC networks that loaded successfully
  const vcs = results
    .map((r, i) => {
      if (r.status === 'fulfilled' && r.value.details.isVc) {
        return { ...r.value.details, portfolioCount: r.value.portfolioCount }
      }
      // Fallback: show the domain even if API failed, but mark as VC
      if (r.status === 'rejected') {
        console.warn(`[portfolio] Failed to fetch details for ${domains[i]}:`, r.reason)
      }
      return null
    })
    .filter((vc): vc is NonNullable<typeof vc> => vc !== null)

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Portfolio</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
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
          <div className="text-center py-16 max-w-lg mx-auto">
            <h3 className="text-lg font-semibold mb-2">No VC networks available</h3>
            <p className="text-sm text-muted-foreground">
              Your connected networks don&apos;t have portfolio data yet.
            </p>
          </div>
        )}

        {vcs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
