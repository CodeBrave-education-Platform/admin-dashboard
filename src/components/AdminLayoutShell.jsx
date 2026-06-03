'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  LayoutDashboard, BookOpen, LogOut, Loader2, User, ChevronRight, Menu, X
} from 'lucide-react';

export default function AdminLayoutShell({ children, title, subtitle }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
      } else {
        setAdminUser(user);
      }
    };
    fetchUser();
  }, [router, supabase]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.refresh();
      router.replace('/login');
    } catch (err) {
      console.error('[Sign Out Error]:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const navItems = [
    { label: 'Overview Console', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Syllabus Manager', href: '/courses', icon: BookOpen }
  ];

  const userInitials = adminUser?.email?.substring(0, 2).toUpperCase() || 'AD';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 cursor-pointer"
        />
      )}

      {/* Persistent Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 transform lg:translate-x-0 lg:static lg:flex lg:flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand wordmark logo */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
              Δ
            </div>
            <span className="font-black text-sm tracking-[0.2em] text-slate-900">ASENTRA</span>
          </Link>

          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition select-none cursor-pointer hover:scale-[1.01] active:scale-[0.99] tactile-press ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 font-bold border-r-4 border-indigo-600 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition ${isActive ? 'opacity-100' : 'opacity-0'}`} />
              </Link>
            );
          })}
        </nav>

        {/* User Session profile and Sign Out */}
        <div className="p-4 border-t border-slate-200 space-y-3 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-[10px] shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Logged In</span>
              <span className="text-xs font-bold text-slate-700 truncate block max-w-[140px] mt-0.5">{adminUser?.email}</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-4 py-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition cursor-pointer select-none disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Header bar */}
        <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl"
            >
              <Menu className="w-4 h-4" />
            </button>
            
            <div className="hidden sm:block">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">{title}</h2>
              {subtitle && <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
            ASENTRA Beta
          </span>
        </header>

        {/* Viewport content */}
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>

    </div>
  );
}
