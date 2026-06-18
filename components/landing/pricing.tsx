import Link from 'next/link'
import { CREDIT_PACKS } from '@/lib/stripe'
import { Check } from 'lucide-react'

const FREE_FEATURES = [
  '500 credits on signup',
  '10 free credits every month',
  'Full API access',
  '3× webhook retry',
  'Real-time dashboard',
  'Stripe + Paystack payments',
]

export function Pricing() {
  return (
    <section id="pricing" className="px-4 sm:px-6 py-14 bg-zinc-950 border-t border-zinc-800/60">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 max-w-xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Pay per delivery. Nothing else.
          </h2>
          <p className="mt-2 sm:mt-3 text-zinc-400 text-sm sm:text-base">
            No seats, no tiers, no monthly lock-in. Credits never expire.
            Stripe for USD, Paystack for NGN.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Free tier */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Free forever</p>
              <span className="text-3xl sm:text-4xl font-black text-white">$0</span>
              <p className="text-xs text-zinc-500 mt-1">to get started</p>
            </div>
            <ul className="space-y-2 flex-1 mb-5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-zinc-300">
                  <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/signup"
              className="block w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-center text-sm font-bold text-zinc-200 transition hover:bg-zinc-700"
            >
              Start free
            </Link>
          </div>

          {/* Credit packs */}
          {CREDIT_PACKS.map((pack) => {
            const isPopular = pack.id === 'growth'
            const perK = (pack.usdPrice / pack.credits * 1000).toFixed(2)
            return (
              <div
                key={pack.id}
                className={`relative rounded-xl border p-5 flex flex-col ${
                  isPopular ? 'border-blue-500 bg-blue-950/30' : 'border-zinc-700 bg-zinc-900'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 inset-x-0 flex justify-center">
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{pack.label}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white">${pack.usdPrice}</span>
                    <span className="text-zinc-500 mb-1 text-sm">USD</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">₦{pack.ngnPrice.toLocaleString()} NGN</p>
                </div>

                <div className="flex-1 mb-5 space-y-2">
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-3 py-2.5">
                    <p className="text-xl sm:text-2xl font-black text-white">{pack.credits.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">webhook deliveries</p>
                  </div>
                  <p className="text-xs text-zinc-500">${perK} per 1,000 deliveries</p>
                </div>

                <Link
                  href="/auth/signup"
                  className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-bold transition ${
                    isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'
                      : 'border border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  Get {pack.label}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}