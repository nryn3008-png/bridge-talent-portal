import { bridgeGet } from './client'
import type { BridgeUser, BridgeContact } from './types'

// Bridge API v1 wraps user responses: { user: {...}, message: "..." }
// These helpers unwrap the envelope.

async function getUser(path: string, params?: Record<string, string>, jwt?: string): Promise<BridgeUser> {
  const data = await bridgeGet<{ user: BridgeUser } | BridgeUser>(path, params, jwt)
  // Handle both wrapped { user: {...} } and flat response shapes
  return (data as { user: BridgeUser }).user ?? (data as BridgeUser)
}

// Get current authenticated user (full profile)
export function getCurrentUser(jwt: string): Promise<BridgeUser> {
  return getUser('/api/v1/users/me', undefined, jwt)
}

// Get user by ID
export function getUserById(userId: string, jwt?: string): Promise<BridgeUser> {
  return getUser(`/api/v1/users/${userId}`, undefined, jwt)
}

// Get user by email
export function getUserByEmail(email: string, jwt?: string): Promise<BridgeUser> {
  return getUser('/api/v1/users/show_by_email', { email }, jwt)
}

// Get list of all Bridge member UUIDs in the network
export function getBridgeMemberIds(): Promise<{ list: string[] }> {
  return bridgeGet<{ list: string[] }>('/api/v1/contacts/bridge_members_ids')
}

// ⚠️ BROKEN: /api/v1/contacts/bridge_members_details/since/:time returns 404. Do not use.
// export function getMembersSince(since: string): Promise<BridgeMember[]> {
//   return bridgeGet<BridgeMember[]>(`/api/v1/contacts/bridge_members_details/since/${since}`)
// }

// ⚠️ BROKEN: /api/v1/user_networks returns 404. Do not use.
// export function getUserNetworks(jwt: string): Promise<unknown[]> {
//   return bridgeGet<unknown[]>('/api/v1/user_networks', undefined, jwt)
// }

// Get a contact's full profile by ID
// Uses /api/v1/contacts/:id which returns { contact: {...}, message: "..." }
export async function getContactById(contactId: string): Promise<BridgeContact> {
  const data = await bridgeGet<{ contact: BridgeContact }>(`/api/v1/contacts/${contactId}`)
  return data.contact
}
