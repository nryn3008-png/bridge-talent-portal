// ATS provider mapping for Bridge portfolio companies
// Maps company domains to their Applicant Tracking System providers

export interface AtsConfig {
  provider: 'workable' | 'greenhouse' | 'lever' | 'ashby' | 'recruitee' | 'smartrecruiters' | 'personio' | 'manual_only'
  accountSlug?: string   // ATS account slug for public API (Workable, Greenhouse, Lever, or Ashby)
  companyName: string
  companyDomain: string
}

export const PORTFOLIO_ATS_CONFIG: AtsConfig[] = [
  {
    provider: 'workable',
    accountSlug: 'quantive',
    companyName: 'Quantive',
    companyDomain: 'quantive.com',
  },
  {
    provider: 'personio',
    accountSlug: 'bees-bears-gmbh',
    companyName: 'Bees & Bears',
    companyDomain: 'beesandbears.com',
  },
  {
    provider: 'ashby',
    accountSlug: 'lemon-markets',
    companyName: 'lemon.markets',
    companyDomain: 'lemon.markets',
  },
  // ── Ashby (non-guessable slugs) ──────────────────────────────────────────
  {
    provider: 'ashby',
    accountSlug: 'strange-loop-labs',
    companyName: 'Guru (Strange Loop Labs)',
    companyDomain: 'getguru.ai',
  },
  {
    provider: 'ashby',
    accountSlug: 'get-ivy',
    companyName: 'Ivy',
    companyDomain: 'getivy.io',
  },
  // ── Personio (non-guessable slugs) ───────────────────────────────────────
  {
    provider: 'personio',
    accountSlug: 'cello',
    companyName: 'Cello',
    companyDomain: 'cello.so',
  },
  {
    provider: 'personio',
    accountSlug: 'penzilla-gmbh',
    companyName: 'Penzilla',
    companyDomain: 'penzilla.de',
  },
  {
    provider: 'personio',
    accountSlug: 'fides-technology-gmbh',
    companyName: 'Fides Technology',
    companyDomain: 'fides.technology',
  },
  {
    provider: 'personio',
    accountSlug: 'rouvia',
    companyName: 'Rouvia',
    companyDomain: 'rouvia.com',
  },
  // ── Lever ────────────────────────────────────────────────────────────────
  {
    provider: 'lever',
    accountSlug: 'tradelink',
    companyName: 'Tradelink',
    companyDomain: 'tradelink.co',
  },
  // ── Workable (verified accounts — may have 0 jobs currently) ─────────────
  {
    provider: 'workable',
    accountSlug: 'dagshub',
    companyName: 'DagsHub',
    companyDomain: 'dagshub.com',
  },
  {
    provider: 'workable',
    accountSlug: 'datamilk',
    companyName: 'DataMilk',
    companyDomain: 'datamilk.ai',
  },
  {
    provider: 'workable',
    accountSlug: 'dlthub',
    companyName: 'dltHub',
    companyDomain: 'dlthub.com',
  },
  {
    provider: 'workable',
    accountSlug: 'graphy',
    companyName: 'Graphy',
    companyDomain: 'graphyapp.com',
  },
  {
    provider: 'workable',
    accountSlug: 'opna',
    companyName: 'Opna',
    companyDomain: 'opna.earth',
  },
  {
    provider: 'workable',
    accountSlug: 'stakester',
    companyName: 'Stakester',
    companyDomain: 'stakester.com',
  },
  {
    provider: 'workable',
    accountSlug: 'symmetrical',
    companyName: 'Symmetrical',
    companyDomain: 'symmetrical.ai',
  },
  // ── Greenhouse (verified — 0 jobs currently) ────────────────────────────
  {
    provider: 'greenhouse',
    accountSlug: 'mindsdb',
    companyName: 'MindsDB',
    companyDomain: 'mindsdb.com',
  },
  { provider: 'manual_only', companyName: 'Kaia Health', companyDomain: 'kaiahealth.com' },
  { provider: 'manual_only', companyName: 'Salient Energy', companyDomain: 'salientenergy.ca' },
  { provider: 'manual_only', companyName: 'PYM', companyDomain: 'youcanpym.com' },
  { provider: 'manual_only', companyName: 'Clarisights', companyDomain: 'clarisights.com' },
  { provider: 'manual_only', companyName: 'SimplStudy', companyDomain: 'simplestudy.ie' },
  { provider: 'manual_only', companyName: 'GoYonder', companyDomain: 'goyonder.io' },
  { provider: 'manual_only', companyName: 'MeatBorsa', companyDomain: 'meatborsa.com' },
  { provider: 'manual_only', companyName: 'HerdMarket', companyDomain: 'herdmarket.com' },
  { provider: 'manual_only', companyName: 'Ultimate.ai', companyDomain: 'ultimate.ai' },
]

export function getWorkableConfigs(): AtsConfig[] {
  return PORTFOLIO_ATS_CONFIG.filter((c) => c.provider === 'workable' && c.accountSlug)
}

/** Get all static ATS configs that have a known provider + slug (excludes manual_only) */
export function getStaticAtsConfigs(): AtsConfig[] {
  return PORTFOLIO_ATS_CONFIG.filter((c) => c.provider !== 'manual_only' && c.accountSlug)
}
