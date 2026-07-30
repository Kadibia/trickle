import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDeveloperById, updateDeveloperSettings, rotateWebhookSecret } from '@/lib/db/developers'

// Ceiling reflects what worker/src/scheduler.ts can actually sustain per
// developer: MAX_PER_TICK_PER_DEV (50) deliveries per 2s tick = 1,500/min.
// Raising this requires scaling the worker (more instances, or moving off
// REST polling), not just changing this number.
const MAX_DRIP_RATE = 1_500
const MIN_DRIP_RATE = 1

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const developer = await getDeveloperById(session.user.id)
    if (!developer) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      success: true,
      data: {
        webhookUrl: developer.webhookUrl,
        webhookSecret: developer.webhookSecret,
        dripRate: developer.dripRate,
      },
    })
  } catch (err) {
    console.error('GET /api/internal/settings error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { webhookUrl?: string; dripRate?: number }
    const { webhookUrl, dripRate } = body

    if (webhookUrl !== undefined) {
      try { new URL(webhookUrl) } catch {
        return NextResponse.json({ success: false, error: 'Invalid webhook URL format', code: 'INVALID_URL' }, { status: 422 })
      }
    }

    if (dripRate !== undefined && (
      !Number.isInteger(dripRate) ||
      dripRate < MIN_DRIP_RATE ||
      dripRate > MAX_DRIP_RATE
    )) {
      return NextResponse.json({
        success: false,
        error: `Drip rate must be between ${MIN_DRIP_RATE} and ${MAX_DRIP_RATE.toLocaleString()}`,
        code: 'INVALID_DRIP_RATE'
      }, { status: 422 })
    }

    const updated = await updateDeveloperSettings(session.user.id, { webhookUrl, dripRate })
    return NextResponse.json({
      success: true,
      data: { webhookUrl: updated.webhookUrl, dripRate: updated.dripRate },
    })
  } catch (err) {
    console.error('PATCH /api/internal/settings error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { action } = await request.json() as { action?: string }

    if (action === 'rotate-secret') {
      const webhookSecret = await rotateWebhookSecret(session.user.id)
      return NextResponse.json({ success: true, data: { webhookSecret } })
    }

    if (action === 'test-webhook') {
      const developer = await getDeveloperById(session.user.id)
      if (!developer?.webhookUrl) {
        return NextResponse.json({ success: false, error: 'No webhook URL configured', code: 'NO_WEBHOOK' }, { status: 422 })
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)

      try {
        const res = await fetch(developer.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Trickle-Event': 'ping',
            'X-Trickle-Delivery': `test-${Date.now()}`,
          },
          body: JSON.stringify({ event: 'ping', message: 'Trickle webhook test' }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        return NextResponse.json({ success: res.ok, data: { statusCode: res.status, ok: res.ok }, error: res.ok ? undefined : `Webhook returned ${res.status}` })
      } catch (err) {
        clearTimeout(timeout)
        const isTimeout = err instanceof Error && err.name === 'AbortError'
        return NextResponse.json({ success: false, error: isTimeout ? 'Webhook timed out after 10s' : 'Webhook unreachable' })
      }
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('POST /api/internal/settings error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
