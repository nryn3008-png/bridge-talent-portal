import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { getBridgeMemberIds } from '@/lib/bridge-api/users'
import { TalentDirectoryClient } from '@/components/talent/talent-directory-client'
import { CompanyDirectoryClient } from '@/components/talent/company-directory-client'
import { ViewToggle } from '@/components/talent/view-toggle'
import { ROLE_CATEGORIES, buildPositionFilter } from '@/lib/role-categories'
import { buildCompanyExclusionWhere, buildCompanySearchWhere } from '@/lib/company-utils'
import type { BridgeMember } from '@/lib/bridge-api/types'
import type { CompanyPreviewMember } from '@/components/talent/company-card'

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function TalentDirectoryPage({ searchParams }: PageProps) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const params = await searchParams
  const query = params.q?.toLowerCase() || ''
  const roleFilter = params.role || ''
  const companyFilter = params.company || ''
  const view = params.view || 'people'
  const page = Math.max(1, parseInt(params.page || '1'))
  const perPage = 24

  // ═══════════════════════════════════════════════
  // COMPANIES VIEW
  // ═══════════════════════════════════════════════
  if (view === 'companies' && prisma) {
    let companies: Array<{
      companyName: string
      memberCount: number
      previewMembers: CompanyPreviewMember[]
    }> = []
    let totalCount = 0

    try {
      // Build the where clause for company filtering
      const companyWhere = query
        ? buildCompanySearchWhere(query)
        : buildCompanyExclusionWhere()

      // Query 1: Group by company, get counts, paginated
      const grouped = await prisma.talentProfile.groupBy({
        by: ['company'],
        _count: { company: true },
        where: companyWhere,
        orderBy: { _count: { company: 'desc' } },
        skip: (page - 1) * perPage,
        take: perPage,
      })

      // Query 2: Count total distinct companies for pagination
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT company) as count
        FROM talent_profiles
        WHERE company IS NOT NULL
          AND company NOT IN ('', 'No organization', 'no organization', 'No Organization', 'NO ORGANIZATION', 'N/A', 'n/a', 'None', 'none', '-', 'Unknown', 'unknown', '.', 'NA', 'na', 'TBD', 'tbd')
          ${query ? Prisma.sql`AND company ILIKE ${`%${query}%`}` : Prisma.empty}
      `
      totalCount = Number(countResult[0]?.count ?? 0)

      // Query 3: Fetch preview members for the companies on this page
      const companyNames = grouped
        .map((g) => g.company)
        .filter((c): c is string => c !== null)

      let previewMembers: Array<{
        company: string | null
        bridgeUserId: string
        firstName: string | null
        lastName: string | null
        profilePicUrl: string | null
      }> = []

      if (companyNames.length > 0) {
        previewMembers = await prisma.talentProfile.findMany({
          where: { company: { in: companyNames } },
          select: {
            company: true,
            bridgeUserId: true,
            firstName: true,
            lastName: true,
            profilePicUrl: true,
          },
          orderBy: [
            { isSuperConnector: 'desc' },
            { profileCompleteness: 'desc' },
          ],
        })
      }

      // Group preview members by company (take top 4 per company)
      const membersByCompany = new Map<string, CompanyPreviewMember[]>()
      for (const m of previewMembers) {
        if (!m.company) continue
        const existing = membersByCompany.get(m.company) ?? []
        if (existing.length < 4) {
          existing.push({
            bridgeUserId: m.bridgeUserId,
            firstName: m.firstName,
            lastName: m.lastName,
            profilePicUrl: m.profilePicUrl,
          })
          membersByCompany.set(m.company, existing)
        }
      }

      // Assemble final data
      companies = grouped.map((g) => ({
        companyName: g.company ?? '',
        memberCount: g._count.company,
        previewMembers: membersByCompany.get(g.company ?? '') ?? [],
      }))
    } catch (err) {
      console.warn('[talent/page] Companies query failed:', err instanceof Error ? err.message : err)
    }

    const totalPages = Math.ceil(totalCount / perPage)

    const buildUrl = (p: number) => {
      const parts = [`/talent?view=companies&page=${p}`]
      if (query) parts.push(`q=${encodeURIComponent(query)}`)
      return parts.join('&')
    }

    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Talent Directory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalCount > 0
                ? `${totalCount.toLocaleString()} companies in the Bridge network`
                : 'Browse companies in the Bridge network'}
            </p>
          </div>

          <ViewToggle activeView="companies" />

          <CompanyDirectoryClient
            companies={companies}
            totalCount={totalCount}
            query={query}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              {page > 1 && (
                <a
                  href={buildUrl(page - 1)}
                  className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
                >
                  Previous
                </a>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={buildUrl(page + 1)}
                  className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // PEOPLE VIEW (default)
  // ═══════════════════════════════════════════════
  let members: BridgeMember[] = []
  let totalCount = 0
  let hasSyncedProfiles = false

  // ── Try reading from DB (Supabase) first ──
  if (prisma) {
    try {
      // Build where clause — combine search + role filter + company filter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = []

      // Text search
      if (query) {
        conditions.push({
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { company: { contains: query, mode: 'insensitive' } },
            { position: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        })
      }

      // Role category filter
      if (roleFilter) {
        const positionFilters = buildPositionFilter(roleFilter)
        if (positionFilters) {
          conditions.push({ OR: positionFilters })
        }
      }

      // Company filter (from clicking "View Talent" on a company card)
      if (companyFilter) {
        conditions.push({
          company: { equals: companyFilter, mode: 'insensitive' },
        })
      }

      const whereClause = conditions.length > 0 ? { AND: conditions } : {}

      const [count, profiles] = await Promise.all([
        prisma.talentProfile.count({ where: whereClause }),
        prisma.talentProfile.findMany({
          where: whereClause,
          skip: (page - 1) * perPage,
          take: perPage,
          orderBy: [
            { isSuperConnector: 'desc' },
            { profileCompleteness: 'desc' },
            { firstName: 'asc' },
          ],
        }),
      ])

      totalCount = count
      hasSyncedProfiles = profiles.some((p) => p.profileSyncedAt !== null)

      members = profiles.map((p): BridgeMember => ({
        id: p.bridgeUserId,
        sid: 0,
        first_name: p.firstName ?? '',
        last_name: p.lastName ?? '',
        email: p.email ?? undefined,
        profile_pic_url: p.profilePicUrl ?? undefined,
        position: p.position ?? undefined,
        company: p.company ?? undefined,
        location: p.location ?? undefined,
        bio: p.bio ?? undefined,
        linkedin_profile_url: p.linkedinUrl ?? undefined,
        is_super_connector: p.isSuperConnector,
        icp_roles: p.openToRoles,
        icp_industries: p.skills,
      }))
    } catch (err) {
      console.warn('[talent/page] DB query failed:', err instanceof Error ? err.message : err)
    }
  }

  // ── Fallback: if DB is empty or unavailable, use Bridge API for UUIDs ──
  if (totalCount === 0 && !roleFilter && !companyFilter) {
    try {
      const data = await getBridgeMemberIds()
      const memberIds = data.list ?? []
      totalCount = memberIds.length
      const pageIds = memberIds.slice((page - 1) * perPage, page * perPage)
      members = pageIds.map((uuid) => ({
        id: uuid,
        sid: 0,
        first_name: '',
        last_name: '',
      }))
    } catch (err) {
      console.error('[talent/page] Failed to fetch member IDs:', err)
    }
  }

  const totalPages = Math.ceil(totalCount / perPage)

  // Build URL helper for pagination links
  const buildUrl = (p: number) => {
    const parts = [`/talent?page=${p}`]
    if (query) parts.push(`q=${encodeURIComponent(query)}`)
    if (roleFilter) parts.push(`role=${encodeURIComponent(roleFilter)}`)
    if (companyFilter) parts.push(`company=${encodeURIComponent(companyFilter)}`)
    return parts.join('&')
  }

  // Subtitle text
  const subtitleText = (() => {
    if (totalCount === 0) return 'Vetted professionals in the Bridge network'
    if (companyFilter) {
      return `${totalCount.toLocaleString()} member${totalCount !== 1 ? 's' : ''} at ${companyFilter}`
    }
    if (roleFilter) {
      const roleLabel = ROLE_CATEGORIES.find((c) => c.id === roleFilter)?.label ?? roleFilter
      return `${totalCount.toLocaleString()} members in ${roleLabel}`
    }
    return `${totalCount.toLocaleString()} members in the Bridge network`
  })()

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Talent Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {subtitleText}
          </p>
        </div>

        <ViewToggle activeView="people" />

        {/* Sync prompt when profiles are placeholder-only */}
        {totalCount > 0 && !hasSyncedProfiles && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Profiles not yet synced.</span>{' '}
              Run <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">POST /api/sync {`{"mode":"bulk"}`}</code> to fetch full profiles from Bridge.
            </p>
          </div>
        )}

        <TalentDirectoryClient
          members={members}
          totalCount={totalCount}
          page={page}
          totalPages={totalPages}
          query={query}
          activeRole={roleFilter}
          roleCategories={ROLE_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
          companyFilter={companyFilter || undefined}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            {page > 1 && (
              <a
                href={buildUrl(page - 1)}
                className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
              >
                Previous
              </a>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={buildUrl(page + 1)}
                className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
              >
                Next
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
