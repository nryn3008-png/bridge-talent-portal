import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { JobCard } from '@/components/jobs/job-card'
import { JobFilters } from '@/components/jobs/job-filters'
import { Pagination } from '@/components/ui/pagination'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Briefcase } from 'lucide-react'

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
    <div className="px-6 pt-6 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header — Bridge pattern: icon + title inline, subtitle below */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-[12px] bg-[#0038FF] flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-[18px] h-[18px] text-white" />
              </div>
              <h1 className="text-[18px] font-bold text-[#0D1531]">Job Board</h1>
            </div>
            <p className="text-[14px] text-[#81879C] tracking-[0.4px]">
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
              <Briefcase className="w-6 h-6 text-[#81879C]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#0D1531] mb-2">No jobs found</h3>
            <p className="text-[14px] text-[#81879C] mb-4">
              {hasAnyFilter
                ? 'Try adjusting your filters or search terms.'
                : 'No jobs have been posted yet. Check back soon!'}
            </p>
            {hasAnyFilter && (
              <Link href="/jobs" className="text-[14px] text-[#0038FF] hover:underline">
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
