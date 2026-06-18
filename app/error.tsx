'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app error boundary]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-800 bg-red-950/40 mx-auto">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">Something went wrong</p>
          <p className="mt-1 text-sm text-zinc-400">{error.message || 'An unexpected error occurred.'}</p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    </div>
  )
}
