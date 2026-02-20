import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

// GET /api/jobs/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Increment view count
  await prisma.job.update({ where: { id }, data: { viewCount: { increment: 1 } } })

  return NextResponse.json({ job })
}

// PATCH /api/jobs/[id] — update job (poster or admin)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  if (job.postedBy !== session.userId && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const updated = await prisma.job.update({ where: { id }, data: body })
  return NextResponse.json({ job: updated })
}
