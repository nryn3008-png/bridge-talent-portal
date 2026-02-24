import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { PortfolioCompanyCard } from '@/components/portfolio/portfolio-company-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { prisma } from '@/lib/db/prisma'
import { SyncPortfolioJobsButton } from '@/components/portfolio/sync-portfolio-jobs-button'
import { VcDetailTabs } from '@/components/portfolio/vc-detail-tabs'
import { TalentCard } from '@/components/talent/talent-card'
import {
  buildTalentMatchArrays,
  countPortfolioTalent,
  fetchPortfolioTalent,
} from '@/lib/portfolio-talent-match'
import { Pagination } from '@/components/ui/pagination'
import { ArrowLeft, MapPin, Briefcase, Building2, Users } from 'lucide-react'
import Link from 'next/link'
import type { BridgeMember } from '@/lib/bridge-api/types'

interface PageProps {
  params: Promise<{ domain: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

const VALID_TABS = ['jobs', 'companies', 'talent'] as const
type Tab = (typeof VALID_TABS)[number]

export default async function VcDetailPage({ params, searchParams }: PageProps) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (!prisma) {
    return <div className="p-8 text-center text-[#81879C]">Database not configured</div>
  }

  const { domain } = await params
  const sParams = await searchParams
  const decodedDomain = decodeURIComponent(domain)
  const tab: Tab = VALID_TABS.includes(sParams.tab as Tab) ? (sParams.tab as Tab) : 'jobs'
  const page = Math.max(1, parseInt(sParams.page || '1'))

  // ── Core data (always needed) ──
  const vcRecord = await prisma.vcNetwork.findUnique({
    where: { domain: decodedDomain },
  })

  if (!vcRecord) notFound()

  const vc = {
    domain: vcRecord.domain,
    title: vcRecord.title,
    description: vcRecord.description,
    location: vcRecord.location,
    isVc: vcRecord.isVc,
    founders: vcRecord.founders,
    industries: vcRecord.industries,
    industriesInvestIn: (vcRecord.industriesInvestIn ?? {}) as Record<string, number>,
    investmentFocus: vcRecord.investmentFocus,
  }

  const companies = await prisma.portfolioCompany.findMany({
    where: { vcDomain: decodedDomain },
    orderBy: { domain: 'asc' },
  })

  const displayName = vc.title ?? decodedDomain
  const companyDomains = companies.map((c) => c.domain)
  const companyCount = companies.length

  // Top industries (for header section)
  const topIndustries = Object.entries(vc.industriesInvestIn)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  // ── Parallel count queries for all tab headers ──
  const { emailDomains, companyStems } = buildTalentMatchArrays(
    companyDomains,
    decodedDomain,
    vc.title
  )

  const [jobCount, talentCount] = await Promise.all([
    companyDomains.length > 0
      ? prisma.job.count({
          where: { companyDomain: { in: companyDomains }, status: 'active' },
        })
      : 0,
    countPortfolioTalent(prisma, emailDomains, companyStems),
  ])

  // ── Active tab data ──
  const defaultPerPage = tab === 'jobs' ? 18 : 24
  const perPage = Math.min(50, Math.max(1, parseInt(sParams.per_page || String(defaultPerPage))))

  let jobsData: Array<{
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
  let jobsTotalPages = 0

  let pagedCompanies: typeof companies = []
  let companiesTotalPages = 0
  let jobCountsByDomain: Record<string, number> = {}

  let talentMembers: BridgeMember[] = []
  let talentTotalPages = 0

  if (tab === 'jobs') {
    if (companyDomains.length > 0) {
      jobsData = await prisma.job.findMany({
        where: { companyDomain: { in: companyDomains }, status: 'active' },
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
        skip: (page - 1) * perPage,
        take: perPage,
      })
    }
    jobsTotalPages = Math.ceil(jobCount / perPage)
  } else if (tab === 'companies') {
    companiesTotalPages = Math.ceil(companyCount / perPage)
    pagedCompanies = companies.slice((page - 1) * perPage, page * perPage)

    // Get job counts for current page's companies only
    if (pagedCompanies.length > 0) {
      const pagedDomains = pagedCompanies.map((c) => c.domain)
      const grouped = await prisma.job.groupBy({
        by: ['companyDomain'],
        where: { companyDomain: { in: pagedDomains }, status: 'active' },
        _count: { id: true },
      })
      jobCountsByDomain = Object.fromEntries(grouped.map((g) => [g.companyDomain, g._count.id]))
    }
  } else if (tab === 'talent') {
    const result = await fetchPortfolioTalent(
      prisma,
      emailDomains,
      companyStems,
      page,
      perPage
    )
    talentTotalPages = Math.ceil(result.total / perPage)
    talentMembers = result.profiles.map(
      (p): BridgeMember => ({
        id: p.bridgeUserId,
        sid: 0,
        first_name: p.firstName ?? '',
        last_name: p.lastName ?? '',
        email: p.email ?? undefined,
        profile_pic_url: p.profilePicUrl ?? undefined,
        position: p.position ?? undefined,
        company: p.company ?? undefined,
        location: p.location ?? undefined,
        bio: p.bio ?? undefined,
        linkedin_profile_url: p.linkedinUrl ?? undefined,
        is_super_connector: p.isSuperConnector,
        icp_roles: p.openToRoles,
        icp_industries: p.skills,
      })
    )
  }

  const totalPages =
    tab === 'jobs' ? jobsTotalPages : tab === 'companies' ? companiesTotalPages : talentTotalPages

  const portfolioExtraParams: Record<string, string> = { tab }

  return (
    <div className="px-6 pt-6 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Back */}
        <Link
          href="/portfolio"
          className="text-[13px] text-[#81879C] hover:text-[#0D1531] mb-4 inline-flex items-center gap-1.5 transition-colors duration-150"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Portfolio
        </Link>

        {/* VC Header */}
        <Card className="card-elevated mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-5">
              <VcHeaderLogo domain={decodedDomain} title={vc.title} />
              <div className="flex-1">
                <h1 className="text-[22px] font-bold text-[#0D1531]">{displayName}</h1>
                {vc.location && (
                  <p className="text-[13px] text-[#676C7E] mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {vc.location}
                  </p>
                )}
                <p className="text-[13px] text-[#81879C] mt-0.5">
                  {companyCount} portfolio {companyCount === 1 ? 'company' : 'companies'}
                  {jobCount > 0 && ` · ${jobCount} open ${jobCount === 1 ? 'job' : 'jobs'}`}
                </p>
              </div>
            </div>

            {vc.description && (
              <p className="text-[14px] text-[#676C7E] mt-4 leading-relaxed">{vc.description}</p>
            )}

            {vc.founders.length > 0 && (
              <div className="mt-4">
                <p className="text-[12px] font-medium text-[#81879C] uppercase tracking-wide mb-1">
                  Founders
                </p>
                <p className="text-[14px] text-[#0D1531]">{vc.founders.join(', ')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Industries they invest in */}
        {topIndustries.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[12px] font-medium text-[#81879C] uppercase tracking-wide mb-2">
              Top Investment Industries
            </h2>
            <div className="flex flex-wrap gap-2">
              {topIndustries.map(([industry, count]) => (
                <Badge key={industry} variant="default">
                  {industry} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <VcDetailTabs
          vcDomain={decodedDomain}
          activeTab={tab}
          jobCount={jobCount}
          companyCount={companyCount}
          talentCount={talentCount}
        />

        {/* ═══ Jobs Tab ═══ */}
        {tab === 'jobs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] text-[#81879C]">
                {jobCount > 0
                  ? `${jobCount} open ${jobCount === 1 ? 'position' : 'positions'} across portfolio companies`
                  : 'Discover open positions from portfolio companies'}
              </p>
              <SyncPortfolioJobsButton vcDomain={decodedDomain} role={session.role} />
            </div>

            {jobsData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {jobsData.map((job) => (
                  <Card
                    key={job.id}
                    className="card-elevated group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <JobCompanyFavicon domain={job.companyDomain} />
                        <span className="text-[12px] text-[#81879C]">{job.companyDomain}</span>
                      </div>
                      <Link href={`/jobs/${job.id}`} className="hover:underline">
                        <h3 className="font-semibold text-[13px] text-[#0D1531] group-hover:text-[#0038FF] transition-colors duration-150 leading-snug">
                          {job.title}
                        </h3>
                      </Link>
                      {job.location && (
                        <p className="text-[12px] text-[#676C7E] mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span>{job.location}{job.workType === 'remote' && ' (Remote)'}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.workType && (
                          <Badge variant="default">
                            {job.workType === 'remote'
                              ? 'Remote'
                              : job.workType === 'hybrid'
                                ? 'Hybrid'
                                : 'On-site'}
                          </Badge>
                        )}
                        {job.source !== 'manual' && (
                          <Badge variant="info">
                            via {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 pt-2 border-t border-[#ECEDF0] flex items-center justify-between">
                        <span className="text-[12px] text-[#81879C]">
                          {new Date(job.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-[13px] font-semibold text-[#0038FF] hover:text-[#0036D7] transition-colors duration-150"
                        >
                          View & Apply &rarr;
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Briefcase className="w-6 h-6 text-[#81879C]" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#0D1531] mb-2">No jobs found yet</h3>
                <p className="text-[14px] text-[#81879C]">
                  Click &quot;Sync Portfolio Jobs&quot; to discover open positions from portfolio companies.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ Companies Tab ═══ */}
        {tab === 'companies' && (
          <div>
            {companyCount === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Building2 className="w-6 h-6 text-[#81879C]" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#0D1531] mb-2">No portfolio companies</h3>
                <p className="text-[14px] text-[#81879C]">
                  This VC network doesn&apos;t have any portfolio companies listed yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-stagger">
                {pagedCompanies.map((company) => (
                  <PortfolioCompanyCard
                    key={company.id}
                    domain={company.domain}
                    description={company.description}
                    industries={company.industries}
                    status={company.status}
                    funded={company.funded}
                    investDate={company.investDate}
                    jobCount={jobCountsByDomain[company.domain] ?? 0}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Talent Tab ═══ */}
        {tab === 'talent' && (
          <div>
            {talentMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-stagger">
                {talentMembers.map((member) => (
                  <TalentCard key={member.id} member={member} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Users className="w-6 h-6 text-[#81879C]" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#0D1531] mb-2">No talent found</h3>
                <p className="text-[14px] text-[#81879C]">
                  No Bridge members matched to this VC network or its portfolio companies yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        <Pagination page={page} totalPages={totalPages} perPage={perPage} basePath={`/portfolio/${encodeURIComponent(decodedDomain)}`} extraParams={portfolioExtraParams} />
      </div>
    </div>
  )
}

// Server-rendered favicon with CSS initials fallback (Google Favicon API)
function VcHeaderLogo({ domain, title }: { domain: string; title: string | null }) {
  const initial = (title ?? domain)[0].toUpperCase()

  return (
    <div className="relative flex-shrink-0 w-16 h-16 rounded-xl bg-[#F2F3F5] flex items-center justify-center overflow-hidden">
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-[#81879C]">
        {initial}
      </span>
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        width={36}
        height={36}
        className="rounded-sm relative z-10"
      />
    </div>
  )
}

// Small favicon for inline job cards
function JobCompanyFavicon({ domain }: { domain: string }) {
  return (
    <div className="relative flex-shrink-0 w-5 h-5 rounded bg-[#F2F3F5] flex items-center justify-center overflow-hidden">
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-[#81879C]">
        {domain.charAt(0).toUpperCase()}
      </span>
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        alt=""
        width={14}
        height={14}
        className="rounded-sm relative z-10"
      />
    </div>
  )
}
