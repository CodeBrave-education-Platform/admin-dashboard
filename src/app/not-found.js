'use client'

import Link from 'next/link'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans text-slate-900">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm bg-white border border-slate-200/80 p-8 rounded-3xl backdrop-blur-xl shadow-xl flex flex-col items-center text-center space-y-6 relative z-10">
        <img src="/logo.png" alt="ASENTRA Logo" className="h-14 w-auto object-contain mb-1" />
        
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-500 rounded-2xl">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h1 className="font-extrabold text-4xl text-slate-900 tracking-tight">404</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Page Not Found</p>
          <p className="text-xs text-slate-500 mt-3 font-medium leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition select-none cursor-pointer w-full justify-center"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
