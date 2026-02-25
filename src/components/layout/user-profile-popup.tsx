'use client'

import type { SessionPayload } from '@/lib/auth/session'
import type { BridgeUser, BridgeNetworkDomain } from '@/lib/bridge-api/types'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import {
  Crown,
  Building2,
  Briefcase,
  User,
  Settings,
  ChevronRight,
  ExternalLink,
  LogOut,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/* ─── Role config ──────────────────────────────────────────────── */

const ROLE_CONFIG = {
  admin: {
    icon: Crown,
    title: 'Admin',
    description: 'You have admin access to the portal',
    borderColor: 'border-l-[#E19500]',
    bgColor: 'bg-[#FCF4E6]',
    iconBg: 'bg-[#E19500]',
  },
  vc: {
    icon: Building2,
    title: 'VC Network Manager',
    description: 'You manage portfolio companies',
    borderColor: 'border-l-[#0038FF]',
    bgColor: 'bg-[#EEF4FF]',
    iconBg: 'bg-[#0038FF]',
  },
  company: {
    icon: Briefcase,
    title: 'Company Member',
    description: "You're part of a portfolio company",
    borderColor: 'border-l-[#568FFF]',
    bgColor: 'bg-[#EEF4FF]',
    iconBg: 'bg-[#568FFF]',
  },
  talent: {
    icon: User,
    title: 'Talent',
    description: "You're a Bridge network member",
    borderColor: 'border-l-[#B3B7C4]',
    bgColor: 'bg-[#F9F9FA]',
    iconBg: 'bg-[#81879C]',
  },
} as const

/* ─── Account helpers ──────────────────────────────────────────── */

interface AccountInfo {
  domain: string
  displayName: string
  email?: string
  isPrimary: boolean
}

function resolveConnectedAccounts(
  bridgeUser: BridgeUser,
  sessionEmail: string,
): { workAccounts: AccountInfo[]; personalEmail: AccountInfo | null } {
  // Guard: email_references may contain non-string entries from the API
  const rawEmailRefs = Array.isArray(bridgeUser.global_profile?.email_references)
    ? bridgeUser.global_profile.email_references
    : []
  const emailRefs = rawEmailRefs.filter((e): e is string => typeof e === 'string')

  // Guard: network_domains / investor_network_domains may contain malformed entries
  const rawDomains = [
    ...(Array.isArray(bridgeUser.network_domains) ? bridgeUser.network_domains : []),
    ...(Array.isArray(bridgeUser.investor_network_domains) ? bridgeUser.investor_network_domains : []),
  ]

  // Filter to only entries that have a valid domain string
  const allDomains = rawDomains.filter(
    (nd): nd is BridgeNetworkDomain => nd != null && typeof nd === 'object' && typeof nd.domain === 'string' && nd.domain.length > 0,
  )

  // Dedupe by domain
  const seen = new Set<string>()
  const uniqueDomains = allDomains.filter((nd) => {
    if (seen.has(nd.domain)) return false
    seen.add(nd.domain)
    return true
  })

  // Session email domain for primary detection
  const sessionDomain = typeof sessionEmail === 'string' && sessionEmail.includes('@')
    ? sessionEmail.split('@')[1]
    : ''

  // Build work accounts
  const workAccounts: AccountInfo[] = uniqueDomains.map((nd) => {
    const matchedEmail = emailRefs.find((e) => e.endsWith(`@${nd.domain}`))
    return {
      domain: nd.domain,
      displayName: typeof nd.name === 'string' && nd.name.length > 0 ? nd.name : nd.domain,
      email: matchedEmail,
      isPrimary: sessionDomain.length > 0 && nd.domain === sessionDomain,
    }
  })

  // Sort: primary first
  workAccounts.sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1))

  // Personal email = bridgeUser.email (unless it matches a work domain)
  const userEmail = typeof bridgeUser.email === 'string' ? bridgeUser.email : ''
  const userDomain = userEmail.includes('@') ? userEmail.split('@')[1] : ''
  const isWorkEmail = userDomain.length > 0 && uniqueDomains.some((nd) => nd.domain === userDomain)

  const personalEmail: AccountInfo | null =
    isWorkEmail || userEmail.length === 0
      ? null
      : {
          domain: userDomain,
          displayName: userEmail,
          email: undefined,
          isPrimary: false,
        }

  return { workAccounts, personalEmail }
}

