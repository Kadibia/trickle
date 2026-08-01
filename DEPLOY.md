# Trickle — Deploy Checklist

## Pre-deploy

### Environment variables

**Dashboard (.env.local → Vercel)**
```
DATABASE_URL=          # Neon connection string
BETTER_AUTH_SECRET=    # openssl rand -hex 32
UPSTASH_REDIS_URL=     # rediss://...
UPSTASH_REDIS_TOKEN=   # from Upstash dashboard
STRIPE_SECRET_KEY=     # sk_live_...
STRIPE_WEBHOOK_SECRET= # whsec_... (from Stripe → Webhooks → endpoint secret)
PAYSTACK_SECRET_KEY=   # sk_live_...
NEXT_PUBLIC_APP_URL=   # https://your-app.vercel.app
```

**Worker (/worker/.env → Render)**
```
DATABASE_URL=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
PORT=            # Render sets this automatically; health-check server binds to it
```

### Database
```bash
npm run db:push          # push Drizzle schema to Neon
npx better-auth generate # generate Better Auth tables
npm run db:push          # push again (auth tables)
npm run db:studio        # verify all tables exist
```

## Part 3 — Deploy Dashboard to Vercel

1. Push repo to GitHub
   ```bash
   git init && git add . && git commit -m "feat: initial trickle build"
   git remote add origin https://github.com/YOUR_USER/trickle.git
   git push -u origin main
   ```

2. Connect to Vercel
   - vercel.com → New Project → Import your repo
   - Framework: Next.js (auto-detected)

3. Set all env vars in Vercel dashboard (Settings → Environment Variables)

4. Deploy → wait for build

5. Set `NEXT_PUBLIC_APP_URL` to production URL (e.g. `https://trickle.vercel.app`)

6. Register Stripe webhook endpoint:
   ```
   https://YOUR_VERCEL_URL/api/webhooks/stripe
   Event: payment_intent.succeeded
   ```

7. Register Paystack webhook endpoint:
   ```
   https://YOUR_VERCEL_URL/api/webhooks/paystack
   ```

## Part 4 — Deploy Worker to Render

1. render.com → New → Web Service → connect your GitHub repo
   (must be a Web Service, not "Background Worker" — Render's free tier
   only keeps Web Services always-invocable; Background Workers aren't
   available on the free plan)

2. Root Directory: `worker`

3. Build Command: `npm install && npm run build`
   Start Command: `npm start`

4. Set env vars in Render dashboard:
   - DATABASE_URL
   - UPSTASH_REDIS_URL
   - UPSTASH_REDIS_TOKEN
   (Render sets PORT automatically — the worker's health-check HTTP
   server binds to it)

5. Deploy → check logs for:
   ```
   Trickle worker started. Scheduling deliveries per developer drip rate...
   Monthly credit cron scheduled (1st of each month, 00:00 UTC)
   Health-check server listening on port XXXX
   ```

6. Render's free tier spins down after 15 minutes of no inbound HTTP
   requests — since this worker's real work happens in a background
   `setInterval` loop, not in response to HTTP requests, it will spin
   down and stop processing the queue unless kept warm. Set up
   UptimeRobot (or similar) to GET the service's `/` health-check
   endpoint every 5 minutes to prevent this.

7. Verify the health check directly:
   ```bash
   curl https://YOUR_RENDER_URL/
   # Expected: { "status": "ok", "uptimeSeconds": ..., "secondsSinceLastTick": <30, "jobsScheduled": ... }
   ```

## Part 5 — Production Smoke Test

```bash
# 1. Sign up at production URL → get API key

# 2. Set webhook URL to https://webhook.site/YOUR-ID in Settings

# 3. Queue a test registration
curl -X POST https://YOUR_VERCEL_URL/api/v1/queue \
  -H "Authorization: Bearer tck_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","name":"Smoke Test"}'
# Expected: 202 { success: true, data: { queue_id, position, status: "queued" } }

# 4. Check webhook.site — payload arrives within ~10 seconds

# 5. Check /dashboard → credit balance: 499
# 6. Check /dashboard → SSE green dot, event in table

# Rate limit test:
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://YOUR_VERCEL_URL/api/v1/queue \
    -H "Authorization: Bearer tck_live_your_key" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com"}'
done
# All 200 below limit; 429 after 500/min
```

## Security Checklist

- [x] /api/v1/* returns 401 without valid key (proxy.ts)
- [x] /api/v1/* returns 402 on 0 credits (validate-key route)
- [x] /api/v1/* returns 429 after 500 req/min (proxy.ts sliding window)
- [x] /dashboard/* redirects to /auth/login without session (proxy.ts)
- [x] Stripe webhook verifies signature before DB write (webhooks/stripe/route.ts:18)
- [x] Paystack webhook verifies signature before DB write (webhooks/paystack/route.ts:30-34)
- [x] No raw API keys in any response (api-keys route returns masked only)
- [x] No process.env in any client component (grep audit passed)
- [x] API key stored as SHA-256 hash only — raw key shown once, never retrievable
- [x] Credit balance always aggregated — no balance column that can drift
