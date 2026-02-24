'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface RoleCategoryInfo {
  id: string
  label: string
}

interface RoleFilterDropdownProps {
  roleCategories: RoleCategoryInfo[]
  activeRole?: string
}

export function RoleFilterDropdown({ roleCategories, activeRole }: RoleFilterDropdownProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeLabel = roleCategories.find((c) => c.id === activeRole)?.label

  function handleSelect(roleId?: string) {
    const params = new URLSearchParams()
    const q = searchParams.get('q')
    if (q) params.set('q', q)
    if (roleId) params.set('role', roleId)
    const company = searchParams.get('company')
    if (company) params.set('company', company)
    const qs = params.toString()
    router.push(`/talent${qs ? `?${qs}` : ''}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 h-[37px] px-4 rounded-full border transition-all duration-150 flex-shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038FF] ${
            activeRole
              ? 'bg-[#F2F5FF] border-[#0038FF]/30 text-[#0038FF]'
              : 'bg-white border-[#ECEDF0] text-[#3D445A] hover:border-[#D9DBE1]'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[13px] font-bold">{activeLabel || 'Role'}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuItem
          onClick={() => handleSelect()}
          className="flex items-center justify-between text-[13px]"
        >
          <span className={!activeRole ? 'font-bold text-[#0D1531]' : ''}>All Roles</span>
          {!activeRole && <Check className="w-3.5 h-3.5 text-[#0038FF]" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {roleCategories.map((cat) => (
          <DropdownMenuItem
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className="flex items-center justify-between text-[13px]"
          >
            <span className={activeRole === cat.id ? 'font-bold text-[#0D1531]' : ''}>
              {cat.label}
            </span>
            {activeRole === cat.id && <Check className="w-3.5 h-3.5 text-[#0038FF]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
