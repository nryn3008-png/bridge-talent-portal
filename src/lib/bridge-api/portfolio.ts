import { bridgeGet } from './client'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VcDetails {
  domain: string
  title: string | null
  description: string | null
  location: string | null
  isVc: boolean
  founders: string[]
  industries: string[]
  industriesInvestIn: Record<string, number>
  investmentFocus: string | null
}

export interface PortfolioCompany {
  id: string
  domain: string
  description: string | null
  industries: string[]
  status: string | null
  funded: number | null
  investDate: string | null
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

interface TagsDetailsResponse {
  data: {
    id: string
    type: string
    attributes: {
      domain: string
      is_vc: boolean
      title: string | null
      description: string | null
      location: string | null
      founders: string[] | null
      industries: string[] | null
      industries_invest_in: Record<string, number> | null
      investment_focus: string | null
    }
  }
}

interface PortfolioV4Response {
  data: Array<{
    id: string
    type: 'portfolio'
    attributes: {
      id: number
      domain: string
      description: string | null
      industries: string[] | null
      status: string | null
      funded: number | null
      invest_date: string | null
    }
  }>
}

// ─── Fetch Functions ─────────────────────────────────────────────────────────

/**
 * Fetch VC/network details from GET /api/v1/tags/:domain/details
 */
export async function fetchVcDetails(domain: string): Promise<VcDetails> {
  const data = await bridgeGet<TagsDetailsResponse>(`/api/v1/tags/${domain}/details`)
  const attrs = data.data.attributes

  return {
    domain: attrs.domain,
    title: attrs.title,
    description: attrs.description,
    location: attrs.location,
    isVc: attrs.is_vc,
    founders: attrs.founders ?? [],
    industries: attrs.industries ?? [],
    industriesInvestIn: attrs.industries_invest_in ?? {},
    investmentFocus: attrs.investment_focus,
  }
}

/**
 * Fetch portfolio companies from GET /api/v4/search/network_portfolios
 * Handles pagination automatically.
 */
export async function fetchPortfolioCompanies(
  domain: string,
  limit: number = 50,
): Promise<PortfolioCompany[]> {
  let offset = 0
  const all: PortfolioCompany[] = []

  while (true) {
    const data = await bridgeGet<PortfolioV4Response>(
      '/api/v4/search/network_portfolios',
      { domain, limit, offset },
    )

    if (!data.data || data.data.length === 0) break

    for (const item of data.data) {
      all.push({
        id: item.id,
        domain: item.attributes.domain,
        description: item.attributes.description,
        industries: item.attributes.industries ?? [],
        status: item.attributes.status,
        funded: item.attributes.funded,
        investDate: item.attributes.invest_date,
      })
    }

    if (data.data.length < limit) break
    offset += limit
  }

  return all
}
