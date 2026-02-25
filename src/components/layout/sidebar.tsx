'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Building2, HelpCircle } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: typeof Briefcase
  countKey: 'jobs' | 'portfolio'
}

const NAV_LINKS: NavItem[] = [
  { href: '/jobs', label: 'Jobs', icon: Briefcase, countKey: 'jobs' },
  { href: '/portfolio', label: 'Portfolio', icon: Building2, countKey: 'portfolio' },
]

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1).replace(/\.0$/, '')}K`
  }
  return String(n)
}

interface SidebarProps {
  counts?: {
    jobs?: number
    portfolio?: number
  }
}

export function Sidebar({ counts }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed top-14 left-0 bottom-0 w-60 bg-white border-r border-[#ECEDF0] z-40 flex flex-col">
      {/* Section label */}
      <div className="px-4 pt-3 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[#B3B7C4]">
          Admin
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 flex flex-col gap-1">
        {NAV_LINKS.map(({ href, label, icon: Icon, countKey }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          const count = counts?.[countKey]
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] tracking-[0.4px] transition-colors duration-150 ${
                isActive
                  ? 'bg-[#EDF1FF] text-[#0038FF] font-medium'
                  : 'text-[#3D445A] font-normal hover:bg-[#F9F9FA]'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#0038FF]' : 'text-[#81879C]'}`} />
              <span className="flex-1 min-w-0">{label}</span>
              {count !== undefined && count > 0 && (
                <span className="text-[#B3B7C4] text-[13px] font-normal tracking-[0.4px] flex-shrink-0">
                  {formatCount(count)}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer — Need help? */}
      <div className="border-t border-[#ECEDF0] px-3 py-2">
        <a
          href="mailto:support@brdg.app"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-normal text-[#3D445A] tracking-[0.4px] hover:bg-[#F9F9FA] transition-colors duration-150"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0 text-[#81879C]" />
          <span>Need help?</span>
        </a>
      </div>
    </aside>
  )
}
