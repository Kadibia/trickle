'use client'

import { useState } from 'react'
import { X, Zap, ExternalLink, Loader2 } from 'lucide-react'
import { CREDIT_PACKS, type PackId } from '@/lib/stripe'
import { cn } from '@/lib/utils'

interface PurchaseModalProps {
  onClose: () => void
}

// Auto-detect currency: Nigeria → NGN (Paystack), all others → USD (Stripe)
function detectCurrency(): 'NGN' | 'USD' {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (locale.endsWith('-NG') || tz.startsWith('Africa/Lagos') || tz.startsWith('Africa/Abuja')) {
      return 'NGN'
    }
  } catch { /* ignore */ }
  return 'USD'
}

export function PurchaseModal({ onClose }: PurchaseModalProps) {
  const [selected, setSelected] = useState<PackId>('growth')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const currency = detectCurrency()

  const provider = currency === 'NGN' ? 'Paystack' : 'Stripe'

  async function handlePurchase() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/internal/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selected, currency }),
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.error ?? 'Something went wrong')
        return
      }

      // Redirect to payment page
      window.location.href = json.data.paymentUrl
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-7 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Buy Credits</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Paying via{' '}
              <span className="font-medium text-zinc-200">{provider}</span>
              <span className="ml-1 text-zinc-500">
                ({currency === 'NGN' ? '₦ NGN' : '$ USD'})
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Pack cards */}
        <div className="space-y-3 mb-6">
          {CREDIT_PACKS.map((pack) => {
            const price = currency === 'NGN'
              ? `₦${pack.ngnPrice.toLocaleString()}`
              : `$${pack.usdPrice}`
            const isSelected = selected === pack.id
            const isPopular = pack.id === 'growth'

            return (
              <button
                key={pack.id}
                onClick={() => setSelected(pack.id)}
                className={cn(
                  'relative w-full rounded-xl border p-4 text-left transition',
                  isSelected
                    ? 'border-blue-500 bg-blue-950/30'
                    : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'
                )}
              >
                {isPopular && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Popular
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      isSelected ? 'bg-blue-600' : 'bg-zinc-700'
                    )}>
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{pack.label}</p>
                      <p className="text-sm text-zinc-400">
                        {pack.credits.toLocaleString()} credits
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-white">{price}</p>
                </div>
              </button>
            )
          })}
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={handlePurchase}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Opening payment…</>
          ) : (
            <><ExternalLink className="h-4 w-4" /> Continue to {provider}</>
          )}
        </button>

        <p className="mt-3 text-center text-xs text-zinc-600">
          Credits are added automatically after payment confirmation.
        </p>
      </div>
    </div>
  )
}
