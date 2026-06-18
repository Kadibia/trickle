import 'dotenv/config'
import cron from 'node-cron'
import { neon } from '@neondatabase/serverless'
import { log } from './logger'
import { processJob } from './processor'
import type { QueueJobData } from './types'

const { UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN, DATABASE_URL } = process.env

if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN || !DATABASE_URL) {
  log.error('Missing required env vars')
  process.exit(1)
}

const QUEUE_KEY = 'trickle:jobs'
const POLL_INTERVAL_MS = 2000

// ── Poll Redis list for jobs via Upstash REST ──────────────────────
async function pollQueue(): Promise<void> {
  try {
    // Upstash REST API: POST /pipeline for atomic rpop
    const res = await fetch(`${UPSTASH_REDIS_URL}/rpop/${encodeURIComponent(QUEUE_KEY)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`,
      },
    })

    if (!res.ok) {
      log.error(`Redis poll HTTP error: ${res.status}`)
      return
    }

    const data = await res.json() as { result: string | null }

    if (!data.result) return

    const job = JSON.parse(data.result) as QueueJobData
    log.info(`Picked up job for event ${job.eventId}`)
    await processJob(job)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`Poll error: ${message}`)
  }
}

// ── Monthly credit allocation ──────────────────────────────────────
async function runMonthlyCreditAllocation(): Promise<void> {
  log.info('Running monthly credit allocation...')
  const sql = neon(DATABASE_URL!)
  try {
    const developers = await sql`SELECT id FROM developers`
    let count = 0
    for (const dev of developers) {
      try {
        await sql`
          INSERT INTO credits (developer_id, amount, source, created_at)
          VALUES (${dev.id as string}, 10, 'monthly', NOW())
        `
        count++
      } catch (err) {
        log.error(`Failed monthly credit for ${dev.id as string}`, err)
      }
    }
    log.info(`Monthly allocation complete — ${count} developers credited +10`)
  } catch (err) {
    log.error('Monthly credit allocation failed', err)
  }
}

cron.schedule('0 0 1 * *', () => { void runMonthlyCreditAllocation() }, { timezone: 'UTC' })

log.info('Monthly credit cron scheduled (1st of each month, 00:00 UTC)')
log.info('Trickle worker started. Polling for jobs...')

setInterval(() => { void pollQueue() }, POLL_INTERVAL_MS)

async function shutdown(signal: string) {
  log.warn(`${signal} received — shutting down`)
  process.exit(0)
}

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT',  () => { void shutdown('SIGINT') })