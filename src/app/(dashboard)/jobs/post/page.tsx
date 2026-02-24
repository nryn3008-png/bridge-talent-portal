import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { JobPostForm } from '@/components/jobs/job-post-form'
import { PenSquare } from 'lucide-react'

export default async function PostJobPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Only company, vc, and admin roles can post jobs
  if (!['company', 'vc', 'admin'].includes(session.role)) {
    redirect('/jobs')
  }

  const defaultDomain = session.networkDomains?.[0] || ''

  return (
    <div className="px-6 pt-6 pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Header — Bridge pattern: icon + title inline, subtitle below */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-[12px] bg-[#0038FF] flex items-center justify-center flex-shrink-0">
              <PenSquare className="w-[18px] h-[18px] text-white" />
            </div>
            <h1 className="text-[18px] font-bold text-[#0D1531]">Post a Job</h1>
          </div>
          <p className="text-[14px] text-[#81879C] tracking-[0.4px]">
            Create a new job listing visible to the Bridge network
          </p>
        </div>

        <JobPostForm defaultDomain={defaultDomain} />
      </div>
    </div>
  )
}
