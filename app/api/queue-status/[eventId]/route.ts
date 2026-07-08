import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { queueEvents } from '@/lib/db/schema'
import { eq, and, lt, lte } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

// Public endpoint — no auth required
// Only returns safe fields, no payload data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  const event = await db.query.queueEvents.findFirst({
    where: eq(queueEvents.id, eventId),
  })

  if (!event) {
    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    )
  }

  // Calculate position — how many queued events came before this one
  let position: number | null = null
  if (event.status === 'queued') {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(queueEvents)
      .where(
        and(
          eq(queueEvents.developerId, event.developerId),
          eq(queueEvents.status, 'queued'),
          lte(queueEvents.createdAt, event.createdAt),
        )
      )
    position = Number(result[0]?.count ?? 1)
  }

  return NextResponse.json({
    success: true,
    data: {
      status:       event.status,
      position,
      attempts:     event.attempts,
      createdAt:    event.createdAt,
      deliveredAt:  event.deliveredAt,
    },
  })
}
