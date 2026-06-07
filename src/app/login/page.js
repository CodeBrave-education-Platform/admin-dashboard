'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { Loader2, Mail, Key, ShieldAlert, CheckCircle2 } from 'lucide-react'
import Script from 'next/script'

const GOOGLE_CLIENT_ID = '259431848841-k354jedd55sllpojicha3uq6on8524k9.apps.googleusercontent.com'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const googleBtnContainerRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [gsiReady, setGsiReady] = useState(false)

  // Store latest callback in ref to avoid stale closures
  const credentialCallbackRef = useRef(null)

  // Sync login page errors from callback redirects
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const errorParam = query.get('error')
    if (errorParam) {
      setErrorMsg(decodeURIComponent(errorParam))
    }
  }, [])

  // Google credential handler — uses signInWithIdToken (NO redirects!)
  const handleGoogleCredential = useCallback(async (response) => {
    setGoogleLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      // Exchange Google ID token directly with Supabase — no redirect needed
      const { data, error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      })

      if (signInError) throw signInError

      const user = data?.user
      if (!user) throw new Error('Authentication returned no user.')

      // Fetch user profile role to verify Admin status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        throw new Error('Associated profile not found in ASENTRA registry.')
      }

      const isAuthorized = ['admin', 'teacher', 'instructor'].includes(profile.role)
      if (!isAuthorized) {
        await supabase.auth.signOut()
        throw new Error('Forbidden: Account lacks administrative privileges.')
      }

      setSuccessMsg('Successfully authenticated! Synchronizing console...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (err) {
      console.error('Google ID Token auth error:', err)
      setErrorMsg(err.message || 'Google authentication failed.')
    } finally {
      setGoogleLoading(false)
    }
  }, [supabase, router])

  // Keep ref in sync with latest callback
  useEffect(() => {
    credentialCallbackRef.current = handleGoogleCredential
  }, [handleGoogleCredential])

  // Initialize Google Identity Services once the script loads
  const initializeGsi = useCallback(() => {
    if (!window.google?.accounts?.id) return

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        // Use ref to always call the latest version of the handler
        if (credentialCallbackRef.current) {
          credentialCallbackRef.current(response)
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    // Render the invisible Google button inside the container
    if (googleBtnContainerRef.current) {
      window.google.accounts.id.renderButton(
        googleBtnContainerRef.current,
        {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: googleBtnContainerRef.current.offsetWidth || 380,
        }
      )
    }

    setGsiReady(true)
  }, [])

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return setErrorMsg('Please complete all credential fields.')

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      // 1. Direct password-based authentication via Supabase
      const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      })

      if (loginError) throw loginError

      // 2. Fetch user profile role to verify Admin status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        throw new Error('Associated profile not found in ASENTRA registry.')
      }

      const isAuthorized = ['admin', 'teacher', 'instructor'].includes(profile.role)
      if (!isAuthorized) {
        await supabase.auth.signOut()
        throw new Error('Forbidden: Account lacks administrative privileges.')
      }

      setSuccessMsg('Successfully authenticated! Synchronizing console...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Google Identity Services Script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGsi}
      />

      {/* Dynamic ambient gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white border border-slate-200/80 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl space-y-6 relative z-10 text-slate-800"
      >
        <div className="text-center space-y-2">
          <img src="/logo.png" alt="ASENTRA Logo" className="mx-auto h-24 w-auto object-contain mb-2 animate-fade-in" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Admin Control Console</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black font-sans">Secure administrative login gateway</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold leading-normal flex items-start gap-2.5 animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-55/10 bg-emerald-50 border border-emerald-250 text-emerald-600 rounded-2xl text-xs font-bold leading-normal flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="administrator@asentra.in"
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Security Key (Password)</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <a
              href="/forgot-password"
              className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition"
            >
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-white rounded-2.5xl text-xs font-black shadow-md cursor-pointer transition select-none flex items-center justify-center gap-2 border border-slate-950 hover:scale-[1.01] active:scale-[0.99] tactile-press mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>Unlock Admin Console</span>
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Or continue with</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Google Sign-In Button — rendered by Google Identity Services */}
        {/* This uses ID token flow: Google popup → ID token → Supabase (NO redirects) */}
        <div className="relative w-full">
          {/* Google's rendered button (visible, handles click + popup) */}
          <div
            ref={googleBtnContainerRef}
            className="w-full flex justify-center items-center"
            style={{ minHeight: '44px' }}
          />

          {/* Loading overlay */}
          {googleLoading && (
            <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center z-20">
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            </div>
          )}

          {/* Fallback if GSI hasn't loaded yet */}
          {!gsiReady && (
            <div className="w-full py-3.5 bg-white border border-slate-200 text-slate-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading Google Sign-In...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
