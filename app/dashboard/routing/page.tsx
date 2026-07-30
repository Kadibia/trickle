'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, Plus, Trash2, GitBranch, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoutingConfig, RoutingRule } from '@/lib/routing'

type Operator = RoutingRule['operator']

const OPERATORS: { value: Operator; label: string }[] = [
  { value: 'equals',     label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains',   label: 'contains' },
  { value: 'exists',     label: 'exists' },
]

function newRule(): RoutingRule {
  return {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    field: '',
    operator: 'equals',
    value: '',
    webhookUrl: '',
  }
}

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

function FeedbackMsg({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm',
      ok ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400'
         : 'border-red-900/50 bg-red-950/30 text-red-400'
    )}>
      {ok ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
      {text}
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
const selectClass = inputClass + ' appearance-none'

function RuleRow({ rule, index, onChange, onRemove }: {
  rule: RoutingRule
  index: number
  onChange: (rule: RoutingRule) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Rule {index + 1}
        </span>
        <button onClick={onRemove}
          className="rounded-md p-1.5 text-zinc-500 transition hover:bg-red-950/40 hover:text-red-400"
          aria-label="Remove rule">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1fr_1.2fr]">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-400">Payload field</label>
          <input type="text" value={rule.field} placeholder="e.g. country"
            onChange={(e) => onChange({ ...rule, field: e.target.value })}
            className={inputClass} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-400">Operator</label>
          <select value={rule.operator}
            onChange={(e) => onChange({ ...rule, operator: e.target.value as Operator })}
            className={selectClass}>
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-400">Value</label>
          <input type="text" value={rule.value ?? ''} placeholder={rule.operator === 'exists' ? 'n/a' : 'e.g. NG'}
            disabled={rule.operator === 'exists'}
            onChange={(e) => onChange({ ...rule, value: e.target.value })}
            className={cn(inputClass, rule.operator === 'exists' && 'opacity-40')} />
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <label className="block text-xs font-medium text-zinc-400">Send matching events to</label>
        <input type="url" value={rule.webhookUrl} placeholder="https://your-app.com/webhooks/ng-registrations"
          onChange={(e) => onChange({ ...rule, webhookUrl: e.target.value })}
          className={inputClass} />
      </div>
    </div>
  )
}

export default function RoutingPage() {
  const [config, setConfig] = useState<RoutingConfig>({ rules: [], defaultWebhookUrl: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/internal/routing')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.routingRules) {
          setConfig({
            rules: json.data.routingRules.rules ?? [],
            defaultWebhookUrl: json.data.routingRules.defaultWebhookUrl ?? '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function addRule() {
    setConfig((c) => ({ ...c, rules: [...c.rules, newRule()] }))
  }

  function updateRule(id: string, updated: RoutingRule) {
    setConfig((c) => ({ ...c, rules: c.rules.map((r) => (r.id === id ? updated : r)) }))
  }

  function removeRule(id: string) {
    setConfig((c) => ({ ...c, rules: c.rules.filter((r) => r.id !== id) }))
  }

  async function saveConfig() {
    setSaving(true)
    setMsg(null)

    const incomplete = config.rules.find(
      (r) => !r.field.trim() || !r.webhookUrl.trim() || (r.operator !== 'exists' && !r.value?.trim())
    )
    if (incomplete) {
      setMsg({ ok: false, text: 'Every rule needs a field, a value (unless using "exists"), and a webhook URL.' })
      setSaving(false)
      return
    }

    try {
      const payload: RoutingConfig | null =
        config.rules.length === 0 && !config.defaultWebhookUrl?.trim()
          ? null
          : { rules: config.rules, defaultWebhookUrl: config.defaultWebhookUrl?.trim() || undefined }

      const res = await fetch('/api/internal/routing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routingRules: payload }),
      })
      const json = await res.json()
      if (json.success) setMsg({ ok: true, text: 'Routing rules saved.' })
      else setMsg({ ok: false, text: json.error ?? 'Save failed.' })
    } catch {
      setMsg({ ok: false, text: 'Network error.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Routing</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Send registrations to different webhooks based on their payload. Rules are checked in order, top to bottom.
        </p>
      </div>

      <SectionCard title="Rules"
        description="Each rule inspects a field in the incoming payload. The first rule that matches wins.">
        <div className="space-y-3">
          {config.rules.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-sm text-zinc-500">
              <GitBranch className="h-4 w-4" />
              No rules yet. Every registration goes to your default webhook.
            </div>
          )}

          {config.rules.map((rule, i) => (
            <div key={rule.id}>
              <RuleRow
                rule={rule}
                index={i}
                onChange={(updated) => updateRule(rule.id, updated)}
                onRemove={() => removeRule(rule.id)}
              />
              {i < config.rules.length - 1 && (
                <div className="flex justify-center py-1.5">
                  <ArrowDown className="h-3.5 w-3.5 text-zinc-700" />
                </div>
              )}
            </div>
          ))}

          <button onClick={addRule}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200">
            <Plus className="h-3.5 w-3.5" /> Add rule
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Fallback"
        description="Used when no rule matches, or when no rules are set. Leave blank to fall back to your webhook in Settings.">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">Default webhook URL</label>
          <input type="url" value={config.defaultWebhookUrl ?? ''}
            placeholder="https://your-app.com/api/registrations"
            onChange={(e) => setConfig((c) => ({ ...c, defaultWebhookUrl: e.target.value }))}
            className={inputClass} />
        </div>
      </SectionCard>

      {msg && <FeedbackMsg ok={msg.ok} text={msg.text} />}

      <button onClick={saveConfig} disabled={saving}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save Routing Rules
      </button>
    </div>
  )
}