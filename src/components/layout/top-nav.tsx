'use client'

import type { SessionPayload } from '@/lib/auth/session'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { User, LogOut, ChevronDown } from 'lucide-react'
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

const NAV_LINKS = [
  { href: '/talent', label: 'Talent Directory' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/portfolio', label: 'Portfolio' },
] as const

export function TopNav({ session }: TopNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const initials = `${session.firstName?.[0] ?? ''}${session.lastName?.[0] ?? ''}`.toUpperCase()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
    toast.success('Signed out')
  }

  return (
    <header className="h-16 glass-nav flex items-center px-6 fixed top-0 left-0 right-0 z-50">
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
      <nav className="hidden sm:flex items-center gap-1 mr-4">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary rounded-full'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full p-1 hover:bg-muted/60 transition-colors outline-none">
            {session.profilePicUrl ? (
              <Image
                src={session.profilePicUrl}
                alt={`${session.firstName} ${session.lastName}`}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">{initials}</span>
              </div>
            )}
            <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
              {session.firstName}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
              <span className="inline-flex items-center mt-1.5 w-fit px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-primary/10 text-primary">
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
    </header>
  )
}
