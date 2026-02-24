'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'

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
    } catch {
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
        className="text-[12px]"
      >
        {status === 'syncing' ? (
          <>
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            Syncing jobs...
          </>
        ) : (
          <>
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Sync Portfolio Jobs
          </>
        )}
      </Button>

      {status === 'done' && result && (
        <span className="text-[12px] text-[#0D7C47] font-medium">
          Discovered {result.discovered} {result.discovered === 1 ? 'company' : 'companies'}, synced {result.created + result.updated} {result.created + result.updated === 1 ? 'job' : 'jobs'}
        </span>
      )}

      {status === 'error' && result && (
        <span className="text-[12px] text-[#D93025] font-medium">
          {result.error}
        </span>
      )}
    </div>
  )
}
