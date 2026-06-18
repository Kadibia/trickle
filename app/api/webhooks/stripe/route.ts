import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { addPurchasedCredits } from '@/lib/db/credits'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    console.error('[stripe webhook] Missing signature or secret')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`[stripe webhook] Received event: ${event.type}`)

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object
    const { developerId, credits } = intent.metadata

    if (!developerId || !credits) {
      console.error('[stripe webhook] Missing metadata on payment_intent', intent.id)
      return NextResponse.json({ received: true })
    }

    try {
      await addPurchasedCredits(developerId, Number(credits), intent.id)
      console.log(`[stripe webhook] Credited ${credits} to developer ${developerId} via ${intent.id}`)
    } catch (err) {
      console.error('[stripe webhook] Failed to add credits:', err)
      // Return 200 so Stripe doesn't retry — log for manual reconciliation
    }
  }

  // Always return 200 immediately
  return NextResponse.json({ received: true })
}
