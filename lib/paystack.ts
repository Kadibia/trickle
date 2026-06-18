export { CREDIT_PACKS, getPackById } from './stripe'
export type { PackId, CreditPack } from './stripe'

export function getPaystackSecret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set')
  return key
}

export interface PaystackInitResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export async function initializePaystackTransaction(opts: {
  email: string
  amountKobo: number   // NGN in kobo (x100)
  metadata: Record<string, unknown>
  callbackUrl: string
}): Promise<PaystackInitResponse> {
  const secret = getPaystackSecret()
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountKobo,
      metadata: opts.metadata,
      callback_url: opts.callbackUrl,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Paystack init failed: ${body}`)
  }

  return res.json() as Promise<PaystackInitResponse>
}
