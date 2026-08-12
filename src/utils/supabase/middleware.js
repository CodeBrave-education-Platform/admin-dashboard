import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// Max 5 login attempts per 5 minutes
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '5 m'),
  ephemeralCache: new Map(),
})

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
  const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1'

  // Apply Rate Limiting to Auth Routes
  if (pathname.startsWith('/login') && request.method === 'POST') {
    // Only rate limit POST requests (actual login attempts) to avoid blocking page loads
    const { success } = await ratelimit.limit(`login_ratelimit_${ip}`)
    if (!success) {
      return new NextResponse('Too many login attempts. Please try again in 5 minutes.', { status: 429 })
    }
  }
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
    
    // Verify Instructor/Admin/Teacher privileges instantly via JWT metadata
    const userRole = user?.app_metadata?.role || 'student'
    
    const isAuthorizedAdmin = 
      userRole === 'admin' || 
      userRole === 'instructor' || 
      userRole === 'teacher'
      
    if (!isAuthorizedAdmin) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'Forbidden: Account lacks administrative privileges.')
      return NextResponse.redirect(url)
    }
  }

  if (isPublicRoute && user) {
    if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
