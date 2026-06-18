import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getBalance, getCreditHistory } from '@/lib/db/credits'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const developerId = session.user.id
    const [balance, history] = await Promise.all([
      getBalance(developerId),
      getCreditHistory(developerId, 50),
    ])

    return NextResponse.json({ success: true, data: { balance, history } })
  } catch (err) {
    console.error('GET /api/internal/credits error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
