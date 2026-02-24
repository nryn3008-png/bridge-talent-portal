'use client'

import type { SessionPayload } from '@/lib/auth/session'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { User, LogOut, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopNavProps {
  session: SessionPayload
}

const isDev = process.env.NODE_ENV !== 'production'

interface ApiHealth {
  status: 'checking' | 'ok' | 'error'
  apiUrl?: string
  responseTime?: number
  error?: string
  lastChecked?: string
}

function ApiHealthBadge() {
  const [health, setHealth] = useState<ApiHealth>({ status: 'checking' })
  const [isHovered, setIsHovered] = useState(false)

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setHealth({
        status: data.status === 'ok' ? 'ok' : 'error',
        apiUrl: data.apiUrl,
        responseTime: data.responseTime,
        error: data.error,
        lastChecked: new Date().toLocaleTimeString(),
      })
    } catch {
      setHealth((prev) => ({
        ...prev,
        status: 'error',
        error: 'Health endpoint unreachable',
        lastChecked: new Date().toLocaleTimeString(),
      }))
    }
  }, [])

  useEffect(() => {
    if (!isDev) return
    checkHealth()
    const interval = setInterval(checkHealth, 30_000)
    return () => clearInterval(interval)
  }, [checkHealth])

  // Dot + label colors per status
  const dotColor =
    health.status === 'ok'
      ? 'bg-[#0EA02E]'
      : health.status === 'error'
        ? 'bg-[#E13535]'
        : 'bg-[#E19500]'
  const textColor =
    health.status === 'ok'
      ? 'text-[#0EA02E]'
      : health.status === 'error'
        ? 'text-[#E13535]'
        : 'text-[#E19500]'
  const label =
    health.status === 'ok'
      ? 'API Online'
      : health.status === 'error'
        ? 'API Offline'
        : 'Checking...'

  // Production: hide entirely
  if (!isDev) return null

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badge trigger */}
      <button
        onClick={checkHealth}
        className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity duration-150"
      >
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor} ${health.status === 'checking' ? 'animate-pulse' : ''}`} />
        <span className={`text-[12px] font-medium ${textColor} tracking-[-0.16px]`}>
          {label}
        </span>
      </button>

      {/* Hover popover — dev only */}
      {isHovered && (
        <div className="absolute top-full right-0 mt-2 w-[260px] bg-white rounded-xl border border-[#ECEDF0] shadow-[0px_3px_10px_rgba(0,0,0,0.1)] p-4 z-50">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-[#0D1531]">Bridge API Status</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                checkHealth()
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#F2F3F5] transition-colors duration-150"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3 text-[#81879C]" />
            </button>
          </div>

          {/* Status rows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#81879C]">Status</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                <span className={`text-[12px] font-medium ${textColor}`}>
                  {health.status === 'ok' ? 'Healthy' : health.status === 'error' ? 'Unreachable' : 'Checking'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#81879C]">URL</span>
              <span className="text-[12px] font-medium text-[#0D1531] truncate max-w-[160px]">
                {health.apiUrl ?? '—'}
              </span>
            </div>

            {health.responseTime !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#81879C]">Response time</span>
                <span className={`text-[12px] font-medium ${health.responseTime < 500 ? 'text-[#0EA02E]' : health.responseTime < 2000 ? 'text-[#E19500]' : 'text-[#E13535]'}`}>
                  {health.responseTime}ms
                </span>
              </div>
            )}

            {health.lastChecked && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#81879C]">Last checked</span>
                <span className="text-[12px] text-[#0D1531]">{health.lastChecked}</span>
              </div>
            )}

            {health.error && (
              <div className="mt-2 p-2 rounded-lg bg-[#FCEBEB] border border-[#F5C6C6]">
                <p className="text-[11px] text-[#9E0000] break-words">{health.error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-[#ECEDF0]">
            <p className="text-[11px] text-[#B3B7C4]">
              Dev only — auto-refreshes every 30s
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function TopNav({ session }: TopNavProps) {
  const router = useRouter()
  const initials = `${session.firstName?.[0] ?? ''}${session.lastName?.[0] ?? ''}`.toUpperCase()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
    toast.success('Signed out')
  }

  return (
    <header className="h-14 bg-white border-b border-[rgba(236,237,240,0.6)] flex items-center px-8 fixed top-0 left-0 right-0 z-50">
      {/* Left — Logo + divider + subtitle */}
      <div className="flex items-center gap-4">
        <Link href="/talent" className="flex items-center flex-shrink-0">
          <Image
            src="/logos/bridge-logo.svg"
            alt="Bridge"
            width={114}
            height={20}
            className="h-5 w-auto"
            priority
          />
        </Link>
        <div className="w-px h-5 bg-[#ECEDF0]" />
        <span className="text-[12px] font-normal text-[#81879C] tracking-[0.4px]">
          Talent &amp; Job Board
        </span>
      </div>

      <div className="flex-1" />

      {/* Right — API badge + divider + user avatar */}
      <div className="flex items-center gap-3">
        {isDev && (
          <>
            <ApiHealthBadge />
            <div className="w-px h-7 border-l border-[#ECEDF0]" />
          </>
        )}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center rounded-[12px] p-1 hover:bg-[#F2F3F5] transition-colors duration-150 outline-none">
              {session.profilePicUrl ? (
                <Image
                  src={session.profilePicUrl}
                  alt={`${session.firstName} ${session.lastName}`}
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

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">
                  {session.firstName} {session.lastName}
                </p>
                <p className="text-xs text-muted-foreground leading-none truncate">
                  {session.email}
                </p>
                <span className="inline-flex items-center mt-1.5 w-fit px-2 py-0.5 rounded text-xs font-medium capitalize bg-[#E6EBFF] text-[#0038FF]">
                  {session.role}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Your Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
