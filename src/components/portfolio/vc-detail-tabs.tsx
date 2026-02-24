'use client'

import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface VcDetailTabsProps {
  vcDomain: string
  activeTab: string
  jobCount: number
  companyCount: number
  talentCount: number
}

export function VcDetailTabs({
  vcDomain,
  activeTab,
  jobCount,
  companyCount,
  talentCount,
}: VcDetailTabsProps) {
  const base = `/portfolio/${encodeURIComponent(vcDomain)}`

  return (
    <Tabs value={activeTab} className="mb-8">
      <TabsList variant="line">
        <TabsTrigger value="jobs" asChild>
          <Link href={`${base}?tab=jobs`}>
            Jobs ({jobCount.toLocaleString()})
          </Link>
        </TabsTrigger>
        <TabsTrigger value="companies" asChild>
          <Link href={`${base}?tab=companies`}>
            Portfolio Companies ({companyCount.toLocaleString()})
          </Link>
        </TabsTrigger>
        <TabsTrigger value="talent" asChild>
          <Link href={`${base}?tab=talent`}>
            Talent Network ({talentCount.toLocaleString()})
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
