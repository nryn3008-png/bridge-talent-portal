import { prisma } from '@/lib/db/prisma'
import { fetchVcDetails, fetchPortfolioCompanies } from '@/lib/bridge-api/portfolio'

interface PortfolioSyncResult {
  vcNetworksSynced: number
  companiesSynced: number
  errors: number
}

/**
 * Sync portfolio data for given VC domains.
 * Fetches VC details + all portfolio companies from Bridge API,
 * then upserts into local DB for fast page loads.
 */
export async function syncPortfolioData(
  vcDomains: string[],
): Promise<PortfolioSyncResult> {
  if (!prisma) throw new Error('Database not available — check DATABASE_URL')
  const db = prisma

  const result: PortfolioSyncResult = { vcNetworksSynced: 0, companiesSynced: 0, errors: 0 }

  for (const domain of vcDomains) {
    try {
      // 1. Fetch and upsert VC details
      console.log(`[portfolio-sync] Fetching VC details for ${domain}...`)
      const vcDetails = await fetchVcDetails(domain)

      await db.vcNetwork.upsert({
        where: { domain },
        create: {
          domain,
          title: vcDetails.title,
          description: vcDetails.description,
          location: vcDetails.location,
          isVc: vcDetails.isVc,
          founders: vcDetails.founders,
          industries: vcDetails.industries,
          industriesInvestIn: vcDetails.industriesInvestIn,
          investmentFocus: vcDetails.investmentFocus,
          lastSyncedAt: new Date(),
        },
        update: {
          title: vcDetails.title,
          description: vcDetails.description,
          location: vcDetails.location,
          isVc: vcDetails.isVc,
          founders: vcDetails.founders,
          industries: vcDetails.industries,
          industriesInvestIn: vcDetails.industriesInvestIn,
          investmentFocus: vcDetails.investmentFocus,
          lastSyncedAt: new Date(),
        },
      })
      result.vcNetworksSynced++

      // 2. Fetch all portfolio companies (paginated from Bridge API)
      console.log(`[portfolio-sync] Fetching portfolio companies for ${domain}...`)
      const companies = await fetchPortfolioCompanies(domain)
      console.log(`[portfolio-sync] ${domain}: ${companies.length} portfolio companies`)

      // 3. Upsert companies in batches of 50 using transactions
      const batchSize = 50
      for (let i = 0; i < companies.length; i += batchSize) {
        const batch = companies.slice(i, i + batchSize)
        await db.$transaction(
          batch.map((company) =>
            db.portfolioCompany.upsert({
              where: {
                domain_vcDomain: { domain: company.domain, vcDomain: domain },
              },
              create: {
                domain: company.domain,
                vcDomain: domain,
                description: company.description,
                industries: company.industries,
                status: company.status,
                funded: company.funded,
                investDate: company.investDate,
                lastSyncedAt: new Date(),
              },
              update: {
                description: company.description,
                industries: company.industries,
                status: company.status,
                funded: company.funded,
                investDate: company.investDate,
                lastSyncedAt: new Date(),
              },
            }),
          ),
        )
        result.companiesSynced += batch.length
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[portfolio-sync] Failed for ${domain}: ${msg}`)
      result.errors++
    }
  }

  // Log the sync
  await db.bridgeSyncLog.create({
    data: {
      syncType: 'bulk',
      entityType: 'portfolio',
      lastSyncedAt: new Date(),
      recordsSynced: result.companiesSynced,
      status: 'completed',
      errorMessage: result.errors > 0
        ? `${result.errors} VC domains failed`
        : null,
    },
  })

  console.log(`[portfolio-sync] Complete: ${result.vcNetworksSynced} VCs, ${result.companiesSynced} companies, ${result.errors} errors`)
  return result
}
