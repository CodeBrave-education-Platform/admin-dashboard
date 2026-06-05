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
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isLoginRoute = request.nextUrl.pathname.startsWith('/login')

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isLoginRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
