'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/', label: 'Daily Feed' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/import', label: 'Import' },
  { href: '/comms', label: 'Add Comms' },
]

export default function NavBar() {
  const pathname = usePathname()
  return (
    <header>
      <div className="ft-rule-thick" />
      <div style={{ backgroundColor: 'var(--lv-burgundy)' }} className="text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-12">
          <Link href="/" className="font-bold text-lg tracking-wide" style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>
            LOVE VENTURES <span className="font-light text-sm opacity-75 ml-2">DEAL INTELLIGENCE</span>
          </Link>
          <nav className="flex gap-6 text-sm" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`hover:underline transition-opacity ${pathname === href ? 'opacity-100 font-semibold' : 'opacity-70 hover:opacity-100'}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="ft-rule" style={{ borderColor: 'var(--ft-border)', marginTop: 0 }} />
    </header>
  )
}
