import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { addPurchasedCredits } from '@/lib/db/credits'

interface PaystackEvent {
  event: string
  data: {
    reference: string
    status: string
    metadata: {
      developerId?: string
      credits?: number
      packId?: string
      packLabel?: string
    }
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const paystackSig = request.headers.get('x-paystack-signature')
  const secret = process.env.PAYSTACK_SECRET_KEY

  if (!paystackSig || !secret) {
    console.error('[paystack webhook] Missing signature or secret')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Verify HMAC SHA-512 signature
  const expectedSig = createHmac('sha512', secret)
    .update(body)
    .digest('hex')

  if (paystackSig !== expectedSig) {
    console.error('[paystack webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: PaystackEvent
  try {
    event = JSON.parse(body) as PaystackEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log(`[paystack webhook] Received event: ${event.event}`)

  if (event.event === 'charge.success') {
    const { developerId, credits } = event.data.metadata
    const reference = event.data.reference

    if (!developerId || !credits) {
      console.error('[paystack webhook] Missing metadata on charge.success', reference)
      return NextResponse.json({ received: true })
    }

    try {
      await addPurchasedCredits(developerId, Number(credits), reference)
      console.log(`[paystack webhook] Credited ${credits} to developer ${developerId} via ${reference}`)
    } catch (err) {
      console.error('[paystack webhook] Failed to add credits:', err)
      // Return 200 so Paystack doesn't retry — log for manual reconciliation
    }
  }

  return NextResponse.json({ received: true })
}
