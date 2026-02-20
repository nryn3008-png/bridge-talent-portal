import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { bulkSyncBridgeMembers, deltaSyncBridgeMembers } from '@/lib/sync/profile-sync'

// POST /api/sync — trigger a sync (admin/vc only)
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !['vc', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { mode } = await request.json().catch(() => ({ mode: 'delta' }))

  try {
    const result = mode === 'bulk'
      ? await bulkSyncBridgeMembers()
      : await deltaSyncBridgeMembers()

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    console.error('Sync error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
