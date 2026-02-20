'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
    <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
      <Input
        name="q"
        placeholder="Search by name, role, company, skills..."
        defaultValue={searchParams.get('q') ?? ''}
        className="flex-1"
      />
      <Button type="submit">Search</Button>
      {searchParams.toString() && (
        <Button type="button" variant="ghost" onClick={() => router.push('/talent')}>
          Clear
        </Button>
      )}
    </form>
  )
}
