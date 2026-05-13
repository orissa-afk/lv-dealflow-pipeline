import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side singleton
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client (same key for now; add service role key later for admin ops)
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}
