import { neon } from '@neondatabase/serverless'
import { log } from './logger'
import { deliverWebhook } from './webhook'
import { deductCredit } from './credits'
import type { QueueJobData } from './types'

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000]
const MAX_ATTEMPTS = 3

function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return neon(url)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getWebhookUrl(developerId: string): Promise<string | null> {
  const sql = getDb()
  const rows = await sql`SELECT webhook_url FROM developers WHERE id = ${developerId} LIMIT 1`
  return (rows[0]?.webhook_url as string | null) ?? null
}

async function markDelivered(eventId: string): Promise<void> {
  const sql = getDb()
  await sql`UPDATE queue_events SET status = 'delivered', delivered_at = NOW() WHERE id = ${eventId}`
}

async function markFailed(eventId: string): Promise<void> {
  const sql = getDb()
  await sql`UPDATE queue_events SET status = 'failed' WHERE id = ${eventId}`
}

async function incrementAttempts(eventId: string): Promise<void> {
  const sql = getDb()
  await sql`UPDATE queue_events SET attempts = attempts + 1 WHERE id = ${eventId}`
}

async function recordDeliveryAttempt(
  eventId: string, attempt: number, statusCode: number, responseBody: string
): Promise<void> {
  const sql = getDb()
  await sql`
    INSERT INTO webhook_deliveries (event_id, attempt, status_code, response_body, attempted_at)
    VALUES (${eventId}, ${attempt}, ${statusCode}, ${responseBody}, NOW())
  `
}

export async function processJob(job: QueueJobData): Promise<void> {
  const { eventId, developerId, payload } = job

  log.info(`Processing event ${eventId}`, { developerId })

  let webhookUrl: string | null
  try {
    webhookUrl = await getWebhookUrl(developerId)
  } catch (err) {
    log.error(`Failed to fetch webhookUrl for ${developerId}`, err)
    await markFailed(eventId).catch(() => {})
    return
  }

  if (!webhookUrl) {
    log.warn(`No webhookUrl for developer ${developerId}`, { eventId })
    await markFailed(eventId).catch(() => {})
    return
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const deliveryId = `${eventId}-attempt-${attempt}`
    log.info(`Delivery attempt ${attempt}/${MAX_ATTEMPTS}`, { eventId, webhookUrl })

    await incrementAttempts(eventId).catch(() => {})
    const result = await deliverWebhook(webhookUrl, payload, deliveryId)

    log.info(`Attempt ${attempt} result`, { eventId, statusCode: result.statusCode, success: result.success })

    await recordDeliveryAttempt(eventId, attempt, result.statusCode, result.responseBody).catch(
      (err) => log.warn('Failed to record delivery attempt', err)
    )

    if (result.success) {
      await markDelivered(eventId).catch((err) => log.error('Failed to mark delivered', err))
      await deductCredit(developerId, eventId).catch((err) => log.error('Failed to deduct credit', err))
      log.info(`Event ${eventId} delivered on attempt ${attempt}`)
      return
    }

    if (attempt < MAX_ATTEMPTS) {
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? 5_000
      log.warn(`Attempt ${attempt} failed (${result.statusCode}) — retrying in ${delay}ms`, { eventId })
      await sleep(delay)
    }
  }

  await markFailed(eventId).catch((err) => log.error('Failed to mark failed', err))
  log.error(`Event ${eventId} failed after ${MAX_ATTEMPTS} attempts`, { eventId, developerId })
}
