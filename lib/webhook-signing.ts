import { createHmac, randomBytes } from 'crypto'

export function generateWebhookSecret(): string {
  return 'whsec_' + randomBytes(32).toString('hex')
}

export function signPayload(payload: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
}

export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signPayload(payload, secret)
  // Timing-safe comparison
  if (expected.length !== signature.length) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.equals(b)
}
