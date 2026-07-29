import 'dotenv/config'
import { createServer } from 'http'
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

let lastPollAt = Date.now()
let jobsProcessed = 0
const startedAt = Date.now()

// ── Poll Redis list for jobs via Upstash REST ──────────────────────
async function pollQueue(): Promise<void> {
  lastPollAt = Date.now()
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
    jobsProcessed++
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

// ── Health-check HTTP server ────────────────────────────────────────
// Render's free tier only offers always-on compute for "Web Services"
// (which need to bind to $PORT and respond to HTTP), not for
// "Background Workers". This tiny server exists purely so the worker
// qualifies as a Web Service. An external uptime pinger (e.g.
// UptimeRobot) hitting GET / every few minutes keeps it from spinning
// down on Render's free tier. The actual work still happens in the
// setInterval poll loop above, this server doesn't drive it.
const PORT = process.env.PORT ?? 3000

const server = createServer((_req, res) => {
  const secondsSincePoll = Math.round((Date.now() - lastPollAt) / 1000)
  const healthy = secondsSincePoll < 30 // poll loop should tick every 2s

  res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    status: healthy ? 'ok' : 'stalled',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    secondsSinceLastPoll: secondsSincePoll,
    jobsProcessed,
  }))
})

server.listen(PORT, () => {
  log.info(`Health-check server listening on port ${PORT}`)
})

async function shutdown(signal: string) {
  log.warn(`${signal} received — shutting down`)
  server.close()
  process.exit(0)
}

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT',  () => { void shutdown('SIGINT') })