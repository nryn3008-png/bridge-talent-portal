'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

export function TalentSearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const query = (form.elements.namedItem('q') as HTMLInputElement).value
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('q', query)
    } else {
      params.delete('q')
    }
    params.delete('page')
    router.push(`/talent?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex-1 min-w-0">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9FB0] pointer-events-none" />
        <input
          name="q"
          type="search"
          placeholder="Search by name, role or company..."
          defaultValue={searchParams.get('q') ?? ''}
          className="w-full h-[39px] pl-11 pr-4 rounded-full border border-[#ECEDF0] bg-white text-[14px] text-[#0D1531] tracking-[0.4px] placeholder:text-[#9A9FB0] outline-none transition-all duration-150 hover:border-[#0038FF]/40 focus:border-[#0038FF] focus:ring-2 focus:ring-[#0038FF]/20 focus:bg-white"
        />
      </div>
    </form>
  )
}
