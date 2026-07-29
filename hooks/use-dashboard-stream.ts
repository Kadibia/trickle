'use client'

import { useState, useEffect, useRef } from 'react'
import type { QueueEvent } from '@/lib/db/schema'

export interface DashboardStats {
  creditBalance: number
  queueDepth: number
  deliveredToday: number
  failedToday: number
  routedToday: number
  recentEvents: QueueEvent[]
  isSurging: boolean
  currentRate: number
}

interface StreamState {
  stats: DashboardStats | null
  isConnected: boolean
  error: string | null
}

export function useDashboardStream(): StreamState {
  const [state, setState] = useState<StreamState>({
    stats: null,
    isConnected: false,
    error: null,
  })
  const esRef = useRef<EventSource | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function connect() {
    if (esRef.current) { esRef.current.close(); esRef.current = null }

    const es = new EventSource('/api/internal/stream')
    esRef.current = es

    es.onopen = () => setState((prev) => ({ ...prev, isConnected: true, error: null }))

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as DashboardStats
        setState({ stats: data, isConnected: true, error: null })
      } catch { /* ignore malformed frames */ }
    }

    es.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }))
      es.close()
      esRef.current = null
      reconnectRef.current = setTimeout(() => connect(), 5_000)
    }
  }

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}