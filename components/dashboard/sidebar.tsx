'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Key,
  CreditCard,
  BarChart2,
  Settings,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Overview',   href: '/dashboard',           icon: LayoutDashboard, exact: true },
  { label: 'API Keys',   href: '/dashboard/api-keys',  icon: Key },
  { label: 'Credits',    href: '/dashboard/credits',   icon: CreditCard },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { label: 'Settings',  href: '/dashboard/settings',  icon: Settings },
  { label: 'Docs',      href: '/dashboard/docs',      icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-zinc-800 bg-[#0f0f0f]">
      {/* Wordmark — links back to landing page */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-5">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-lg font-bold tracking-tight text-white group-hover:text-zinc-300 transition">
            trickle
          </span>
          <span className="rounded bg-blue-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
            beta
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map(({ label, href, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-blue-400' : 'text-zinc-500')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-5 py-4">
        <p className="text-xs text-zinc-600">© 2025 Trickle</p>
      </div>
    </aside>
  )
}