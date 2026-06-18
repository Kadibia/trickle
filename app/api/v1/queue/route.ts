import { NextRequest, NextResponse } from 'next/server'
import { getDeveloperById } from '@/lib/db/developers'
import { createQueueEvent, getQueueDepth } from '@/lib/db/events'
import { pushToQueue } from '@/lib/queue'

export async function POST(request: NextRequest) {
  // developerId injected by proxy.ts after key validation
  const developerId = request.headers.get('x-developer-id')
  if (!developerId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  // Validate Content-Type
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { success: false, error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' },
      { status: 415 }
    )
  }

  // Parse + validate body
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

  // Fetch developer settings
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
    // Insert queue event (never log payload — log event ID only)
    const event = await createQueueEvent({
      developerId,
      payload,
      status: 'queued',
      attempts: 0,
    })

    console.log(`[queue] Enqueued event ${event.id} for developer ${developerId}`)

    // Push to BullMQ
    await pushToQueue({
      eventId: event.id,
      developerId,
      webhookUrl: developer.webhookUrl,
      payload,
      dripRate: developer.dripRate,
    })

    // Get current queue depth from DB (accurate per-developer count)
    const position = await getQueueDepth(developerId)

    return NextResponse.json(
      {
        success: true,
        data: {
          queue_id: event.id,
          position,
          status: 'queued',
          message: 'Registration queued. Your webhook will receive it shortly.',
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
