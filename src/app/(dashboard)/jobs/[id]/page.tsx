import { getSession } from '@/lib/auth/session'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JobApplyButton } from '@/components/jobs/job-apply-button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!prisma) {
    return <div className="p-8 text-center text-[#81879C]">Database not configured</div>
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
  const existingApplication = await prisma.application.findUnique({
    where: { jobId_bridgeUserId: { jobId: id, bridgeUserId: session.userId } },
  })
  const hasApplied = !!existingApplication

  return (
    <div className="px-6 pt-6 pb-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/jobs"
          className="text-[13px] text-[#81879C] hover:text-[#0D1531] mb-4 inline-flex items-center gap-1.5 transition-colors duration-150"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to jobs
        </Link>

        <Card className="card-elevated mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[13px] text-[#81879C] mb-1">{job.companyDomain}</p>
                <h1 className="text-[22px] font-bold text-[#0D1531] tracking-tight">{job.title}</h1>
                {job.location && (
                  <p className="text-[14px] text-[#676C7E] mt-1">{job.location}</p>
                )}
              </div>
              {salaryText && (
                <span className="text-[16px] font-semibold text-[#0D7C47]">{salaryText}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {job.workType && <Badge variant="default">{job.workType}</Badge>}
              {job.employmentType && <Badge variant="default">{job.employmentType}</Badge>}
              {job.experienceLevel && <Badge variant="default">{job.experienceLevel}</Badge>}
              {job.department && <Badge variant="default">{job.department}</Badge>}
              {job.source !== 'manual' && (
                <Badge variant="info">
                  via {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
                </Badge>
              )}
            </div>

            {job.skillsRequired.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {job.skillsRequired.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-[#F2F3F5] text-[#676C7E] text-[12px] rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <p className="text-[13px] text-[#81879C]">
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
          <CardContent className="pt-6">
            <h2 className="text-[16px] font-semibold text-[#0D1531] mb-4">About the Role</h2>
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
            <CardContent className="pt-6">
              <h2 className="text-[16px] font-semibold text-[#0D1531] mb-4">Requirements</h2>
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
            <CardContent className="pt-6">
              <h2 className="text-[16px] font-semibold text-[#0D1531] mb-4">Apply</h2>
              {hasApplied ? (
                <p className="text-[14px] text-[#81879C]">
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
