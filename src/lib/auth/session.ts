import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { BridgeUser } from '@/lib/bridge-api/types'

const SESSION_COOKIE = 'bridge_talent_session'
const SESSION_SECRET = new TextEncoder().encode(
  process.env.JWT_SESSION_SECRET || process.env.BRIDGE_JWT_SECRET || 'dev-secret-change-in-production',
)
const SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days in seconds

export interface SessionPayload {
  userId: string
  email: string
  bridgeJwt: string
  firstName: string
  lastName: string
  profilePicUrl?: string
  // Role derived from Bridge network_domains
  role: 'talent' | 'company' | 'vc' | 'admin'
  networkDomains: string[]
  iat?: number
  exp?: number
}

export function deriveUserRole(user: BridgeUser): SessionPayload['role'] {
  if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) {
    return 'admin'
  }
  // VC/Fund managers have network domains with has_portfolios: true
  const hasVcAccess = user.network_domains?.some((nd) => nd.has_portfolios || nd.role === 'api_admin')
  if (hasVcAccess) return 'vc'

  // Investor network domains indicate VC role
  if (user.investor_network_domains && user.investor_network_domains.length > 0) {
    return 'vc'
  }

  // Companies are members/admins of network domains with portfolio flag
  const hasCompanyAccess = user.network_domains?.some((nd) => nd.role === 'member')
  if (hasCompanyAccess && user.global_profile?.company) return 'company'

  return 'talent'
}

export async function createSession(user: BridgeUser, bridgeJwt: string): Promise<string> {
  const role = deriveUserRole(user)

  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    bridgeJwt,
    firstName: user.first_name,
    lastName: user.last_name,
    profilePicUrl: user.profile_pic_url,
    role,
    networkDomains: user.network_domains?.map((nd) => nd.domain) ?? [],
  }

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(SESSION_SECRET)

  return token
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE
}
