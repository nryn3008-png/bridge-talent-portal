import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

// GET /api/jobs — list jobs with filters
export async function GET(request: Request) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const workType = searchParams.get('work_type') || ''
  const employmentType = searchParams.get('employment_type') || ''
  const experienceLevel = searchParams.get('experience_level') || ''
  const department = searchParams.get('department') || ''
  const companyDomain = searchParams.get('company') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const perPage = Math.min(50, parseInt(searchParams.get('per_page') || '20'))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: 'active',
    ...(query && {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    }),
    ...(workType && { workType }),
    ...(employmentType && { employmentType }),
    ...(experienceLevel && { experienceLevel }),
    ...(department && { department: { contains: department, mode: 'insensitive' } }),
    ...(companyDomain && { companyDomain }),
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.job.count({ where }),
  ])

  return NextResponse.json({ jobs, total, page, perPage })
}

// POST /api/jobs — create a new job (company/vc/admin only)
export async function POST(request: Request) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session || !['company', 'vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const {
    title,
    description,
    requirements,
    department,
    employmentType,
    experienceLevel,
    salaryMin,
    salaryMax,
    salaryCurrency = 'USD',
    showSalary = true,
    location,
    workType,
    skillsRequired = [],
    applyUrl,
    expiresAt,
    visibility = 'network',
    companyDomain,
  } = body

  if (!title || !description) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
  }

  const job = await prisma.job.create({
    data: {
      title,
      description,
      requirements: requirements || null,
      department: department || null,
      employmentType: employmentType || null,
      experienceLevel: experienceLevel || null,
      salaryMin: salaryMin ? parseInt(salaryMin) : null,
      salaryMax: salaryMax ? parseInt(salaryMax) : null,
      salaryCurrency,
      showSalary,
      location: location || null,
      workType: workType || null,
      skillsRequired,
      applyUrl: applyUrl || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      companyDomain: companyDomain || session.networkDomains[0] || '',
      postedBy: session.userId,
      source: 'manual',
      status: 'active',
      visibility,
    },
  })

  return NextResponse.json({ job }, { status: 201 })
}
