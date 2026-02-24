'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, List } from 'lucide-react'

interface ViewToggleProps {
  activeView: string
}

export function ViewToggle({ activeView }: ViewToggleProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleViewChange(view: string) {
    const params = new URLSearchParams()
    const q = searchParams.get('q')
    if (q) params.set('q', q)
    if (view === 'companies') {
      params.set('view', 'companies')
    }
    const qs = params.toString()
    router.push(`/talent${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="inline-flex items-center gap-1 p-[3px] rounded-full bg-[#F9F9FA] border border-[#ECEDF0] h-[37px] flex-shrink-0">
      <button
        onClick={() => handleViewChange('people')}
        className={`inline-flex items-center gap-1.5 px-3 h-[31px] text-[13px] font-bold rounded-full transition-all duration-150 ${
          activeView === 'people'
            ? 'bg-white text-[#0D1531] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]'
            : 'text-[#81879C] hover:text-[#0D1531]'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        People
      </button>
      <button
        onClick={() => handleViewChange('companies')}
        className={`inline-flex items-center gap-1.5 px-3 h-[31px] text-[13px] font-bold rounded-full transition-all duration-150 ${
          activeView === 'companies'
            ? 'bg-white text-[#0D1531] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]'
            : 'text-[#81879C] hover:text-[#0D1531]'
        }`}
      >
        <List className="w-3.5 h-3.5" />
        Companies
      </button>
    </div>
  )
}
