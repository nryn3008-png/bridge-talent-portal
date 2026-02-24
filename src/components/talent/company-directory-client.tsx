'use client'

import Link from 'next/link'
import { CompanyCard, type CompanyPreviewMember } from './company-card'
import { SearchX } from 'lucide-react'

interface CompanyData {
  companyName: string
  memberCount: number
  previewMembers: CompanyPreviewMember[]
}

interface CompanyDirectoryClientProps {
  companies: CompanyData[]
  totalCount: number
  query?: string
}

export function CompanyDirectoryClient({
  companies,
  totalCount,
  query,
}: CompanyDirectoryClientProps) {
  /* Empty state — no data (ux-copywriter: What this area shows + How to fill it) */
  if (totalCount === 0 && !query) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <SearchX className="w-5 h-5 text-[#9A9FB0]" />
        </div>
        <h3 className="text-base font-bold text-[#0D1531] mb-2">No companies yet</h3>
        <p className="text-[14px] text-[#676C7E]">
          Company data will appear after syncing profiles.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Empty state — search (ux-copywriter: What happened + What to do) */}
      {totalCount === 0 && query && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <SearchX className="w-5 h-5 text-[#9A9FB0]" />
          </div>
          <h3 className="text-base font-bold text-[#0D1531] mb-2">No matches found</h3>
          <p className="text-[14px] text-[#676C7E] mb-4">
            Try a different search term.
          </p>
          <Link
            href="/talent?view=companies"
            className="text-[14px] font-semibold text-[#0038FF] hover:text-[#0036D7] transition-colors duration-150"
          >
            Clear search
          </Link>
        </div>
      )}

      {/* Companies grid — 16px gap, staggered entrance */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-stagger">
          {companies.map((company) => (
            <CompanyCard
              key={company.companyName}
              companyName={company.companyName}
              memberCount={company.memberCount}
              previewMembers={company.previewMembers}
            />
          ))}
        </div>
      )}
    </div>
  )
}
