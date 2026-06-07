'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { Loader2, Lock, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Exchange the code from the URL for a session
  useEffect(() => {
    const handleCodeExchange = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } catch (err) {
          setErrorMsg('Invalid or expired reset link. Please request a new one.')
        }
      }
      setVerifying(false)
    }

    handleCodeExchange()
  }, [supabase])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      return setErrorMsg('Please fill in both password fields.')
    }
    if (password.length < 8) {
      return setErrorMsg('Password must be at least 8 characters long.')
    }
    if (password !== confirmPassword) {
      return setErrorMsg('Passwords do not match.')
    }

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw error

      setSuccessMsg('Password updated successfully! Redirecting to login...')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
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
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Set New Password</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black font-sans">Choose a strong, secure password</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold leading-normal flex items-start gap-2.5 animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl text-xs font-bold leading-normal flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-11 py-3.5 text-xs text-slate-800 outline-none focus:border-indigo-500 transition font-bold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-11 py-3.5 text-xs text-slate-800 outline-none focus:border-indigo-500 transition font-bold"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password strength indicator */}
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                <div className={`h-1 flex-1 rounded-full transition ${password.length >= 8 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                <div className={`h-1 flex-1 rounded-full transition ${password.length >= 10 && /[A-Z]/.test(password) ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                <div className={`h-1 flex-1 rounded-full transition ${password.length >= 12 && /[^a-zA-Z0-9]/.test(password) ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              </div>
              <p className="text-[9px] text-slate-400 font-bold">
                {password.length < 8 ? 'Too short' : password.length < 10 ? 'Fair' : password.length < 12 ? 'Good' : 'Strong'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-white rounded-2.5xl text-xs font-black shadow-md cursor-pointer transition select-none flex items-center justify-center gap-2 border border-slate-950 hover:scale-[1.01] active:scale-[0.99] tactile-press mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
