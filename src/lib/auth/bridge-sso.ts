// Bridge JWT SSO — login and token management

const BRIDGE_API_URL = process.env.BRIDGE_API_URL!

export interface BridgeLoginResponse {
  token: string
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}

export async function loginWithBridge(
  email: string,
  password: string,
): Promise<BridgeLoginResponse> {
  const response = await fetch(`${BRIDGE_API_URL}/api/v1/auth/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error || body?.message || 'Authentication failed')
  }

  return response.json()
}

export async function verifyBridgeToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    // Verify by fetching the current user — if it succeeds, token is valid
    const response = await fetch(`${BRIDGE_API_URL}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) return null

    const data = await response.json()
    // Bridge API v1 wraps response: {"user": {...}, "message": "..."}
    const user = data.user ?? data
    return { userId: user.id, email: user.email }
  } catch {
    return null
  }
}
