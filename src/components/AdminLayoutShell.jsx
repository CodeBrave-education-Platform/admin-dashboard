'use client'

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  LayoutDashboard, GraduationCap, Loader2, ChevronRight, Menu, X, Award, LogOut, BookOpen
} from 'lucide-react';

function SidebarNav({ pathname, courses, batches, loadingSidebarData }) {
  const searchParams = useSearchParams();
  const activeItemId = searchParams?.get('id') || searchParams?.get('courseId') || searchParams?.get('batchId');

  const navItems = [
    { label: 'Overview Console', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Course Studio', href: '/courses', icon: BookOpen },
    { label: 'Cohort Gradebook', href: '/gradebook', icon: GraduationCap }
  ];

  return (
    <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto custom-scrollbar">
      <div className="space-y-1.5">
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
      </div>

      {/* Dynamic Courses Sub-Section */}
      <div className="pt-2 border-t border-slate-100">
        <span className="px-3.5 text-[9px] font-black text-slate-450 uppercase tracking-widest block mb-2.5">
          Course blueprints
        </span>
        <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar px-1">
          {loadingSidebarData ? (
            <div className="px-3.5 py-2 text-[10px] text-slate-400 font-bold animate-pulse flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
              <span>Loading Courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="px-3.5 py-2 text-[10px] text-slate-400 italic">No courses registered</div>
          ) : (
            courses.map(c => {
              const isActive = pathname === '/courses' && activeItemId === c.id;
              return (
                <Link
                  key={c.id}
                  href={`/courses?id=${c.id}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition select-none cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                    isActive
                      ? 'bg-indigo-50/80 text-indigo-700 font-bold shadow-2xs border-l-2 border-indigo-600'
                      : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate max-w-[170px]">{c.title}</span>
                  <ChevronRight className={`w-3 h-3 text-indigo-600 transition ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Dynamic Batches Sub-Section */}
      <div className="pt-2 border-t border-slate-100">
        <span className="px-3.5 text-[9px] font-black text-slate-455 uppercase tracking-widest block mb-2.5">
          Batch Telemetry
        </span>
        <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar px-1">
          {loadingSidebarData ? (
            <div className="px-3.5 py-2 text-[10px] text-slate-400 font-bold animate-pulse flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
              <span>Loading Batches...</span>
            </div>
          ) : batches.length === 0 ? (
            <div className="px-3.5 py-2 text-[10px] text-slate-400 italic">No batches registered</div>
          ) : (
            batches.map(b => {
              const isActive = pathname === '/batches' && activeItemId === b.id;
              return (
                <Link
                  key={b.id}
                  href={`/batches?id=${b.id}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition select-none cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-bold shadow-2xs border-l-2 border-emerald-600'
                      : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate max-w-[170px]">{b.title}</span>
                  <ChevronRight className={`w-3 h-3 text-emerald-600 transition ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </nav>
  );
}

export default function AdminLayoutShell({ children, title, subtitle }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingSidebarData, setLoadingSidebarData] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
      } else {
        setAdminUser(user);
        try {
          const [coursesRes, batchesRes] = await Promise.all([
            supabase.from('courses').select('id, title').order('title', { ascending: true }),
            supabase.from('batches').select('id, title').order('title', { ascending: true })
          ]);
          if (coursesRes.data) setCourses(coursesRes.data);
          if (batchesRes.data) setBatches(batchesRes.data);
        } catch (err) {
          console.error('[Sidebar Data Load Failed]:', err);
        } finally {
          setLoadingSidebarData(false);
        }
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
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="ASENTRA Logo" className="h-9 w-auto object-contain" />
          </Link>

          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Suspense Wrapped Navigation List */}
        <Suspense fallback={
          <div className="flex-1 px-4 py-6 space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-50 rounded-xl" />
              <div className="h-24 bg-slate-50 rounded-xl" />
            </div>
          </div>
        }>
          <SidebarNav 
            pathname={pathname}
            courses={courses}
            batches={batches}
            loadingSidebarData={loadingSidebarData}
          />
        </Suspense>

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
