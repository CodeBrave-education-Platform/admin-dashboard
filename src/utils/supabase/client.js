import { createBrowserClient } from '@supabase/ssr'

export function createClient() {


  const cookieOptions = {}
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname.endsWith('institute.com') || hostname.includes('institute.com')) {
      cookieOptions.domain = '.institute.com'
    }
  }

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions,
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  )


  return client
}
