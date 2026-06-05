'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import { 
  Trophy, Target, Clock, AlertCircle, Search, RefreshCw, X, ChevronRight, GraduationCap, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Simple Compile Markdown placeholder for inline latex compiling
const compileMarkdownToHtml = (markdown) => {
  if (!markdown) return '';
  return markdown;
};

export default function GradebookPage() {
  const supabase = createClient();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [exams, setExams] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('title', { ascending: true });

        if (error) throw error;
        setCourses(data || []);
        if (data && data.length > 0) {
          setSelectedCourseId(data[0].id);
        }
      } catch (err) {
        console.error('[Gradebook Fetch Courses Error]:', err.message);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [supabase]);

  // Fetch attempts & exams when selected course changes
  const fetchTelemetryData = async () => {
    if (!selectedCourseId) return;
    setLoadingAttempts(true);
    setRefreshing(true);
    try {
      // 1. Fetch assessments for this course
      const { data: examsData, error: examsErr } = await supabase
        .from('assessments')
        .select('*')
        .eq('course_id', selectedCourseId);
      
      if (examsErr) throw examsErr;
      setExams(examsData || []);

      // 2. Fetch assessment attempts for these exams
      const examIds = (examsData || []).map(e => e.id);
      if (examIds.length === 0) {
        setAttempts([]);
        setLoadingAttempts(false);
        setRefreshing(false);
        return;
      }

      const { data: attemptsData, error: attemptsErr } = await supabase
        .from('assessment_attempts')
        .select('*, assessments(*, questions(id, correct_option_index)), profiles(*)')
        .in('assessment_id', examIds)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false });

      if (attemptsErr) throw attemptsErr;
      setAttempts(attemptsData || []);
    } catch (err) {
      console.error('[Gradebook Fetch Telemetry Error]:', err.message);
    } finally {
      setLoadingAttempts(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetryData();
  }, [selectedCourseId]);

  // Calculations
  const statsAttempts = React.useMemo(() => {
    if (examFilter === 'all') return attempts;
    return attempts.filter(a => a.assessment_id === examFilter);
  }, [attempts, examFilter]);

  const telemetryStats = React.useMemo(() => {
    if (statsAttempts.length === 0) return { avg: 0, highest: 0, avgTimeStr: '0s' };
    const totalScore = statsAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
    const avg = Math.round((totalScore / statsAttempts.length) * 10) / 10;
    const highest = Math.max(...statsAttempts.map(a => a.score || 0));
    
    const totalTimeMs = statsAttempts.reduce((sum, a) => {
      if (!a.started_at || !a.submitted_at) return sum;
      return sum + (new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime());
    }, 0);
    const avgTimeSeconds = Math.round((totalTimeMs / statsAttempts.length) / 1000);
    
    let avgTimeStr = '0s';
    if (avgTimeSeconds > 3600) {
      avgTimeStr = `${Math.floor(avgTimeSeconds / 3600)}h ${Math.floor((avgTimeSeconds % 3600) / 60)}m`;
    } else if (avgTimeSeconds > 60) {
      avgTimeStr = `${Math.floor(avgTimeSeconds / 60)}m ${avgTimeSeconds % 60}s`;
    } else {
      avgTimeStr = `${avgTimeSeconds}s`;
    }

    return { avg, highest: Math.max(0, highest), avgTimeStr };
  }, [statsAttempts]);

  const processedRoster = React.useMemo(() => {
    return attempts.map(attempt => {
      if (!attempt) return null;
      const started = attempt.started_at ? new Date(attempt.started_at) : null;
      const submitted = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
      const elapsedMs = (started && submitted) ? (submitted.getTime() - started.getTime()) : 0;
      
      const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
      let timeStr = '0s';
      if (elapsedSeconds > 3600) {
        timeStr = `${Math.floor(elapsedSeconds / 3600)}h ${Math.floor((elapsedSeconds % 3600) / 60)}m`;
      } else if (elapsedSeconds > 60) {
        timeStr = `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
      } else {
        timeStr = `${elapsedSeconds}s`;
      }

      const questions = attempt.assessments?.questions || [];
      const answers = attempt.answers_payload || {};
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      questions.forEach(q => {
        if (!q) return;
        const ans = answers[q.id];
        if (ans === undefined || ans === null || ans === -1) {
          unanswered++;
        } else if (Number(ans) === q.correct_option_index) {
          correct++;
        } else {
          incorrect++;
        }
      });

      const accuracy = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

      return {
        ...attempt,
        timeStr,
        correct,
        incorrect,
        unanswered,
        accuracy,
        totalQuestions: questions.length
      };
    }).filter(Boolean);
  }, [attempts]);

  const filteredRoster = React.useMemo(() => {
    return processedRoster.filter(roster => {
      const search = searchTerm.trim().toLowerCase();
      const studentName = (roster.profiles?.full_name || '').toLowerCase();
      const studentEmail = (roster.profiles?.email || '').toLowerCase();
      const matchesSearch = !search || studentName.includes(search) || studentEmail.includes(search);

      const matchesExam = examFilter === 'all' || roster.assessment_id === examFilter;

      return matchesSearch && matchesExam;
    });
  }, [processedRoster, searchTerm, examFilter]);

  return (
    <AdminLayoutShell 
      title="Cohort Gradebook & Student Scorecards"
      subtitle="Examine mock exam telemetry, student scoring breakdowns, and conceptual accuracy reports"
    >
      <div className="space-y-6 animate-fade-in font-sans">
        
        {/* Top Control Panel: Select Course */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">Select Course Catalog</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Examine scoreboard logs for enrolled student profiles</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={selectedCourseId}
              onChange={e => { setSelectedCourseId(e.target.value); setExamFilter('all'); }}
              disabled={loadingCourses}
              className="bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs text-slate-800 rounded-xl outline-none focus:border-indigo-500 transition cursor-pointer font-bold w-full md:w-64"
            >
              <option value="">-- Choose Course --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            <button
              onClick={fetchTelemetryData}
              disabled={refreshing}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition cursor-pointer disabled:opacity-55"
              title="Sync Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loadingAttempts ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-slate-200 p-6 rounded-3xl h-24 shadow-sm" />
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-16 bg-slate-50 border border-slate-200 rounded-3xl min-h-[350px] flex flex-col items-center justify-center space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto text-slate-200 mb-3 animate-pulse" />
            <h3 className="font-extrabold text-sm text-slate-700">No Telemetry Data Available</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              No exam attempts have been submitted for this course catalog yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Telemetry Summary Bento Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 hover:border-slate-350 transition shadow-sm">
                <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-650">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cohort Avg Score</span>
                  <h4 className="text-xl font-extrabold text-slate-800 mt-0.5">{telemetryStats.avg} <span className="text-xs text-slate-400 font-medium">Points</span></h4>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 hover:border-slate-350 transition shadow-sm">
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Highest JEE Score</span>
                  <h4 className="text-xl font-extrabold text-emerald-600 mt-0.5">+{telemetryStats.highest} <span className="text-xs text-slate-400 font-medium">Points</span></h4>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 hover:border-slate-350 transition shadow-sm">
                <div className="p-3.5 bg-cyan-50 rounded-xl border border-cyan-100 text-cyan-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Average Time Spent</span>
                  <h4 className="text-xl font-extrabold text-slate-800 mt-0.5">{telemetryStats.avgTimeStr}</h4>
                </div>
              </div>
            </div>

            {/* Filter Deck */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="text-xs font-bold text-slate-850">
                Attempt Records ({filteredRoster.length})
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search student or email..."
                  className="bg-slate-50 border border-slate-200 px-4 py-2 text-xs text-slate-800 rounded-xl outline-none focus:border-indigo-500 transition w-44 font-semibold shadow-xs"
                />

                <select
                  value={examFilter}
                  onChange={e => setExamFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 px-4 py-2 text-xs text-slate-800 rounded-xl outline-none focus:border-indigo-500 transition cursor-pointer font-bold shadow-xs"
                >
                  <option value="all">All Assessments</option>
                  {exams.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-655 text-[10px] uppercase font-bold tracking-widest">
                      <th className="py-3.5 px-5">Student Participant</th>
                      <th className="py-3.5 px-4">Exam Sheet</th>
                      <th className="py-3.5 px-4">Date Taken</th>
                      <th className="py-3.5 px-4">Duration</th>
                      <th className="py-3.5 px-4 text-center">Accuracy (%)</th>
                      <th className="py-3.5 px-5 text-right">JEE Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredRoster.map(roster => (
                      <tr
                        key={roster.id}
                        onClick={() => setSelectedAttempt(roster)}
                        className="hover:bg-slate-50/50 cursor-pointer select-none transition duration-150 border-b border-slate-100"
                      >
                        <td className="py-3.5 px-5">
                          <div>
                            <h4 className="font-extrabold text-slate-800 leading-tight">
                              {roster.profiles?.full_name || roster.profiles?.email?.split('@')[0] || 'Anonymous student'}
                            </h4>
                            <span className="text-[10px] text-slate-550 font-medium truncate block max-w-[200px]">
                              {roster.profiles?.email || 'No email registered'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-700">{roster.assessments?.title || 'Chapter Assessment'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-bold">
                          {new Date(roster.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                          {roster.timeStr}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                            roster.accuracy >= 70 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            roster.accuracy >= 40 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            {roster.accuracy}%
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-extrabold text-slate-800 font-mono">
                          <span className={roster.score >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                            {roster.score >= 0 ? `+${roster.score}` : roster.score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Detailed Scorecard Overlay Modal */}
      <AnimatePresence>
        {selectedAttempt && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAttempt(null)}
              className="absolute inset-0 cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl relative text-slate-800 overflow-hidden z-10 p-6 md:p-8"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-650 font-extrabold text-sm uppercase">
                    {selectedAttempt.profiles?.full_name?.substring(0, 2) || selectedAttempt.profiles?.email?.substring(0, 2) || 'ST'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 leading-tight">
                      {selectedAttempt.profiles?.full_name || 'Anonymous Student'}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {selectedAttempt.profiles?.email || 'N/A'} • Submitted on {new Date(selectedAttempt.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">JEE Scorecard</span>
                  <div className={`text-xl font-mono font-extrabold mt-0.5 ${selectedAttempt.score >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedAttempt.score >= 0 ? `+${selectedAttempt.score}` : selectedAttempt.score}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mt-5 space-y-2">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Assessment Outline</h4>
                <p className="text-xs font-extrabold text-slate-700">{selectedAttempt.assessments?.title || 'Chapter Assessment'}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-550 pt-1.5 border-t border-slate-200/50 mt-1.5 font-semibold">
                  <span>Duration Spent: <strong className="text-slate-750 font-mono">{selectedAttempt.timeStr}</strong></span>
                  <span>Accuracy: <strong className="text-indigo-600">{selectedAttempt.accuracy}%</strong></span>
                  <span>Attempt ID: <span className="font-mono text-slate-400 select-all">{selectedAttempt.id}</span></span>
                </div>
              </div>

              {/* Dynamic NTA counts Bento Grid */}
              <div className="grid grid-cols-3 gap-4 mt-5 select-none">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex flex-col justify-between hover:border-emerald-250 transition h-20">
                  <span className="text-[9px] font-bold text-emerald-650 uppercase tracking-wider block leading-none">Correct</span>
                  <h4 className="text-lg font-black text-emerald-600 font-mono">+{selectedAttempt.correct} <span className="text-[9px] text-slate-400 font-bold">Qns</span></h4>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex flex-col justify-between hover:border-rose-255 transition h-20">
                  <span className="text-[9px] font-bold text-rose-650 uppercase tracking-wider block leading-none">Incorrect</span>
                  <h4 className="text-lg font-black text-rose-600 font-mono">-{selectedAttempt.incorrect} <span className="text-[9px] text-slate-400 font-bold">Qns</span></h4>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between hover:border-slate-350 transition h-20">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block leading-none">Unanswered</span>
                  <h4 className="text-lg font-black text-slate-700 font-mono">{selectedAttempt.unanswered} <span className="text-[9px] text-slate-400 font-bold">Qns</span></h4>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition select-none cursor-pointer"
                >
                  Close Scorecard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayoutShell>
  );
}
