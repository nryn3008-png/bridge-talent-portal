// PATCH /api/applications/[id] — update application status (company/vc/admin)
// Talent can only withdraw their own application

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { status } = body

  const application = await prisma.application.findUnique({
    where: { id },
    include: { job: { select: { companyDomain: true, postedBy: true } } },
  })

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  // Talent can only withdraw their own application
  if (session.role === 'talent') {
    if (application.bridgeUserId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (status !== 'withdrawn') {
      return NextResponse.json(
        { error: 'Talent can only withdraw applications' },
        { status: 403 },
      )
    }
    const updated = await prisma.application.update({
      where: { id },
      data: { status: 'withdrawn' },
    })
    return NextResponse.json({ application: updated })
  }

  // Company/VC/Admin can update to any valid status
  if (!['company', 'vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const validStatuses = ['applied', 'reviewed', 'interviewing', 'offered', 'hired', 'rejected']
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(', ')}` },
      { status: 400 },
    )
  }

  const now = new Date()
  const updated = await prisma.application.update({
    where: { id },
    data: {
      status,
      ...(status === 'reviewed' && { reviewedAt: now }),
      ...(['offered', 'rejected', 'hired'].includes(status) && { respondedAt: now }),
    },
  })

  return NextResponse.json({ application: updated })
}
