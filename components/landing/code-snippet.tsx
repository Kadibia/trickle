import { codeToHtml } from 'shiki'

const BEFORE = `// Before — direct DB hit, crashes under load
app.post('/register', async (req, res) => {
  const user = await db.users.create(req.body)
  await sendWelcomeEmail(user)
  res.json({ success: true })
})`

const AFTER = `// After — queue absorbs the spike
app.post('/register', async (req, res) => {
  const response = await fetch(
    'https://api.trickle.dev/api/v1/queue',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer tck_live_...',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    }
  )
  res.status(202).json(await response.json())
})`

export async function CodeSnippet() {
  const [beforeHtml, afterHtml] = await Promise.all([
    codeToHtml(BEFORE, { lang: 'javascript', theme: 'github-dark' }),
    codeToHtml(AFTER,  { lang: 'javascript', theme: 'github-dark' }),
  ])

  return (
    <section className="px-4 sm:px-6 py-14 bg-[#0a0a0a] border-t border-zinc-800/60">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            One swap. That&apos;s it.
          </h2>
          <p className="mt-2 text-zinc-400 text-sm sm:text-base max-w-md">
            Replace your registration handler with a single fetch call. No SDKs, no new packages.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-red-900/40 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-red-900/30 bg-red-950/20 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-xs font-semibold text-red-400">Before — crashes under load</span>
            </div>
            <div
              className="overflow-x-auto p-4 text-sm [&_pre]:!bg-transparent [&_code]:!text-[11px] sm:[&_code]:!text-[12px] [&_code]:!leading-relaxed"
              dangerouslySetInnerHTML={{ __html: beforeHtml }}
            />
          </div>

          <div className="rounded-xl border border-emerald-900/40 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-emerald-900/30 bg-emerald-950/20 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-emerald-400">After — handles any surge</span>
            </div>
            <div
              className="overflow-x-auto p-4 text-sm [&_pre]:!bg-transparent [&_code]:!text-[11px] sm:[&_code]:!text-[12px] [&_code]:!leading-relaxed"
              dangerouslySetInnerHTML={{ __html: afterHtml }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 sm:px-6 py-4">
          {[
            'Works with Node, Python, PHP, Go — any language',
            'Users always get 202 — never a 500 error',
            'Webhook receives payloads at your safe rate',
          ].map((text) => (
            <div key={text} className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
              <span className="h-1 w-1 rounded-full bg-zinc-500 shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}