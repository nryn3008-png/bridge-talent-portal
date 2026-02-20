// Bridge API TypeScript types — matches User#as_json shape

export interface BridgeUser {
  id: string
  sid: number
  email: string
  first_name: string
  last_name: string
  username: string
  bio?: string
  profile_pic_url?: string
  confirmed?: boolean      // Bridge API v1 returns boolean; v2 may return confirmed_at datetime
  confirmed_at?: string    // May be null in v1 even when confirmed=true
  terms_accepted_at?: string
  deleting?: boolean
  global_profile?: BridgeGlobalProfile
  icp?: BridgeICP
  network_domains?: BridgeNetworkDomain[]
  investor_network_domains?: BridgeNetworkDomain[]
  features?: Record<string, boolean>
  roles?: string[]
}

export interface BridgeGlobalProfile {
  bio?: string
  linkedin_profile_url?: string
  company?: string
  company_website?: string
  position?: string
  location?: string
  twitter_handle_url?: string
  is_super_connector?: boolean
  no_organization?: boolean
  email_references?: string[]
}

export interface BridgeICP {
  roles?: string[]
  industries?: string[]
  description?: string
  context?: string
  public?: boolean
}

export interface BridgeNetworkDomain {
  domain: string
  name?: string
  role?: string // member, guest, api_admin
  has_portfolios?: boolean
  logo_url?: string
}

export interface BridgeMember {
  id: string
  sid: number
  first_name: string
  last_name: string
  email?: string
  profile_pic_url?: string
  position?: string
  company?: string
  location?: string
  bio?: string
  linkedin_profile_url?: string
  is_super_connector?: boolean
  icp_roles?: string[]
  icp_industries?: string[]
  network_domains?: string[]
}

export interface BridgeSearchResult {
  members: BridgeMember[]
  total?: number
  page?: number
  per_page?: number
}

export interface BridgeEmbeddingSearchResult {
  results: Array<{
    user: BridgeMember
    score: number
  }>
}

export interface BridgeIntroduction {
  id: string
  requester_id: string
  target_id: string
  connector_id?: string
  status: string
  message?: string
  created_at: string
  updated_at: string
}

export interface BridgeConnectorSuggestion {
  user: BridgeMember
  strength: number
  reason?: string
}

export interface BridgePortfolio {
  domain: string
  name: string
  logo_url?: string
  website?: string
  description?: string
  industries?: string[]
}

// Contact response from GET /api/v1/contacts/:id
// Different shape from BridgeUser — this is the "contact" view of a network member
export interface BridgeContact {
  id: string
  name: string
  given_name?: string
  email?: string
  company?: string
  position?: string
  location?: string
  bio?: string
  profile_pic_url?: string | null
  linkedin_profile_url?: string
  twitter_handle_url?: string
  company_website?: string
  is_super_connector?: boolean
  is_member?: boolean
  username?: string
  icp?: BridgeICP | null
  tags?: Array<{ id: string; name: string }>
  created_at?: string
  updated_at?: string
}

export interface BridgeAuthSession {
  token: string
  user: BridgeUser
}

export interface BridgeApiError {
  error: string
  message?: string
  status?: number
}