/* ─── AccountRow ───────────────────────────────────────────────── */

function AccountRow({ domain, displayName, email, isPrimary }: AccountInfo) {
  const initial = (displayName[0] ?? '?').toUpperCase()
  return (
    <div className="flex items-center gap-2.5 py-1">
      {/* Favicon with initials fallback */}
      <div className="relative flex-shrink-0 w-8 h-8 rounded-lg bg-[#F2F3F5] flex items-center justify-center overflow-hidden">
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#81879C]">
          {initial}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          width={20}
          height={20}
          className="rounded-sm relative z-10"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-medium text-[#0D1531] truncate">{displayName}</p>
          {isPrimary && (
            <Badge variant="info" className="text-[10px] px-1.5 py-0 leading-[16px]">
              Primary
            </Badge>
          )}
        </div>
        {email && <p className="text-[11px] text-[#81879C] truncate">{email}</p>}
      </div>
    </div>
  )
}

/* ─── Skeleton rows ────────────────────────────────────────────── */

function AccountSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2.5 py-1">
          <div className="w-8 h-8 rounded-lg bg-[#F2F3F5] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-[#F2F3F5] rounded animate-pulse w-24" />
            <div className="h-2.5 bg-[#F2F3F5] rounded animate-pulse w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Main component ───────────────────────────────────────────── */

interface UserProfilePopupProps {
  session: SessionPayload
  onLogout: () => void
}

const STALE_TIME = 5 * 60 * 1000 // 5 minutes

export function UserProfilePopup({ session, onLogout }: UserProfilePopupProps) {
  const [bridgeUser, setBridgeUser] = useState<BridgeUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState(0)

  const initials = `${session.firstName?.[0] ?? ''}${session.lastName?.[0] ?? ''}`.toUpperCase()
  const fullName = `${session.firstName} ${session.lastName}`
  const roleConfig = ROLE_CONFIG[session.role] ?? ROLE_CONFIG.talent
  const RoleIcon = roleConfig.icon

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && Date.now() - lastFetched > STALE_TIME) {
        setIsLoading(true)
        fetch('/api/auth/me')
          .then((res) => {
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json()
          })
          .then((data) => {
            if (data && typeof data === 'object' && data.user) {
              setBridgeUser(data.user as BridgeUser)
              setLastFetched(Date.now())
            }
          })
          .catch(() => {
            // Silently fail — session data still shown
          })
          .finally(() => setIsLoading(false))
      }
    },
    [lastFetched],
  )

  // Resolve connected accounts when data available — wrapped in try/catch for safety
  let accounts: { workAccounts: AccountInfo[]; personalEmail: AccountInfo | null } | null = null
  if (bridgeUser) {
    try {
      accounts = resolveConnectedAccounts(bridgeUser, session.email)
    } catch {
      // If data shape is unexpected, fall back to no accounts
      accounts = { workAccounts: [], personalEmail: null }
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center rounded-[12px] p-1 hover:bg-[#F2F3F5] transition-colors duration-150 outline-none"
          aria-label="Account menu"
        >
          {session.profilePicUrl ? (
            <Image
              src={session.profilePicUrl}
              alt={fullName}
              width={28}
              height={28}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#F2F5FF] flex items-center justify-center">
              <span className="text-[#0038FF] font-semibold text-[11px]">{initials}</span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[340px] rounded-xl border-[#ECEDF0] shadow-[0px_3px_10px_rgba(0,0,0,0.1)] p-0 overflow-hidden"
      >
        {/* ── Section 1: Signed in as ── */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[11px] font-medium text-[#81879C] uppercase tracking-[0.5px] mb-3">
            Signed in as
          </p>
          <div className="flex items-center gap-3">
            {session.profilePicUrl ? (
              <Image
                src={session.profilePicUrl}
                alt={fullName}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#F2F5FF] flex items-center justify-center flex-shrink-0">
                <span className="text-[#0038FF] font-semibold text-[14px]">{initials}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#0D1531] truncate">{fullName}</p>
              <p className="text-[12px] text-[#81879C] truncate">{session.email}</p>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-[#ECEDF0]" />

        {/* ── Section 2: Access Status ── */}
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#81879C] uppercase tracking-[0.5px] mb-2">
            Access Status
          </p>
          <div
            className={`rounded-lg ${roleConfig.bgColor} ${roleConfig.borderColor} border-l-[3px] p-3`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-md ${roleConfig.iconBg} flex items-center justify-center flex-shrink-0`}
              >
                <RoleIcon className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0D1531]">{roleConfig.title}</p>
                <p className="text-[12px] text-[#676C7E]">{roleConfig.description}</p>
              </div>
            </div>
          </div>
          {session.role === 'admin' && (
            <Link
              href="/profile"
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#0038FF] hover:text-[#0036D7] transition-colors duration-150"
            >
              <Settings className="w-3 h-3" />
              Admin Controls
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-[#ECEDF0]" />

        {/* ── Section 3: Connected Accounts ── */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium text-[#81879C] uppercase tracking-[0.5px]">
              Connected Accounts
            </p>
            <Link
              href="/profile"
              className="text-[11px] font-medium text-[#0038FF] hover:text-[#0036D7] transition-colors duration-150"
            >
              Manage
            </Link>
          </div>

          {isLoading ? (
            <AccountSkeleton />
          ) : accounts ? (
            <>
              {/* WORK */}
              {accounts.workAccounts.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-[#B3B7C4] uppercase tracking-[0.5px] mb-1">
                    Work
                  </p>
                  {accounts.workAccounts.map((account) => (
                    <AccountRow key={account.domain} {...account} />
                  ))}
                </div>
              )}

              {/* PERSONAL */}
              {accounts.personalEmail && (
                <div>
                  <p className="text-[10px] font-semibold text-[#B3B7C4] uppercase tracking-[0.5px] mb-1">
                    Personal
                  </p>
                  <AccountRow {...accounts.personalEmail} />
                </div>
              )}

              {/* Fallback: no accounts at all */}
              {accounts.workAccounts.length === 0 && !accounts.personalEmail && (
                <p className="text-[12px] text-[#81879C] py-2">No connected accounts</p>
              )}
            </>
          ) : (
            // Before first fetch completes (e.g. session-only data)
            <div className="py-1">
              <p className="text-[12px] text-[#81879C]">
                {session.networkDomains.length > 0
                  ? `${session.networkDomains.length} connected account${session.networkDomains.length === 1 ? '' : 's'}`
                  : 'No connected accounts'}
              </p>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-[#ECEDF0]" />

        {/* ── Section 4: Footer ── */}
        <div className="px-4 py-3 space-y-0.5">
          <a
            href="https://brdg.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-1.5 rounded-md px-1 -mx-1 text-[13px] text-[#3D445A] hover:text-[#0D1531] hover:bg-[#F9F9FA] transition-colors duration-150"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#81879C]" />
            Bridge account
          </a>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 py-1.5 rounded-md px-1 -mx-1 text-[13px] text-[#3D445A] hover:text-[#0D1531] hover:bg-[#F9F9FA] transition-colors duration-150 w-full text-left"
          >
            <LogOut className="w-3.5 h-3.5 text-[#81879C]" />
            Sign out
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
