'use client'

import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export interface CompanyPreviewMember {
  bridgeUserId: string
  firstName: string | null
  lastName: string | null
  profilePicUrl: string | null
}

interface CompanyCardProps {
  companyName: string
  memberCount: number
  previewMembers: CompanyPreviewMember[]
}

/**
 * Guess a domain from a company name for logo fetching.
 * "Google" → "google.com", "McKinsey & Company" → "mckinsey.com"
 */
function guessCompanyDomain(name: string): string | null {
  // Clean up the name
  const cleaned = name
    .toLowerCase()
    .replace(/[,.]$/, '')               // trailing punctuation
    .replace(/\s*(inc\.?|llc|ltd\.?|corp\.?|co\.?|gmbh|plc|pty|s\.?a\.?|ag)\s*$/i, '') // suffixes
    .replace(/[^a-z0-9\s-]/g, '')       // special chars
    .trim()

  if (!cleaned || cleaned.length < 2) return null

  // Use first word for multi-word names, full name for single word
  const words = cleaned.split(/\s+/)
  const slug = words.length <= 2
    ? words.join('')
    : words[0]

  return `${slug}.com`
}

function CompanyLogo({ companyName }: { companyName: string }) {
  const [failed, setFailed] = useState(false)
  const domain = guessCompanyDomain(companyName)
  const initial = companyName.charAt(0).toUpperCase()

  if (!domain || failed) {
    return (
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-primary font-bold text-lg">{initial}</span>
      </div>
    )
  }

  return (
    <Image
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${companyName} logo`}
      width={40}
      height={40}
      className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-100 flex-shrink-0"
      onError={() => setFailed(true)}
      unoptimized
    />
  )
}

export function CompanyCard({ companyName, memberCount, previewMembers }: CompanyCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow border border-gray-200 rounded-lg">
      <CardContent className="p-5">
        {/* Header with logo + name */}
        <div className="flex items-start gap-3 mb-3">
          <CompanyLogo companyName={companyName} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-gray-900 truncate">
              {companyName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>

        {/* Avatar preview row */}
        {previewMembers.length > 0 && (
          <div className="flex items-center mb-4">
            <div className="flex -space-x-2">
              {previewMembers.slice(0, 4).map((member) => {
                const initials = `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase()
                return member.profilePicUrl ? (
                  <Image
                    key={member.bridgeUserId}
                    src={member.profilePicUrl}
                    alt={`${member.firstName} ${member.lastName}`}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                    unoptimized
                  />
                ) : (
                  <div
                    key={member.bridgeUserId}
                    className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-white"
                  >
                    <span className="text-primary font-semibold text-xs">{initials}</span>
                  </div>
                )
              })}
              {memberCount > 4 && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center ring-2 ring-white">
                  <span className="text-muted-foreground text-xs font-medium">
                    +{memberCount - 4}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action */}
        <div className="pt-3 border-t border-gray-100">
          <Link
            href={`/talent?company=${encodeURIComponent(companyName)}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View Talent →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
