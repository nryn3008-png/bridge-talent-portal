import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

// POST /api/jobs/[id]/apply — one-click apply
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: jobId } = await params
  const body = await request.json().catch(() => ({}))
  const { coverNote, resumeUrl, screeningAnswers } = body as {
    coverNote?: string
    resumeUrl?: string
    screeningAnswers?: Record<string, unknown>
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job || job.status !== 'active') {
    return NextResponse.json({ error: 'Job not found or no longer active' }, { status: 404 })
  }

  // Get or create talent profile
  let talentProfile = await prisma.talentProfile.findUnique({
    where: { bridgeUserId: session.userId },
  })

  if (!talentProfile) {
    talentProfile = await prisma.talentProfile.create({
      data: { bridgeUserId: session.userId },
    })
  }

  // Check if already applied
  const existing = await prisma.application.findUnique({
    where: { jobId_talentId: { jobId, talentId: talentProfile.id } },
  })

  if (existing) {
    return NextResponse.json({ error: 'You have already applied to this job' }, { status: 409 })
  }

  const [application] = await prisma.$transaction([
    prisma.application.create({
      data: {
        jobId,
        talentId: talentProfile.id,
        bridgeUserId: session.userId,
        coverNote: coverNote || null,
        resumeUrl: resumeUrl || null,
        screeningAnswers: (screeningAnswers as object) || {},
        status: 'applied',
      },
    }),
    prisma.job.update({ where: { id: jobId }, data: { applyCount: { increment: 1 } } }),
  ])

  return NextResponse.json({ application }, { status: 201 })
}
