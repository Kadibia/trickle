import { Redis } from '@upstash/redis'

export interface QueueJobData {
  eventId: string
  developerId: string
  webhookUrl: string
  webhookSecret?: string | null
  payload: unknown
  dripRate: number
}

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  })
}

const QUEUE_KEY = 'trickle:jobs'

export async function pushToQueue(data: QueueJobData): Promise<string> {
  const redis = getRedis()
  await redis.lpush(QUEUE_KEY, JSON.stringify(data))
  return data.eventId
}

export async function getQueueDepth(): Promise<number> {
  const redis = getRedis()
  return redis.llen(QUEUE_KEY)
}
