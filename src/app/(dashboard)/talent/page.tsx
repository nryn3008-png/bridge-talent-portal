import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { getBridgeMemberIds } from '@/lib/bridge-api/users'
import { TalentDirectoryClient } from '@/components/talent/talent-directory-client'
import { CompanyDirectoryClient } from '@/components/talent/company-directory-client'
import { TalentSearchBar } from '@/components/talent/talent-search-bar'
import { ViewToggle } from '@/components/talent/view-toggle'
import { RoleFilterDropdown } from '@/components/talent/role-filter-dropdown'
import { ROLE_CATEGORIES, buildPositionFilter } from '@/lib/role-categories'
import { buildCompanyExclusionWhere, buildCompanySearchWhere } from '@/lib/company-utils'
import { Pagination } from '@/components/ui/pagination'
import { Users } from 'lucide-react'
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
  const perPage = Math.min(50, Math.max(1, parseInt(params.per_page || '20')))

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
      const companyWhere = query
        ? buildCompanySearchWhere(query)
        : buildCompanyExclusionWhere()

      const grouped = await prisma.talentProfile.groupBy({
        by: ['company'],
        _count: { company: true },
        where: companyWhere,
        orderBy: { _count: { company: 'desc' } },
        skip: (page - 1) * perPage,
        take: perPage,
      })

      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT company) as count
        FROM talent_profiles
        WHERE company IS NOT NULL
          AND company NOT IN ('', 'No organization', 'no organization', 'No Organization', 'NO ORGANIZATION', 'N/A', 'n/a', 'None', 'none', '-', 'Unknown', 'unknown', '.', 'NA', 'na', 'TBD', 'tbd')
          ${query ? Prisma.sql`AND company ILIKE ${`%${query}%`}` : Prisma.empty}
      `
      totalCount = Number(countResult[0]?.count ?? 0)

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

      companies = grouped.map((g) => ({
        companyName: g.company ?? '',
        memberCount: g._count.company,
        previewMembers: membersByCompany.get(g.company ?? '') ?? [],
      }))
    } catch (err) {
      console.warn('[talent/page] Companies query failed:', err instanceof Error ? err.message : err)
    }

    const totalPages = Math.ceil(totalCount / perPage)

    const companiesExtraParams: Record<string, string> = { view: 'companies' }
    if (query) companiesExtraParams.q = query

    return (
      <div className="px-6 pt-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header — Figma: icon + title inline, subtitle below */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-[12px] bg-[#0038FF] flex items-center justify-center flex-shrink-0">
                <Users className="w-[18px] h-[18px] text-white" />
              </div>
              <h1 className="text-[18px] font-bold text-[#0D1531]">Talent Directory</h1>
            </div>
            <p className="text-[14px] text-[#81879C] tracking-[0.4px]">
              Discover and connect with top talent in our directory!
            </p>
          </div>

          {/* Controls row — Figma: search + divider + view toggle on one line */}
          <div className="flex items-center gap-2">
            <TalentSearchBar />
            <div className="w-px h-6 bg-[#ECEDF0] flex-shrink-0" />
            <ViewToggle activeView="companies" />
          </div>

          <div className="mt-6" />

          <CompanyDirectoryClient
            companies={companies}
            totalCount={totalCount}
            query={query}
          />

          <Pagination page={page} totalPages={totalPages} perPage={perPage} basePath="/talent" extraParams={companiesExtraParams} />
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

  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = []

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

      if (roleFilter) {
        const positionFilters = buildPositionFilter(roleFilter)
        if (positionFilters) {
          conditions.push({ OR: positionFilters })
        }
      }

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

  const peopleExtraParams: Record<string, string> = {}
  if (query) peopleExtraParams.q = query
  if (roleFilter) peopleExtraParams.role = roleFilter
  if (companyFilter) peopleExtraParams.company = companyFilter

  return (
    <div className="px-6 pt-6 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header — Figma: icon + title inline, subtitle below */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-[12px] bg-[#0038FF] flex items-center justify-center flex-shrink-0">
              <Users className="w-[18px] h-[18px] text-white" />
            </div>
            <h1 className="text-[18px] font-bold text-[#0D1531]">Talent Directory</h1>
          </div>
          <p className="text-[14px] text-[#81879C] tracking-[0.4px]">
            Discover and connect with top talent in our directory!
          </p>
        </div>

        {/* Controls row — Figma: search + role dropdown + divider + view toggle */}
        <div className="flex items-center gap-2">
          <TalentSearchBar />
          <RoleFilterDropdown
            roleCategories={ROLE_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
            activeRole={roleFilter || undefined}
          />
          <div className="w-px h-6 bg-[#ECEDF0] flex-shrink-0" />
          <ViewToggle activeView="people" />
        </div>

        <div className="mt-6" />

        {/* Sync warning — Bridge warning pattern: Honey 10 bg, Honey S10 text */}
        {totalCount > 0 && !hasSyncedProfiles && (
          <div className="mb-6 rounded-lg border border-[#FBEFD9] bg-[#FCF4E6] px-4 py-3">
            <p className="text-[14px] text-[#714A00]">
              <span className="font-bold">Profiles not yet synced.</span>{' '}
              Run <code className="text-[12px] bg-[#FBEFD9] px-1 py-0.5 rounded">POST /api/sync {`{"mode":"bulk"}`}</code> to fetch full profiles from Bridge.
            </p>
          </div>
        )}

        <TalentDirectoryClient
          members={members}
          totalCount={totalCount}
          query={query}
          activeRole={roleFilter}
          companyFilter={companyFilter || undefined}
        />

        <Pagination page={page} totalPages={totalPages} perPage={perPage} basePath="/talent" extraParams={peopleExtraParams} />
      </div>
    </div>
  )
}
