'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  perPage: number
  /** Base path, e.g. "/talent" or "/jobs" */
  basePath: string
  /** Extra query params to preserve (serializable), e.g. { q: "react", role: "engineering" } */
  extraParams?: Record<string, string>
  perPageOptions?: number[]
}

/**
 * Pagination — Figma node 4894:2636
 *
 * Layout: "Page X of Y" + prev/next chevron buttons + rows-per-page dropdown
 * All pill-shaped (rounded-full), Slate 60 border (#B3B7C4)
 */
export function Pagination({
  page,
  totalPages,
  perPage,
  basePath,
  extraParams = {},
  perPageOptions = [10, 20, 50],
}: PaginationProps) {
  const router = useRouter()

  if (totalPages <= 1 && perPageOptions.length <= 1) return null

  function buildUrl(p: number, pp: number) {
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('per_page', String(pp))
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value)
    }
    return `${basePath}?${params.toString()}`
  }

  const isFirstPage = page <= 1
  const isLastPage = page >= totalPages

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center gap-4 mt-6"
    >
      {/* Page info — 14px Regular, Charcoal, tracking 0.4px */}
      <span className="text-[14px] font-normal text-[#0D1531] tracking-[0.4px] leading-[20px] whitespace-nowrap">
        Page {page} of {totalPages}
      </span>

      {/* Page actions */}
      <div className="flex items-center gap-2">
        {/* Previous page */}
        {isFirstPage ? (
          <span
            aria-disabled="true"
            className="inline-flex items-center justify-center px-2 py-1 rounded-full border border-[#B3B7C4] opacity-40 cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-[#0D1531]" />
          </span>
        ) : (
          <a
            href={buildUrl(page - 1, perPage)}
            aria-label="Previous page"
            className="inline-flex items-center justify-center px-2 py-1 rounded-full border border-[#B3B7C4] hover:bg-[#F9F9FA] transition-colors duration-150"
          >
            <ChevronLeft className="w-5 h-5 text-[#0D1531]" />
          </a>
        )}

        {/* Next page */}
        {isLastPage ? (
          <span
            aria-disabled="true"
            className="inline-flex items-center justify-center px-2 py-1 rounded-full border border-[#B3B7C4] opacity-40 cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-[#0D1531]" />
          </span>
        ) : (
          <a
            href={buildUrl(page + 1, perPage)}
            aria-label="Next page"
            className="inline-flex items-center justify-center px-2 py-1 rounded-full border border-[#B3B7C4] hover:bg-[#F9F9FA] transition-colors duration-150"
          >
            <ChevronRight className="w-5 h-5 text-[#0D1531]" />
          </a>
        )}

        {/* Rows per page dropdown */}
        <div className="relative">
          <select
            value={perPage}
            onChange={(e) => {
              const newPerPage = Number(e.target.value)
              router.push(buildUrl(1, newPerPage))
            }}
            aria-label="Rows per page"
            className="appearance-none bg-white border border-[#B3B7C4] rounded-full pl-3 pr-8 py-1 text-[14px] font-normal text-[#0D1531] tracking-[0.4px] leading-[24px] cursor-pointer hover:bg-[#F9F9FA] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#0038FF]/20 focus:border-[#0038FF]"
          >
            {perPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0D1531] pointer-events-none" />
        </div>
      </div>
    </nav>
  )
}
