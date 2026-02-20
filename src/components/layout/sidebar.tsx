'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { SessionPayload } from '@/lib/auth/session'

interface SidebarProps {
  session: SessionPayload
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = pathname === '/talent' || pathname.startsWith('/talent/')

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
    toast.success('Signed out')
  }

  return (
    <aside className="flex flex-col w-[240px] min-h-[calc(100vh-64px)] bg-card border-r flex-shrink-0">
      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <Link href="/talent">
          <span
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary border-l-[3px] border-primary rounded-l-none -ml-3 pl-[calc(0.75rem+1px)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <span className="text-base">👥</span>
            Talent Directory
          </span>
        </Link>
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t space-y-2">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">
            {session.firstName} {session.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{session.email}</p>
          <span
            className={cn(
              'inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize',
              session.role === 'vc' && 'badge-vc',
              session.role === 'company' && 'bg-orange-50 text-orange-700 border border-orange-200',
              session.role === 'talent' && 'bg-green-50 text-green-700 border border-green-200',
              session.role === 'admin' && 'bg-gray-100 text-gray-700 border border-gray-200',
            )}
          >
            {session.role}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
        >
          Sign out
        </Button>
      </div>
    </aside>
  )
}
