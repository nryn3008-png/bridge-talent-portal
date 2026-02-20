import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

// PATCH /api/talent/me — update current user's talent profile
export async function PATCH(request: Request) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { talentStatus, openToRoles, workPreference, skills, salaryMin, salaryMax, preferredLocations, visibility } = body

  const profile = await prisma.talentProfile.upsert({
    where: { bridgeUserId: session.userId },
    create: {
      bridgeUserId: session.userId,
      talentStatus: talentStatus ?? 'not_looking',
      openToRoles: openToRoles ?? [],
      workPreference: workPreference ?? null,
    },
    update: {
      ...(talentStatus !== undefined && { talentStatus }),
      ...(openToRoles !== undefined && { openToRoles }),
      ...(workPreference !== undefined && { workPreference }),
      ...(skills !== undefined && { skills }),
      ...(salaryMin !== undefined && { salaryMin }),
      ...(salaryMax !== undefined && { salaryMax }),
      ...(preferredLocations !== undefined && { preferredLocations }),
      ...(visibility !== undefined && { visibility }),
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({ profile })
}

// GET /api/talent/me
export async function GET() {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.talentProfile.findUnique({
    where: { bridgeUserId: session.userId },
  })

  return NextResponse.json({ profile })
}
