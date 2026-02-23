import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { fetchVcDetails, fetchPortfolioCompanies } from '@/lib/bridge-api/portfolio'
import { PortfolioCompanyCard } from '@/components/portfolio/portfolio-company-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { prisma } from '@/lib/db/prisma'
import { SyncPortfolioJobsButton } from '@/components/portfolio/sync-portfolio-jobs-button'
import Image from 'next/image'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ domain: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function VcDetailPage({ params, searchParams }: PageProps) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const { domain } = await params
  const sParams = await searchParams
  const decodedDomain = decodeURIComponent(domain)
  const page = Math.max(1, parseInt(sParams.page || '1'))
  const perPage = 24

  let vc
  let companies

  try {
    ;[vc, companies] = await Promise.all([
      fetchVcDetails(decodedDomain),
      fetchPortfolioCompanies(decodedDomain),
    ])
  } catch (err) {
    console.error(`[portfolio/${decodedDomain}] Failed to fetch:`, err)
    notFound()
  }

  const displayName = vc.title ?? decodedDomain
  const totalCompanies = companies.length
  const totalPages = Math.ceil(totalCompanies / perPage)
  const pagedCompanies = companies.slice((page - 1) * perPage, page * perPage)

  // Top industries they invest in (sorted by count)
  const topIndustries = Object.entries(vc.industriesInvestIn)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  // Fetch jobs from portfolio companies that are in our DB
  const companyDomains = companies.map((c) => c.domain)
  let portfolioJobs: Array<{
    id: string
    title: string
    companyDomain: string
    location: string | null
    workType: string | null
    employmentType: string | null
    source: string
    createdAt: Date
    applyUrl: string | null
  }> = []

  if (prisma && companyDomains.length > 0) {
    portfolioJobs = await prisma.job.findMany({
      where: {
        companyDomain: { in: companyDomains },
        status: 'active',
      },
      select: {
        id: true,
        title: true,
        companyDomain: true,
        location: true,
        workType: true,
        employmentType: true,
        source: true,
        createdAt: true,
        applyUrl: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }

  const buildUrl = (p: number) => `/portfolio/${encodeURIComponent(decodedDomain)}?page=${p}`

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back */}
        <Link href="/portfolio" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
          ← Back to Portfolio
        </Link>

        {/* VC Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-5">
              <VcHeaderLogo domain={decodedDomain} title={vc.title} />
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {vc.location && (
                  <p className="text-sm text-muted-foreground mt-0.5">📍 {vc.location}</p>
                )}
                <p className="text-sm text-muted-foreground mt-0.5">
                  {totalCompanies} portfolio {totalCompanies === 1 ? 'company' : 'companies'}
                  {portfolioJobs.length > 0 && ` · ${portfolioJobs.length}+ open jobs`}
                </p>
              </div>
            </div>

            {vc.description && (
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{vc.description}</p>
            )}

            {/* Founders */}
            {vc.founders.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Founders</p>
                <p className="text-sm">{vc.founders.join(', ')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Industries they invest in */}
        {topIndustries.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Top Investment Industries
            </h2>
            <div className="flex flex-wrap gap-2">
              {topIndustries.map(([industry, count]) => (
                <Badge key={industry} variant="secondary" className="text-xs">
                  {industry} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Jobs from portfolio companies */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Open Jobs in Portfolio Companies</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {portfolioJobs.length > 0
                  ? `Found ${portfolioJobs.length}+ jobs across portfolio companies`
                  : 'Discover open positions from portfolio companies'}
              </p>
            </div>
            <SyncPortfolioJobsButton vcDomain={decodedDomain} role={session.role} />
          </div>

          {portfolioJobs.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {portfolioJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow border border-gray-200 rounded-lg">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{job.companyDomain}</p>
                      <Link href={`/jobs/${job.id}`} className="hover:underline">
                        <h3 className="font-semibold text-sm text-gray-900 leading-snug">{job.title}</h3>
                      </Link>
                      {job.location && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {job.location}
                          {job.workType === 'remote' && ' (Remote)'}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.workType && (
                          <Badge variant="secondary" className="text-xs">
                            {job.workType === 'remote' ? 'Remote' : job.workType === 'hybrid' ? 'Hybrid' : 'On-site'}
                          </Badge>
                        )}
                        {job.source !== 'manual' && (
                          <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            via {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <Link href={`/jobs/${job.id}`} className="text-xs font-medium text-primary hover:underline">
                          View & Apply →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-3 text-center">
                <Link href="/jobs" className="text-sm font-medium text-primary hover:underline">
                  View all jobs →
                </Link>
              </div>
            </>
          ) : (
            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No jobs found yet. Click &quot;Sync Portfolio Jobs&quot; to discover open positions from portfolio companies using Workable.
              </p>
            </div>
          )}
        </div>

        {/* Portfolio companies grid */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Portfolio Companies</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCompanies} {totalCompanies === 1 ? 'company' : 'companies'}
          </p>
        </div>

        {totalCompanies === 0 ? (
          <div className="text-center py-16 max-w-lg mx-auto">
            <h3 className="text-lg font-semibold mb-2">No portfolio companies</h3>
            <p className="text-sm text-muted-foreground">
              This VC network doesn&apos;t have any portfolio companies listed yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pagedCompanies.map((company) => (
              <PortfolioCompanyCard
                key={company.id}
                domain={company.domain}
                description={company.description}
                industries={company.industries}
                status={company.status}
                funded={company.funded}
                investDate={company.investDate}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            {page > 1 && (
              <a
                href={buildUrl(page - 1)}
                className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
              >
                Previous
              </a>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={buildUrl(page + 1)}
                className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
              >
                Next
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Server-rendered logo with img tag (no onError needed — uses CSS fallback)
function VcHeaderLogo({ domain, title }: { domain: string; title: string | null }) {
  const initial = (title ?? domain)[0].toUpperCase()

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <Image
        src={`https://logo.clearbit.com/${domain}`}
        alt={`${title ?? domain} logo`}
        width={64}
        height={64}
        className="w-16 h-16 rounded-xl object-contain bg-white border border-gray-100"
        unoptimized
      />
      {/* Fallback shown behind image if it fails to load */}
      <div className="absolute inset-0 -z-10 w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
        <span className="text-primary font-bold text-2xl">{initial}</span>
      </div>
    </div>
  )
}
