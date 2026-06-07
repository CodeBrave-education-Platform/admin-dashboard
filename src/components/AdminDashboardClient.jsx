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
  
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [studentPortalUrl, setStudentPortalUrl] = useState('https://animated-cocada-cb9b93.netlify.app/dashboard?tab=learning');

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

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* Header section with refreshing state */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span>ASENTRA Administrative Command Center</span>
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">High-fidelity cohort monitoring, syllabus blueprinting, and real-time polling telemetry</p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-2 select-none cursor-pointer disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sync Real-Time Telemetry</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-8 animate-pulse">
          {/* Asymmetric Bento-Grid Statistics Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white border border-slate-200 p-6 rounded-3xl flex items-center justify-between shadow-sm h-24">
                <div className="space-y-2">
                  <div className="w-24 h-2 bg-slate-100 rounded" />
                  <div className="w-12 h-5 bg-slate-200 rounded" />
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-2.5xl" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Student Roster Directory Skeleton */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm min-h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-150 pb-4">
                <div className="w-48 h-4 bg-slate-100 rounded" />
                <div className="w-60 h-8 bg-slate-50 border border-slate-150 rounded-xl" />
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100" />
                      <div className="space-y-2">
                        <div className="w-32 h-3 bg-slate-150 rounded" />
                        <div className="w-48 h-2 bg-slate-100 rounded" />
                      </div>
                    </div>
                    <div className="w-16 h-3 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions & CBT Telemetry Skeleton */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm h-44 flex flex-col justify-center space-y-3">
                <div className="w-24 h-3 bg-slate-100 rounded" />
                <div className="h-10 bg-slate-50 border border-slate-100 rounded-2xl" />
                <div className="h-10 bg-slate-50 border border-slate-100 rounded-2xl" />
              </div>
              <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm h-64 flex flex-col justify-center space-y-3">
                <div className="w-32 h-3 bg-slate-100 rounded" />
                {[1, 2].map(i => (
                  <div key={i} className="bg-slate-50 p-3 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <div className="w-20 h-3 bg-slate-150 rounded" />
                      <div className="w-8 h-3 bg-slate-100 rounded" />
                    </div>
                    <div className="w-28 h-2 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Asymmetric Bento-Grid Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Active Courses', value: courses.length, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
              { label: 'Registered Students', value: students.filter(s => s.role === 'student' || !s.role).length, icon: Users, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
              { label: 'Live Poll Cycles', value: recentAttempts.length > 0 ? 'Active' : 'Inactive', icon: Radio, color: recentAttempts.length > 0 ? 'text-teal-600 bg-teal-50 border-teal-150 animate-pulse' : 'text-slate-400 bg-slate-50 border-slate-200' },
              { label: 'Total Assessments', value: recentAttempts.length, icon: GraduationCap, color: 'text-cyan-600 bg-cyan-50 border-cyan-100' }
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 p-6 rounded-3xl flex items-center justify-between transition-all duration-200 shadow-sm hover:shadow-md select-none group"
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{stat.label}</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1 group-hover:scale-105 transition duration-300 origin-left">{stat.value}</h3>
                </div>
                <div className={`p-4 rounded-2.5xl border ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Dynamic Student Roster Directory */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl space-y-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold text-sm uppercase text-slate-800 tracking-wider">
                      {roleFilter === 'all' ? 'All User Directory' : roleFilter === 'student' ? 'Student Roster Directory' : roleFilter === 'teacher' ? 'Teacher/Instructor Directory' : 'Administrator Directory'}
                    </h3>
                  </div>
                  {/* Segmented control for role filtering */}
                  <div className="flex gap-1.5 pt-1.5 select-none">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'student', label: 'Students' },
                      { key: 'teacher', label: 'Teachers' },
                      { key: 'admin', label: 'Admins' }
                    ].map(btn => (
                      <button
                        key={btn.key}
                        onClick={() => setRoleFilter(btn.key)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
                          roleFilter === btn.key
                            ? 'bg-indigo-600 text-white border border-indigo-600 shadow-sm'
                            : 'bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative w-full sm:w-60 shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search credentials..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>
              </div>

              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                {filteredStudents.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-16">
                    <Users className="w-12 h-12 text-slate-200 mb-3 mx-auto" />
                    No matching profiles found in registry.
                  </div>
                ) : (
                  filteredStudents.map(student => {
                    const initials = (student.full_name || 'ST').substring(0,2).toUpperCase();
                    const isNeet = student.target_focus === 'NEET' || student.academic_batch?.toUpperCase().includes('NEET');
                    const subjects = student.preferred_subjects || student.preferred_subject || 'Physics, Chemistry, Mathematics';
                    const isCurrentUser = student.id === currentUserId;
                    return (
                      <div
                        key={student.id}
                        className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 hover:border-slate-300 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-655 font-black text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-800 leading-tight">
                                {student.full_name || 'Anonymous User'}
                              </h4>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[8px] font-bold uppercase tracking-wider border border-amber-200 select-none">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">{student.email}</span>
                            {(student.role === 'student' || !student.role) && (
                              <span className="text-[9px] text-slate-400 font-bold block mt-1">
                                Subjects: {subjects}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto">
                          {/* Role edit select menu for administrators */}
                          {currentUserRole === 'admin' ? (
                            <div className="flex items-center gap-1.5 select-none">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Role:</span>
                              <select
                                value={student.role || 'student'}
                                disabled={isCurrentUser}
                                onChange={(e) => handleUpdateUserRole(student.id, e.target.value)}
                                className="bg-white border border-slate-250 rounded-lg px-2 py-1 text-[10px] font-black text-slate-750 outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50 shadow-sm"
                              >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-xs ${
                              student.role === 'admin'
                                ? 'bg-rose-50 text-rose-700 border-rose-150'
                                : student.role === 'teacher'
                                  ? 'bg-amber-50 text-amber-700 border-amber-150'
                                  : isNeet
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                            }`}>
                              {student.role === 'admin' ? 'Admin' : student.role === 'teacher' ? 'Teacher' : isNeet ? 'NEET Focus' : 'JEE Focus'}
                            </span>
                          )}

                          <div className="text-right shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Joined</span>
                            <span className="text-[10px] text-slate-600 font-bold block mt-1.5 font-mono leading-none">
                              {new Date(student.created_at).toLocaleDateString('en-US')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Recent Telemetry Actions & Catalog Shortcuts */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Quick Actions</h3>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/courses')}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-xs text-slate-800 font-bold transition select-none cursor-pointer hover:bg-slate-100/50 group"
                  >
                    <span>Manage Course Curriculums</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition group-hover:translate-x-1" />
                  </button>

                  <a
                    href={studentPortalUrl}
                    target="_blank"
                    className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-xs text-slate-800 font-bold transition select-none cursor-pointer hover:bg-slate-100/50 group"
                  >
                    <span>Launch Student Portal</span>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition" />
                  </a>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Recent CBT Telemetry</h3>
                </div>

                <div className="space-y-3 text-xs leading-normal">
                  {recentAttempts.length === 0 ? (
                    <div className="text-slate-400 text-center py-6">
                      No recent mock test attempts submitted.
                    </div>
                  ) : (
                    recentAttempts.map(attempt => (
                      <div
                        key={attempt.id}
                        className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl space-y-1.5"
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-extrabold text-slate-800 truncate max-w-[130px]">
                            {attempt.profiles?.full_name || 'Student'}
                          </span>
                          <span className={attempt.score >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                            {attempt.score >= 0 ? `+${attempt.score}` : attempt.score} pts
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold leading-none">
                          <span className="truncate max-w-[110px] text-slate-600">{attempt.assessments?.title}</span>
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
