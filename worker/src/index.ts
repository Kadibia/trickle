import 'dotenv/config'
import { createServer } from 'http'
import cron from 'node-cron'
import { neon } from '@neondatabase/serverless'
import { log } from './logger'
import { runSchedulerTick, getJobsScheduled } from './scheduler'

const { UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN, DATABASE_URL } = process.env

if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN || !DATABASE_URL) {
  log.error('Missing required env vars')
  process.exit(1)
}

const POLL_INTERVAL_MS = 2000

let lastTickAt = Date.now()
const startedAt = Date.now()

async function tick(): Promise<void> {
  lastTickAt = Date.now()
  await runSchedulerTick()
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
log.info('Trickle worker started. Scheduling deliveries per developer drip rate...')

setInterval(() => { void tick() }, POLL_INTERVAL_MS)

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
  const secondsSinceTick = Math.round((Date.now() - lastTickAt) / 1000)
  const healthy = secondsSinceTick < 30 // scheduler tick should run every 2s

  res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    status: healthy ? 'ok' : 'stalled',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    secondsSinceLastTick: secondsSinceTick,
    jobsScheduled: getJobsScheduled(),
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