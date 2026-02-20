import { NextResponse } from 'next/server'
import { loginWithBridge } from '@/lib/auth/bridge-sso'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { getCurrentUser } from '@/lib/bridge-api/users'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, useApiKey, apiKey } = body

    let bridgeJwt: string
    let user

    if (useApiKey) {
      // Dev login — use your personal Bridge JWT directly (no password needed)
      // Only allowed outside production
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'API key login is not allowed in production' }, { status: 403 })
      }

      if (!apiKey) {
        return NextResponse.json({ error: 'API key is required' }, { status: 400 })
      }

      bridgeJwt = apiKey
      user = await getCurrentUser(bridgeJwt)
    } else {
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 })
      }
      // Standard email + password login
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 })
      }

      const loginResponse = await loginWithBridge(email, password)
      bridgeJwt = loginResponse.token
      user = await getCurrentUser(bridgeJwt)
    }

    // Only allow confirmed, non-deleting users.
    // Bridge API v1 returns `confirmed: true` (boolean); confirmed_at may be null even when confirmed.
    const isConfirmed = user.confirmed || user.confirmed_at
    if (!isConfirmed) {
      return NextResponse.json({ error: 'Please confirm your email before signing in' }, { status: 403 })
    }

    if (user.deleting) {
      return NextResponse.json({ error: 'Account is not available' }, { status: 403 })
    }

    // Create session token
    const sessionToken = await createSession(user, bridgeJwt)
    await setSessionCookie(sessionToken)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed'
    console.error('Login error:', message)

    if (message.includes('401') || message.includes('Unauthorized') || message.includes('Authentication failed')) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
