import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { queueEvents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getDeveloperById } from '@/lib/db/developers'
import { getBalance } from '@/lib/db/credits'
import { pushToQueue } from '@/lib/queue'

// POST /api/v1/queue/:eventId/replay — replay a failed event
export async function POST(
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

  if (event.status !== 'failed') {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot replay event with status '${event.status}'. Only failed events can be replayed.`,
        code: 'INVALID_STATUS',
      },
      { status: 422 }
    )
  }

  // Check credit balance before replaying
  const balance = await getBalance(developerId)
  if (balance <= 0) {
    return NextResponse.json(
      { success: false, error: 'Insufficient credits', code: 'NO_CREDITS' },
      { status: 402 }
    )
  }

  const developer = await getDeveloperById(developerId)
  if (!developer?.webhookUrl) {
    return NextResponse.json(
      { success: false, error: 'No webhook URL configured', code: 'NO_WEBHOOK' },
      { status: 422 }
    )
  }

  // Reset event to queued and push back to queue
  await db
    .update(queueEvents)
    .set({ status: 'queued', attempts: 0, deliveredAt: null })
    .where(eq(queueEvents.id, eventId))

  await pushToQueue({
    eventId: event.id,
    developerId,
    webhookUrl: developer.webhookUrl,
    webhookSecret: developer.webhookSecret,
    payload: event.payload,
    dripRate: developer.dripRate,
  })

  return NextResponse.json({
    success: true,
    data: {
      queue_id: eventId,
      status: 'queued',
      message: 'Event has been replayed and is back in the queue.',
    },
  })
}
