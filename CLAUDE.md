# TRICKLE

## Project Overview
Trickle is a registration queue API that protects web applications from
traffic surges. When a site is flooded with registration requests, Trickle
intercepts them, buffers them in a managed Redis queue, and delivers them
to the developer's server via webhook at a safe, configurable drip rate.
Developers integrate via a single API call. They manage keys, credits, and
queue analytics via the Trickle dashboard. Business model: 500 free credits
on signup + 10 free credits/month. 1 credit = 1 registration processed.
Beyond free tier: developers purchase credit packs via Stripe or Paystack.

## Repo Structure
Single repo, two deployable services:
- / — Next.js 15 dashboard + API intake → Vercel
- /worker — Node.js BullMQ queue processor → Railway

## Tech Stack
- Framework: Next.js 15 (App Router, TypeScript strict mode)
- Styling: Tailwind CSS + shadcn/ui
- Database: Neon (serverless PostgreSQL) — Trickle-owned
- ORM: Drizzle ORM (schema in /lib/db/schema.ts)
- Auth: Better Auth (sessions in Neon, config in /lib/auth.ts)
- Real-time: Server-Sent Events (SSE) via /app/api/internal/stream/route.ts
- Queue Storage: Upstash Redis
- Queue Processor: BullMQ in /worker
- Payments: Stripe (global) + Paystack (Africa)
- Rate Limiting: @upstash/ratelimit sliding window in proxy.ts
- Dashboard deploy: Vercel
- Worker deploy: Railway

## Architecture Rules
- API intake route: /app/api/v1/queue/route.ts
- API key validation + rate limiting runs in proxy.ts before every /api/v1/* route
- All DB queries go through /lib/db/ — never query inline in components
- Queue operations go through /lib/queue.ts — never call Upstash directly
- Credit deduction is always a Drizzle INSERT into credits table
- Never UPDATE a balance column — always aggregate the credits ledger
- Webhook delivery and retry logic: /worker/src/processor.ts only
- SSE stream: /app/api/internal/stream/route.ts — pushes dashboard stats
- Dashboard consumes SSE via useDashboardStream() hook in /hooks/
- .env.local for dashboard secrets, /worker/.env for worker secrets
- Never expose raw API keys or secrets in API responses

## Database Tables (Drizzle schema — /lib/db/schema.ts)
- developers — id, email, passwordHash, apiKeyHash, webhookUrl, dripRate
- credits — id, developerId, amount, source, reference, createdAt
- queue_events — id, developerId, payload, status, attempts, deliveredAt
- webhook_deliveries — id, eventId, attempt, statusCode, responseBody
- Better Auth tables — auto-generated (sessions, accounts, verifications)

## Critical Business Logic
- Credit balance = db.select(sum(credits.amount)).where(developerId)
- Never store or read from a balance column — always aggregate
- On signup: INSERT +500 credits (source='signup') — idempotent
- Monthly cron (Railway): INSERT +10 credits for every active developer
- Before queueing: check balance > 0, reject 402 if insufficient
- Deduct 1 credit ONLY after confirmed 200 webhook delivery
- Failed webhooks: retry 3x with exponential backoff (5s, 30s, 120s), no credit deducted
- Drip rate default: 10 registrations/minute per developer account
- Rate limit: 500 req/min per developer (sliding window, Upstash Redis)

## API Keys
- Format: tck_live_ prefix + 64 hex chars
- Store SHA-256 hash only — never the raw key
- Show raw key once on generation, never retrievable again (Stripe pattern)

## Real-time
- SSE endpoint polls dashboard stats every 3 seconds
- Dashboard hook: useDashboardStream() in /hooks/use-dashboard-stream.ts
- Updates: credit balance, queue depth, recent delivery events
- No third-party service — runs entirely in Next.js

## API Response Shape (all endpoints)
{ success: boolean, data?: any, error?: string, code?: string }

## Error Codes
- MISSING_KEY — 401, no Authorization header
- INVALID_KEY — 401, key not in DB
- NO_CREDITS  — 402, balance is 0
- RATE_LIMITED — 429, over 500 req/min
- INVALID_CONTENT_TYPE — 415
- EMPTY_PAYLOAD — 422
- NO_WEBHOOK — 422, no webhook URL configured
- QUEUE_ERROR — 500

## Code Style
- TypeScript strict mode — no 'any' types ever
- Functional components only
- async/await only — no .then() chains
- Every async function has try/catch with typed errors
- File names: kebab-case | Component names: PascalCase
- Files stay under 200 lines — split if longer
- shadcn/ui for all UI — no custom primitives

## Commands
Dashboard:
  npm run dev          — local dev (localhost:3000)
  npm run build        — production build
  npm run db:push      — sync Drizzle schema to Neon
  npm run db:migrate   — run migrations
  npm run db:studio    — open Drizzle Studio (visual DB browser)

Worker:
  cd worker && npm run dev    — start BullMQ worker locally
  cd worker && npm run build  — compile TypeScript

## Environment Variables
Dashboard (.env.local):
  DATABASE_URL=
  BETTER_AUTH_SECRET=
  UPSTASH_REDIS_URL=
  UPSTASH_REDIS_TOKEN=
  STRIPE_SECRET_KEY=
  STRIPE_WEBHOOK_SECRET=
  PAYSTACK_SECRET_KEY=
  NEXT_PUBLIC_APP_URL=

Worker (/worker/.env):
  DATABASE_URL=
  UPSTASH_REDIS_URL=
  UPSTASH_REDIS_TOKEN=

## Current Status
- Phase: O — COMPLETE
- All 15 phases (A–O) shipped
- Dashboard → Vercel, Worker → Railway
- See DEPLOY.md for deployment instructions

## Credit Packs
  Starter:  1,000 credits — $9 USD / ₦14,900 NGN
  Growth:  10,000 credits — $49 USD / ₦79,900 NGN
  Scale:  100,000 credits — $199 USD / ₦329,900 NGN
