import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'
import { getDeveloperById, createDeveloper } from '@/lib/db/developers'
import { seedSignupCredits, getBalance } from '@/lib/db/credits'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const userId = session.user.id
  const email = session.user.email

  let creditBalance: number | null = null

  try {
    // Auto-provision for OAuth users
    let developer = await getDeveloperById(userId)
    if (!developer) {
      const { developer: newDev } = await createDeveloper({ id: userId, email, passwordHash: '' })
      await seedSignupCredits(newDev.id)
      developer = newDev
    }

    // Fetch balance to show in topbar
    creditBalance = await getBalance(userId)
  } catch {
    // Non-fatal — dashboard still renders
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <div className="pl-60">
        <Topbar email={email} creditBalance={creditBalance} />
        <main className="px-8 py-8">{children}</main>
      </div>
    </div>
  )
}