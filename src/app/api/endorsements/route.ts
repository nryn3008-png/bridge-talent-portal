// GET /api/endorsements?talentId= — get endorsements for a talent profile
// POST /api/endorsements — create an endorsement (vc/founder/peer)

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: Request) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const talentId = searchParams.get('talentId')

  if (!talentId) {
    return NextResponse.json({ error: 'talentId query param required' }, { status: 400 })
  }

  const endorsements = await prisma.endorsement.findMany({
    where: { talentId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ endorsements })
}

export async function POST(request: Request) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { talentId, endorserType, endorsementText, skillsEndorsed = [], relationship } = body

  if (!talentId || !endorserType) {
    return NextResponse.json(
      { error: 'talentId and endorserType are required' },
      { status: 400 },
    )
  }

  const validTypes = ['vc_partner', 'founder', 'peer', 'colleague']
  if (!validTypes.includes(endorserType)) {
    return NextResponse.json(
      { error: `endorserType must be one of: ${validTypes.join(', ')}` },
      { status: 400 },
    )
  }

  const talentProfile = await prisma.talentProfile.findUnique({
    where: { id: talentId },
    select: { id: true },
  })
  if (!talentProfile) {
    return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })
  }

  // VC partners automatically get isVerified = true
  const isVerified = session.role === 'vc' || session.role === 'admin'

  const endorsement = await prisma.endorsement.create({
    data: {
      talentId,
      endorserBridgeUserId: session.userId,
      endorserType,
      endorsementText: endorsementText || null,
      skillsEndorsed,
      relationship: relationship || null,
      isVerified,
    },
  })

  return NextResponse.json({ endorsement }, { status: 201 })
}
