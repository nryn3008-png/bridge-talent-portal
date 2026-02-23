'use client'

import Link from 'next/link'
import { TalentSearchBar } from './talent-search-bar'
import { CompanyCard, type CompanyPreviewMember } from './company-card'

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
  if (totalCount === 0 && !query) {
    return (
      <div className="text-center py-16 max-w-lg mx-auto">
        <h3 className="text-lg font-semibold mb-2">No companies found</h3>
        <p className="text-sm text-muted-foreground">
          No company data is available. Run a profile sync to populate the directory.
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

      {/* Empty state for search results */}
      {totalCount === 0 && query && (
        <div className="text-center py-16 max-w-lg mx-auto">
          <h3 className="text-lg font-semibold mb-2">No companies match your search</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try a different search term.
          </p>
          <Link
            href="/talent?view=companies"
            className="text-sm text-primary hover:underline"
          >
            Clear search
          </Link>
        </div>
      )}

      {/* Companies grid */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
