'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { Loader2, Mail, Key, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Sync login page errors from callback redirects
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const errorParam = query.get('error')
    if (errorParam) {
      setErrorMsg(decodeURIComponent(errorParam))
    }
  }, [])

  const handleGoogleLogin = async () => {
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (err) {
      setErrorMsg(err.message || 'Google authentication failed.')
    }
  }

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

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-700 rounded-2.5xl text-xs font-bold shadow-xs cursor-pointer transition select-none flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] tactile-press"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.55 14.97 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.86 3C6.03 7.8 8.78 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.58l3.76 2.91c2.2-2.03 3.49-5.02 3.49-8.64z"
            />
            <path
              fill="#FBBC05"
              d="M5.1 14.28a7.11 7.11 0 0 1 0-4.56l-3.86-3a11.96 11.96 0 0 0 0 10.56l3.86-3z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.5 1.18-4.2 1.18-3.22 0-5.97-2.76-6.9-6.68l-3.86 3A11.95 11.95 0 0 0 12 23z"
            />
          </svg>
          <span>Sign In with Google</span>
        </button>
      </motion.div>
    </div>
  )
}
