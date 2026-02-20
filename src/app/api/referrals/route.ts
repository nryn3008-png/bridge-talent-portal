// GET /api/referrals — get referrals made by current user (or for current user's jobs)
// POST /api/referrals — create a referral (refer a talent to a job)

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
  const view = searchParams.get('view') || 'made' // 'made' | 'received' | 'job'
  const jobId = searchParams.get('jobId')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: any = {}

  if (view === 'made') {
    where = { referrerBridgeUserId: session.userId }
  } else if (view === 'received') {
    const profile = await prisma.talentProfile.findUnique({
      where: { bridgeUserId: session.userId },
      select: { id: true },
    })
    if (!profile) return NextResponse.json({ referrals: [] })
    where = { referredTalentId: profile.id }
  } else if (view === 'job' && jobId) {
    if (!['company', 'vc', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    where = { jobId }
  }

  const referrals = await prisma.referral.findMany({
    where,
    include: { job: { select: { id: true, title: true, companyDomain: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ referrals })
}

export async function POST(request: Request) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { jobId, referredTalentId, note, bridgeIntroId } = body

  if (!jobId || !referredTalentId) {
    return NextResponse.json(
      { error: 'jobId and referredTalentId are required' },
      { status: 400 },
    )
  }

  const [job, talent] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId }, select: { id: true, status: true } }),
    prisma.talentProfile.findUnique({ where: { id: referredTalentId }, select: { id: true } }),
  ])

  if (!job || job.status !== 'active') {
    return NextResponse.json({ error: 'Job not found or no longer active' }, { status: 404 })
  }
  if (!talent) {
    return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })
  }

  const referral = await prisma.referral.create({
    data: {
      jobId,
      referrerBridgeUserId: session.userId,
      referredTalentId,
      note: note || null,
      bridgeIntroId: bridgeIntroId || null,
      status: 'pending',
    },
  })

  return NextResponse.json({ referral }, { status: 201 })
}
