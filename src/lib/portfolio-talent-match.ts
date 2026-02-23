import type { PrismaClient } from '@prisma/client'

/**
 * Build arrays for matching TalentProfile records to a VC's portfolio companies.
 *
 * Two matching strategies:
 * 1. Email domain match — if talent's email @domain matches a portfolio company domain
 * 2. Company name stem match — strip TLD from domains to get name stems, match against company field
 */
export function buildTalentMatchArrays(
  portfolioDomains: string[],
  vcDomain: string,
  vcTitle: string | null
): { emailDomains: string[]; companyStems: string[] } {
  // Email domains: portfolio company domains + VC domain itself
  const emailDomains = [...new Set([vcDomain, ...portfolioDomains].map((d) => d.toLowerCase()))]

  // Company name stems: strip TLD from each domain + VC title
  const stemSet = new Set<string>()
  for (const d of [vcDomain, ...portfolioDomains]) {
    const stem = d.replace(/\.\w+$/, '').toLowerCase()
    if (stem.length >= 2) stemSet.add(stem)
  }
  if (vcTitle) {
    stemSet.add(vcTitle.toLowerCase())
  }
  const companyStems = Array.from(stemSet)

  return { emailDomains, companyStems }
}

/**
 * Count talent profiles that match portfolio companies via email domain or company name stem.
 */
export async function countPortfolioTalent(
  prismaClient: PrismaClient,
  emailDomains: string[],
  companyStems: string[]
): Promise<number> {
  if (emailDomains.length === 0 && companyStems.length === 0) return 0

  const result = await prismaClient.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM talent_profiles
    WHERE
      LOWER(SPLIT_PART(email, '@', 2)) = ANY(${emailDomains}::text[])
      OR LOWER(company) = ANY(${companyStems}::text[])
  `
  return Number(result[0]?.count ?? 0)
}

/**
 * Fetch paginated talent profiles matching portfolio companies.
 */
export async function fetchPortfolioTalent(
  prismaClient: PrismaClient,
  emailDomains: string[],
  companyStems: string[],
  page: number,
  perPage: number
): Promise<{
  profiles: Array<{
    id: string
    bridgeUserId: string
    firstName: string | null
    lastName: string | null
    email: string | null
    company: string | null
    position: string | null
    location: string | null
    bio: string | null
    profilePicUrl: string | null
    linkedinUrl: string | null
    isSuperConnector: boolean
    openToRoles: string[]
    skills: string[]
  }>
  total: number
}> {
  if (emailDomains.length === 0 && companyStems.length === 0) {
    return { profiles: [], total: 0 }
  }

  const offset = (page - 1) * perPage

  const [countResult, profiles] = await Promise.all([
    prismaClient.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM talent_profiles
      WHERE
        LOWER(SPLIT_PART(email, '@', 2)) = ANY(${emailDomains}::text[])
        OR LOWER(company) = ANY(${companyStems}::text[])
    `,
    prismaClient.$queryRaw<
      Array<{
        id: string
        bridge_user_id: string
        first_name: string | null
        last_name: string | null
        email: string | null
        company: string | null
        position: string | null
        location: string | null
        bio: string | null
        profile_pic_url: string | null
        linkedin_url: string | null
        is_super_connector: boolean
        open_to_roles: string[]
        skills: string[]
      }>
    >`
      SELECT id, bridge_user_id, first_name, last_name, email, company, position,
             location, bio, profile_pic_url, linkedin_url, is_super_connector,
             open_to_roles, skills
      FROM talent_profiles
      WHERE
        LOWER(SPLIT_PART(email, '@', 2)) = ANY(${emailDomains}::text[])
        OR LOWER(company) = ANY(${companyStems}::text[])
      ORDER BY is_super_connector DESC, first_name ASC NULLS LAST
      LIMIT ${perPage} OFFSET ${offset}
    `,
  ])

  return {
    total: Number(countResult[0]?.count ?? 0),
    profiles: profiles.map((p) => ({
      id: p.id,
      bridgeUserId: p.bridge_user_id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      company: p.company,
      position: p.position,
      location: p.location,
      bio: p.bio,
      profilePicUrl: p.profile_pic_url,
      linkedinUrl: p.linkedin_url,
      isSuperConnector: p.is_super_connector,
      openToRoles: p.open_to_roles ?? [],
      skills: p.skills ?? [],
    })),
  }
}
