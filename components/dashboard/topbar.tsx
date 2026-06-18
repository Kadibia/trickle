'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { LogOut, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopbarProps {
  email: string
  // creditBalance now driven by SSE stream — passed down from overview page
  // topbar receives it as a prop so it updates without re-render cycles
  creditBalance?: number | null
  isStreamConnected?: boolean
}

export function Topbar({ email, creditBalance, isStreamConnected }: TopbarProps) {
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800 bg-[#0a0a0a]/95 px-6 backdrop-blur">
      {/* Credit balance pill */}
      <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5">
        <Coins className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-sm font-medium text-zinc-200">
          {creditBalance != null ? creditBalance.toLocaleString() : '—'}
          <span className="ml-1 text-zinc-500">credits</span>
        </span>
        {/* Live connection dot */}
        {isStreamConnected !== undefined && (
          <span className={cn(
            'ml-1 h-1.5 w-1.5 rounded-full',
            isStreamConnected ? 'bg-emerald-400' : 'bg-zinc-600'
          )} />
        )}
      </div>

      {/* Right: email + logout */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-500">{email}</span>
        <div className="h-4 w-px bg-zinc-700" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </header>
  )
}
