#!/usr/bin/env node
/**
 * Run ATS discovery across all portfolio companies in batches.
 * This script runs directly (not via HTTP) to avoid timeout issues.
 *
 * Usage: node scripts/run-discovery.mjs [batchSize] [maxRounds]
 */

import fs from 'fs'
import path from 'path'

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const val = match[2].trim()
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

// Dynamic imports after env is loaded
const { PrismaPg } = await import('@prisma/adapter-pg')
const { PrismaClient } = await import('@prisma/client')
const { discoverAtsJobs } = await import('../src/lib/sync/ats-discovery.ts')
const { getStaticAtsConfigs } = await import('../src/lib/sync/ats-config.ts')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const BATCH_SIZE = parseInt(process.argv[2] || '50', 10)
const MAX_ROUNDS = parseInt(process.argv[3] || '200', 10)

async function syncAtsJobsForCompany(domain, provider, mappedJobs) {
  let created = 0, updated = 0, deactivated = 0

  for (const jobData of mappedJobs) {
    const externalId = jobData.externalId
    if (!externalId) continue

    const existing = await prisma.job.findUnique({ where: { externalId } })

    if (existing) {
      await prisma.job.update({
        where: { externalId },
        data: {
          title: jobData.title,
          description: jobData.description,
          department: jobData.department,
          location: jobData.location,
          workType: jobData.workType,
          employmentType: jobData.employmentType,
          applyUrl: jobData.applyUrl,
          status: 'active',
        },
      })
      updated++
    } else {
      await prisma.job.create({
        data: {
          title: jobData.title,
          description: jobData.description,
          department: jobData.department || null,
          location: jobData.location || null,
          workType: jobData.workType || null,
          employmentType: jobData.employmentType || 'full_time',
          applyUrl: jobData.applyUrl || null,
          companyDomain: jobData.companyDomain,
          postedBy: jobData.postedBy || 'system-job-sync',
          source: jobData.source,
          status: jobData.status || 'active',
          visibility: jobData.visibility || 'network',
          externalId: jobData.externalId,
        },
      })
      created++
    }
  }

  return { created, updated, deactivated }
}

async function main() {
  console.log(`\n=== ATS Discovery Script ===`)
  console.log(`Batch size: ${BATCH_SIZE} domains per round`)
  console.log(`Max rounds: ${MAX_ROUNDS}\n`)

  // Get all portfolio company domains
  const companies = await prisma.portfolioCompany.findMany({
    select: { domain: true },
  })
  const allDomains = [...new Set(companies.map(c => c.domain))]
  console.log(`Total unique portfolio company domains: ${allDomains.length}`)

  // Get already-cached domains
  const cached = await prisma.portfolioAtsCache.findMany({ select: { companyDomain: true } })
  const cachedSet = new Set(cached.map(c => c.companyDomain))
  const staticSet = new Set(getStaticAtsConfigs().map(c => c.companyDomain))

  // Filter to unchecked
  const unchecked = allDomains.filter(d => !cachedSet.has(d) && !staticSet.has(d))
  console.log(`Already cached: ${cachedSet.size}, Static config: ${staticSet.size}`)
  console.log(`Unchecked domains: ${unchecked.length}\n`)

  if (unchecked.length === 0) {
    console.log('All domains already checked!')
    await prisma.$disconnect()
    return
  }

  let totalDiscovered = 0
  let totalCreated = 0
  let totalUpdated = 0
  let totalErrors = 0
  let totalChecked = 0
  const discoveries = []

  const startTime = Date.now()

  // Process in rounds
  const rounds = Math.min(Math.ceil(unchecked.length / BATCH_SIZE), MAX_ROUNDS)

  for (let round = 0; round < rounds; round++) {
    const startIdx = round * BATCH_SIZE
    const batch = unchecked.slice(startIdx, startIdx + BATCH_SIZE)
    if (batch.length === 0) break

    const roundStart = Date.now()
    console.log(`--- Round ${round + 1}/${rounds} (domains ${startIdx + 1}-${startIdx + batch.length} of ${unchecked.length}) ---`)

    // Process batch with concurrency of 10
    const concurrency = 10
    for (let i = 0; i < batch.length; i += concurrency) {
      const chunk = batch.slice(i, i + concurrency)

      const results = await Promise.allSettled(
        chunk.map(async (domain) => {
          try {
            const discovery = await discoverAtsJobs(domain)
            if (!discovery) return null

            // Sync jobs
            const stats = await syncAtsJobsForCompany(domain, discovery.provider, discovery.mappedJobs)

            // Cache the discovery
            await prisma.portfolioAtsCache.upsert({
              where: { companyDomain: domain },
              create: {
                companyDomain: domain,
                provider: discovery.provider,
                slug: discovery.slug,
                lastSyncedAt: new Date(),
                jobCount: discovery.jobCount,
                lastCheckedAt: new Date(),
              },
              update: {
                provider: discovery.provider,
                slug: discovery.slug,
                lastSyncedAt: new Date(),
                jobCount: discovery.jobCount,
                lastCheckedAt: new Date(),
              },
            })

            return { domain, provider: discovery.provider, slug: discovery.slug, jobCount: discovery.jobCount, ...stats }
          } catch (err) {
            return null
          }
        })
      )

      for (const r of results) {
        totalChecked++
        if (r.status === 'fulfilled' && r.value) {
          const v = r.value
          totalDiscovered++
          totalCreated += v.created
          totalUpdated += v.updated
          discoveries.push(v)
          console.log(`  ✓ ${v.domain} → ${v.provider} (${v.slug}) — ${v.jobCount} jobs (${v.created} new, ${v.updated} updated)`)
        } else if (r.status === 'rejected') {
          totalErrors++
        }
      }
    }

    const roundTime = ((Date.now() - roundStart) / 1000).toFixed(1)
    console.log(`  Round time: ${roundTime}s | Progress: ${totalChecked}/${unchecked.length} (${((totalChecked/unchecked.length)*100).toFixed(1)}%) | Found: ${totalDiscovered}\n`)
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`\n=== DISCOVERY COMPLETE ===`)
  console.log(`Total checked: ${totalChecked}`)
  console.log(`Total discovered: ${totalDiscovered} new ATS accounts`)
  console.log(`Total jobs: ${totalCreated} created, ${totalUpdated} updated`)
  console.log(`Total errors: ${totalErrors}`)
  console.log(`Time: ${totalTime}s`)

  if (discoveries.length > 0) {
    console.log(`\nDiscovered ATS accounts:`)
    // Group by VC
    const byProvider = {}
    for (const d of discoveries) {
      byProvider[d.provider] = (byProvider[d.provider] || 0) + 1
    }
    for (const [p, count] of Object.entries(byProvider).sort((a, b) => b - a)) {
      console.log(`  ${p}: ${count}`)
    }
    console.log(`\nDetails:`)
    for (const d of discoveries) {
      console.log(`  ${d.domain} → ${d.provider}/${d.slug} (${d.jobCount} jobs)`)
    }
  }

  // Final stats from DB
  const finalCache = await prisma.portfolioAtsCache.count()
  const activeJobs = await prisma.job.count({ where: { status: 'active' } })
  console.log(`\nFinal DB state:`)
  console.log(`  ATS cache entries: ${finalCache}`)
  console.log(`  Active jobs: ${activeJobs}`)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
