'use client'

import { useState, useEffect } from 'react'
import { Coins, ShoppingCart, TrendingDown } from 'lucide-react'
import { CreditHistoryTable } from '@/components/credits/credit-history-table'
import { PurchaseModal } from '@/components/credits/purchase-modal'
import type { Credit } from '@/lib/db/schema'

const FREE_TIER = 500

interface CreditsData {
  balance: number
  history: Credit[]
}

export default function CreditsPage() {
  const [data, setData] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/internal/credits')
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch { /* silently fail */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const balance = data?.balance ?? 0
  const usedFromFree = Math.max(0, FREE_TIER - balance)
  const progressPct = Math.min(100, Math.round((usedFromFree / FREE_TIER) * 100))

  return (
    <>
      {showModal && <PurchaseModal onClose={() => setShowModal(false)} />}

      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Credits</h1>
          <p className="mt-1 text-sm text-zinc-400">
            1 credit = 1 registration delivered to your webhook.
          </p>
        </div>

        {/* Balance card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Coins className="h-5 w-5 text-amber-400" />
                <p className="text-sm font-medium text-zinc-400">Current balance</p>
              </div>
              {loading ? (
                <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-800" />
              ) : (
                <p className="text-4xl font-bold tracking-tight text-white">
                  {balance.toLocaleString()}
                  <span className="ml-2 text-lg font-medium text-zinc-400">credits</span>
                </p>
              )}
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 active:bg-blue-700"
            >
              <ShoppingCart className="h-4 w-4" />
              Buy Credits
            </button>
          </div>

          {/* Free tier usage bar */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="h-3 w-3" />
                {usedFromFree.toLocaleString()} used from free tier
              </span>
              <span>{FREE_TIER.toLocaleString()} free credits</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-600">{progressPct}% of free tier used</p>
          </div>
        </div>

        {/* Credit packs preview */}
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Credit Packs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Starter', credits: '1,000',   usd: '$9',   ngn: '₦14,900' },
              { label: 'Growth',  credits: '10,000',  usd: '$49',  ngn: '₦79,900', popular: true },
              { label: 'Scale',   credits: '100,000', usd: '$199', ngn: '₦329,900' },
            ].map((pack) => (
              <button
                key={pack.label}
                onClick={() => setShowModal(true)}
                className={`relative rounded-xl border p-5 text-left transition ${
                  pack.popular
                    ? 'border-blue-600/60 bg-blue-950/20 hover:border-blue-500'
                    : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Popular
                  </span>
                )}
                <p className="font-semibold text-white">{pack.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {pack.credits}
                  <span className="ml-1 text-sm font-normal text-zinc-400">credits</span>
                </p>
                <p className="mt-3 text-sm text-zinc-400">
                  {pack.usd} <span className="text-zinc-600">·</span> {pack.ngn}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Transaction History</h2>
          {loading ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center">
              <p className="text-sm text-zinc-500">Loading…</p>
            </div>
          ) : (
            <CreditHistoryTable history={data?.history ?? []} />
          )}
        </div>
      </div>
    </>
  )
}
