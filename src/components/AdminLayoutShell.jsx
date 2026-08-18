'use client'

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  LayoutDashboard, GraduationCap, Loader2, ChevronRight, Menu, X, Award, LogOut, BookOpen, Radio, Package, HelpCircle
} from 'lucide-react';
import CommandPalette from '@/components/CommandPalette';
import { ThemeToggle } from '@/components/ThemeToggle';

function SidebarNav({ pathname, courses, batches, loadingSidebarData, collapsed }) {
  const searchParams = useSearchParams();
  const activeItemId = searchParams?.get('id') || searchParams?.get('courseId') || searchParams?.get('batchId');

  const mainSection = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
  ];

  const academicsSection = [
    { label: 'Students', href: '/admin/students', icon: GraduationCap },
    { label: 'Courses', href: '/courses', icon: BookOpen },
    { label: 'Live Classes', href: '/batches', icon: Radio },
    { label: 'Gradebook', href: '/gradebook', icon: GraduationCap }
  ];

  const storeSection = [
    { label: 'Book Orders', href: '/admin/books/orders', icon: Package },
    { label: 'Book Inventory', href: '/admin/books', icon: BookOpen }
  ];

  const testingSection = [
    { label: 'Test Packages', href: '/admin/test-series', icon: Package },
    { label: 'Question Bank', href: '/admin/questions', icon: HelpCircle },
    { label: 'Test Series', href: '/admin/test-series/compiler', icon: Award }
  ];

  const allNavItems = [
    ...mainSection, 
    ...academicsSection, 
    ...storeSection, 
    ...testingSection
  ];
  
  // Find the longest matching href for the current pathname to prevent active state bleeding
  const sortedHrefs = allNavItems.map(item => item.href).sort((a, b) => b.length - a.length);
  const activeHref = sortedHrefs.find(href => pathname === href || pathname.startsWith(href + '/'));

  const renderNavGroup = (title, items) => (
    <div className="space-y-1">
      {title && !collapsed && (
        <span className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 mt-3">
          {title}
        </span>
      )}
      {items.map(item => {
        const isActive = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all select-none cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              isActive 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
              <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!collapsed && <span>{item.label}</span>}
            </div>
            {!collapsed && <ChevronRight className={`w-3.5 h-3.5 text-slate-300 transition ${isActive ? 'opacity-100' : 'opacity-0'}`} />}
          </Link>
        );
      })}
    </div>
  );

  return (
    <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
      {renderNavGroup(null, mainSection)}
      {renderNavGroup('Academics', academicsSection)}
      {renderNavGroup('Store', storeSection)}
      {renderNavGroup('Exams', testingSection)}

      {/* Dynamic Courses Sub-Section */}
      {!collapsed && (
        <div className="pt-2 border-t border-slate-100">
          <span className="px-3.5 text-[9px] font-black text-slate-450 uppercase tracking-widest block mb-2.5">
            Active Courses
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
                const isActive = (pathname === '/courses' || pathname === '/admin/courses') && activeItemId === c.id;
                return (
                  <Link
                    key={c.id}
                    href={`/courses?id=${c.id}`}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all select-none cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                      isActive
                        ? 'bg-blue-50/80 text-blue-700 shadow-sm border-l-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
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
      )}

      {/* Dynamic Batches Sub-Section */}
      {!collapsed && (
        <div className="pt-2 border-t border-slate-100">
          <span className="px-3.5 text-[9px] font-black text-slate-455 uppercase tracking-widest block mb-2.5">
            Active Batches
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
      )}
    </nav>
  );
}

export default function AdminLayoutShell({ children, title, subtitle }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingSidebarData, setLoadingSidebarData] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const hasAdminCookie = typeof document !== 'undefined' && document.cookie.includes('admin_session=true');
      
      if (!user && !hasAdminCookie) {
        router.replace('/login');
      } else {
        setAdminUser(user || { email: 'admin@Asentra.edu.in' });
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
      if (typeof document !== 'undefined') {
        document.cookie = "admin_session=; path=/; max-age=0";
      }
      await supabase.auth.signOut();
      router.refresh();
      router.replace('/login');
    } catch (err) {
      console.error('[Sign Out Error]:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const userInitials = adminUser?.email?.substring(0, 2)?.toUpperCase() || 'AD';

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-white to-emerald-50 text-slate-900 flex font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 cursor-pointer"
        />
      )}

      {/* Persistent Sidebar */}
      <aside className={`fixed inset-y-0 left-0 bg-white/80 backdrop-blur-xl border-r border-slate-100 z-50 transform lg:translate-x-0 lg:static lg:flex lg:flex-col transition-all duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'w-20' : 'w-64'}`}>
        {/* Brand wordmark logo */}
        <div className={`h-16 px-4 border-b border-slate-200 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/asentra-logo.png" alt="ASENTRA Logo" className="h-10 w-auto object-contain" />
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-lg font-black shrink-0">
              A
            </Link>
          )}

          {!collapsed && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
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
            collapsed={collapsed}
          />
        </Suspense>

        {/* User Session profile and Sign Out */}
        <div className="p-4 border-t border-slate-200 space-y-3 shrink-0 bg-slate-50/50">
          {!collapsed && (
            <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-[10px] shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Logged In</span>
                <span className="text-xs font-bold text-slate-700 truncate block max-w-[140px] mt-0.5">{adminUser?.email}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            title={collapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center justify-center gap-2.5 p-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition cursor-pointer select-none disabled:opacity-50`}
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Header bar */}
        <header className="h-16 px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/60 backdrop-blur-2xl sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:block p-1.5 bg-white/60 backdrop-blur border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            
            <div className="hidden sm:block">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">{title}</h2>
              {subtitle && <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
              ASENTRA
            </span>
            <ThemeToggle />
          </div>
        </header>

        {/* Viewport content */}
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
