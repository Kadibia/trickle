const STEPS = [
  {
    n: '01',
    title: 'Surge hits your signup page',
    desc: 'A launch, newsletter drop, or viral moment sends thousands of registrations at once. Your server buckles. Users see errors.',
    before: 'DB timeout errors',
    after: null,
  },
  {
    n: '02',
    title: 'Trickle absorbs the spike',
    desc: 'Replace your registration handler with one API call. Every request lands in a managed Redis queue instantly — users always get 202.',
    before: null,
    after: '202 Accepted',
  },
  {
    n: '03',
    title: 'Your server gets what it can handle',
    desc: 'The BullMQ worker drips registrations to your webhook at your configured rate. 10/min by default. No crashes, no missed signups.',
    before: null,
    after: '10 req/min, safe',
  },
]

const FEATURES = [
  { title: '3× Auto-retry',     desc: 'Exponential backoff at 5s, 30s, 120s. Credits only deducted on success.' },
  { title: 'Live dashboard',    desc: 'Real-time queue depth, delivery rates, and credit balance via SSE.' },
  { title: 'API key auth',      desc: 'SHA-256 hashed keys, never stored in plain text. Revoke anytime.' },
  { title: 'Pay as you go',     desc: 'Credits never expire. Stripe for USD, Paystack for NGN.' },
  { title: 'Configurable rate', desc: 'Set your drip rate from 1 to 1,000 req/min. Change anytime.' },
  { title: 'Works anywhere',    desc: "Any language, any framework. If you can make an HTTP request, you're done." },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 sm:px-6 py-14 bg-zinc-950 border-t border-zinc-800/60">
      <div className="mx-auto max-w-6xl space-y-14">

        {/* ── Steps ──────────────────────────────────────────── */}
        <div>
          <div className="mb-8 max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              How it works.
            </h2>
            <p className="mt-2 text-zinc-400 text-sm sm:text-base">
              Three steps. One API call. No infrastructure changes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-4 h-px bg-zinc-700 z-10" />
                )}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 h-full space-y-3 hover:border-zinc-700 transition-colors">
                  <span className="font-mono text-3xl font-black text-zinc-800 block">{step.n}</span>
                  <div>
                    <h3 className="font-bold text-white text-sm mb-1.5">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
                  </div>
                  {step.before && (
                    <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2">
                      <p className="text-xs font-mono text-red-400">✗ {step.before}</p>
                    </div>
                  )}
                  {step.after && (
                    <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2">
                      <p className="text-xs font-mono text-emerald-400">✓ {step.after}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Features ───────────────────────────────────────── */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-6">
            Built for production from day one.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-5 hover:border-zinc-700 transition-colors">
                <p className="font-semibold text-white text-sm mb-1">{f.title}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}