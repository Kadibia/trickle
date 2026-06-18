import Link from 'next/link'

const EVENTS = [
  { id: 'evt_a1b2', email: 'ada@loop.io',   status: 'delivered', ms: 847  },
  { id: 'evt_c3d4', email: 'kai@surge.co',  status: 'delivered', ms: 1203 },
  { id: 'evt_e5f6', email: 'mia@nexus.dev', status: 'queued',    ms: null  },
  { id: 'evt_g7h8', email: 'leo@spark.io',  status: 'queued',    ms: null  },
  { id: 'evt_i9j0', email: 'zoe@drift.com', status: 'queued',    ms: null  },
]

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 pt-20 pb-12 overflow-hidden">

      {/* Top border accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── Left: Copy ──────────────────────────────────── */}
          <div className="space-y-6">

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-white">
                Stop your site from{' '}
                <span className="relative inline-block text-blue-400">
                  {/* cra */}
                  <span>cra</span>
                  {/* sh — golden lightning letters */}
                  <span className="lightning-letters">sh</span>
                  {/* ing */}
                  <span>ing</span>
                </span>{' '}
                during signups.
              </h1>
              <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-md">
                One API call replaces your registration endpoint. Trickle absorbs
                the surge, queues everything, and delivers to your webhook at a
                safe rate — no infra changes required.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/signup"
                className="group relative overflow-hidden rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 hover:-translate-y-px text-center"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                <span className="relative">Get started free</span>
              </Link>
              <a
                href="#how-it-works"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white text-center"
              >
                How it works ↓
              </a>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 sm:gap-8 pt-2 border-t border-zinc-800">
              {[
                { n: '500',   label: 'free credits'  },
                { n: '< 5ms', label: 'queue latency' },
                { n: '3×',    label: 'auto-retry'    },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-lg sm:text-xl font-black text-white">{s.n}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Live queue widget ─────────────────────── */}
          <div className="relative w-full">
            <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/80 shadow-2xl shadow-black/40 overflow-hidden backdrop-blur-sm">

              {/* Card header */}
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 sm:px-5 py-3 sm:py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  </div>
                  <span className="text-xs font-mono text-zinc-500">trickle / queue</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-400">live</span>
                </div>
              </div>

              {/* Rate indicator */}
              <div className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/40 px-4 sm:px-5 py-2.5">
                <span className="text-xs text-zinc-500">Drip rate</span>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={`h-3 w-1 rounded-sm ${i < 6 ? 'bg-blue-500' : 'bg-zinc-700'}`} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-white">10 / min</span>
                </div>
              </div>

              {/* Event rows */}
              <div className="divide-y divide-zinc-800/60">
                {EVENTS.map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-zinc-800/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${evt.status === 'delivered' ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-zinc-300 truncate">{evt.email}</p>
                        <p className="text-[10px] text-zinc-600 font-mono">{evt.id}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {evt.status === 'delivered' ? (
                        <>
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">delivered</span>
                          <p className="text-[10px] text-zinc-600 mt-0.5">{evt.ms}ms</p>
                        </>
                      ) : (
                        <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">queued</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/40 px-4 sm:px-5 py-3">
                <span className="text-xs text-zinc-600">2 delivered · 3 queued</span>
                <span className="text-xs font-mono text-zinc-600">1 credit / delivery</span>
              </div>
            </div>

            {/* Floating code pill — desktop only */}
            <div className="absolute -bottom-4 -left-4 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 shadow-xl hidden lg:block">
              <p className="font-mono text-[11px] text-zinc-400">
                <span className="text-blue-400">POST</span>{' '}
                <span className="text-zinc-200">/api/v1/queue</span>
              </p>
              <p className="font-mono text-[11px] text-emerald-400 mt-0.5">202 Accepted</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}