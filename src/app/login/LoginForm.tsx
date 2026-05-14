'use client'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : authError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 0',
    borderBottom: '1px solid #CCBCB0',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
    fontSize: '0.9rem',
    fontFamily: 'Helvetica Neue, Arial, sans-serif',
    color: '#33302E',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#66605C',
    marginBottom: '4px',
    fontFamily: 'Helvetica Neue, Arial, sans-serif',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" style={labelStyle}>Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@loveventures.co.uk"
          style={inputStyle}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <label htmlFor="password" style={labelStyle}>Password</label>
          <a
            href="#"
            onClick={e => {
              e.preventDefault()
              if (!email) { setError('Enter your email first to reset your password.'); return }
              const sb = createSupabaseBrowserClient()
              sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback` })
              setError('')
              alert('Password reset email sent — check your inbox.')
            }}
            style={{ fontSize: '0.7rem', color: '#0D7680', fontFamily: 'Helvetica Neue, Arial, sans-serif', textDecoration: 'none' }}
          >
            Forgot password?
          </a>
        </div>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
        />
      </div>

      {error && (
        <p
          className="text-sm py-2 px-3 rounded"
          style={{ backgroundColor: '#FDE8E8', color: '#C0392B', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.8rem' }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '11px',
          backgroundColor: loading ? '#A0616E' : '#7B1D3C',
          color: 'white',
          border: 'none',
          borderRadius: '2px',
          fontSize: '0.85rem',
          fontWeight: 600,
          fontFamily: 'Helvetica Neue, Arial, sans-serif',
          letterSpacing: '0.03em',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s',
          marginTop: '4px',
        }}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
