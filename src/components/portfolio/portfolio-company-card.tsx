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
    <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
      <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-gray-400">
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
    <Card className="hover:shadow-md transition-shadow border border-gray-200 rounded-lg">
      <CardContent className="p-5">
        {/* Header with logo + name */}
        <div className="flex items-start gap-3 mb-2">
          <CompanyLogo domain={domain} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {name}
              </h3>
              {status && (
                <Badge
                  variant={status === 'exited' ? 'outline' : 'secondary'}
                  className={`text-xs ${status === 'live' ? 'bg-green-50 text-green-700 border-green-200' : ''}`}
                >
                  {status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{domain}</p>
            {jobCount !== undefined && jobCount > 0 && (
              <p className="text-xs text-green-600 font-medium">{jobCount} open {jobCount === 1 ? 'job' : 'jobs'}</p>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{description}</p>
        )}

        {/* Industry tags */}
        {industries.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {industries.slice(0, 3).map((ind) => (
              <Badge key={ind} variant="outline" className="text-xs">
                {ind}
              </Badge>
            ))}
            {industries.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{industries.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Action */}
        <div className="pt-3 border-t border-gray-100">
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            Visit Website →
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
