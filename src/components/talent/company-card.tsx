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
 */
function guessCompanyDomain(name: string): string | null {
  const cleaned = name
    .toLowerCase()
    .replace(/[,.]$/, '')
    .replace(/\s*(inc\.?|llc|ltd\.?|corp\.?|co\.?|gmbh|plc|pty|s\.?a\.?|ag)\s*$/i, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()

  if (!cleaned || cleaned.length < 2) return null

  const words = cleaned.split(/\s+/)
  const slug = words.length <= 2 ? words.join('') : words[0]
  return `${slug}.com`
}

function CompanyLogo({ companyName }: { companyName: string }) {
  const [failed, setFailed] = useState(false)
  const domain = guessCompanyDomain(companyName)
  const initial = companyName.charAt(0).toUpperCase()

  /* Fallback — Royal 05 bg, Royal text, rounded-xl (8px) */
  if (!domain || failed) {
    return (
      <div className="w-10 h-10 rounded-lg bg-[#F2F5FF] flex items-center justify-center flex-shrink-0">
        <span className="text-[#0038FF] font-bold text-[16px]">{initial}</span>
      </div>
    )
  }

  return (
    <Image
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${companyName} logo`}
      width={40}
      height={40}
      className="w-10 h-10 rounded-lg object-contain bg-white border border-[#ECEDF0] flex-shrink-0"
      onError={() => setFailed(true)}
      unoptimized
    />
  )
}

export function CompanyCard({ companyName, memberCount, previewMembers }: CompanyCardProps) {
  return (
    <Card className="card-elevated group">
      <CardContent className="p-4">
        {/* Header — logo + name + count */}
        <div className="flex items-start gap-3 mb-4">
          <CompanyLogo companyName={companyName} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-[#0D1531] group-hover:text-[#0038FF] transition-colors duration-150 truncate">
              {companyName}
            </h3>
            <p className="text-[13px] text-[#676C7E]">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>

        {/* Avatar preview stack — 32px, ring-2 white */}
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
                    className="w-8 h-8 rounded-full bg-[#F2F5FF] flex items-center justify-center ring-2 ring-white"
                  >
                    <span className="text-[#0038FF] font-semibold text-[12px]">{initials}</span>
                  </div>
                )
              })}
              {memberCount > 4 && (
                <div className="w-8 h-8 rounded-full bg-[#F2F3F5] flex items-center justify-center ring-2 ring-white">
                  <span className="text-[#81879C] text-[12px] font-medium">
                    +{memberCount - 4}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer action — Slate 15 border */}
        <div className="pt-3 border-t border-[#ECEDF0]">
          <Link
            href={`/talent?company=${encodeURIComponent(companyName)}`}
            className="text-[14px] font-semibold text-[#0038FF] hover:text-[#0036D7] transition-colors duration-150 inline-flex items-center gap-1"
          >
            View talent
            <span className="inline-block group-hover:translate-x-0.5 transition-transform duration-150">
              &rarr;
            </span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
