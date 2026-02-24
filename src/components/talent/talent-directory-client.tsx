'use client'

import Link from 'next/link'
import { TalentCard } from './talent-card'
import type { BridgeMember } from '@/lib/bridge-api/types'
import { SearchX, X } from 'lucide-react'

interface TalentDirectoryClientProps {
  members: BridgeMember[]
  totalCount: number
  query?: string
  activeRole?: string
  companyFilter?: string
}

export function TalentDirectoryClient({
  members,
  totalCount,
  query,
  activeRole,
  companyFilter,
}: TalentDirectoryClientProps) {
  /* Empty state — no data at all (ux-copywriter: What this area shows + How to fill it) */
  if (totalCount === 0 && !activeRole && !query && !companyFilter) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <SearchX className="w-5 h-5 text-[#9A9FB0]" />
        </div>
        <h3 className="text-base font-bold text-[#0D1531] mb-2">No members yet</h3>
        <p className="text-[14px] text-[#676C7E]">
          Members will appear here after syncing. Check your API key in .env.local.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Company filter badge — Bridge badge style (4px radius) */}
      {companyFilter && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[13px] text-[#676C7E]">Showing members at</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#E6EBFF] text-[#0038FF] text-[12px] font-medium rounded border border-[#E6EEFF]">
            {companyFilter}
            <Link href="/talent" className="hover:text-[#0036D7] transition-colors duration-150">
              <X className="w-3 h-3" />
            </Link>
          </span>
        </div>
      )}

      {/* Empty state — filtered (ux-copywriter: What happened + What to do) */}
      {totalCount === 0 && (activeRole || query || companyFilter) && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <SearchX className="w-5 h-5 text-[#9A9FB0]" />
          </div>
          <h3 className="text-base font-bold text-[#0D1531] mb-2">No matches found</h3>
          <p className="text-[14px] text-[#676C7E] mb-4">
            Try adjusting your search or filters.
          </p>
          <Link
            href="/talent"
            className="text-[14px] font-semibold text-[#0038FF] hover:text-[#0036D7] transition-colors duration-150"
          >
            Clear filters
          </Link>
        </div>
      )}

      {/* Member grid — 16px gap, staggered entrance */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-stagger">
          {members.map((member) => (
            <TalentCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  )
}
