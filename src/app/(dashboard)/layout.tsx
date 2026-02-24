import { getSession } from '@/lib/auth/session'
import { TopNav } from '@/components/layout/top-nav'
import { Sidebar } from '@/components/layout/sidebar'
import { prisma } from '@/lib/db/prisma'
import type { SessionPayload } from '@/lib/auth/session'

const DEV_SESSION: SessionPayload = {
  userId: 'dev',
  email: 'dev@brdg.app',
  bridgeJwt: process.env.BRIDGE_API_KEY || '',
  firstName: 'Dev',
  lastName: 'User',
  role: 'admin',
  networkDomains: [],
}

async function getSidebarCounts() {
  if (!prisma) return undefined
  try {
    const [talent, jobs, portfolio] = await Promise.all([
      prisma.talentProfile.count(),
      prisma.job.count({ where: { status: 'active' } }),
      prisma.vcNetwork.count(),
    ])
    return { talent, jobs, portfolio }
  } catch {
    return undefined
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, counts] = await Promise.all([
    getSession(),
    getSidebarCounts(),
  ])

  return (
    <div className="min-h-screen bg-background">
      <TopNav session={session ?? DEV_SESSION} />
      <Sidebar counts={counts} />
      <main className="pt-14 pl-60 min-h-screen">
        {children}
      </main>
    </div>
  )
}
