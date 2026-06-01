import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // If Supabase variables are missing or use defaults, return a dummy fallback object.
  // This prevents instant React render-time crashes before environment variables are supplied,
  // allowing the UI to display the graceful "Missing Supabase Environment Variables" inline validation.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-id") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-supabase-anon-key")
  ) {
    return {
      auth: {
        signInWithOtp: async () => {
          throw new Error("Missing Supabase Environment Variables.");
        },
        verifyOtp: async () => {
          throw new Error("Missing Supabase Environment Variables.");
        },
        signInWithOAuth: async () => {
          throw new Error("Missing Supabase Environment Variables.");
        },
        updateUser: async () => {
          throw new Error("Missing Supabase Environment Variables.");
        },
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => {},
      }
    }
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
