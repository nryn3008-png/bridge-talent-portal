'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { TalentCard } from './talent-card'
import { TalentSearchBar } from './talent-search-bar'
import type { BridgeMember } from '@/lib/bridge-api/types'

interface RoleCategoryInfo {
  id: string
  label: string
}

interface TalentDirectoryClientProps {
  members: BridgeMember[]
  totalCount: number
  page: number
  totalPages: number
  query?: string
  activeRole?: string
  roleCategories?: RoleCategoryInfo[]
}

export function TalentDirectoryClient({
  members,
  totalCount,
  query,
  activeRole,
  roleCategories,
}: TalentDirectoryClientProps) {
  const searchParams = useSearchParams()

  // Build filter URL preserving search query
  function buildFilterUrl(roleId?: string) {
    const params = new URLSearchParams()
    const q = searchParams.get('q')
    if (q) params.set('q', q)
    if (roleId) params.set('role', roleId)
    const qs = params.toString()
    return `/talent${qs ? `?${qs}` : ''}`
  }

  if (totalCount === 0 && !activeRole && !query) {
    return (
      <div className="text-center py-16 max-w-lg mx-auto">
        <h3 className="text-lg font-semibold mb-2">No network members found</h3>
        <p className="text-sm text-muted-foreground">
          Could not fetch member data from the Bridge API. Check your BRIDGE_API_KEY in .env.local.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4">
        <TalentSearchBar />
      </div>

      {/* Role filter chips */}
      {roleCategories && roleCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={buildFilterUrl()}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !activeRole
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            All
          </Link>
          {roleCategories.map((cat) => (
            <Link
              key={cat.id}
              href={buildFilterUrl(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeRole === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      )}

      {/* Empty state for filtered results */}
      {totalCount === 0 && (activeRole || query) && (
        <div className="text-center py-16 max-w-lg mx-auto">
          <h3 className="text-lg font-semibold mb-2">No members match your filters</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try a different role category or adjust your search terms.
          </p>
          <Link
            href="/talent"
            className="text-sm text-primary hover:underline"
          >
            Clear all filters
          </Link>
        </div>
      )}

      {/* Member grid */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map((member) => (
            <TalentCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  )
}
