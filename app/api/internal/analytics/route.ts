import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { queueEvents } from '@/lib/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const developerId = session.user.id
    const range = request.nextUrl.searchParams.get('range') ?? '24h'

    const now = new Date()
    let since: Date

    if (range === '7d') {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (range === '30d') {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else {
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    const [rawEvents, avgResult] = await Promise.all([
      db
        .select({
          status: queueEvents.status,
          createdAt: queueEvents.createdAt,
          deliveredAt: queueEvents.deliveredAt,
        })
        .from(queueEvents)
        .where(
          and(
            eq(queueEvents.developerId, developerId),
            gte(queueEvents.createdAt, since)
          )
        ),

      db
        .select({
          avgMs: sql<number>`
            AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) * 1000)
          `,
        })
        .from(queueEvents)
        .where(
          and(
            eq(queueEvents.developerId, developerId),
            eq(queueEvents.status, 'delivered'),
            gte(queueEvents.createdAt, since)
          )
        ),
    ])

    // ── Build hourly buckets (24h) ─────────────────────────────────
    const hourlyMap = new Map<string, { queued: number; delivered: number; failed: number }>()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    for (let h = 0; h < 24; h++) {
      const d = new Date(last24h.getTime() + h * 60 * 60 * 1000)
      const label = d.toISOString().slice(11, 16) // 'HH:MM'
      hourlyMap.set(label, { queued: 0, delivered: 0, failed: 0 })
    }

    // ── Build daily buckets (30d) ──────────────────────────────────
    const dailyMap = new Map<string, { queued: number; delivered: number; failed: number }>()
    const days = range === '24h' ? 1 : range === '7d' ? 7 : 30

    for (let d = days - 1; d >= 0; d--) {
      const dt = new Date(now)
      dt.setUTCDate(dt.getUTCDate() - d)
      const label = dt.toISOString().slice(0, 10)
      dailyMap.set(label, { queued: 0, delivered: 0, failed: 0 })
    }

    let total = 0
    let delivered = 0

    for (const event of rawEvents) {
      total++
      const status = event.status as string
      if (status === 'delivered') delivered++

      // Hourly (only for 24h range)
      const eventTime = new Date(event.createdAt)
      if (eventTime >= last24h) {
        const hLabel = eventTime.toISOString().slice(11, 13) + ':00'
        const hBucket = hourlyMap.get(hLabel)
        if (hBucket) {
          hBucket.queued++
          if (status === 'delivered') hBucket.delivered++
          if (status === 'failed') hBucket.failed++
        }
      }

      // Daily
      const dLabel = eventTime.toISOString().slice(0, 10)
      const dBucket = dailyMap.get(dLabel)
      if (dBucket) {
        dBucket.queued++
        if (status === 'delivered') dBucket.delivered++
        if (status === 'failed') dBucket.failed++
      }
    }

    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0
    const avgDeliveryTime = Math.round(Number(avgResult[0]?.avgMs ?? 0))

    return NextResponse.json({
      success: true,
      data: {
        hourlyVolume: Array.from(hourlyMap.entries()).map(([hour, v]) => ({ hour, ...v })),
        dailyVolume: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })),
        successRate,
        avgDeliveryTime,
        total,
      },
    })
  } catch (err) {
    console.error('GET /api/internal/analytics error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
