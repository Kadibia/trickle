import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Dashboard auth ─────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    // Better Auth can use different cookie names depending on version
    const cookies = request.cookies
    const hasSession =
      cookies.get('better-auth.session_token') ??
      cookies.get('__Secure-better-auth.session_token') ??
      cookies.get('better-auth.session') ??
      cookies.get('auth-session') ??
      // Check any cookie that starts with 'better-auth'
      [...cookies.getAll()].find(c => c.name.includes('better-auth') || c.name.includes('session'))

    if (!hasSession) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // ── API v1 key auth + rate limiting ───────────────────────────
  if (pathname.startsWith('/api/v1/')) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing API key', code: 'MISSING_KEY' },
        { status: 401 }
      )
    }

    const keyHash = hashApiKey(token)
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const lookupRes = await fetch(
      `${base}/api/internal/validate-key?hash=${keyHash}`,
      { headers: { 'x-internal-secret': process.env.BETTER_AUTH_SECRET! } }
    )

    if (!lookupRes.ok) {
      let code = 'INVALID_KEY'
      let error = 'Invalid API key'
      try {
        const body = await lookupRes.json()
        code = body.code ?? code
        error = body.error ?? error
      } catch { /* ignore */ }

      return NextResponse.json(
        { success: false, error, code },
        { status: lookupRes.status }
      )
    }

    const { developerId } = await lookupRes.json() as { developerId: string }

    const url = process.env.UPSTASH_REDIS_URL
    const token2 = process.env.UPSTASH_REDIS_TOKEN

    if (url && token2) {
      const { Ratelimit } = await import('@upstash/ratelimit')
      const { Redis } = await import('@upstash/redis')

      const rl = new Ratelimit({
        redis: new Redis({ url, token: token2 }),
        limiter: Ratelimit.slidingWindow(500, '1 m'),
        analytics: false,
        prefix: 'trickle:rl',
      })

      const { success, limit, remaining, reset } = await rl.limit(developerId)

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded — 500 req/min', code: 'RATE_LIMITED' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(reset),
              'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
            },
          }
        )
      }
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-developer-id', developerId)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/v1/:path*'],
}
