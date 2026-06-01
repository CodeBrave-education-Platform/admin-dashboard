'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'

export default function RootGatePage() {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState('checking') // 'checking' | 'authorized' | 'denied'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const checkIdentity = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          router.replace('/login')
          return
        }

        // Fetch user profile role from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          setStatus('denied')
          setErrorMsg('No profile role found for this user account.')
          return
        }

        const isAuthorized = ['admin', 'teacher', 'instructor'].includes(profile.role)
        if (isAuthorized) {
          setStatus('authorized')
          router.replace('/dashboard')
        } else {
          setStatus('denied')
          setErrorMsg('Forbidden: You do not possess instructor/administrative permissions.')
        }
      } catch (err) {
        setStatus('denied')
        setErrorMsg('Authentication gateway error: ' + err.message)
      }
    }

    checkIdentity()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm bg-zinc-900/60 border border-zinc-800/80 p-8 rounded-3xl backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center space-y-6 animate-fade-in relative z-10">
        
        {status === 'checking' && (
          <>
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl relative">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-sm text-white tracking-wide">Zero-Trust Identity Gate</h3>
              <p className="text-[10px] text-zinc-550 uppercase tracking-widest font-black font-sans mt-1">Securing ASENTRA-Beta-Console</p>
              <p className="text-xs text-zinc-500 mt-2 font-medium">Verifying Supabase administrative credentials...</p>
            </div>
          </>
        )}

        {status === 'authorized' && (
          <>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <ShieldCheck className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-sm text-emerald-400 tracking-wide">Identity Verified</h3>
              <p className="text-[10px] text-zinc-550 uppercase tracking-widest font-black font-sans mt-1">Session Authorized</p>
              <p className="text-xs text-zinc-500 mt-2 font-medium">Redirecting to command center...</p>
            </div>
          </>
        )}

        {status === 'denied' && (
          <>
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-455 rounded-2xl">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-sm text-rose-455 tracking-wide">Access Denied</h3>
              <p className="text-[10px] text-zinc-550 uppercase tracking-widest font-black font-sans mt-1">Gating Rejected</p>
              <p className="text-xs text-zinc-400 mt-2 font-semibold leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={() => {
                supabase.auth.signOut().then(() => router.replace('/login'))
              }}
              className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition select-none cursor-pointer w-full"
            >
              Sign In with Another Account
            </button>
          </>
        )}
      </div>
    </div>
  )
}
