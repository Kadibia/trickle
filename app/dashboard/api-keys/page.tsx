'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { ApiKeyCard } from '@/components/api-keys/api-key-card'

interface KeyState {
  hasKey: boolean
  maskedKey: string | null
  rawKey: string | null
}

export default function ApiKeysPage() {
  const searchParams = useSearchParams()
  const [keyState, setKeyState] = useState<KeyState>({
    hasKey: false,
    maskedKey: null,
    rawKey: null,
  })
  const [loading, setLoading] = useState(true)
  const [bannerCopied, setBannerCopied] = useState(false)

  const fetchKey = useCallback(async () => {
    try {
      const res = await fetch('/api/internal/api-keys')
      const json = await res.json()
      if (json.success) {
        setKeyState((prev) => ({
          ...prev,
          hasKey: json.data.hasKey,
          maskedKey: json.data.maskedKey,
        }))
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check if a new key was passed via URL (from signup)
    const newKey = searchParams.get('newKey')
    if (newKey) {
      setKeyState({ hasKey: true, maskedKey: null, rawKey: newKey })
      setLoading(false)
      // Clean up URL without triggering a reload
      window.history.replaceState({}, '', '/dashboard/api-keys')
    } else {
      fetchKey()
    }
  }, [fetchKey, searchParams])

  async function handleRegenerate() {
    const res = await fetch('/api/internal/api-keys', { method: 'POST' })
    const json = await res.json()
    if (json.success) {
      setKeyState({ hasKey: true, maskedKey: null, rawKey: json.data.rawApiKey })
    }
  }

  async function handleRevoke() {
    const res = await fetch('/api/internal/api-keys', { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      setKeyState({ hasKey: false, maskedKey: null, rawKey: null })
    }
  }

  async function handleBannerCopy() {
    if (!keyState.rawKey) return
    await navigator.clipboard.writeText(keyState.rawKey)
    setBannerCopied(true)
    setTimeout(() => setBannerCopied(false), 2000)
  }

  function dismissBanner() {
    setKeyState((prev) => ({ ...prev, rawKey: null }))
    fetchKey()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Your key authenticates all requests to{' '}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">
            POST /api/v1/queue
          </code>
          . One key per account.
        </p>
      </div>

      {/* One-time reveal banner */}
      {keyState.rawKey && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-amber-300">
              Save this key — it won&apos;t be shown again
            </p>
          </div>
          <div className="rounded-lg border border-amber-800/40 bg-zinc-950 px-4 py-3 font-mono text-sm text-amber-100 break-all">
            {keyState.rawKey}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleBannerCopy}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600">
              {bannerCopied ? '✓ Copied!' : 'Copy Key'}
            </button>
            <button onClick={dismissBanner}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:text-white">
              I&apos;ve saved it
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center">
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      ) : !keyState.rawKey ? (
        <ApiKeyCard
          maskedKey={keyState.maskedKey}
          hasKey={keyState.hasKey}
          onRegenerate={handleRegenerate}
          onRevoke={handleRevoke}
        />
      ) : null}
    </div>
  )
}
