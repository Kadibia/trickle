import { Redis } from '@upstash/redis'

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  })
}

const SURGE_THRESHOLD_MULTIPLIER = 3  // 3x average = surge
const SURGE_TTL_SECONDS = 300         // surge flag clears after 5 minutes
const BASELINE_WINDOW_MINUTES = 60    // rolling average over last 60 minutes

// Called on every intake request — tracks requests per minute per developer
export async function trackAndDetectSurge(developerId: string): Promise<boolean> {
  const redis = getRedis()
  const now = Date.now()
  const currentMinute = Math.floor(now / 60_000)

  const countKey   = `trickle:rate:${developerId}:${currentMinute}`
  const surgeKey   = `trickle:surge:${developerId}`
  const historyKey = `trickle:history:${developerId}`

  // Increment current minute counter
  const currentCount = await redis.incr(countKey)
  await redis.expire(countKey, 120) // keep for 2 minutes

  // Only check for surge on first request of each minute to reduce DB calls
  if (currentCount === 1) {
    // Store this minute's count in history list
    await redis.lpush(historyKey, currentCount)
    await redis.ltrim(historyKey, 0, BASELINE_WINDOW_MINUTES - 1)
    await redis.expire(historyKey, 7200)
  }

  // Calculate rolling average from history
  const history = await redis.lrange(historyKey, 0, -1) as number[]
  
  if (history.length < 3) return false // not enough data yet

  const avg = history.reduce((a, b) => a + Number(b), 0) / history.length

  // Detect surge
  const isSurging = currentCount > avg * SURGE_THRESHOLD_MULTIPLIER && currentCount > 5

  if (isSurging) {
    await redis.set(surgeKey, '1', { ex: SURGE_TTL_SECONDS })
  }

  return isSurging
}

export async function getSurgeStatus(developerId: string): Promise<boolean> {
  const redis = getRedis()
  const surgeKey = `trickle:surge:${developerId}`
  const val = await redis.get(surgeKey)
  return val === '1'
}

export async function getCurrentRate(developerId: string): Promise<number> {
  const redis = getRedis()
  const currentMinute = Math.floor(Date.now() / 60_000)
  const countKey = `trickle:rate:${developerId}:${currentMinute}`
  const count = await redis.get(countKey)
  return Number(count ?? 0)
}
