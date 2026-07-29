import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { developers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { RoutingConfig } from '@/lib/routing'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [developer] = await db.select({ routingRules: developers.routingRules })
      .from(developers).where(eq(developers.id, session.user.id))

    return NextResponse.json({
      success: true,
      data: { routingRules: developer?.routingRules ?? null },
    })
  } catch (err) {
    console.error('GET /api/internal/routing error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { routingRules: RoutingConfig | null }

    await db.update(developers)
      .set({ routingRules: body.routingRules })
      .where(eq(developers.id, session.user.id))

    return NextResponse.json({ success: true, data: { saved: true } })
  } catch (err) {
    console.error('PUT /api/internal/routing error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
