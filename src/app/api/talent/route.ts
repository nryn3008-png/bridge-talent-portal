import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

// GET /api/talent — search talent directory from local DB (company/vc/admin only)
// Data is populated by /api/sync (bulk or delta sync from Bridge API).
export async function GET(request: Request) {
  const session = await getSession()
  if (!session || !['company', 'vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!prisma) {
    return NextResponse.json(
      { error: 'Database not configured. Set DATABASE_URL in .env.local.' },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const perPage = Math.min(50, parseInt(searchParams.get('per_page') || '24'))

  try {
    const [total, profiles] = await Promise.all([
      prisma.talentProfile.count(),
      prisma.talentProfile.findMany({
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: [{ referralScore: 'desc' }, { profileCompleteness: 'desc' }, { updatedAt: 'desc' }],
      }),
    ])

    return NextResponse.json({
      members: profiles.map((p) => ({ id: p.bridgeUserId })),
      total,
      page,
      per_page: perPage,
    })
  } catch (err) {
    console.error('[api/talent] DB error:', err)
    return NextResponse.json({ error: 'Failed to query talent directory' }, { status: 500 })
  }
}
