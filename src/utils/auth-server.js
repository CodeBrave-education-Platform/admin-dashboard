import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side utility to verify if the current user is an admin.
 * Use this to wrap sensitive Server Actions and API Routes.
 */
export async function requireAdmin() {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized: Session not found')
  }

  // Fast Edge Check using synced JWT claims
  const userRole = user?.app_metadata?.role || 'student'
  const isAuthorized = ['admin', 'teacher', 'instructor'].includes(userRole)

  if (!isAuthorized) {
    throw new Error('Forbidden: Account lacks administrative privileges')
  }

  return user
}
