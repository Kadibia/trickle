import { NextRequest, NextResponse } from 'next/server'
import { getDeveloperByApiKeyHash } from '@/lib/db/developers'
import { getBalance } from '@/lib/db/credits'

// Called only by proxy.ts — protected by internal secret header
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-internal-secret')
  if (secret !== process.env.BETTER_AUTH_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  const hash = request.nextUrl.searchParams.get('hash')
  if (!hash) {
    return NextResponse.json(
      { success: false, error: 'Missing hash', code: 'INVALID_KEY' },
      { status: 401 }
    )
  }

  try {
    const developer = await getDeveloperByApiKeyHash(hash)
    if (!developer) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key', code: 'INVALID_KEY' },
        { status: 401 }
      )
    }

    const balance = await getBalance(developer.id)
    if (balance <= 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits', code: 'NO_CREDITS' },
        { status: 402 }
      )
    }

    return NextResponse.json({ developerId: developer.id, balance })
  } catch (err) {
    console.error('validate-key error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
