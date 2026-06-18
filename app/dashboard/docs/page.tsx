import { codeToHtml } from 'shiki'
import Link from 'next/link'
import { CodeBlock, CodeTabs } from '@/components/dashboard/code-block'
import { ExternalLink } from 'lucide-react'

// ── Code snippets ─────────────────────────────────────────────────

const JS_CODE = `const response = await fetch('https://api.trickle.dev/api/v1/queue', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(registrationData)
})

const { data } = await response.json()
// data.queue_id  — track this registration
// data.position  — place in queue
// data.status    — 'queued'`

const PY_CODE = `import requests

response = requests.post(
    'https://api.trickle.dev/api/v1/queue',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json=registration_data
)

data = response.json()['data']
# data['queue_id']  — track this registration
# data['position']  — place in queue
# data['status']    — 'queued'`

const PHP_CODE = `<?php
$ch = curl_init('https://api.trickle.dev/api/v1/queue');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer YOUR_API_KEY',
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($registrationData),
]);

$response = json_decode(curl_exec($ch), true);
$queueId  = $response['data']['queue_id'];
// $queueId  — track this registration`

const WEBHOOK_PAYLOAD = `{
  "queue_id":    "3f8a2c1d-...",
  "event":       "registration.queued",
  "delivered_at": "2025-06-01T10:30:00.000Z",
  "data": {
    // ...your original registration payload
    "email": "user@example.com",
    "name":  "Ada Lovelace"
  }
}`

const CURL_EXAMPLE = `curl -X POST https://api.trickle.dev/api/v1/queue \\
  -H "Authorization: Bearer tck_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","name":"Ada Lovelace"}'`

const SUCCESS_RESPONSE = `HTTP/1.1 202 Accepted
{
  "success": true,
  "data": {
    "queue_id": "3f8a2c1d-...",
    "position": 14,
    "status":   "queued",
    "message":  "Registration queued. Your webhook will receive it shortly."
  }
}`

// ── Helper ────────────────────────────────────────────────────────

async function hl(code: string, lang: string): Promise<string> {
  return codeToHtml(code, {
    lang,
    theme: 'github-dark',
  })
}

// ── Page ──────────────────────────────────────────────────────────

