'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BookOpen, Radio, GraduationCap, Search, ArrowRight,
  PlusCircle, RefreshCw, Key, ShieldAlert, Sparkles, TrendingUp,
  Mail, Calendar, ExternalLink, Activity
} from 'lucide-react';

export default function AdminDashboardClient() {
  const router = useRouter();
  const supabase = createClient();

  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [recentAttempts, setRecentAttempts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch course catalog
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      setCourses(coursesData || []);

      // 2. Fetch student profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
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
    } catch (err) {
      console.error('[Dashboard Ingest Error]:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredStudents = students.filter(s => {
    const term = searchTerm.trim().toLowerCase();
    return !term || 
      (s.full_name || '').toLowerCase().includes(term) || 
      (s.email || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* Header section with refreshing state */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>ASENTRA Administrative Command Center</span>
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </h1>
          <p className="text-xs text-zinc-550 mt-1">High-fidelity cohort monitoring, syllabus blueprinting, and real-time polling telemetry</p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-2 select-none cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sync Real-Time Telemetry</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 h-28" />
          ))}
        </div>
      ) : (
        <>
          {/* Asymmetric Bento-Grid Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Active Courses', value: courses.length, icon: BookOpen, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
              { label: 'Registered Students', value: students.length, icon: Users, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Live Poll Cycles', value: recentAttempts.length > 0 ? 'Active' : 'Inactive', icon: Radio, color: recentAttempts.length > 0 ? 'text-teal-400 bg-teal-500/10 border-teal-500/20 animate-pulse' : 'text-zinc-500 bg-zinc-900/30 border-zinc-800' },
              { label: 'Total Assessments', value: recentAttempts.length, icon: GraduationCap, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/40 border border-zinc-800/80 p-6 rounded-3xl flex items-center justify-between hover:border-zinc-700 transition duration-300 shadow-md select-none group"
              >
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">{stat.label}</span>
                  <h3 className="text-2xl font-black text-white mt-1 group-hover:scale-105 transition duration-300 origin-left">{stat.value}</h3>
                </div>
                <div className={`p-4 rounded-2.5xl border ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Dynamic Student Roster Directory */}
            <div className="lg:col-span-2 bg-[#030303]/60 border border-zinc-800/80 p-6 sm:p-8 rounded-3xl space-y-6 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-sm uppercase text-zinc-400 tracking-wider">Student Roster Directory</h3>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-650" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search student credentials..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>
              </div>

              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                {filteredStudents.length === 0 ? (
                  <div className="text-center text-zinc-650 text-xs py-16">
                    No matching student profiles found in registry.
                  </div>
                ) : (
                  filteredStudents.map(student => {
                    const initials = (student.full_name || 'ST').substring(0,2).toUpperCase();
                    return (
                      <div
                        key={student.id}
                        className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4 hover:border-zinc-700 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs">
                            {initials}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white leading-tight">{student.full_name || 'Anonymous student'}</h4>
                            <span className="text-[10px] text-zinc-500 font-medium block mt-0.5">{student.email}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block leading-none">Joined</span>
                          <span className="text-[10px] text-zinc-400 font-bold block mt-1 font-mono">
                            {new Date(student.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Recent Telemetry Actions & Catalog Shortcuts */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-[#030303]/60 border border-zinc-800/80 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
                  <Activity className="w-4 h-4 text-emerald-450" />
                  <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider">Quick Actions</h3>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/courses')}
                    className="w-full flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl text-xs text-white font-bold transition select-none cursor-pointer hover:bg-zinc-900/40 group"
                  >
                    <span>Manage Course Curriculums</span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition group-hover:translate-x-1" />
                  </button>

                  <a
                    href="http://localhost:3000"
                    target="_blank"
                    className="w-full flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl text-xs text-white font-bold transition select-none cursor-pointer hover:bg-zinc-900/40 group"
                  >
                    <span>Launch Student Portal</span>
                    <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-white transition" />
                  </a>
                </div>
              </div>

              <div className="bg-[#030303]/60 border border-zinc-800/80 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider">Recent CBT Telemetry</h3>
                </div>

                <div className="space-y-3 text-xs leading-normal">
                  {recentAttempts.length === 0 ? (
                    <div className="text-zinc-650 text-center py-6">
                      No recent mock test attempts submitted.
                    </div>
                  ) : (
                    recentAttempts.map(attempt => (
                      <div
                        key={attempt.id}
                        className="bg-zinc-950/40 p-3.5 border border-zinc-800/80 rounded-xl space-y-1.5"
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-extrabold text-white truncate max-w-[130px]">
                            {attempt.profiles?.full_name || 'Student'}
                          </span>
                          <span className={attempt.score >= 0 ? 'text-emerald-450 font-black' : 'text-rose-455 font-black'}>
                            {attempt.score >= 0 ? `+${attempt.score}` : attempt.score} pts
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold leading-none">
                          <span className="truncate max-w-[110px]">{attempt.assessments?.title}</span>
                          <span>{new Date(attempt.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
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
