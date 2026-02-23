'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

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

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const query = (form.elements.namedItem('q') as HTMLInputElement).value
    updateParam('q', query)
  }

  function clearFilters() {
    router.push('/jobs')
  }

  const hasFilters = searchParams.toString().length > 0

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          name="q"
          placeholder="Search jobs..."
          defaultValue={searchParams.get('q') ?? ''}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Select
          value={searchParams.get('work_type') ?? 'all'}
          onValueChange={(v) => updateParam('work_type', v)}
        >
          <SelectTrigger className="w-36">
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
          <SelectTrigger className="w-36">
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
          <SelectTrigger className="w-36">
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
            <SelectTrigger className="w-44">
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
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
