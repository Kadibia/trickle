import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getDeveloperById,
  updateApiKey,
  revokeApiKey,
} from '@/lib/db/developers'

async function getSessionDeveloperId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user?.id ?? null
  } catch {
    return null
  }
}

// Masked key — never derived from hash content, purely cosmetic
const MASKED_KEY = 'tck_live_••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'

// GET /api/internal/api-keys — returns whether a key exists + masked placeholder
export async function GET() {
  const developerId = await getSessionDeveloperId()
  if (!developerId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const developer = await getDeveloperById(developerId)
    if (!developer) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        hasKey: !!developer.apiKeyHash,
        maskedKey: developer.apiKeyHash ? MASKED_KEY : null,
        webhookUrl: developer.webhookUrl,
        dripRate: developer.dripRate,
      },
    })
  } catch (err) {
    console.error('GET /api/internal/api-keys error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/internal/api-keys — regenerate key, return raw once
export async function POST() {
  const developerId = await getSessionDeveloperId()
  if (!developerId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { rawApiKey } = await updateApiKey(developerId)
    // rawApiKey is returned ONCE here — never stored, never returned again
    return NextResponse.json({ success: true, data: { rawApiKey } })
  } catch (err) {
    console.error('POST /api/internal/api-keys error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/internal/api-keys — revoke key
export async function DELETE() {
  const developerId = await getSessionDeveloperId()
  if (!developerId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await revokeApiKey(developerId)
    return NextResponse.json({ success: true, data: { revoked: true } })
  } catch (err) {
    console.error('DELETE /api/internal/api-keys error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
