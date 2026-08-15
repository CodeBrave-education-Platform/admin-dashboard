'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BookOpen, Radio, GraduationCap, Search, ArrowRight,
  PlusCircle, RefreshCw, Key, ShieldAlert, Sparkles, TrendingUp,
  Mail, Calendar, ExternalLink, Activity
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
          <RefreshCw className="w-8 h-8 text-slate-300 animate-spin" />
        </div>
      ) : (
        <>
          {/* Main Metric Cards (Glassmorphism + Soft Gradients) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-[#f3e8ff] to-[#fae8ff] border border-white/40 p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/60 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/50 text-purple-600">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-6xl font-black text-slate-900 tracking-tighter mb-2 group-hover:scale-105 transition-transform origin-left">
                  {activeStudentsCount.toLocaleString()}
                </h2>
                <p className="text-sm font-bold text-slate-700">Total Active Students</p>
                <p className="text-xs font-bold text-emerald-600 mt-4">+2.1% this week</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#cffafe] to-[#ccfbf1] border border-white/40 p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/60 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/50 text-teal-600">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h2 className="text-6xl font-black text-slate-900 tracking-tighter mb-2 group-hover:scale-105 transition-transform origin-left">
                  {liveClassesCount}
                </h2>
                <p className="text-sm font-bold text-slate-700">Ongoing Live Classes</p>
                <p className="text-xs font-bold text-amber-600 mt-4">{batchEnrollments.length} Starting Soon</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
            {/* Minimal Student Activity Chart */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Student Activity</h3>
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-[2rem] shadow-sm h-[300px]">
                {recentAttempts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm font-medium text-slate-400">
                    Not enough data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={recentAttempts.map((a, i) => ({ name: a.profiles?.full_name?.split(' ')[0] || `S${i}`, score: a.score }))}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}}
                      />
                      <Area type="monotone" dataKey="score" stroke="#c084fc" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Activity</h3>
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-[2rem] shadow-sm">
                <div className="space-y-6">
                  {courseEnrollments.slice(0, 2).map((enrollment, idx) => (
                    <div key={`e-${idx}`} className="flex items-start gap-4">
                      <span className="text-sm font-black text-slate-300 mt-0.5">{idx + 1}.</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">New enrollment: Student {enrollment.profile_id?.substring(0,4)}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">Class: {courses.find(c => c.id === enrollment.course_id)?.title || 'Standard Course'}</p>
                      </div>
                    </div>
                  ))}
                  
                  {recentAttempts.slice(0, 2).map((attempt, idx) => (
                    <div key={`a-${idx}`} className="flex items-start gap-4">
                      <span className="text-sm font-black text-slate-300 mt-0.5">{idx + 3}.</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Quiz Submitted: {attempt.profiles?.full_name || 'Anonymous'}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">Score: {attempt.score} / {attempt.assessments?.total_marks || 100}</p>
                      </div>
                    </div>
                  ))}

                  {courseEnrollments.length === 0 && recentAttempts.length === 0 && (
                    <p className="text-sm font-medium text-slate-400">No recent activity found.</p>
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
