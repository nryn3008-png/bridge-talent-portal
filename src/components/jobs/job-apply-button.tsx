'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface JobApplyButtonProps {
  jobId: string
  externalUrl?: string | null
}

export function JobApplyButton({ jobId, externalUrl }: JobApplyButtonProps) {
  const router = useRouter()
  const [coverNote, setCoverNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleApply() {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverNote: coverNote.trim() || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Application failed')
        return
      }

      toast.success('Application submitted!')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Add a brief note (optional)..."
        value={coverNote}
        onChange={(e) => setCoverNote(e.target.value)}
        rows={3}
        maxLength={500}
      />
      <div className="flex gap-2">
        <Button onClick={handleApply} disabled={loading} className="flex-1">
          {loading ? 'Submitting...' : 'Apply with Bridge Profile'}
        </Button>
        {externalUrl && (
          <a href={externalUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">Apply externally</Button>
          </a>
        )}
      </div>
    </div>
  )
}
