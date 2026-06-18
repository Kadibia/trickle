import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center space-y-5">
      <p className="text-6xl font-black text-zinc-700">404</p>
      <div>
        <p className="font-semibold text-white">Page not found</p>
        <p className="mt-1 text-sm text-zinc-400">This dashboard page does not exist.</p>
      </div>
      <Link href="/dashboard" className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700">
        Back to overview
      </Link>
    </div>
  )
}
