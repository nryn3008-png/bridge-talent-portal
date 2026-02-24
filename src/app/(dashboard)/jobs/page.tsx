import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { JobCard } from '@/components/jobs/job-card'
import { JobFilters } from '@/components/jobs/job-filters'
import { Pagination } from '@/components/ui/pagination'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function JobsPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await searchParams
  const query = params.q || ''
  const workType = params.work_type || ''
  const employmentType = params.employment_type || ''
  const experienceLevel = params.experience_level || ''
  const companyDomain = params.company || ''
  const vcDomain = params.vc || ''
  const page = Math.max(1, parseInt(params.page || '1'))
  const perPage = Math.min(50, Math.max(1, parseInt(params.per_page || '20')))

  // Read VC network names from local DB (fast, single query)
  const networkDomains = session.networkDomains ?? []
  let vcNetworks: Array<{ domain: string; name: string }> = []
  if (prisma && networkDomains.length > 0) {
    const vcs = await prisma.vcNetwork.findMany({
      where: { domain: { in: networkDomains } },
      select: { domain: true, title: true },
    })
    vcNetworks = vcs.map((vc) => ({
      domain: vc.domain,
      name: vc.title || vc.domain,
    }))
    // Add any domains not yet in DB (fallback to domain as name)
    const cachedDomains = new Set(vcs.map((v) => v.domain))
    for (const nd of networkDomains) {
      if (!cachedDomains.has(nd)) {
        vcNetworks.push({ domain: nd, name: nd })
      }
    }
  }

  // If filtering by VC, get that VC's portfolio company domains from local DB
  let vcCompanyDomains: string[] | null = null
  if (vcDomain && prisma) {
    const companies = await prisma.portfolioCompany.findMany({
      where: { vcDomain },
      select: { domain: true },
    })
    vcCompanyDomains = companies.map((c) => c.domain)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jobs: any[] = []
  let total = 0

  if (prisma) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: 'active',
      ...(query && {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { companyDomain: { contains: query, mode: 'insensitive' } },
        ],
      }),
      ...(workType && { workType }),
      ...(employmentType && { employmentType }),
      ...(experienceLevel && { experienceLevel }),
      ...(companyDomain && { companyDomain }),
      ...(vcCompanyDomains && { companyDomain: { in: vcCompanyDomains } }),
    }

    ;[jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.job.count({ where }),
    ])
  }

  const totalPages = Math.ceil(total / perPage)
  const canPost = ['company', 'vc', 'admin'].includes(session.role)

  const jobsExtraParams: Record<string, string> = {}
  if (query) jobsExtraParams.q = query
  if (workType) jobsExtraParams.work_type = workType
  if (employmentType) jobsExtraParams.employment_type = employmentType
  if (experienceLevel) jobsExtraParams.experience_level = experienceLevel
  if (vcDomain) jobsExtraParams.vc = vcDomain

  const hasAnyFilter = query || workType || employmentType || experienceLevel || vcDomain

  return (
    <div className="px-8 pt-6 pb-8">
      <div className="max-w-5xl mx-auto">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Board</h1>
            <p className="text-muted-foreground mt-1">
              {total > 0
                ? `${total} open position${total !== 1 ? 's' : ''} across Bridge portfolio companies`
                : 'Opportunities at Bridge portfolio companies'}
            </p>
          </div>
          {canPost && (
            <Link href="/jobs/post">
              <Button>Post a Job</Button>
            </Link>
          )}
        </div>

        <div className="mb-6">
          <JobFilters vcNetworks={vcNetworks} />
        </div>

        {jobs.length > 0 ? (
          <div className="grid gap-4 animate-stagger">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {hasAnyFilter
                ? 'Try adjusting your filters or search terms.'
                : 'No jobs have been posted yet. Check back soon!'}
            </p>
            {hasAnyFilter && (
              <Link href="/jobs" className="text-sm text-primary hover:underline">
                Clear all filters
              </Link>
            )}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} perPage={perPage} basePath="/jobs" extraParams={jobsExtraParams} />
      </div>
    </div>
  )
}
