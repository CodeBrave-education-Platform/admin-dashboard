import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Prevent server-side crash if environment variables are missing or are placeholders
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-id") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-supabase-anon-key")
  ) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          const host = request.headers.get('host') || ''
          const cookieDomain = (host.endsWith('institute.com') || host.includes('institute.com')) ? '.institute.com' : undefined

          cookiesToSet.forEach(({ name, value, options }) => {
            const updatedOptions = { ...options }
            if (cookieDomain) {
              updatedOptions.domain = cookieDomain
            }
            request.cookies.set(name, value, updatedOptions)
          })

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            const updatedOptions = { ...options }
            if (cookieDomain) {
              updatedOptions.domain = cookieDomain
            }
            supabaseResponse.cookies.set(name, value, updatedOptions)
          })
        },
      },
    }
  )

  // IMPORTANT: Do NOT write any logic between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Route Protection Rules
  const pathname = request.nextUrl.pathname
  const isPublicRoute = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/forgot-password') || 
    pathname.startsWith('/reset-password') || 
    pathname.startsWith('/auth')

  if (!isPublicRoute) {
    // If not logged in, redirect to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    
    // Fetch user profile role to verify Instructor/Admin/Teacher privileges
    let userRole = null
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      userRole = profile?.role
    } catch (err) {
      console.error('[Middleware] Failed to fetch user role:', err)
    }

    const isAuthorizedAdmin = userRole === 'admin' || userRole === 'teacher' || userRole === 'instructor'
    if (!isAuthorizedAdmin) {
      // Sign out unauthorized user and redirect to login with error message
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'Forbidden: Account lacks administrative privileges.')
      return NextResponse.redirect(url)
    }
  }

  if (isPublicRoute && user) {
    // Check role before redirecting to dashboard
    let userRole = null
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      userRole = profile?.role
    } catch (err) {
      console.error('[Middleware] Failed to fetch user role:', err)
    }

    const isAuthorizedAdmin = userRole === 'admin' || userRole === 'teacher' || userRole === 'instructor'
    if (isAuthorizedAdmin && (pathname.startsWith('/login') || pathname.startsWith('/auth'))) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
