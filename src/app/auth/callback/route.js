import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSafeRedirectUrl } from '@/utils/security'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || requestUrl.searchParams.get('redirectTo') || '/dashboard'
  const safeNext = getSafeRedirectUrl(next, '/dashboard')

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging OAuth code for session:', error.message)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
      )
    }

    if (user) {
      // Fetch user profile role to verify Admin/Teacher status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent('Associated profile not found in ASENTRA registry.')}`, request.url)
        )
      }

      const isAuthorized = ['admin', 'teacher', 'instructor'].includes(profile.role)
      if (!isAuthorized) {
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent('Forbidden: Account lacks administrative privileges.')}`, request.url)
        )
      }
    }
  }

  // Redirect to safe destination on successful authentication
  return NextResponse.redirect(new URL(safeNext, request.url))
}
