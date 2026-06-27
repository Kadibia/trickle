import Link from 'next/link'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { CodeSnippet } from '@/components/landing/code-snippet'
import { Pricing } from '@/components/landing/pricing'

async function Navbar() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  const isLoggedIn = !!session

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-zinc-800/80 bg-[#0a0a0a]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-base font-black tracking-tight text-white">
          trickle
        </Link>
        <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
          <Link href="#how-it-works" className="transition hover:text-white">How it works</Link>
          <Link href="#pricing"      className="transition hover:text-white">Pricing</Link>
          <Link href="/dashboard/docs" className="transition hover:text-white">Docs</Link>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm text-zinc-400 transition hover:text-white hidden sm:block">
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function CTA() {
  return (
    <section className="px-4 sm:px-6 py-14 bg-[#0a0a0a] border-t border-zinc-800/60">
      <div className="mx-auto max-w-3xl text-center space-y-5">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Ready to stop losing signups?
        </h2>
        <p className="text-zinc-400 text-sm sm:text-base">
          500 free credits. No card required. Set up in 10 minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/signup"
            className="w-full sm:w-auto rounded-lg bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition hover:bg-blue-500"
          >
            Get started free
          </Link>
          <Link
            href="/dashboard/docs"
            className="w-full sm:w-auto rounded-lg border border-zinc-700 bg-zinc-900 px-8 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white text-center"
          >
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm font-black text-white">trickle</span>
        <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-zinc-500">
          <Link href="/dashboard/docs" className="transition hover:text-zinc-300">Docs</Link>
          <Link href="#pricing"        className="transition hover:text-zinc-300">Pricing</Link>
          <Link href="/auth/signup"    className="transition hover:text-zinc-300">Sign Up</Link>
          <Link href="/auth/login"     className="transition hover:text-zinc-300">Log In</Link>
        </nav>
        <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Trickle</p>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <Hero />
      <HowItWorks />
      <CodeSnippet />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}