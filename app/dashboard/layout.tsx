import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'

// Prevent static generation — forces runtime rendering
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const email = session.user.email

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <div className="pl-60">
        <Topbar email={email} />
        <main className="px-8 py-8">{children}</main>
      </div>
    </div>
  )
}