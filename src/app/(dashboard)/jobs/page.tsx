import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { JobCard } from '@/components/jobs/job-card'
import { JobFilters } from '@/components/jobs/job-filters'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { fetchPortfolioCompanies } from '@/lib/bridge-api/portfolio'
import { fetchVcDetails } from '@/lib/bridge-api/portfolio'

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
  const perPage = 20

  // Fetch VC network names for the filter dropdown
  const networkDomains = session.networkDomains ?? []
  const vcNetworks: Array<{ domain: string; name: string }> = []
  for (const nd of networkDomains) {
    try {
      const details = await fetchVcDetails(nd)
      vcNetworks.push({ domain: nd, name: details.title || nd })
    } catch {
      vcNetworks.push({ domain: nd, name: nd })
    }
  }

  // If filtering by VC, get that VC's portfolio company domains
  let vcCompanyDomains: string[] | null = null
  if (vcDomain) {
    try {
      const companies = await fetchPortfolioCompanies(vcDomain)
      vcCompanyDomains = companies.map((c) => c.domain)
    } catch {
      vcCompanyDomains = []
    }
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

  const buildUrl = (p: number) => {
    const parts = [`/jobs?page=${p}`]
    if (query) parts.push(`q=${encodeURIComponent(query)}`)
    if (workType) parts.push(`work_type=${workType}`)
    if (employmentType) parts.push(`employment_type=${employmentType}`)
    if (experienceLevel) parts.push(`experience_level=${experienceLevel}`)
    if (vcDomain) parts.push(`vc=${encodeURIComponent(vcDomain)}`)
    return parts.join('&')
  }

  const hasAnyFilter = query || workType || employmentType || experienceLevel || vcDomain

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Job Board</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
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
          <div className="grid gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
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
