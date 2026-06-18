import { createHash, randomBytes } from 'crypto'

const PREFIX = 'tck_live_'

export function generateApiKey(): string {
  return PREFIX + randomBytes(32).toString('hex') // 64 hex chars
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function maskApiKey(key: string): string {
  const visible = key.slice(0, 12)
  const tail = key.slice(-4)
  return `${visible}••••••••${tail}`
}
