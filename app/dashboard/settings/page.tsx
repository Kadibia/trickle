'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Settings { webhookUrl: string | null; dripRate: number }

function SectionCard({ title, description, children }: {
  title: string; description: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="mb-5 border-b border-zinc-800 pb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ webhookUrl: '', dripRate: 10 })
  const [loading, setLoading] = useState(true)

  // Webhook section
  const [webhookInput, setWebhookInput] = useState('')
  const [webhookSaving, setWebhookSaving] = useState(false)
  const [webhookMsg, setWebhookMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)

  // Drip rate section
  const [dripInput, setDripInput] = useState('10')
  const [dripSaving, setDripSaving] = useState(false)
  const [dripMsg, setDripMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/internal/settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSettings(json.data)
          setWebhookInput(json.data.webhookUrl ?? '')
          setDripInput(String(json.data.dripRate))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function saveWebhook() {
    setWebhookSaving(true)
    setWebhookMsg(null)
    try {
      const res = await fetch('/api/internal/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookInput }),
      })
      const json = await res.json()
      if (json.success) {
        setSettings((s) => ({ ...s, webhookUrl: webhookInput }))
        setWebhookMsg({ ok: true, text: 'Webhook URL saved.' })
      } else {
        setWebhookMsg({ ok: false, text: json.error ?? 'Save failed.' })
      }
    } catch {
      setWebhookMsg({ ok: false, text: 'Network error.' })
    } finally {
      setWebhookSaving(false)
    }
  }

  async function testWebhook() {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/internal/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-webhook' }),
      })
      const json = await res.json()
      setTestResult({
        ok: json.success,
        text: json.success
          ? `Ping delivered (${json.data?.statusCode ?? 200})`
          : json.error ?? 'Test failed.',
      })
    } catch {
      setTestResult({ ok: false, text: 'Network error.' })
    } finally {
      setTestLoading(false)
    }
  }

  async function saveDripRate() {
    const rate = parseInt(dripInput, 10)
    if (isNaN(rate) || rate < 1 || rate > 1000) {
      setDripMsg({ ok: false, text: 'Enter a value between 1 and 1000.' })
      return
    }
    setDripSaving(true)
    setDripMsg(null)
    try {
      const res = await fetch('/api/internal/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dripRate: rate }),
      })
      const json = await res.json()
      if (json.success) {
        setSettings((s) => ({ ...s, dripRate: rate }))
        setDripMsg({ ok: true, text: 'Drip rate saved.' })
      } else {
        setDripMsg({ ok: false, text: json.error ?? 'Save failed.' })
      }
    } catch {
      setDripMsg({ ok: false, text: 'Network error.' })
    } finally {
      setDripSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">Configure your webhook and queue behaviour.</p>
      </div>

      {/* Section 1 — Webhook */}
      <SectionCard
        title="Webhook"
        description="Trickle will POST each registration payload to this URL."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Webhook URL</label>
            <input
              type="url"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              placeholder="https://your-app.com/api/registrations"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {webhookMsg && (
            <FeedbackMsg ok={webhookMsg.ok} text={webhookMsg.text} />
          )}
          {testResult && (
            <FeedbackMsg ok={testResult.ok} text={testResult.text} />
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={saveWebhook}
              disabled={webhookSaving}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {webhookSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save URL
            </button>
            <button
              onClick={testWebhook}
              disabled={testLoading || !settings.webhookUrl}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 disabled:opacity-50"
            >
              {testLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />}
              Test Webhook
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Section 2 — Drip Rate */}
      <SectionCard
        title="Queue"
        description="How many registrations per minute to deliver to your webhook."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">
              Drip Rate
              <span className="ml-2 font-normal text-zinc-500">(registrations / minute)</span>
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={dripInput}
              onChange={(e) => setDripInput(e.target.value)}
              className="w-36 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-zinc-500">
              Default is 10/min. The worker reads this value from the database per job — changes
              take effect on the next delivery cycle.
            </p>
          </div>

          {dripMsg && <FeedbackMsg ok={dripMsg.ok} text={dripMsg.text} />}

          <button
            onClick={saveDripRate}
            disabled={dripSaving}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {dripSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save Rate
          </button>
        </div>
      </SectionCard>

      {/* Section 3 — Account (read-only for now) */}
      <SectionCard
        title="Account"
        description="Your developer account details."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Email</label>
            <div className="w-full rounded-lg border border-zinc-800 bg-zinc-800/30 px-3.5 py-2.5 text-sm text-zinc-400">
              {/* Email shown in topbar — read from session server-side */}
              Shown in the top bar
            </div>
          </div>
          <p className="text-xs text-zinc-600">
            Password change and account deletion coming in a future release.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}

function FeedbackMsg({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm',
      ok
        ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400'
        : 'border-red-900/50 bg-red-950/30 text-red-400'
    )}>
      {ok
        ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
        : <XCircle className="h-3.5 w-3.5 shrink-0" />}
      {text}
    </div>
  )
}
