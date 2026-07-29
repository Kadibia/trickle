import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getBalance } from '@/lib/db/credits'
import { getQueueDepth, getRecentEvents } from '@/lib/db/events'
import { db } from '@/lib/db'
import { queueEvents } from '@/lib/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'
import { getSurgeStatus, getCurrentRate } from '@/lib/surge'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const developerId = session.user.id
    const midnight = new Date()
    midnight.setUTCHours(0, 0, 0, 0)

    const [creditBalance, queueDepth, recentEvents, todayStats, routedTodayResult, isSurging, currentRate] =
      await Promise.all([
        getBalance(developerId),
        getQueueDepth(developerId),
        getRecentEvents(developerId, 10),
        db
          .select({ count: sql<number>`COUNT(*)`, status: queueEvents.status })
          .from(queueEvents)
          .where(and(eq(queueEvents.developerId, developerId), gte(queueEvents.createdAt, midnight)))
          .groupBy(queueEvents.status),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(queueEvents)
          .where(and(
            eq(queueEvents.developerId, developerId),
            gte(queueEvents.createdAt, midnight),
            sql`${queueEvents.routingRuleId} IS NOT NULL`
          )),
        getSurgeStatus(developerId).catch(() => false),
        getCurrentRate(developerId).catch(() => 0),
      ])

    const routedToday = Number(routedTodayResult[0]?.count ?? 0)

    let deliveredToday = 0
    let failedToday = 0
    for (const row of todayStats) {
      if (row.status === 'delivered') deliveredToday = Number(row.count)
      if (row.status === 'failed') failedToday = Number(row.count)
    }

    return NextResponse.json({
      success: true,
      data: {
        creditBalance,
        queueDepth,
        deliveredToday,
        failedToday,
        routedToday,
        recentEvents,
        isSurging,
        currentRate,
      },
    })
  } catch (err) {
    console.error('GET /api/internal/analytics/stats error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}