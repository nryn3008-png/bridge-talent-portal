// Workable public widget API client
// Endpoint: GET https://apply.workable.com/api/v1/widget/accounts/{accountSlug}/
// No authentication required (public API)

export interface WorkableWidgetResponse {
  jobs: WorkableJob[]
  total: number
}

export interface WorkableJob {
  shortcode: string
  title: string
  department: string
  url: string
  application_url: string
  shortlink: string
  location: {
    city: string
    country: string
    country_code: string
    region: string
    region_code: string
    telecommuting: boolean
  }
  created_at: string
}

export async function fetchWorkableJobs(accountSlug: string): Promise<WorkableJob[]> {
  const url = `https://apply.workable.com/api/v1/widget/accounts/${accountSlug}/`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Workable API error ${response.status} for account ${accountSlug}`)
  }

  const data: WorkableWidgetResponse = await response.json()
  return data.jobs ?? []
}

export function mapWorkableJobToJobData(workableJob: WorkableJob, companyDomain: string) {
  const locationParts = [
    workableJob.location?.city,
    workableJob.location?.region,
    workableJob.location?.country,
  ].filter(Boolean)

  const workType = workableJob.location?.telecommuting ? 'remote' : 'onsite'

  return {
    title: workableJob.title,
    description: `Apply for ${workableJob.title} at ${companyDomain}. View full details and apply at the link below.`,
    department: workableJob.department || null,
    location: locationParts.join(', ') || null,
    workType,
    employmentType: 'full_time' as const,
    applyUrl: workableJob.url || workableJob.application_url,
    companyDomain,
    postedBy: 'system-job-sync',
    source: 'workable',
    status: 'active',
    visibility: 'network',
    externalId: `workable:${workableJob.shortcode}`,
  }
}
