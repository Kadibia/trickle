import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDeveloperById } from '@/lib/db/developers'
import { getPackById, getStripe } from '@/lib/stripe'
import { initializePaystackTransaction } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const developerId = session.user.id
    const email = session.user.email
    const body = await request.json() as { packId?: string; currency?: string }
    const { packId, currency } = body

    if (!packId || !currency || !['USD', 'NGN'].includes(currency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid packId or currency', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    const pack = getPackById(packId)
    if (!pack) {
      return NextResponse.json(
        { success: false, error: 'Unknown credit pack', code: 'INVALID_PACK' },
        { status: 400 }
      )
    }

    const developer = await getDeveloperById(developerId)
    if (!developer) {
      return NextResponse.json({ success: false, error: 'Developer not found' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // ── Paystack (NGN) ─────────────────────────────────────────────
    if (currency === 'NGN') {
      const result = await initializePaystackTransaction({
        email,
        amountKobo: pack.ngnPrice * 100,
        metadata: {
          developerId,
          credits: pack.credits,
          packId: pack.id,
          packLabel: pack.label,
        },
        callbackUrl: `${baseUrl}/dashboard/credits?payment=success`,
      })

      return NextResponse.json({
        success: true,
        data: { paymentUrl: result.data.authorization_url, provider: 'paystack' },
      })
    }

    // ── Stripe (USD) ───────────────────────────────────────────────
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pack.usdPrice * 100, // cents
      currency: 'usd',
      metadata: {
        developerId,
        credits: String(pack.credits),
        packId: pack.id,
        packLabel: pack.label,
      },
      automatic_payment_methods: { enabled: true },
    })

    // Return client secret — frontend uses Stripe.js to complete
    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        provider: 'stripe',
        // Hosted payment link for simplicity (no embedded form needed yet)
        paymentUrl: `https://buy.stripe.com/?amount=${pack.usdPrice * 100}&currency=usd`,
      },
    })
  } catch (err) {
    console.error('POST /api/internal/credits/purchase error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
