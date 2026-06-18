import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Lazy singleton — only created when UPSTASH env vars are present
let _ratelimit: Ratelimit | null = null

export function getRatelimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit

  const url   = process.env.UPSTASH_REDIS_URL
  const token = process.env.UPSTASH_REDIS_TOKEN

  // Gracefully skip rate limiting if Redis not configured (local dev without env)
  if (!url || !token) return null

  _ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(500, '1 m'), // 500 req/min per API key
    analytics: false,
    prefix: 'trickle:rl',
  })

  return _ratelimit
}
