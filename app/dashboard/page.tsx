'use client'

import { Coins, Zap, CheckCircle, AlertCircle, Clock, AlertTriangle, GitBranch } from 'lucide-react'
import { useDashboardStream } from '@/hooks/use-dashboard-stream'
import { StatsCard } from '@/components/dashboard/stats-card'
import { cn } from '@/lib/utils'
import type { QueueEvent } from '@/lib/db/schema'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  queued:    { label: 'Queued',    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  delivered: { label: 'Delivered', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  failed:    { label: 'Failed',    className: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

function RecentEventsTable({ events }: { events: QueueEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">
          No events yet. Send your first registration to{' '}
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-300">
            POST /api/v1/queue
          </code>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            <th className="px-5 py-3 text-left font-medium text-zinc-400">Time</th>
            <th className="px-5 py-3 text-left font-medium text-zinc-400">Event ID</th>
            <th className="px-5 py-3 text-left font-medium text-zinc-400">Status</th>
            <th className="px-5 py-3 text-center font-medium text-zinc-400">Routed</th>
            <th className="px-5 py-3 text-right font-medium text-zinc-400">Attempts</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, i) => {
            const badge = STATUS_BADGE[event.status] ?? STATUS_BADGE.queued
            return (
              <tr key={event.id} className={cn(
                'border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/30',
                i === events.length - 1 && 'border-b-0'
              )}>
                <td className="px-5 py-3.5 text-zinc-400 tabular-nums text-xs">
                  {new Date(event.createdAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-zinc-300">
                  {event.id.slice(0, 8)}…
                </td>
                <td className="px-5 py-3.5">
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    badge.className
                  )}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  {event.routingRuleId ? (
                    <span title="Delivered via a routing rule" className="inline-flex items-center justify-center rounded-full bg-purple-500/15 p-1 text-purple-400 border border-purple-500/30">
                      <GitBranch className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="text-zinc-700">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right text-zinc-400 tabular-nums">
                  {event.attempts}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function OverviewPage() {
  const { stats, isConnected } = useDashboardStream()

  const fmt = (n: number | undefined) => n != null ? n.toLocaleString() : '—'

  return (
    <div className="space-y-6">

      {/* Surge alert banner */}
      {stats?.isSurging && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Traffic surge detected</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Your app is receiving {stats.currentRate} requests this minute — significantly above your normal rate.
              Trickle is absorbing the surge and protecting your server. All registrations are safely queued.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="mt-1 text-sm text-zinc-400">Live queue activity.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5">
          <span className={cn(
            'h-2 w-2 rounded-full',
            isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
          )} />
          <span className="text-xs text-zinc-400">
            {isConnected ? 'Live' : 'Reconnecting…'}
          </span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Credit Balance"   value={fmt(stats?.creditBalance)}  subtitle="1 credit = 1 delivery" icon={Coins} />
        <StatsCard title="Queue Depth"      value={fmt(stats?.queueDepth)}     subtitle="Pending deliveries"   icon={Zap} />
        <StatsCard title="Delivered Today"  value={fmt(stats?.deliveredToday)} subtitle="Since midnight UTC"   icon={CheckCircle} trend={stats?.deliveredToday ? 'up' : 'neutral'} />
        <StatsCard title="Failed Today"     value={fmt(stats?.failedToday)}    subtitle="Since midnight UTC"   icon={AlertCircle} trend={stats?.failedToday ? 'down' : 'neutral'} />
      </div>

      {/* Current rate */}
      {stats && (
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>Current rate:</span>
          <span className={cn(
            'font-semibold',
            stats.isSurging ? 'text-amber-400' : 'text-zinc-300'
          )}>
            {stats.currentRate} req/min
          </span>
          {stats.isSurging && (
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-amber-400 text-[10px] font-semibold">
              SURGE
            </span>
          )}
          {stats.routedToday > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-purple-400">
              <GitBranch className="h-3 w-3" />
              {stats.routedToday} routed by rule today
            </span>
          )}
        </div>
      )}

      {/* Recent events */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-zinc-500" />
          <h2 className="text-base font-semibold text-white">Recent Events</h2>
          {stats && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              Last {stats.recentEvents.length}
            </span>
          )}
        </div>
        {stats ? (
          <RecentEventsTable events={stats.recentEvents} />
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center">
            <p className="text-sm text-zinc-500">
              {isConnected ? 'Loading events…' : 'Connecting to stream…'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}