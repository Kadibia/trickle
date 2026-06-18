'use client'

import { cn } from '@/lib/utils'
import type { Credit } from '@/lib/db/schema'

const SOURCE_LABELS: Record<string, string> = {
  signup: 'Signup bonus',
  monthly: 'Monthly allocation',
  purchase: 'Credit purchase',
  delivery: 'Webhook delivery',
}

const SOURCE_ICONS: Record<string, string> = {
  signup: '🎉',
  monthly: '🔄',
  purchase: '💳',
  delivery: '📤',
}

interface CreditHistoryTableProps {
  history: Credit[]
}

export function CreditHistoryTable({ history }: CreditHistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">No transactions yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            <th className="px-5 py-3 text-left font-medium text-zinc-400">Date</th>
            <th className="px-5 py-3 text-left font-medium text-zinc-400">Type</th>
            <th className="px-5 py-3 text-left font-medium text-zinc-400">Reference</th>
            <th className="px-5 py-3 text-right font-medium text-zinc-400">Amount</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row, i) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/30',
                i === history.length - 1 && 'border-b-0'
              )}
            >
              <td className="px-5 py-3.5 text-zinc-400 tabular-nums">
                {new Date(row.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="px-5 py-3.5">
                <span className="flex items-center gap-2 text-zinc-200">
                  <span>{SOURCE_ICONS[row.source] ?? '•'}</span>
                  {SOURCE_LABELS[row.source] ?? row.source}
                </span>
              </td>
              <td className="px-5 py-3.5 text-zinc-500 font-mono text-xs">
                {row.reference
                  ? row.reference.slice(0, 20) + (row.reference.length > 20 ? '…' : '')
                  : '—'}
              </td>
              <td className={cn(
                'px-5 py-3.5 text-right font-semibold tabular-nums',
                row.amount > 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {row.amount > 0 ? '+' : ''}{row.amount.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
