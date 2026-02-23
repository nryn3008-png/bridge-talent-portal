'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { useState } from 'react'

interface PortfolioCompanyCardProps {
  domain: string
  description: string | null
  industries: string[]
  status: string | null
  funded: number | null
  investDate: string | null
}

function CompanyLogo({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false)
  const initial = domain[0].toUpperCase()

  if (failed) {
    return (
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-primary font-bold text-lg">{initial}</span>
      </div>
    )
  }

  return (
    <Image
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${domain} logo`}
      width={40}
      height={40}
      className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-100 flex-shrink-0"
      onError={() => setFailed(true)}
      unoptimized
    />
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
