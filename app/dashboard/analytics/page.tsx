'use client'

import { useState, useEffect } from 'react'
import { Activity, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/stats-card'
import { ThroughputLineChart, VolumeBarChart } from '@/components/analytics/throughput-chart'
import { cn } from '@/lib/utils'

type Range = '24h' | '7d' | '30d'
type Bucket = { label: string; queued: number; delivered: number; failed: number }

interface AnalyticsData {
  hourlyVolume: { hour: string; queued: number; delivered: number; failed: number }[]
  dailyVolume:  { date: string; queued: number; delivered: number; failed: number }[]
  successRate: number
  avgDeliveryTime: number
  total: number
}

function normalise(
  data: AnalyticsData | null,
  range: Range
): { line: Bucket[]; bar: Bucket[] } {
  if (!data) return { line: [], bar: [] }
  const toLabel = (s: string) => s
  const hourly: Bucket[] = data.hourlyVolume.map((r) => ({ label: toLabel(r.hour), ...r }))
  const daily:  Bucket[] = data.dailyVolume.map((r)  => ({ label: toLabel(r.date), ...r }))
  return range === '24h'
    ? { line: hourly, bar: daily }
    : { line: daily,  bar: daily  }
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d',  label: '7d'  },
  { value: '30d', label: '30d' },
]

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('24h')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/internal/analytics?range=${range}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setData(json.data as AnalyticsData) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  const { line, bar } = normalise(data, range)
  const isEmpty = !loading && data?.total === 0

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-400">Throughput, delivery rates, and queue trends.</p>
        </div>
        <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-900 p-1 gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition',
                range === opt.value ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Events"    value={loading ? '—' : (data?.total ?? 0).toLocaleString()} subtitle={`Last ${range}`} icon={Activity} />
        <StatsCard title="Success Rate"    value={loading ? '—' : `${data?.successRate ?? 0}%`} subtitle="Delivered / total" icon={CheckCircle2} trend={data?.successRate == null ? 'neutral' : data.successRate >= 95 ? 'up' : 'down'} />
        <StatsCard title="Avg Delivery"    value={loading ? '—' : `${(data?.avgDeliveryTime ?? 0).toLocaleString()}ms`} subtitle="Queue to webhook" icon={Clock} />
        <StatsCard title="Delivered"       value={loading ? '—' : bar.reduce((s, r) => s + r.delivered, 0).toLocaleString()} subtitle={`Last ${range}`} icon={TrendingUp} trend="up" />
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6 py-16 text-center">
          <Activity className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 font-medium">No events in this period</p>
          <p className="mt-1 text-xs text-zinc-600">
            Send a registration to{' '}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">POST /api/v1/queue</code>
            {' '}to see data here.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-5">
              Throughput — {range === '24h' ? 'Hourly' : 'Daily'}
            </h2>
            <div className="h-52">
              <ThroughputLineChart data={line} />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-5">
              Volume — {range === '24h' ? 'Today' : `Last ${range}`}
            </h2>
            <div className="h-52">
              <VolumeBarChart data={bar} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
