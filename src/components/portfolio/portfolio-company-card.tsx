import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PortfolioCompanyCardProps {
  domain: string
  description: string | null
  industries: string[]
  status: string | null
  funded: number | null
  investDate: string | null
  jobCount?: number
}

function CompanyLogo({ domain }: { domain: string }) {
  const initial = domain[0].toUpperCase()

  return (
    <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-[#F2F3F5] flex items-center justify-center overflow-hidden">
      <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-[#81879C]">
        {initial}
      </span>
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        width={24}
        height={24}
        className="rounded-sm relative z-10"
      />
    </div>
  )
}

function formatCompanyName(domain: string): string {
  // "kaiahealth.com" → "Kaiahealth", "ultimate.ai" → "Ultimate"
  const name = domain.replace(/\.\w+$/, '')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function PortfolioCompanyCard({
  domain,
  description,
  industries,
  status,
  jobCount,
}: PortfolioCompanyCardProps) {
  const name = formatCompanyName(domain)

  return (
    <Card className="card-elevated group">
      <CardContent className="p-5">
        {/* Header with logo + name */}
        <div className="flex items-start gap-3 mb-2">
          <CompanyLogo domain={domain} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[13px] text-[#0D1531] truncate">
                {name}
              </h3>
              {status && (
                <Badge variant={status === 'live' ? 'success' : 'default'}>
                  {status}
                </Badge>
              )}
            </div>
            <p className="text-[12px] text-[#81879C] truncate">{domain}</p>
            {jobCount !== undefined && jobCount > 0 && (
              <p className="text-[12px] text-[#0D7C47] font-medium">{jobCount} open {jobCount === 1 ? 'job' : 'jobs'}</p>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-[12px] text-[#676C7E] line-clamp-2 mb-3">{description}</p>
        )}

        {/* Industry tags */}
        {industries.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {industries.slice(0, 3).map((ind) => (
              <Badge key={ind} variant="default">
                {ind}
              </Badge>
            ))}
            {industries.length > 3 && (
              <Badge variant="default">
                +{industries.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Action */}
        <div className="pt-3 border-t border-[#ECEDF0]">
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold text-[#0038FF] hover:text-[#0036D7] transition-colors duration-150 inline-flex items-center gap-1"
          >
            Visit Website
            <span className="inline-block group-hover:translate-x-0.5 transition-transform duration-150">&rarr;</span>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
