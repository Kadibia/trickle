'use client'

import { useState } from 'react'
import { Copy, Check, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiKeyCardProps {
  maskedKey: string | null
  hasKey: boolean
  onRegenerate: () => Promise<void>
  onRevoke: () => Promise<void>
}

export function ApiKeyCard({
  maskedKey,
  hasKey,
  onRegenerate,
  onRevoke,
}: ApiKeyCardProps) {
  const [copied, setCopied] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [revokeLoading, setRevokeLoading] = useState(false)

  async function handleCopy() {
    if (!maskedKey) return
    await navigator.clipboard.writeText(maskedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegen() {
    setRegenLoading(true)
    try {
      await onRegenerate()
    } finally {
      setRegenLoading(false)
      setShowRegenConfirm(false)
    }
  }

  async function handleRevoke() {
    setRevokeLoading(true)
    try {
      await onRevoke()
    } finally {
      setRevokeLoading(false)
      setShowRevokeConfirm(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Key display */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-zinc-300">Your API Key</p>
          {hasKey && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</>
              ) : (
                <><Copy className="h-3.5 w-3.5" /> Copy</>
              )}
            </button>
          )}
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-200">
          {hasKey ? maskedKey ?? '••••••••••••••••••••' : (
            <span className="text-zinc-500">No key generated</span>
          )}
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Your key is hashed and never stored in plain text. Treat it like a password.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!showRegenConfirm ? (
          <button
            onClick={() => setShowRegenConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate Key
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-400">Old key will stop working immediately.</span>
            <button
              onClick={handleRegen}
              disabled={regenLoading}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
            >
              {regenLoading ? 'Regenerating…' : 'Confirm'}
            </button>
            <button
              onClick={() => setShowRegenConfirm(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-300">Danger Zone</p>
            <p className="mt-1 text-xs text-red-400/70">
              Revoking your key will immediately block all API requests using it.
            </p>
          </div>
        </div>

        {!showRevokeConfirm ? (
          <button
            onClick={() => setShowRevokeConfirm(true)}
            disabled={!hasKey}
            className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Revoke Key
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-400">This cannot be undone.</span>
            <button
              onClick={handleRevoke}
              disabled={revokeLoading}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {revokeLoading ? 'Revoking…' : 'Yes, revoke it'}
            </button>
            <button
              onClick={() => setShowRevokeConfirm(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
