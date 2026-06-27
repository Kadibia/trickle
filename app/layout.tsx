import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Trickle: Registration Queue API',
  description: 'Stop your site from crashing during signups. Trickle queues registration surges and delivers them safely to your server.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Suppress unhandled rejections from browser extensions (e.g. MetaMask inpage.js) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener("unhandledrejection",function(e){if(e.reason&&e.reason.stack&&e.reason.stack.includes("chrome-extension://")){e.preventDefault();}});`,
          }}
        />
      </head>
      <body className="antialiased font-sans">{children}</body>
    </html>
  )
}