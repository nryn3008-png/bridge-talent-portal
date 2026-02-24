import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { JobPostForm } from '@/components/jobs/job-post-form'

export default async function PostJobPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Only company, vc, and admin roles can post jobs
  if (!['company', 'vc', 'admin'].includes(session.role)) {
    redirect('/jobs')
  }

  const defaultDomain = session.networkDomains?.[0] || ''

  return (
    <div className="px-8 pt-6 pb-8">
      <div className="max-w-3xl mx-auto">
        <div className="page-header">
          <h1 className="text-3xl font-bold tracking-tight">Post a Job</h1>
          <p className="text-muted-foreground mt-1">
            Create a new job listing visible to the Bridge network
          </p>
        </div>

        <JobPostForm defaultDomain={defaultDomain} />
      </div>
    </div>
  )
}
