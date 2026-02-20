export interface RoleCategory {
  id: string
  label: string
  patterns: string[]
}

export const ROLE_CATEGORIES: RoleCategory[] = [
  {
    id: 'founders',
    label: 'Founders',
    patterns: ['founder', 'co-founder', 'cofounder'],
  },
  {
    id: 'investors',
    label: 'Investors',
    patterns: ['investor', 'partner', 'venture', 'angel', 'limited partner', 'lp '],
  },
  {
    id: 'executive',
    label: 'Executive',
    patterns: ['ceo', 'president', 'managing director', 'general manager', 'chief'],
  },
  {
    id: 'engineering',
    label: 'Engineering',
    patterns: ['engineer', 'developer', 'cto', 'vp engineering', 'tech lead', 'architect', 'devops', 'sre'],
  },
  {
    id: 'product',
    label: 'Product',
    patterns: ['product manager', 'product lead', 'vp product', 'cpo', 'head of product'],
  },
  {
    id: 'design',
    label: 'Design',
    patterns: ['designer', 'ux', 'ui', 'creative director', 'head of design'],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    patterns: ['marketing', 'cmo', 'growth', 'brand', 'communications'],
  },
  {
    id: 'sales',
    label: 'Sales',
    patterns: ['sales', 'business development', 'account executive', 'bdr', 'sdr', 'revenue', 'cro'],
  },
  {
    id: 'operations',
    label: 'Operations',
    patterns: ['operations', 'coo', 'chief of staff', 'program manager', 'project manager'],
  },
  {
    id: 'people',
    label: 'People',
    patterns: ['hr', 'human resources', 'people', 'talent', 'recruiter', 'recruiting', 'chro'],
  },
  {
    id: 'finance',
    label: 'Finance',
    patterns: ['finance', 'cfo', 'accounting', 'controller', 'financial'],
  },
]

export function getCategoryById(id: string): RoleCategory | undefined {
  return ROLE_CATEGORIES.find((c) => c.id === id)
}

// Build Prisma OR conditions to filter by position patterns
export function buildPositionFilter(categoryId: string) {
  const category = getCategoryById(categoryId)
  if (!category) return undefined

  return category.patterns.map((pattern) => ({
    position: { contains: pattern, mode: 'insensitive' as const },
  }))
}
