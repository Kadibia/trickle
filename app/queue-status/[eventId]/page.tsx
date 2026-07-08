'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface StatusData {
  status: 'queued' | 'delivered' | 'failed'
  position: number | null
  attempts: number
  createdAt: string
  deliveredAt: string | null
}

export default function QueueStatusPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [data, setData] = useState<StatusData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!eventId) return

    let interval: ReturnType<typeof setInterval>

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/queue-status/${eventId}`)
        if (!res.ok) { setError(true); return }
        const json = await res.json()
        setData(json.data)

        // Stop polling once delivered or failed
        if (json.data.status === 'delivered' || json.data.status === 'failed') {
          clearInterval(interval)
        }
      } catch {
        setError(true)
      }
    }

    fetchStatus()
    interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [eventId])

  const statusConfig = {
    queued: {
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      dot: 'bg-blue-400 animate-pulse',
      label: 'In Queue',
      message: 'Your registration is queued and will be processed shortly.',
    },
    delivered: {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      dot: 'bg-emerald-400',
      label: 'Delivered',
      message: 'Your registration has been successfully processed.',
    },
    failed: {
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      dot: 'bg-red-400',
      label: 'Failed',
      message: 'Your registration could not be processed. Please try again.',
    },
  }

  const config = data ? statusConfig[data.status] : null

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <p className="text-2xl font-black text-white">trickle</p>
        <p className="text-sm text-zinc-500 mt-1">Registration Status</p>
      </div>

      <div className="w-full max-w-md">
        {error ? (
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8 text-center">
            <p className="text-red-400 font-medium">Status not found</p>
            <p className="text-sm text-zinc-500 mt-2">This registration ID does not exist or has expired.</p>
          </div>
        ) : !data ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">Loading status…</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 space-y-6">

            {/* Status badge */}
            <div className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2 ${config!.bg}`}>
              <span className={`h-2 w-2 rounded-full ${config!.dot}`} />
              <span className={`text-sm font-semibold ${config!.color}`}>{config!.label}</span>
            </div>

            {/* Position */}
            {data.status === 'queued' && data.position !== null && (
              <div className="text-center py-4">
                <p className="text-6xl font-black text-white">#{data.position}</p>
                <p className="text-zinc-500 text-sm mt-2">in line</p>
              </div>
            )}

            {/* Delivered checkmark */}
            {data.status === 'delivered' && (
              <div className="text-center py-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            )}

            {/* Failed X */}
            {data.status === 'failed' && (
              <div className="text-center py-4">
                <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                  <svg className="h-8 w-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
              </div>
            )}

            <p className="text-sm text-zinc-400 text-center">{config!.message}</p>

            {/* Meta */}
            <div className="border-t border-zinc-800 pt-4 space-y-2 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Registration ID</span>
                <span className="font-mono text-zinc-500">{eventId.slice(0, 8)}…</span>
              </div>
              <div className="flex justify-between">
                <span>Submitted</span>
                <span>{new Date(data.createdAt).toLocaleTimeString()}</span>
              </div>
              {data.deliveredAt && (
                <div className="flex justify-between">
                  <span>Delivered</span>
                  <span>{new Date(data.deliveredAt).toLocaleTimeString()}</span>
                </div>
              )}
              {data.status === 'queued' && (
                <div className="flex justify-between">
                  <span>Attempts</span>
                  <span>{data.attempts}</span>
                </div>
              )}
            </div>

            {data.status === 'queued' && (
              <p className="text-center text-xs text-zinc-600 animate-pulse">
                Updating every 3 seconds…
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-zinc-700">
        Powered by <span className="text-zinc-500">trickle</span>
      </p>
    </div>
  )
}
