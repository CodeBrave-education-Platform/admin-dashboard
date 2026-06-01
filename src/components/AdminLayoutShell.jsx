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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer"
        />
      )}

      {/* Persistent Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#050505] border-r border-zinc-900 z-50 transform lg:translate-x-0 lg:static lg:flex lg:flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand wordmark logo */}
        <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
              Δ
            </div>
            <span className="font-black text-sm tracking-[0.2em] text-white">ASENTRA</span>
          </Link>

          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-zinc-550 hover:text-white"
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
                    ? 'bg-indigo-605/10 border border-indigo-500/25 text-indigo-400 font-black shadow-md' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-455' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-zinc-650 transition ${isActive ? 'opacity-100' : 'opacity-0'}`} />
              </Link>
            );
          })}
        </nav>

        {/* User Session profile and Sign Out */}
        <div className="p-4 border-t border-zinc-900 space-y-3 shrink-0 bg-[#030303]/30">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-emerald-650 flex items-center justify-center text-white font-black text-[10px]">
              {userInitials}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Logged In</span>
              <span className="text-xs font-bold text-zinc-300 truncate block max-w-[140px] mt-0.5">{adminUser?.email}</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-4 py-3 bg-zinc-950 hover:bg-rose-950/20 border border-zinc-900 hover:border-rose-900/30 text-zinc-450 hover:text-rose-400 rounded-xl text-xs font-bold transition cursor-pointer select-none disabled:opacity-50"
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
        <header className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl"
            >
              <Menu className="w-4 h-4" />
            </button>
            
            <div className="hidden sm:block">
              <h2 className="text-xs font-black text-zinc-450 uppercase tracking-widest">{title}</h2>
              {subtitle && <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
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
