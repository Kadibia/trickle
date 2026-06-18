import { eq, desc, and, gte, sql } from 'drizzle-orm'
import { db } from './index'
import {
  queueEvents,
  webhookDeliveries,
  type QueueEvent,
  type NewQueueEvent,
  type NewWebhookDelivery,
  type WebhookDelivery,
} from './schema'

export async function createQueueEvent(
  data: NewQueueEvent
): Promise<QueueEvent> {
  const [event] = await db.insert(queueEvents).values(data).returning()
  return event
}

export async function getQueueEventById(
  id: string
): Promise<QueueEvent | undefined> {
  return db.query.queueEvents.findFirst({
    where: eq(queueEvents.id, id),
  })
}

export async function markEventDelivered(id: string): Promise<void> {
  await db
    .update(queueEvents)
    .set({ status: 'delivered', deliveredAt: new Date() })
    .where(eq(queueEvents.id, id))
}

export async function markEventFailed(id: string): Promise<void> {
  await db
    .update(queueEvents)
    .set({ status: 'failed' })
    .where(eq(queueEvents.id, id))
}

export async function incrementAttempts(id: string): Promise<void> {
  await db
    .update(queueEvents)
    .set({ attempts: sql`${queueEvents.attempts} + 1` })
    .where(eq(queueEvents.id, id))
}

export async function getRecentEvents(
  developerId: string,
  limit = 20
): Promise<QueueEvent[]> {
  return db
    .select()
    .from(queueEvents)
    .where(eq(queueEvents.developerId, developerId))
    .orderBy(desc(queueEvents.createdAt))
    .limit(limit)
}

export async function getQueueDepth(developerId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(queueEvents)
    .where(
      and(
        eq(queueEvents.developerId, developerId),
        eq(queueEvents.status, 'queued')
      )
    )
  return Number(result[0]?.count ?? 0)
}

export async function recordDeliveryAttempt(
  data: NewWebhookDelivery
): Promise<WebhookDelivery> {
  const [delivery] = await db
    .insert(webhookDeliveries)
    .values(data)
    .returning()
  return delivery
}

export async function getAnalyticsData(
  developerId: string,
  since: Date
): Promise<{ total: number; delivered: number; failed: number }> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)`, status: queueEvents.status })
    .from(queueEvents)
    .where(
      and(
        eq(queueEvents.developerId, developerId),
        gte(queueEvents.createdAt, since)
      )
    )
    .groupBy(queueEvents.status)

  let total = 0
  let delivered = 0
  let failed = 0

  for (const row of result) {
    const n = Number(row.count)
    total += n
    if (row.status === 'delivered') delivered = n
    if (row.status === 'failed') failed = n
  }

  return { total, delivered, failed }
}
