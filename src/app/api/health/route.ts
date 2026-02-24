import { NextResponse } from 'next/server'
import { bridgeGet } from '@/lib/bridge-api/client'

/**
 * GET /api/health — Lightweight Bridge API health check (dev only)
 * Returns API status, response time, and URL for the top-nav status badge.
 */
export async function GET() {
  const apiUrl = process.env.BRIDGE_API_URL ?? 'unknown'
  const start = Date.now()

  try {
    await bridgeGet('/api/v1/users/me')
    const responseTime = Date.now() - start

    return NextResponse.json({
      status: 'ok',
      apiUrl,
      responseTime,
    })
  } catch (err) {
    const responseTime = Date.now() - start
    const message = err instanceof Error ? err.message : 'Unknown error'

    return NextResponse.json({
      status: 'error',
      apiUrl,
      responseTime,
      error: message,
    })
  }
}
