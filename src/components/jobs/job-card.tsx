import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
    return (
      <span className="match-high text-xs font-semibold px-2 py-0.5 rounded-full">
        🟢 {score}% Match
      </span>
    )
  }
  if (score >= 50) {
    return (
      <span className="match-medium text-xs font-semibold px-2 py-0.5 rounded-full">
        🟡 {score}% Match
      </span>
    )
  }
  return (
    <span className="match-low text-xs font-semibold px-2 py-0.5 rounded-full">
      ⚪ {score}% Match
    </span>
  )
}

function CompanyFavicon({ domain }: { domain: string }) {
  return (
    <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center overflow-hidden">
      {/* Initials fallback (rendered behind favicon) */}
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-muted-foreground">
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
    <Card className="card-elevated group rounded-lg">
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <CompanyFavicon domain={job.companyDomain} />
          <div className="flex-1 min-w-0">
            {/* Company domain */}
            <p className="text-xs text-muted-foreground mb-0.5">{job.companyDomain}</p>
            {/* Title */}
            <Link href={`/jobs/${job.id}`} className="hover:underline">
              <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors leading-snug">{job.title}</h3>
            </Link>
            {/* Location */}
            {job.location && (
              <p className="text-xs text-muted-foreground mt-0.5">
                📍 {job.location}
                {job.workType === 'remote' && ' (Remote)'}
              </p>
            )}
          </div>
          {/* Salary */}
          {salaryText && (
            <span className="text-sm font-medium text-green-600 whitespace-nowrap">
              {salaryText}
            </span>
          )}
        </div>

        {/* Description preview */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{previewText}</p>

        {/* Skill tags */}
        {job.skillsRequired.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.skillsRequired.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
            {job.skillsRequired.length > 4 && (
              <span className="text-xs text-muted-foreground py-1">
                +{job.skillsRequired.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Type badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.workType && (
            <Badge variant="secondary" className="text-xs">
              {WORK_TYPE_LABELS[job.workType] ?? job.workType}
            </Badge>
          )}
          {job.employmentType && (
            <Badge variant="outline" className="text-xs">
              {EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType}
            </Badge>
          )}
          {job.experienceLevel && (
            <Badge variant="outline" className="text-xs capitalize">
              {job.experienceLevel}
            </Badge>
          )}
          {job.source && job.source !== 'manual' && (
            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              via {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
            </Badge>
          )}
        </div>

        {/* Match score + connections row */}
        {(matchScore !== undefined || connectionsCount !== undefined) && (
          <div className="flex items-center gap-3 mb-3">
            {matchScore !== undefined && <MatchScoreBadge score={matchScore} />}
            {connectionsCount !== undefined && connectionsCount > 0 && (
              <span className="text-xs text-muted-foreground">
                👥 {connectionsCount} connection{connectionsCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {showApplyButton && (
            <Link
              href={`/jobs/${job.id}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              View & Apply <span className="inline-block group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
