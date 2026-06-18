'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard error boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center space-y-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-800 bg-red-950/40">
        <AlertTriangle className="h-5 w-5 text-red-400" />
      </div>
      <div>
        <p className="font-semibold text-white">Something went wrong</p>
        <p className="mt-1 text-sm text-zinc-400">{error.message || 'This page encountered an error.'}</p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  )
}
