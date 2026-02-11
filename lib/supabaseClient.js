import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
if (!supabaseAnonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')

// ✅ Back to the original pattern your app expects
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Optional: keep this too (so both styles work)
export function getSupabase() {
  return supabase
}



