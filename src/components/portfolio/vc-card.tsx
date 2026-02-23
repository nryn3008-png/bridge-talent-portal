'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

interface VcCardProps {
  domain: string
  title: string | null
  description: string | null
  industries: string[]
  location: string | null
  portfolioCount?: number
}

function VcLogo({ domain, title }: { domain: string; title: string | null }) {
  const [failed, setFailed] = useState(false)
  const initial = (title ?? domain)[0].toUpperCase()

  if (failed) {
    return (
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-primary font-bold text-xl">{initial}</span>
      </div>
    )
  }

  return (
    <Image
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${title ?? domain} logo`}
      width={48}
      height={48}
      className="w-12 h-12 rounded-lg object-contain bg-white border border-gray-100 flex-shrink-0"
      onError={() => setFailed(true)}
      unoptimized
    />
  )
}

export function VcCard({ domain, title, description, industries, location, portfolioCount }: VcCardProps) {
  const displayName = title ?? domain.replace(/\.\w+$/, '')

  return (
    <Card className="hover:shadow-md transition-shadow border border-gray-200 rounded-lg">
      <CardContent className="p-5">
        {/* Header with logo + name */}
        <div className="flex items-start gap-3 mb-3">
          <VcLogo domain={domain} title={title} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-gray-900 truncate">
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
        <div className="pt-3 border-t border-gray-100">
          <Link
            href={`/portfolio/${encodeURIComponent(domain)}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View Portfolio →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
