// ATS provider mapping for Bridge portfolio companies
// Maps company domains to their Applicant Tracking System providers

export interface AtsConfig {
  provider: 'workable' | 'manual_only'
  accountSlug?: string   // Workable account slug for widget API
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
  { provider: 'manual_only', companyName: 'Kaia Health', companyDomain: 'kaiahealth.com' },
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
