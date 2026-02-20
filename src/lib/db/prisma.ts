import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient | null {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.warn('[prisma] DATABASE_URL not set — database features disabled')
    return null
  }

  try {
    const adapter = new PrismaPg({ connectionString: databaseUrl })
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  } catch (err) {
    console.warn('[prisma] Failed to create client:', err)
    return null
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma
}
