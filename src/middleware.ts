import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth disabled for local development — re-enable for production
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
