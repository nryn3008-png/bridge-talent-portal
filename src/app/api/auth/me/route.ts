import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getCurrentUser } from '@/lib/bridge-api/users'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await getCurrentUser(session.bridgeJwt)
    return NextResponse.json({ user, session: { role: session.role, networkDomains: session.networkDomains } })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
