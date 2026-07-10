import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing env vars at client init', {
    VITE_SUPABASE_URL: supabaseUrl ? 'set' : 'undefined',
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'set' : 'undefined',
  })
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

// Attaches the current user's Supabase access token so our /api/* proxies
// (claude, exercises, quote) can verify the caller before spending API budget.
export async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}
