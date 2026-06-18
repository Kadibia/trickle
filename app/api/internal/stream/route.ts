import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const statsUrl = `${baseUrl}/api/internal/analytics/stats`
  // Forward the session cookie so the stats route can authenticate
  const reqHeaders = await headers()
  const cookie = reqHeaders.get('cookie') ?? ''

  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      async function pushStats() {
        try {
          const res = await fetch(statsUrl, { headers: { cookie } })
          if (!res.ok) return

          const json = await res.json()
          if (!json.success) return

          const payload = `data: ${JSON.stringify(json.data)}\n\n`
          controller.enqueue(encoder.encode(payload))
        } catch {
          // silently skip — client will reconnect via EventSource
        }
      }

      // Send immediately, then every 3 seconds
      void pushStats()
      intervalId = setInterval(() => { void pushStats() }, 3_000)
    },

    cancel() {
      clearInterval(intervalId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering on Vercel
    },
  })
}
