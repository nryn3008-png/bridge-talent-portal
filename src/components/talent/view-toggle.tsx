'use client'

import { useRouter, useSearchParams } from 'next/navigation'

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
      // Drop role and company params — not applicable to companies view
    }
    // For people view, don't set view param (it's the default)
    const qs = params.toString()
    router.push(`/talent${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="flex gap-1 border-b mb-4">
      <button
        onClick={() => handleViewChange('people')}
        className={`px-4 py-2 text-sm font-medium transition-colors relative ${
          activeView === 'people'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        People
        {activeView === 'people' && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
        )}
      </button>
      <button
        onClick={() => handleViewChange('companies')}
        className={`px-4 py-2 text-sm font-medium transition-colors relative ${
          activeView === 'companies'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Companies
        {activeView === 'companies' && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
        )}
      </button>
    </div>
  )
}
