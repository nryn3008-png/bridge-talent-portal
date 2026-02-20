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

// Search portfolio companies in a network
export function searchNetworkPortfolios(networkDomain?: string): Promise<BridgePortfolio[]> {
  return bridgeGet<BridgePortfolio[]>('/api/v1/search/network_portfolios', {
    domain: networkDomain,
  })
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
