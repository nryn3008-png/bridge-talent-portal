'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

interface VcNetwork {
  domain: string
  name: string
}

interface JobFiltersProps {
  vcNetworks?: VcNetwork[]
}

export function JobFilters({ vcNetworks }: JobFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`/jobs?${params.toString()}`)
    },
    [router, searchParams],
  )

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      updateParam('q', e.currentTarget.value)
    }
  }

  function clearFilters() {
    router.push('/jobs')
  }

  const hasFilters = searchParams.toString().length > 0

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search — pill shape, matches TalentSearchBar pattern */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#81879C]" />
        <input
          type="text"
          placeholder="Search jobs..."
          defaultValue={searchParams.get('q') ?? ''}
          onKeyDown={handleSearch}
          className="w-full h-[39px] pl-9 pr-3 rounded-full bg-white border border-[#ECEDF0] text-[14px] text-[#0D1531] placeholder:text-[#B3B7C4] tracking-[0.4px] focus:outline-none focus:ring-2 focus:ring-[#0038FF]/20 focus:border-[#0038FF] transition-colors duration-150"
        />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-[#ECEDF0] flex-shrink-0" />

      {/* Filter selects */}
      <Select
        value={searchParams.get('work_type') ?? 'all'}
        onValueChange={(v) => updateParam('work_type', v)}
      >
        <SelectTrigger className="w-[120px] h-[39px] rounded-full bg-white border-[#ECEDF0] text-[13px] text-[#0D1531]">
          <SelectValue placeholder="Work type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="remote">Remote</SelectItem>
          <SelectItem value="hybrid">Hybrid</SelectItem>
          <SelectItem value="onsite">On-site</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('employment_type') ?? 'all'}
        onValueChange={(v) => updateParam('employment_type', v)}
      >
        <SelectTrigger className="w-[120px] h-[39px] rounded-full bg-white border-[#ECEDF0] text-[13px] text-[#0D1531]">
          <SelectValue placeholder="Job type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All jobs</SelectItem>
          <SelectItem value="full_time">Full-time</SelectItem>
          <SelectItem value="part_time">Part-time</SelectItem>
          <SelectItem value="contract">Contract</SelectItem>
          <SelectItem value="internship">Internship</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('experience_level') ?? 'all'}
        onValueChange={(v) => updateParam('experience_level', v)}
      >
        <SelectTrigger className="w-[120px] h-[39px] rounded-full bg-white border-[#ECEDF0] text-[13px] text-[#0D1531]">
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All levels</SelectItem>
          <SelectItem value="entry">Entry</SelectItem>
          <SelectItem value="mid">Mid</SelectItem>
          <SelectItem value="senior">Senior</SelectItem>
          <SelectItem value="lead">Lead / Staff</SelectItem>
          <SelectItem value="executive">Executive</SelectItem>
        </SelectContent>
      </Select>

      {vcNetworks && vcNetworks.length > 0 && (
        <Select
          value={searchParams.get('vc') ?? 'all'}
          onValueChange={(v) => updateParam('vc', v)}
        >
          <SelectTrigger className="w-[160px] h-[39px] rounded-full bg-white border-[#ECEDF0] text-[13px] text-[#0D1531]">
            <SelectValue placeholder="VC Network" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Networks</SelectItem>
            {vcNetworks.map((vc) => (
              <SelectItem key={vc.domain} value={vc.domain}>
                {vc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1 h-[31px] px-3 text-[13px] font-medium text-[#81879C] hover:text-[#0D1531] rounded-full hover:bg-[#F2F3F5] transition-colors duration-150"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  )
}
