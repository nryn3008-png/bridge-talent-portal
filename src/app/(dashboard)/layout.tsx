import { getSession } from '@/lib/auth/session'
import { TopNav } from '@/components/layout/top-nav'
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = (await getSession()) ?? DEV_SESSION

  return (
    <div className="min-h-screen bg-background">
      <TopNav session={session} />
      <main className="pt-16 min-h-screen">
        {children}
      </main>
    </div>
  )
}
