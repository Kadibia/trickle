import { Redis } from '@upstash/redis'

export interface QueueJobData {
  eventId: string
  developerId: string
  webhookUrl: string
  payload: unknown
  dripRate: number
}

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  })
}

// Push job to a simple Redis list — worker polls this list
const QUEUE_KEY = 'trickle:jobs'

export async function pushToQueue(data: QueueJobData): Promise<string> {
  const redis = getRedis()
  await redis.lpush(QUEUE_KEY, JSON.stringify(data))
  return data.eventId
}

export async function getQueueDepth(developerId: string): Promise<number> {
  const redis = getRedis()
  const len = await redis.llen(QUEUE_KEY)
  return len
}
