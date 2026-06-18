'use client'

import { useState, useEffect } from 'react'
import { Check, Copy } from 'lucide-react'

interface CodeBlockProps {
  code: string
  lang?: string
  highlightedHtml: string
}

export function CodeBlock({ code, highlightedHtml }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative rounded-xl border border-zinc-700 bg-zinc-950 overflow-hidden">
      <button
        onClick={handleCopy}
        className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:border-zinc-600 hover:text-white"
      >
        {copied ? (
          <><Check className="h-3 w-3 text-emerald-400" /> Copied</>
        ) : (
          <><Copy className="h-3 w-3" /> Copy</>
        )}
      </button>
      <div
        className="overflow-x-auto p-5 text-sm leading-relaxed [&_pre]:!bg-transparent [&_code]:!text-sm"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </div>
  )
}

interface TabsProps {
  tabs: { label: string; code: string; html: string }[]
}

export function CodeTabs({ tabs }: TabsProps) {
  const [active, setActive] = useState(0)

  return (
    <div>
      <div className="flex gap-0 rounded-t-xl border border-b-0 border-zinc-700 bg-zinc-900 overflow-hidden">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={`px-4 py-2.5 text-sm font-medium transition border-r border-zinc-700 last:border-r-0 ${
              active === i
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="relative rounded-b-xl rounded-tr-xl border border-zinc-700 bg-zinc-950 overflow-hidden">
        <CodeBlock
          code={tabs[active]?.code ?? ''}
          highlightedHtml={tabs[active]?.html ?? ''}
        />
      </div>
    </div>
  )
}
