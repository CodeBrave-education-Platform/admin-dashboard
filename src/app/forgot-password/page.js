'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { Loader2, Mail, ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return setErrorMsg('Please enter your email address.')

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSuccessMsg('Password reset link sent! Check your email inbox and spam folder.')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send reset link. Please try again.')
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
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Reset Password</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black font-sans">Enter your email to receive a reset link</p>
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
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
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
              <span>Send Reset Link</span>
            )}
          </button>
        </form>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>
      </motion.div>
    </div>
  )
}
