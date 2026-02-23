'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface SyncPortfolioJobsButtonProps {
  vcDomain?: string // If set, sync only this VC's portfolio; otherwise sync all networks
  role: string
}

interface SyncResult {
  success: boolean
  discovered: number
  created: number
  updated: number
  errors: number
  error?: string
}

export function SyncPortfolioJobsButton({ vcDomain, role }: SyncPortfolioJobsButtonProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<SyncResult | null>(null)

  // Only show for vc/admin roles
  if (!['vc', 'admin'].includes(role)) return null

  async function handleSync() {
    setStatus('syncing')
    setResult(null)

    try {
      const body: Record<string, string> = { type: 'portfolio_jobs' }
      if (vcDomain) body.vcDomain = vcDomain

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setResult({ success: false, discovered: 0, created: 0, updated: 0, errors: 1, error: data.error || 'Sync failed' })
      } else {
        setStatus('done')
        setResult(data)
        // Refresh the page to show newly synced jobs
        router.refresh()
      }
    } catch (err) {
      setStatus('error')
      setResult({ success: false, discovered: 0, created: 0, updated: 0, errors: 1, error: 'Network error' })
    }

    // Reset after 8 seconds
    setTimeout(() => {
      setStatus('idle')
      setResult(null)
    }, 8000)
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleSync}
        disabled={status === 'syncing'}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        {status === 'syncing' ? (
          <>
            <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Syncing jobs...
          </>
        ) : (
          '🔄 Sync Portfolio Jobs'
        )}
      </Button>

      {status === 'done' && result && (
        <span className="text-xs text-green-600 font-medium">
          Discovered {result.discovered} {result.discovered === 1 ? 'company' : 'companies'}, synced {result.created + result.updated} {result.created + result.updated === 1 ? 'job' : 'jobs'}
        </span>
      )}

      {status === 'error' && result && (
        <span className="text-xs text-red-600 font-medium">
          {result.error}
        </span>
      )}
    </div>
  )
}