export default async function DocsPage() {
  const [jsHtml, pyHtml, phpHtml, webhookHtml, curlHtml, responseHtml] =
    await Promise.all([
      hl(JS_CODE,          'javascript'),
      hl(PY_CODE,          'python'),
      hl(PHP_CODE,         'php'),
      hl(WEBHOOK_PAYLOAD,  'json'),
      hl(CURL_EXAMPLE,     'bash'),
      hl(SUCCESS_RESPONSE, 'http'),
    ])

  const tabs = [
    { label: 'JavaScript', code: JS_CODE,  html: jsHtml  },
    { label: 'Python',     code: PY_CODE,  html: pyHtml  },
    { label: 'PHP',        code: PHP_CODE, html: phpHtml },
  ]

  return (
    <div className="max-w-3xl space-y-14">
      {/* ── Page header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Documentation</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Everything you need to integrate Trickle into your app in under 10 minutes.
        </p>
      </div>

      {/* ── Quick Start ─────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-5">Quick Start</h2>
        <ol className="space-y-5">
          {[
            {
              n: 1,
              title: 'Get your API key',
              body: 'Generate your key from the API Keys page. It starts with ',
              code: 'tck_live_',
              link: { href: '/dashboard/api-keys', label: 'Go to API Keys' },
            },
            {
              n: 2,
              title: 'Set your webhook URL',
              body: 'Tell Trickle where to deliver registrations. This is a POST endpoint on your server that processes one registration at a time.',
              link: { href: '/dashboard/settings', label: 'Go to Settings' },
            },
            {
              n: 3,
              title: 'Replace your registration endpoint',
              body: 'Instead of accepting registrations directly, forward them to Trickle. Your webhook receives them at a safe, configurable drip rate.',
            },
          ].map((step) => (
            <li key={step.n} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {step.n}
              </span>
              <div className="pt-0.5">
                <p className="font-medium text-white">{step.title}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {step.body}
                  {step.code && (
                    <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">
                      {step.code}
                    </code>
                  )}
                </p>
                {step.link && (
                  <Link
                    href={step.link.href}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                  >
                    {step.link.label}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Integration code ─────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-2">Integration</h2>
        <p className="text-sm text-zinc-400 mb-5">
          Replace your registration handler with a single API call:
        </p>
        <CodeTabs tabs={tabs} />
      </section>

      {/* ── cURL example ─────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-2">cURL Example</h2>
        <div className="space-y-3">
          <CodeBlock code={CURL_EXAMPLE} highlightedHtml={curlHtml} />
          <p className="text-xs text-zinc-500 pl-1">202 Accepted response:</p>
          <CodeBlock code={SUCCESS_RESPONSE} highlightedHtml={responseHtml} />
        </div>
      </section>

      {/* ── Webhook payload ──────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-2">Webhook Payload</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Trickle sends a{' '}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">POST</code>
          {' '}to your webhook URL for each registration:
        </p>
        <CodeBlock code={WEBHOOK_PAYLOAD} highlightedHtml={webhookHtml} />
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400 space-y-1.5">
          <p>
            <code className="text-xs text-zinc-200 bg-zinc-800 px-1 rounded">X-Trickle-Event</code>
            {' '}: always <code className="text-xs text-zinc-300">registration.queued</code>
          </p>
          <p>
            <code className="text-xs text-zinc-200 bg-zinc-800 px-1 rounded">X-Trickle-Delivery</code>
            {' '}: unique delivery ID for idempotency checks
          </p>
          <p>
            Your endpoint must return <strong className="text-zinc-200">HTTP 200</strong> to confirm
            delivery. Non-200 triggers up to 3 retries with exponential backoff (5s, 30s, 120s).
            Credits are only deducted on confirmed delivery.
          </p>
        </div>
      </section>

      {/* ── API Reference ────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">API Reference</h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                {['Endpoint', 'Method', 'Auth', 'Description', 'Response'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-zinc-400 text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  endpoint: '/api/v1/queue',
                  method: 'POST',
                  auth: 'API Key',
                  desc: 'Queue a registration payload',
                  response: '202 Accepted',
                },
              ].map((row, i, arr) => (
                <tr key={row.endpoint} className={i < arr.length - 1 ? 'border-b border-zinc-800/60' : ''}>
                  <td className="px-4 py-3 font-mono text-xs text-blue-400">{row.endpoint}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-xs font-semibold text-blue-400">
                      {row.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{row.auth}</td>
                  <td className="px-4 py-3 text-xs text-zinc-300">{row.desc}</td>
                  <td className="px-4 py-3 font-mono text-xs text-emerald-400">{row.response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Internal dashboard routes (<code>/api/internal/*</code>) require a session cookie and are not
          part of the public API.
        </p>
      </section>

      {/* ── Error codes ──────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Error Codes</h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                {['Status', 'Code', 'Meaning', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-zinc-400 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { status: '401', code: 'MISSING_KEY',           meaning: 'No Authorization header',         action: 'Include Bearer token' },
                { status: '401', code: 'INVALID_KEY',           meaning: 'API key not recognised',          action: 'Check key in dashboard' },
                { status: '402', code: 'NO_CREDITS',            meaning: 'Credit balance is 0',             action: 'Purchase credits' },
                { status: '415', code: 'INVALID_CONTENT_TYPE',  meaning: 'Not application/json',            action: 'Set Content-Type header' },
                { status: '422', code: 'EMPTY_PAYLOAD',         meaning: 'Request body is empty',           action: 'Send a JSON object' },
                { status: '422', code: 'NO_WEBHOOK',            meaning: 'No webhook URL configured',       action: 'Set URL in Settings' },
                { status: '500', code: 'QUEUE_ERROR',           meaning: 'Failed to enqueue',               action: 'Retry with backoff' },
              ].map((row, i, arr) => (
                <tr key={row.code} className={i < arr.length - 1 ? 'border-b border-zinc-800/60' : ''}>
                  <td className="px-4 py-3 font-mono text-xs text-red-400">{row.status}</td>
                  <td className="px-4 py-3 font-mono text-xs text-amber-400">{row.code}</td>
                  <td className="px-4 py-3 text-xs text-zinc-300">{row.meaning}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Credit system ────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Credit System</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400 space-y-3 leading-relaxed">
          <p>
            Every Trickle account starts with <strong className="text-zinc-200">500 free credits</strong>
            {' '}on signup, plus <strong className="text-zinc-200">10 free credits</strong> added every month.
            One credit is consumed for each registration successfully delivered to your webhook.
          </p>
          <p>
            Credits are <strong className="text-zinc-200">only deducted after a confirmed HTTP 200</strong>
            {' '}response from your endpoint. Failed deliveries and retries never cost credits. If all 3
            delivery attempts fail, the event is marked failed and no credit is spent.
          </p>
          <p>
            When your balance reaches 0, the intake API returns{' '}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-amber-300">402 NO_CREDITS</code>
            {' '}until you top up. Purchase additional credits from the{' '}
            <Link href="/dashboard/credits" className="text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline">
              Credits page
            </Link>.
          </p>
        </div>
      </section>
    </div>
  )
}
