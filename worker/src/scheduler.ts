import { neon } from '@neondatabase/serverless'
import { log } from './logger'
import { processJob } from './processor'
import type { QueueJobData } from './types'

const { UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN, DATABASE_URL } = process.env

const INTAKE_KEY = 'trickle:jobs'
const ACTIVE_DEVS_KEY = 'trickle:active-devs'
const DRAIN_BATCH = 100          // max jobs pulled off the intake queue per tick
const MAX_PER_TICK_PER_DEV = 50  // hard ceiling per developer per tick — protects the
                                  // worker process and destination webhooks from one
                                  // developer's high drip rate starving everyone else
const DEFAULT_DRIP_RATE = 10

function devQueueKey(developerId: string): string {
  return `trickle:jobs:dev:${developerId}`
}

// ── Minimal Upstash REST helper ─────────────────────────────────────
async function redisCmd<T = unknown>(...parts: (string | number)[]): Promise<T> {
  const path = parts.map((p) => encodeURIComponent(String(p))).join('/')
  const res = await fetch(`${UPSTASH_REDIS_URL}/${path}`, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Redis command failed (${parts[0]}): ${res.status}`)
  const data = await res.json() as { result: T }
  return data.result
}

function getDb() {
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')
  return neon(DATABASE_URL)
}

async function getDripRate(developerId: string): Promise<number> {
  try {
    const sql = getDb()
    const rows = await sql`SELECT drip_rate FROM developers WHERE id = ${developerId} LIMIT 1`
    const rate = rows[0]?.drip_rate as number | undefined
    return rate && rate > 0 ? rate : DEFAULT_DRIP_RATE
  } catch (err) {
    log.warn(`Failed to fetch drip rate for ${developerId}, using default`, err)
    return DEFAULT_DRIP_RATE
  }
}

// Tracks the last time each developer had a delivery scheduled, so pacing
// survives across ticks. Lost on worker restart — acceptable, worst case a
// developer gets one extra immediate delivery right after a redeploy.
const lastScheduledAt = new Map<string, number>()
let jobsScheduled = 0

export function getJobsScheduled(): number {
  return jobsScheduled
}

// ── Sort the firehose intake queue into per-developer buckets ──────
async function drainIntake(): Promise<number> {
  let drained = 0
  for (let i = 0; i < DRAIN_BATCH; i++) {
    const raw = await redisCmd<string | null>('rpop', INTAKE_KEY)
    if (!raw) break

    try {
      const job = JSON.parse(raw) as QueueJobData
      await redisCmd('rpush', devQueueKey(job.developerId), raw)
      await redisCmd('sadd', ACTIVE_DEVS_KEY, job.developerId)
      drained++
    } catch (err) {
      log.error('Failed to route intake job into per-developer queue', err)
    }
  }
  return drained
}

// ── Pop and deliver whatever each developer is due for, at their pace ──
async function scheduleDeliveries(): Promise<void> {
  const activeDevs = await redisCmd<string[]>('smembers', ACTIVE_DEVS_KEY).catch(() => [])
  if (!activeDevs || activeDevs.length === 0) return

  const now = Date.now()

  for (const developerId of activeDevs) {
    const dripRate = await getDripRate(developerId)
    const intervalMs = 60_000 / Math.max(1, dripRate)

    const last = lastScheduledAt.get(developerId) ?? (now - intervalMs)
    const elapsed = now - last
    const due = Math.min(Math.floor(elapsed / intervalMs), MAX_PER_TICK_PER_DEV)
    if (due <= 0) continue

    let delivered = 0
    for (let i = 0; i < due; i++) {
      const raw = await redisCmd<string | null>('lpop', devQueueKey(developerId))
      if (!raw) break
      delivered++
      jobsScheduled++
      try {
        const job = JSON.parse(raw) as QueueJobData
        void processJob(job).catch((err) => log.error('processJob threw', err))
      } catch (err) {
        log.error('Failed to parse job from per-developer queue', err)
      }
    }

    if (delivered > 0) {
      // advance by consumed intervals (not just `now`) so pacing doesn't drift
      lastScheduledAt.set(developerId, last + delivered * intervalMs)
    }

    if (delivered < due) {
      // queue ran dry before we hit our due count — nothing left, deactivate
      await redisCmd('srem', ACTIVE_DEVS_KEY, developerId).catch(() => {})
      lastScheduledAt.delete(developerId)
    }
  }
}

export async function runSchedulerTick(): Promise<void> {
  try {
    await drainIntake()
    await scheduleDeliveries()
  } catch (err) {
    log.error('Scheduler tick failed', err)
  }
}