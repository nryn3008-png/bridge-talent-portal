import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Users } from 'lucide-react'
import Link from 'next/link'

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}

interface JobCardJob {
  id: string
  title: string
  companyDomain: string
  description: string
  workType: string | null
  employmentType: string | null
  experienceLevel: string | null
  location: string | null
  salaryMin: number | null
  salaryMax: number | null
  showSalary: boolean
  skillsRequired: string[]
  source?: string
  createdAt: Date
}

interface JobCardProps {
  job: JobCardJob
  matchScore?: number        // 0-100 AI match score
  connectionsCount?: number  // mutual connections at company
  showApplyButton?: boolean
}

function MatchScoreBadge({ score }: { score: number }) {
  if (score >= 80) {
    return <Badge variant="success">{score}% Match</Badge>
  }
  if (score >= 50) {
    return <Badge variant="warning">{score}% Match</Badge>
  }
  return <Badge variant="default">{score}% Match</Badge>
}

function CompanyFavicon({ domain }: { domain: string }) {
  return (
    <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-[#F2F3F5] flex items-center justify-center overflow-hidden">
      {/* Initials fallback (rendered behind favicon) */}
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-[#81879C]">
        {domain.charAt(0).toUpperCase()}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        width={22}
        height={22}
        className="rounded-sm relative z-10"
      />
    </div>
  )
}

export function JobCard({ job, matchScore, connectionsCount, showApplyButton = true }: JobCardProps) {
  const salaryText =
    job.showSalary && job.salaryMin
      ? job.salaryMax
        ? `$${(job.salaryMin / 1000).toFixed(0)}k–$${(job.salaryMax / 1000).toFixed(0)}k`
        : `$${(job.salaryMin / 1000).toFixed(0)}k+`
      : null

  // Strip HTML tags for preview text
  const previewText = job.description.replace(/<[^>]*>/g, '').slice(0, 160)

  return (
    <Card className="card-elevated group">
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <CompanyFavicon domain={job.companyDomain} />
          <div className="flex-1 min-w-0">
            {/* Company domain */}
            <p className="text-[12px] text-[#81879C] mb-0.5">{job.companyDomain}</p>
            {/* Title */}
            <Link href={`/jobs/${job.id}`} className="hover:underline">
              <h3 className="font-semibold text-[14px] text-[#0D1531] group-hover:text-[#0038FF] transition-colors duration-150 leading-snug">{job.title}</h3>
            </Link>
            {/* Location */}
            {job.location && (
              <p className="text-[12px] text-[#676C7E] mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{job.location}{job.workType === 'remote' && ' (Remote)'}</span>
              </p>
            )}
          </div>
          {/* Salary */}
          {salaryText && (
            <span className="text-[13px] font-medium text-[#0D7C47] whitespace-nowrap">
              {salaryText}
            </span>
          )}
        </div>

        {/* Description preview */}
        <p className="text-[13px] text-[#676C7E] line-clamp-2 mb-3">{previewText}</p>

        {/* Skill tags */}
        {job.skillsRequired.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.skillsRequired.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 bg-[#F2F3F5] text-[#676C7E] text-[12px] rounded-full"
              >
                {skill}
              </span>
            ))}
            {job.skillsRequired.length > 4 && (
              <span className="text-[12px] text-[#81879C] py-1">
                +{job.skillsRequired.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Type badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.workType && (
            <Badge variant="default">
              {WORK_TYPE_LABELS[job.workType] ?? job.workType}
            </Badge>
          )}
          {job.employmentType && (
            <Badge variant="default">
              {EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType}
            </Badge>
          )}
          {job.experienceLevel && (
            <Badge variant="default" className="capitalize">
              {job.experienceLevel}
            </Badge>
          )}
          {job.source && job.source !== 'manual' && (
            <Badge variant="info">
              via {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
            </Badge>
          )}
        </div>

        {/* Match score + connections row */}
        {(matchScore !== undefined || connectionsCount !== undefined) && (
          <div className="flex items-center gap-3 mb-3">
            {matchScore !== undefined && <MatchScoreBadge score={matchScore} />}
            {connectionsCount !== undefined && connectionsCount > 0 && (
              <span className="text-[12px] text-[#676C7E] inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {connectionsCount} connection{connectionsCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#ECEDF0]">
          <span className="text-[12px] text-[#81879C]">
            {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {showApplyButton && (
            <Link
              href={`/jobs/${job.id}`}
              className="text-[13px] font-semibold text-[#0038FF] hover:text-[#0036D7] transition-colors duration-150"
            >
              View & Apply <span className="inline-block group-hover:translate-x-0.5 transition-transform duration-150">&rarr;</span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
