// GET /api/pools — list talent pools (vc/admin only)
// POST /api/pools — create a talent pool

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session || !['vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pools = await prisma.talentPool.findMany({
    where: {
      ...(session.role === 'vc' && {
        networkDomain: { in: session.networkDomains },
      }),
    },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ pools })
}

export async function POST(request: Request) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session || !['vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, networkDomain, visibility = 'vc_only', autoRules } = body

  if (!name || !networkDomain) {
    return NextResponse.json({ error: 'name and networkDomain are required' }, { status: 400 })
  }

  const pool = await prisma.talentPool.create({
    data: {
      name,
      description: description || null,
      createdBy: session.userId,
      networkDomain,
      visibility,
      autoRules: autoRules || null,
    },
  })

  return NextResponse.json({ pool }, { status: 201 })
}
