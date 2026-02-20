// GET /api/applications — list applications (talent sees own, company/vc sees job apps)

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
  const jobId = searchParams.get('jobId')
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const perPage = Math.min(50, parseInt(searchParams.get('per_page') || '20'))

  // Talent sees their own applications
  if (session.role === 'talent') {
    const profile = await prisma.talentProfile.findUnique({
      where: { bridgeUserId: session.userId },
      select: { id: true },
    })
    if (!profile) return NextResponse.json({ applications: [], total: 0 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      talentId: profile.id,
      ...(status && { status }),
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: { job: { select: { id: true, title: true, companyDomain: true, workType: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.application.count({ where }),
    ])

    return NextResponse.json({ applications, total, page, perPage })
  }

  // Company / VC / Admin — see applications for jobs they manage
  if (!['company', 'vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    ...(jobId && { jobId }),
    ...(status && { status }),
    // Restrict company users to their own domain's jobs
    ...(session.role === 'company' && {
      job: { companyDomain: { in: session.networkDomains } },
    }),
  }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        job: { select: { id: true, title: true, companyDomain: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.application.count({ where }),
  ])

  return NextResponse.json({ applications, total, page, perPage })
}
