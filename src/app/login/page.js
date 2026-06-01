'use client'

import { useState } from 'react'
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Dynamic ambient gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-zinc-900/60 border border-zinc-800/80 p-8 sm:p-10 rounded-[2.5rem] backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] space-y-6 relative z-10"
      >
        <div className="text-center space-y-2">
          {/* Hexagonal decorative shell */}
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-sm mb-4 animate-pulse">
            Δ
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">ASENTRA Admin Console</h2>
          <p className="text-[10px] text-zinc-550 uppercase tracking-widest font-black font-sans">Secure administrative login gateway</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-600/10 border border-rose-500/20 text-rose-455 rounded-2xl text-xs font-bold leading-normal flex items-start gap-2.5 animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold leading-normal flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-650" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="administrator@asentra.in"
                disabled={loading}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Security Key (Password)</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-650" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading}
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-750 disabled:bg-zinc-900 disabled:text-zinc-650 disabled:border-zinc-800 disabled:cursor-not-allowed text-white rounded-2.5xl text-xs font-black shadow-md cursor-pointer transition select-none flex items-center justify-center gap-2 border border-indigo-500 hover:scale-[1.01] active:scale-[0.99] tactile-press mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>Unlock Admin Console</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
