// GET /api/pools/[id]/members — list members of a talent pool
// POST /api/pools/[id]/members — add a talent to the pool
// DELETE /api/pools/[id]/members?talentId= — remove a talent from the pool

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session || !['vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: poolId } = await params

  const pool = await prisma.talentPool.findUnique({ where: { id: poolId } })
  if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })

  const members = await prisma.talentPoolMember.findMany({
    where: { poolId },
    include: { talentProfile: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ members })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session || !['vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: poolId } = await params
  const body = await request.json()
  const { talentId, note } = body

  if (!talentId) {
    return NextResponse.json({ error: 'talentId is required' }, { status: 400 })
  }

  const [pool, talent] = await Promise.all([
    prisma.talentPool.findUnique({ where: { id: poolId } }),
    prisma.talentProfile.findUnique({ where: { id: talentId }, select: { id: true } }),
  ])

  if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
  if (!talent) return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })

  const member = await prisma.talentPoolMember.upsert({
    where: { poolId_talentId: { poolId, talentId } },
    create: {
      poolId,
      talentId,
      addedBy: session.userId,
      note: note || null,
    },
    update: {
      note: note || null,
    },
  })

  return NextResponse.json({ member }, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session || !['vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: poolId } = await params
  const { searchParams } = new URL(request.url)
  const talentId = searchParams.get('talentId')

  if (!talentId) {
    return NextResponse.json({ error: 'talentId query param required' }, { status: 400 })
  }

  const existing = await prisma.talentPoolMember.findUnique({
    where: { poolId_talentId: { poolId, talentId } },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Member not found in pool' }, { status: 404 })
  }

  await prisma.talentPoolMember.delete({
    where: { poolId_talentId: { poolId, talentId } },
  })

  return NextResponse.json({ success: true })
}
