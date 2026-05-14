'use client'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="opacity-70 hover:opacity-100 transition-opacity text-sm hover:underline"
      style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', color: 'white' }}
    >
      Sign out
    </button>
  )
}
