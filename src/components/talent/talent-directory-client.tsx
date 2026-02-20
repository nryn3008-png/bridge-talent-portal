'use client'

import { TalentCard } from './talent-card'
import { TalentSearchBar } from './talent-search-bar'
import type { BridgeMember } from '@/lib/bridge-api/types'

interface TalentDirectoryClientProps {
  members: BridgeMember[]
  currentUser?: BridgeMember | null
  totalCount: number
  page: number
  totalPages: number
  query?: string
}

export function TalentDirectoryClient({
  members,
  currentUser,
  totalCount,
  query,
}: TalentDirectoryClientProps) {

  if (totalCount === 0) {
    return (
      <div className="text-center py-16 max-w-lg mx-auto">
        <p className="text-5xl mb-4">👥</p>
        <h3 className="text-lg font-semibold mb-2">
          {query ? 'No members match your search' : 'No network members found'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {query
            ? 'Try adjusting your search terms'
            : 'Could not fetch member data from the Bridge API. Check your BRIDGE_API_KEY in .env.local.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Search bar */}
      <div className="mb-6">
        <TalentSearchBar />
      </div>

      {/* Current user's card highlighted at top of page 1 */}
      {currentUser && (
        <div className="mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Your profile
          </p>
          <div className="max-w-sm">
            <TalentCard member={currentUser} highlighted />
          </div>
        </div>
      )}

      {/* Member grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <TalentCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  )
}
