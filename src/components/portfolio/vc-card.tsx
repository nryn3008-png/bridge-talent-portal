import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface VcCardProps {
  domain: string
  title: string | null
  description: string | null
  industries: string[]
  location: string | null
  portfolioCount?: number
}

function VcLogo({ domain, title }: { domain: string; title: string | null }) {
  const initial = (title ?? domain)[0].toUpperCase()

  return (
    <div className="relative flex-shrink-0 w-12 h-12 rounded-lg bg-muted/60 flex items-center justify-center overflow-hidden">
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-muted-foreground">
        {initial}
      </span>
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        width={28}
        height={28}
        className="rounded-sm relative z-10"
      />
    </div>
  )
}

export function VcCard({ domain, title, description, industries, location, portfolioCount }: VcCardProps) {
  const displayName = title ?? domain.replace(/\.\w+$/, '')

  return (
    <Card className="card-elevated group rounded-lg">
      <CardContent className="p-5">
        {/* Header with logo + name */}
        <div className="flex items-start gap-3 mb-3">
          <VcLogo domain={domain} title={title} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
              {displayName}
            </h3>
            {location && (
              <p className="text-xs text-muted-foreground mt-0.5">📍 {location}</p>
            )}
            {portfolioCount !== undefined && portfolioCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {portfolioCount} portfolio {portfolioCount === 1 ? 'company' : 'companies'}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>
        )}

        {/* Industry tags */}
        {industries.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {industries.slice(0, 3).map((ind) => (
              <Badge key={ind} variant="secondary" className="text-xs">
                {ind}
              </Badge>
            ))}
            {industries.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{industries.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Action */}
        <div className="pt-3 border-t border-border/50">
          <Link
            href={`/portfolio/${encodeURIComponent(domain)}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View Portfolio <span className="inline-block group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
