import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { queueEvents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getDeveloperById } from '@/lib/db/developers'
import { getBalance } from '@/lib/db/credits'
import { pushToQueue } from '@/lib/queue'

// POST /api/internal/events/:eventId/replay — session-authenticated replay
// for the dashboard Retry button. Mirrors /api/v1/queue/:eventId/replay,
// which requires an API key header that the dashboard (session-cookie
// auth) doesn't have.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const developerId = session.user.id
    const { eventId } = await params

    const event = await db.query.queueEvents.findFirst({
      where: and(
        eq(queueEvents.id, eventId),
        eq(queueEvents.developerId, developerId)
      ),
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
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
  } catch (err) {
    console.error('POST /api/internal/events/[eventId]/replay error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal error', code: 'QUEUE_ERROR' },
      { status: 500 }
    )
  }
}