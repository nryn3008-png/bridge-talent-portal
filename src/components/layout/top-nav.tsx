'use client'

import type { SessionPayload } from '@/lib/auth/session'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface TopNavProps {
  session: SessionPayload
}

export function TopNav({ session }: TopNavProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const initials = `${session.firstName?.[0] ?? ''}${session.lastName?.[0] ?? ''}`.toUpperCase()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
    toast.success('Signed out')
  }

  return (
    <header className="h-16 border-b bg-card flex items-center px-6 fixed top-0 left-0 right-0 z-50">
      {/* Logo */}
      <Link href="/talent" className="flex items-center flex-shrink-0">
        <Image
          src="/logos/bridge-logo.svg"
          alt="Bridge"
          width={143}
          height={25}
          className="h-6 w-auto"
          priority
        />
      </Link>

      <div className="flex-1" />

      {/* Nav links */}
      <Link
        href="/talent"
        className="hidden sm:flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mr-4"
      >
        Talent Directory
      </Link>
      <Link
        href="/jobs"
        className="hidden sm:flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mr-4"
      >
        Jobs
      </Link>
      <Link
        href="/portfolio"
        className="hidden sm:flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mr-4"
      >
        Portfolio
      </Link>

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-full p-1 hover:bg-muted transition-colors"
        >
          {session.profilePicUrl ? (
            <Image
              src={session.profilePicUrl}
              alt={`${session.firstName} ${session.lastName}`}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">{initials}</span>
            </div>
          )}
          <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
            {session.firstName}
          </span>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-card shadow-lg py-1 z-50">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium truncate">
                {session.firstName} {session.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{session.email}</p>
              <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-primary/10 text-primary">
                {session.role}
              </span>
            </div>
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Your Profile
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
