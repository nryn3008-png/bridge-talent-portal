import { bridgeGet } from './client'
import type {
  BridgeSearchResult,
  BridgeEmbeddingSearchResult,
  BridgeMember,
  BridgePortfolio,
  BridgeConnectorSuggestion,
} from './types'

export interface MemberSearchParams {
  query?: string
  page?: number
  per_page?: number
  roles?: string
  industries?: string
  location?: string
  network_domain?: string
}

// ⚠️ BROKEN: /api/v1/search/bridge_members returns 500 server-side. Do not use.
// Use getBridgeMemberIds() from users.ts instead.
// export function searchBridgeMembers(
//   params: MemberSearchParams,
//   jwt?: string,
// ): Promise<BridgeSearchResult> {
//   return bridgeGet<BridgeSearchResult>('/api/v1/search/bridge_members', params as Record<string, string | number | undefined>, jwt)
// }

// ⚠️ BROKEN: /api/v1/search/embeddings returns 500 server-side.
// export function semanticSearch(query: string, limit = 20): Promise<BridgeEmbeddingSearchResult> {
//   return bridgeGet<BridgeEmbeddingSearchResult>('/api/v1/search/embeddings', {
//     query,
//     limit,
//   })
// }

// Find profiles similar to a given user
export function findSimilarProfiles(
  userId: string,
  limit = 10,
): Promise<BridgeEmbeddingSearchResult> {
  return bridgeGet<BridgeEmbeddingSearchResult>('/api/v1/search/embeddings/by_profile', {
    user_id: userId,
    limit,
  })
}

// Search portfolio companies in a network (v1)
export function searchNetworkPortfolios(networkDomain?: string): Promise<BridgePortfolio[]> {
  return bridgeGet<BridgePortfolio[]>('/api/v1/search/network_portfolios', {
    domain: networkDomain,
  })
}

// Bridge API v4 — JSON:API format response
interface BridgeV4PortfolioResponse {
  data: Array<{
    id: string
    type: 'portfolio'
    attributes: {
      id: number
      domain: string
      description: string | null
      industries: string[]
      status: string
      funded: number | null
      invest_date: string | null
    }
  }>
}

// Fetch portfolio companies via v4 (JSON:API format)
export async function fetchPortfolioCompaniesV4(
  domain: string = 'brdg.app',
  limit: number = 50,
): Promise<BridgePortfolio[]> {
  let offset = 0
  const all: BridgePortfolio[] = []

  while (true) {
    const data = await bridgeGet<BridgeV4PortfolioResponse>(
      '/api/v4/search/network_portfolios',
      { domain, limit, offset },
    )

    if (!data.data || data.data.length === 0) break

    for (const item of data.data) {
      all.push({
        domain: item.attributes.domain,
        name: item.attributes.domain,
        description: item.attributes.description ?? undefined,
        industries: item.attributes.industries,
      })
    }

    if (data.data.length < limit) break
    offset += limit
  }

  return all
}

// Search investors in a network
export function searchNetworkInvestors(networkDomain?: string): Promise<BridgeMember[]> {
  return bridgeGet<BridgeMember[]>('/api/v1/search/network_investors', {
    domain: networkDomain,
  })
}

// Get connector suggestions for a contact (who can introduce)
export function getConnectorSuggestions(
  contactId: string,
  jwt: string,
): Promise<BridgeConnectorSuggestion[]> {
  return bridgeGet<BridgeConnectorSuggestion[]>(
    `/api/v1/contacts/${contactId}/connector_suggestions`,
    undefined,
    jwt,
  )
}

// Get common contacts with another user
export function getCommonContacts(
  contactId: string,
  jwt: string,
): Promise<BridgeMember[]> {
  return bridgeGet<BridgeMember[]>(
    `/api/v1/contacts/${contactId}/common_contacts`,
    undefined,
    jwt,
  )
}
