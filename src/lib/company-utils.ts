/**
 * Utility functions for company name validation and filtering.
 * Handles data quality issues in the talent_profiles.company field.
 */

// Company values to exclude from the companies view
const EXCLUDED_COMPANY_VALUES = [
  '',
  'No organization',
  'no organization',
  'No Organization',
  'NO ORGANIZATION',
  'N/A',
  'n/a',
  'None',
  'none',
  '-',
  'Unknown',
  'unknown',
  '.',
  'NA',
  'na',
  'TBD',
  'tbd',
]

/**
 * Returns a Prisma `where` fragment that excludes invalid company names.
 * Use this in groupBy and findMany queries for the companies view.
 */
export function buildCompanyExclusionWhere() {
  return {
    company: {
      not: null,
      notIn: EXCLUDED_COMPANY_VALUES,
    },
  } as const
}

/**
 * Returns a Prisma `where` fragment that also includes a search filter.
 */
export function buildCompanySearchWhere(query?: string) {
  const base = buildCompanyExclusionWhere()
  if (!query) return base

  return {
    company: {
      ...base.company,
      contains: query,
      mode: 'insensitive' as const,
    },
  }
}
