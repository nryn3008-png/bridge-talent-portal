import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/bridge-api/users'

// GET /api/talent/[id] — fetch a talent's Bridge profile
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !['company', 'vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let user
  try {
    user = await getUserById(id, session.bridgeJwt)
  } catch (err) {
    const status = err instanceof Error && err.message.includes('403') ? 403 : 404
    return NextResponse.json(
      { error: 'Profile not found or access restricted' },
      { status },
    )
  }

  // Respect ICP public flag — don't expose private ICP data
  if (user.icp && !user.icp.public) {
    user.icp = undefined
  }

  return NextResponse.json({ user })
}
