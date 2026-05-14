import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LV Deal Intelligence',
  description: 'Love Ventures — Deal pipeline, scoring and news feed',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" style={{ backgroundColor: 'var(--ft-cream)', color: 'var(--ft-ink)', fontFamily: 'Georgia, serif' }}>
        {children}
      </body>
    </html>
  )
}
