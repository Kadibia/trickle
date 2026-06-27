import { codeToHtml } from 'shiki'
import Link from 'next/link'
import { CodeBlock, CodeTabs } from '@/components/dashboard/code-block'
import { ExternalLink } from 'lucide-react'

// ── Full integration examples ─────────────────────────────────────

const JS_CODE = `// 1. Send registration to Trickle instead of your DB directly
app.post('/register', async (req, res) => {
  const response = await fetch('https://api.trickle.dev/api/v1/queue', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  })

  const result = await response.json()

  if (!response.ok) {
    return res.status(response.status).json({ error: result.error })
  }

  // Return 202 to the user — they are safely queued
  res.status(202).json({
    message: 'You are in the queue. We will process your registration shortly.',
    queueId: result.data.queue_id,
    position: result.data.position
  })
})

// 2. Your webhook endpoint — Trickle calls this for each registration
app.post('/webhooks/trickle', express.json(), (req, res) => {
  const { data, queue_id } = req.body

  // Process the registration — save to DB, send welcome email, etc.
  await db.users.create({ email: data.email, name: data.name })
  await sendWelcomeEmail(data.email)

  // Return 200 to confirm delivery and deduct 1 credit
  res.status(200).json({ received: true })
})`

const PY_CODE = `import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# 1. Send registration to Trickle instead of your DB directly
@app.route('/register', methods=['POST'])
def register():
    registration_data = request.get_json()

    response = requests.post(
        'https://api.trickle.dev/api/v1/queue',
        headers={
            'Authorization': 'Bearer YOUR_API_KEY',
            'Content-Type': 'application/json'
        },
        json=registration_data
    )

    result = response.json()

    if not response.ok:
        return jsonify({'error': result.get('error')}), response.status_code

    # Return 202 to the user — they are safely queued
    return jsonify({
        'message': 'You are in the queue. We will process your registration shortly.',
        'queue_id': result['data']['queue_id'],
        'position': result['data']['position']
    }), 202

# 2. Your webhook endpoint — Trickle calls this for each registration
@app.route('/webhooks/trickle', methods=['POST'])
def trickle_webhook():
    data = request.get_json()
    registration = data.get('data', {})

    # Process the registration — save to DB, send welcome email, etc.
    db.users.create(email=registration['email'], name=registration['name'])
    send_welcome_email(registration['email'])

    # Return 200 to confirm delivery and deduct 1 credit
    return jsonify({'received': True}), 200`

const PHP_CODE = `<?php
// 1. Send registration to Trickle instead of your DB directly
function queueRegistration(array $data): array {
    $ch = curl_init('https://api.trickle.dev/api/v1/queue');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer YOUR_API_KEY',
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($data),
    ]);

    $response = curl_exec($ch);
    $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['status' => $status, 'body' => json_decode($response, true)];
}

// In your registration controller:
$result = queueRegistration($_POST);
if ($result['status'] === 202) {
    // User is safely queued — return success to the user
    echo json_encode([
        'message'  => 'You are in the queue.',
        'queue_id' => $result['body']['data']['queue_id'],
        'position' => $result['body']['data']['position']
    ]);
}

// 2. Your webhook endpoint — Trickle calls this for each registration
// webhook.php
$payload = json_decode(file_get_contents('php://input'), true);
$data    = $payload['data'];

// Process the registration — save to DB, send welcome email, etc.
$db->users->create(['email' => $data['email'], 'name' => $data['name']]);
sendWelcomeEmail($data['email']);

// Return 200 to confirm delivery and deduct 1 credit
http_response_code(200);
echo json_encode(['received' => true]);`

const GO_CODE = `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

// 1. Send registration to Trickle instead of your DB directly
func queueRegistration(w http.ResponseWriter, r *http.Request) {
    var regData map[string]interface{}
    json.NewDecoder(r.Body).Decode(&regData)

    body, _ := json.Marshal(regData)
    req, _ := http.NewRequest("POST",
        "https://api.trickle.dev/api/v1/queue",
        bytes.NewBuffer(body),
    )
    req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        http.Error(w, "Queue error", 500)
        return
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)

    data := result["data"].(map[string]interface{})
    fmt.Println("Queued:", data["queue_id"])

    // Return 202 to the user — they are safely queued
    w.WriteHeader(202)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "message":  "You are in the queue.",
        "queue_id": data["queue_id"],
        "position": data["position"],
    })
}

// 2. Your webhook endpoint — Trickle calls this for each registration
func trickleWebhook(w http.ResponseWriter, r *http.Request) {
    var payload map[string]interface{}
    json.NewDecoder(r.Body).Decode(&payload)

    data := payload["data"].(map[string]interface{})

    // Process the registration — save to DB, send welcome email, etc.
    db.CreateUser(data["email"].(string), data["name"].(string))
    sendWelcomeEmail(data["email"].(string))

    // Return 200 to confirm delivery and deduct 1 credit
    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]bool{"received": true})
}`

