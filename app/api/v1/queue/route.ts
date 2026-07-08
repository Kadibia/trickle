import { NextRequest, NextResponse } from 'next/server'
import { getDeveloperById } from '@/lib/db/developers'
import { createQueueEvent, getQueueDepth } from '@/lib/db/events'
import { pushToQueue } from '@/lib/queue'
import { trackAndDetectSurge } from '@/lib/surge'

export async function POST(request: NextRequest) {
  const developerId = request.headers.get('x-developer-id')
  if (!developerId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { success: false, error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' },
      { status: 415 }
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', code: 'INVALID_JSON' },
      { status: 400 }
    )
  }

  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return NextResponse.json(
      { success: false, error: 'Request body cannot be empty', code: 'EMPTY_PAYLOAD' },
      { status: 422 }
    )
  }

  const developer = await getDeveloperById(developerId)
  if (!developer) {
    return NextResponse.json(
      { success: false, error: 'Developer not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  if (!developer.webhookUrl) {
    return NextResponse.json(
      {
        success: false,
        error: 'No webhook URL configured. Visit your dashboard settings.',
        code: 'NO_WEBHOOK',
      },
      { status: 422 }
    )
  }

  try {
    // Track request rate and detect surge (non-blocking)
    const isSurging = await trackAndDetectSurge(developerId).catch(() => false)

    const event = await createQueueEvent({
      developerId,
      payload,
      status: 'queued',
      attempts: 0,
    })

    console.log(`[queue] Enqueued event ${event.id} for developer ${developerId}${isSurging ? ' [SURGE DETECTED]' : ''}`)

    await pushToQueue({
      eventId: event.id,
      developerId,
      webhookUrl: developer.webhookUrl,
      webhookSecret: developer.webhookSecret,
      payload,
      dripRate: developer.dripRate,
    })

    const position = await getQueueDepth(developerId)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    return NextResponse.json(
      {
        success: true,
        data: {
          queue_id:   event.id,
          position,
          status:     'queued',
          status_url: `${baseUrl}/queue-status/${event.id}`,
          surge:      isSurging,
          message:    isSurging
            ? 'Traffic surge detected. Trickle is protecting your server.'
            : 'Registration queued. Your webhook will receive it shortly.',
        },
      },
      { status: 202 }
    )
  } catch (err) {
    console.error(`[queue] Error enqueuing for developer ${developerId}:`, err)
    return NextResponse.json(
      { success: false, error: 'Failed to enqueue registration', code: 'QUEUE_ERROR' },
      { status: 500 }
    )
  }
}
