// Bridge API HTTP client — server-to-server using API key auth
// NOTE: Bridge API uses /api/v1/ prefix (not /api/current/ as referenced in older specs)
// NOTE: Accept: application/json is REQUIRED — without it Heroku router returns HTML 404

const BRIDGE_API_URL = process.env.BRIDGE_API_URL
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY

if (!BRIDGE_API_URL || !BRIDGE_API_KEY) {
  throw new Error('BRIDGE_API_URL and BRIDGE_API_KEY must be set in environment variables')
}

export class BridgeApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(`Bridge API error ${status}: ${message}`)
    this.name = 'BridgeApiError'
  }
}

async function bridgeFetch<T>(
  path: string,
  options: RequestInit & { jwt?: string; params?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const { jwt, params, ...fetchOptions } = options

  // Build URL with query params
  const url = new URL(`${BRIDGE_API_URL}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  // Use JWT for user-authenticated requests, API key for server-to-server
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`
  } else {
    headers['Authorization'] = `Bearer ${BRIDGE_API_KEY}`
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers,
    // No caching for Bridge API calls — always fresh data
    cache: 'no-store',
  })

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = await response.text()
    }
    throw new BridgeApiError(response.status, response.statusText, body)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

// GET request
export function bridgeGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  jwt?: string,
): Promise<T> {
  return bridgeFetch<T>(path, { method: 'GET', params, jwt })
}

// POST request
export function bridgePost<T>(path: string, body: unknown, jwt?: string): Promise<T> {
  return bridgeFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    jwt,
  })
}

// PATCH request
export function bridgePatch<T>(path: string, body: unknown, jwt?: string): Promise<T> {
  return bridgeFetch<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    jwt,
  })
}

export { bridgeFetch }
