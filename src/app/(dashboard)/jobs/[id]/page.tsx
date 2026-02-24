import { getSession } from '@/lib/auth/session'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JobApplyButton } from '@/components/jobs/job-apply-button'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!prisma) {
    return <div className="p-8 text-center text-muted-foreground">Database not configured</div>
  }

  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) notFound()

  // Increment view count (fire and forget)
  prisma.job.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  const salaryText =
    job.showSalary && job.salaryMin
      ? job.salaryMax
        ? `$${(job.salaryMin / 1000).toFixed(0)}k - $${(job.salaryMax / 1000).toFixed(0)}k`
        : `$${(job.salaryMin / 1000).toFixed(0)}k+`
      : null

  // Check if user already applied
  let hasApplied = false
  const talentProfile = await prisma.talentProfile.findUnique({
    where: { bridgeUserId: session.userId },
  })
  if (talentProfile) {
    const existing = await prisma.application.findUnique({
      where: { jobId_talentId: { jobId: id, talentId: talentProfile.id } },
    })
    hasApplied = !!existing
  }

  return (
    <div className="px-8 pt-6 pb-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/jobs"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l7 7m-7-7l7-7" /></svg>
          Back to jobs
        </Link>

        <Card className="card-elevated mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{job.companyDomain}</p>
                <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
                {job.location && (
                  <p className="text-muted-foreground mt-1">{job.location}</p>
                )}
              </div>
              {salaryText && (
                <span className="text-lg font-semibold text-green-600">{salaryText}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {job.workType && <Badge variant="secondary">{job.workType}</Badge>}
              {job.employmentType && <Badge variant="outline">{job.employmentType}</Badge>}
              {job.experienceLevel && <Badge variant="outline">{job.experienceLevel}</Badge>}
              {job.department && <Badge variant="outline">{job.department}</Badge>}
              {job.source !== 'manual' && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  via {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
                </Badge>
              )}
            </div>

            {job.skillsRequired.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {job.skillsRequired.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Posted{' '}
              {new Date(job.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              {' | '}
              {job.viewCount} view{job.viewCount !== 1 ? 's' : ''}
              {' | '}
              {job.applyCount} application{job.applyCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated mb-6">
          <CardHeader>
            <CardTitle>About the Role</CardTitle>
          </CardHeader>
          <CardContent>
            {/<[a-z][\s\S]*>/i.test(job.description) ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {job.description}
              </div>
            )}
          </CardContent>
        </Card>

        {job.requirements && (
          <Card className="card-elevated mb-6">
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              {/<[a-z][\s\S]*>/i.test(job.requirements) ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.requirements }}
                />
              ) : (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {job.requirements}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {job.status === 'active' && (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Apply</CardTitle>
            </CardHeader>
            <CardContent>
              {hasApplied ? (
                <p className="text-sm text-muted-foreground">
                  You have already applied to this position.
                </p>
              ) : (
                <JobApplyButton jobId={job.id} externalUrl={job.applyUrl} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
