'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Github, Chrome } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error?.message ?? 'Invalid email or password.')
        setLoading(false)
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  function signInWithGitHub() {
    window.location.href = '/api/auth/sign-in/github'
  }

  function signInWithGoogle() {
    window.location.href = '/api/auth/sign-in/google'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">

      {/* Top bar with back to home */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <span className="text-base font-black text-white">trickle</span>
        <div className="w-24" />
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-2xl font-bold text-white">Sign in</p>
            <p className="mt-2 text-sm text-zinc-400">Welcome back</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                onClick={signInWithGitHub}
                className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-800/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700/50"
              >
                <Github className="h-4 w-4" />
                Continue with GitHub
              </button>
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-800/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700/50"
              >
                <Chrome className="h-4 w-4" />
                Continue with Google
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-zinc-900/50 px-2 text-zinc-500">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in with email'}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-zinc-300 hover:text-white transition">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}