const RUBY_CODE = `require 'net/http'
require 'json'
require 'uri'

# 1. Send registration to Trickle instead of your DB directly
post '/register' do
  registration_data = JSON.parse(request.body.read)

  uri = URI('https://api.trickle.dev/api/v1/queue')
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  req = Net::HTTP::Post.new(uri)
  req['Authorization'] = 'Bearer YOUR_API_KEY'
  req['Content-Type']  = 'application/json'
  req.body = registration_data.to_json

  response = http.request(req)
  result   = JSON.parse(response.body)

  # Return 202 to the user — they are safely queued
  status 202
  JSON.generate({
    message:  'You are in the queue.',
    queue_id: result['data']['queue_id'],
    position: result['data']['position']
  })
end

# 2. Your webhook endpoint — Trickle calls this for each registration
post '/webhooks/trickle' do
  payload = JSON.parse(request.body.read)
  data    = payload['data']

  # Process the registration — save to DB, send welcome email, etc.
  User.create(email: data['email'], name: data['name'])
  WelcomeMailer.send(data['email'])

  # Return 200 to confirm delivery and deduct 1 credit
  status 200
  JSON.generate({ received: true })
end`

const WEBHOOK_PAYLOAD = `// Trickle sends this to your webhook URL:
{
  "queue_id":     "3f8a2c1d-...",
  "event":        "registration.queued",
  "delivered_at": "2025-06-01T10:30:00.000Z",
  "data": {
    // Everything you originally sent to POST /api/v1/queue
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

async function hl(code: string, lang: string): Promise<string> {
  return codeToHtml(code, { lang, theme: 'github-dark' })
}

export default async function DocsPage() {
  const [jsHtml, pyHtml, phpHtml, goHtml, rubyHtml, webhookHtml, curlHtml, responseHtml] =
    await Promise.all([
      hl(JS_CODE,          'javascript'),
      hl(PY_CODE,          'python'),
      hl(PHP_CODE,         'php'),
      hl(GO_CODE,          'go'),
      hl(RUBY_CODE,        'ruby'),
      hl(WEBHOOK_PAYLOAD,  'javascript'),
      hl(CURL_EXAMPLE,     'bash'),
      hl(SUCCESS_RESPONSE, 'http'),
    ])

  const tabs = [
    { label: 'JS / Node.js', code: JS_CODE,   html: jsHtml   },
    { label: 'Python',       code: PY_CODE,   html: pyHtml   },
    { label: 'PHP',          code: PHP_CODE,  html: phpHtml  },
    { label: 'Go',           code: GO_CODE,   html: goHtml   },
    { label: 'Ruby',         code: RUBY_CODE, html: rubyHtml },
  ]

  return (
    <div className="max-w-3xl space-y-14">
      <div>
        <h1 className="text-2xl font-bold text-white">Documentation</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Complete integration guide for Node.js, Python, PHP, Go, and Ruby.
        </p>
      </div>

      {/* How it works */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">How the integration works</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400 space-y-3 leading-relaxed">
          <p>
            Trickle sits between your users and your server. Instead of registrations hitting your
            database directly, they go into a managed queue and are delivered to your webhook one
            by one at a safe rate.
          </p>
          <div className="font-mono text-xs text-zinc-500 bg-zinc-950 rounded-lg px-4 py-3">
            User → <span className="text-blue-400">POST /api/v1/queue</span> → Redis Queue → Worker → <span className="text-emerald-400">Your Webhook</span> → Database
          </div>
          <p>
            Your users always get an instant <strong className="text-zinc-200">202 Accepted</strong> response.
            Your server never gets overwhelmed. Every registration is delivered exactly once.
          </p>
        </div>
      </section>

      {/* Quick Start */}
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
              body: 'This is the endpoint on your server that will receive registrations one by one. Trickle will POST each registration payload to this URL.',
              link: { href: '/dashboard/settings', label: 'Go to Settings' },
            },
            {
              n: 3,
              title: 'Replace your registration endpoint',
              body: 'Change your registration handler to forward requests to Trickle instead of writing to the database directly. See the full examples below.',
            },
            {
              n: 4,
              title: 'Add your webhook handler',
              body: 'Create a new endpoint that receives the queued registration from Trickle, saves it to your database, and returns HTTP 200 to confirm delivery.',
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

      {/* Full integration examples */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-2">Complete Integration Examples</h2>
        <p className="text-sm text-zinc-400 mb-5">
          Each example shows both parts of the integration — the registration endpoint that
          queues the request, and the webhook handler that receives and processes it:
        </p>
        <CodeTabs tabs={tabs} />
      </section>

      {/* cURL */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-2">cURL Example</h2>
        <div className="space-y-3">
          <CodeBlock code={CURL_EXAMPLE} highlightedHtml={curlHtml} />
          <p className="text-xs text-zinc-500 pl-1">202 Accepted response:</p>
          <CodeBlock code={SUCCESS_RESPONSE} highlightedHtml={responseHtml} />
        </div>
      </section>

      {/* Webhook payload */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-2">Webhook Payload</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Trickle sends a <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">POST</code> request
          to your webhook URL for each registration. The <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">data</code> field
          contains everything you originally sent to <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">/api/v1/queue</code>:
        </p>
        <CodeBlock code={WEBHOOK_PAYLOAD} highlightedHtml={webhookHtml} />
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3 text-sm text-zinc-400">
          <div className="flex gap-3">
            <code className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">X-Trickle-Event</code>
            <span>Always <code className="text-xs text-zinc-300">registration.queued</code> — use this to verify the request is from Trickle</span>
          </div>
          <div className="flex gap-3">
            <code className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">X-Trickle-Delivery</code>
            <span>Unique ID per delivery attempt — use this to deduplicate in case of retries</span>
          </div>
          <div className="border-t border-zinc-800 pt-3">
            <strong className="text-zinc-200">Important:</strong> Your endpoint must return{' '}
            <strong className="text-zinc-200">HTTP 200</strong> to confirm delivery and deduct 1 credit.
            Any other status code triggers a retry. Up to 3 attempts with exponential backoff (5s, 30s, 120s).
            If all 3 fail, the event is marked failed and no credit is spent.
          </div>
        </div>
      </section>

      {/* API Reference */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">API Reference</h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                {['Endpoint', 'Method', 'Auth', 'Description', 'Response'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-zinc-400 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 font-mono text-xs text-blue-400">/api/v1/queue</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-xs font-semibold text-blue-400">POST</span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">Bearer API Key</td>
                <td className="px-4 py-3 text-xs text-zinc-300">Queue a registration payload for delivery</td>
                <td className="px-4 py-3 font-mono text-xs text-emerald-400">202 Accepted</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Internal dashboard routes (<code>/api/internal/*</code>) require a session cookie and are not part of the public API.
        </p>
      </section>

      {/* Error Codes */}
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
                { status: '401', code: 'MISSING_KEY',          meaning: 'No Authorization header',       action: 'Add Authorization: Bearer YOUR_KEY header' },
                { status: '401', code: 'INVALID_KEY',          meaning: 'API key not recognised',        action: 'Check key in dashboard — regenerate if needed' },
                { status: '402', code: 'NO_CREDITS',           meaning: 'Credit balance is 0',           action: 'Purchase credits from the Credits page' },
                { status: '415', code: 'INVALID_CONTENT_TYPE', meaning: 'Not application/json',          action: 'Set Content-Type: application/json header' },
                { status: '422', code: 'EMPTY_PAYLOAD',        meaning: 'Request body is empty',         action: 'Send a JSON object with at least one field' },
                { status: '422', code: 'NO_WEBHOOK',           meaning: 'No webhook URL configured',     action: 'Set your webhook URL in Settings' },
                { status: '429', code: 'RATE_LIMITED',         meaning: 'Over 500 requests per minute',  action: 'Slow down or contact support to increase limit' },
                { status: '500', code: 'QUEUE_ERROR',          meaning: 'Failed to enqueue',             action: 'Retry with exponential backoff' },
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

      {/* Credit System */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Credit System</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400 space-y-3 leading-relaxed">
          <p>
            Every Trickle account starts with <strong className="text-zinc-200">500 free credits</strong>
            {' '}on signup, plus <strong className="text-zinc-200">10 free credits</strong> added every month.
            One credit is consumed for each registration successfully delivered to your webhook.
          </p>
          <p>
            Credits are <strong className="text-zinc-200">only deducted after your webhook returns HTTP 200</strong>.
            If delivery fails after 3 attempts, the event is marked failed and no credit is spent.
            You are never charged for failed deliveries.
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