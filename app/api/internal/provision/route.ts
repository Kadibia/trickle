import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDeveloperById, createDeveloper } from '@/lib/db/developers'
import { seedSignupCredits } from '@/lib/db/credits'

// Called once after signup to provision developer row + API key + 500 credits.
// Idempotent: if developer row already exists, returns existing state.
export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const email = session.user.email

    // Check if already provisioned
    const existing = await getDeveloperById(userId)
    if (existing) {
      return NextResponse.json({ success: true, data: { alreadyProvisioned: true } })
    }

    // Create developer row with API key
    const { developer, rawApiKey } = await createDeveloper({
      id: userId,
      email,
      passwordHash: '', // Better Auth owns the password — this field is a remnant
    })

    // Seed 500 signup credits
    await seedSignupCredits(developer.id)

    return NextResponse.json({
      success: true,
      data: { rawApiKey, creditsSeeded: 500 },
    })
  } catch (err) {
    console.error('POST /api/internal/provision error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
