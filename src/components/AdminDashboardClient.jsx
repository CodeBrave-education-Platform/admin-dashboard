'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BookOpen, Radio, GraduationCap, Search, ArrowRight,
  PlusCircle, RefreshCw, Key, ShieldAlert, Sparkles, TrendingUp,
  Mail, Calendar, ExternalLink, Activity, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboardClient() {
  const router = useRouter();
  const supabase = createClient();

  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [batchEnrollments, setBatchEnrollments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [studentPortalUrl, setStudentPortalUrl] = useState('http://localhost:3000');

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      // Get current logged-in user details and role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (myProfile) {
          setCurrentUserRole(myProfile.role);
        }
      }

      // 1. Fetch course catalog
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      setCourses(coursesData || []);

      // 2. Fetch all user profiles for management
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setStudents(profilesData || []);

      // 3. Fetch recent assessment attempts
      const { data: attemptsData } = await supabase
        .from('assessment_attempts')
        .select('*, profiles(*), assessments(*)')
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(5);

      setRecentAttempts(attemptsData || []);

      // 4. Fetch enrollments
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('*');
      setCourseEnrollments(enrollData || []);

      const { data: batchEnrollData } = await supabase
        .from('batch_enrollments')
        .select('*');
      setBatchEnrollments(batchEnrollData || []);

    } catch (err) {
      console.error('[Dashboard Ingest Error]:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    const confirmChange = window.confirm(`Are you sure you want to change this user's role to ${newRole}?`);
    if (!confirmChange) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      alert(`User role updated to ${newRole} successfully!`);
      await fetchDashboardData();
    } catch (err) {
      console.error('[Role Update Error]:', err);
      alert('Failed to update user role: ' + err.message);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        setStudentPortalUrl('http://localhost:3000');
      }
    }
  }, []);

  const filteredStudents = students.filter(s => {
    const term = searchTerm.trim().toLowerCase();
    const matchesTerm = !term || 
      (s.full_name || '').toLowerCase().includes(term) || 
      (s.email || '').toLowerCase().includes(term);

    if (!matchesTerm) return false;
    if (roleFilter === 'all') return true;
    return s.role === roleFilter;
  });

  const activeStudentsCount = students.filter(s => s.role === 'student' || !s.role).length;
  const liveClassesCount = courses.length; // Simplified proxy for live classes

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans max-w-5xl mx-auto pb-20">
      
      {/* Hero Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
            Welcome back, {currentUserRole === 'admin' ? 'Admin' : 'User'}!
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="px-5 py-2.5 bg-white/50 backdrop-blur-md border border-slate-200/60 hover:bg-white text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 select-none cursor-pointer disabled:opacity-50 shadow-sm hover:shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Main Metric Cards (Crisp White Bento) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(139,92,246,0.3)] hover:shadow-[0_8px_40px_rgb(139,92,246,0.5)] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 text-white border border-white/30">
                  <Users className="w-7 h-7" />
                </div>
                <h2 className="text-6xl font-black text-white tracking-tighter mb-2 group-hover:scale-105 transition-transform origin-left">
                  {activeStudentsCount.toLocaleString()}
                </h2>
                <p className="text-sm font-bold text-white/90">Total Active Students</p>
                <div className="mt-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md border border-white/30">+8.2% this month</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(56,189,248,0.3)] hover:shadow-[0_8px_40px_rgb(56,189,248,0.5)] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 text-white border border-white/30">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h2 className="text-6xl font-black text-white tracking-tighter mb-2 group-hover:scale-105 transition-transform origin-left">
                  {liveClassesCount}
                </h2>
                <p className="text-sm font-bold text-white/90">Active Courses</p>
                <div className="mt-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md border border-white/30">+{batchEnrollments.length} New Enrollments</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
            {/* Minimal Student Activity Chart */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Student Activity</h3>
              <div className="bg-white/60 backdrop-blur-3xl border border-white p-6 pb-2 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[350px]">
                {recentAttempts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm font-medium text-slate-400">
                    Not enough data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={recentAttempts.map((a, i) => ({ name: a.profiles?.full_name?.split(' ')[0] || `S${i}`, score: a.score }))}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}}
                      />
                      <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Platform Activity</h3>
              <div className="bg-white/60 backdrop-blur-3xl border border-white p-2 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[350px] overflow-y-auto custom-scrollbar">
                <div className="space-y-2 p-2">
                  {courseEnrollments.slice(0, 3).map((enrollment, idx) => {
                    const colors = ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600'];
                    const colorClass = colors[idx % colors.length];
                    return (
                      <div key={`e-${idx}`} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition cursor-pointer">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${colorClass}`}>
                          {enrollment.profile_id?.substring(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">New student enrolled</p>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">{courses.find(c => c.id === enrollment.course_id)?.title || 'Standard Course'}</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {recentAttempts.slice(0, 3).map((attempt, idx) => {
                    const colors = ['bg-emerald-100 text-emerald-600', 'bg-rose-100 text-rose-600', 'bg-cyan-100 text-cyan-600'];
                    const colorClass = colors[idx % colors.length];
                    const initials = attempt.profiles?.full_name?.substring(0, 2).toUpperCase() || 'AN';
                    return (
                      <div key={`a-${idx}`} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition cursor-pointer">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${colorClass}`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{attempt.profiles?.full_name || 'Anonymous'} completed a quiz</p>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">Scored {attempt.score} / {attempt.assessments?.total_marks || 100}</p>
                        </div>
                      </div>
                    );
                  })}

                  {courseEnrollments.length === 0 && recentAttempts.length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-sm font-medium text-slate-400">No recent activity found.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
