import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { queueEvents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// GET /api/v1/queue/:eventId — get event status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const developerId = request.headers.get('x-developer-id')
  if (!developerId) {
    return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { eventId } = await params

  const event = await db.query.queueEvents.findFirst({
    where: and(
      eq(queueEvents.id, eventId),
      eq(queueEvents.developerId, developerId)
    ),
  })

  if (!event) {
    return NextResponse.json({ success: false, error: 'Event not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      queue_id:     event.id,
      status:       event.status,
      attempts:     event.attempts,
      created_at:   event.createdAt,
      delivered_at: event.deliveredAt,
    },
  })
}

// DELETE /api/v1/queue/:eventId — cancel a queued event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const developerId = request.headers.get('x-developer-id')
  if (!developerId) {
    return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { eventId } = await params

  const event = await db.query.queueEvents.findFirst({
    where: and(
      eq(queueEvents.id, eventId),
      eq(queueEvents.developerId, developerId)
    ),
  })

  if (!event) {
    return NextResponse.json({ success: false, error: 'Event not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (event.status !== 'queued') {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot cancel event with status '${event.status}'. Only queued events can be cancelled.`,
        code: 'INVALID_STATUS',
      },
      { status: 422 }
    )
  }

  await db
    .update(queueEvents)
    .set({ status: 'failed' })
    .where(eq(queueEvents.id, eventId))

  return NextResponse.json({
    success: true,
    data: { queue_id: eventId, status: 'cancelled' },
  })
}
