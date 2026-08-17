'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Users, CheckCircle, Activity, Award, RefreshCw, 
  Clock, ShieldAlert, UserCheck 
} from 'lucide-react';

export default function LiveTelemetryTab({
  packageData,
  exams = [],
  selectedExamId = null
}) {
  const supabase = createClient();
  const packageExams = (exams || []).filter(e => e.package_id === packageData?.id);
  
  const [activeExamId, setActiveExamId] = useState(
    selectedExamId || (packageExams[0]?.id || null)
  );

  // Synchronize activeExamId when packageExams or selectedExamId changes
  useEffect(() => {
    if (selectedExamId && packageExams.some(e => e.id === selectedExamId)) {
      setActiveExamId(selectedExamId);
    } else if (!activeExamId && packageExams.length > 0) {
      setActiveExamId(packageExams[0].id);
    }
  }, [selectedExamId, packageExams]);

  // Telemetry States
  const [activeStudents, setActiveStudents] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [bellCurveData, setBellCurveData] = useState([]);
  const [attemptsList, setAttemptsList] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentExam = packageExams.find(e => e.id === activeExamId) || null;

  const fetchLiveTelemetry = async () => {
    if (!activeExamId) return;
    setIsRefreshing(true);
    try {
      // 1. Fetch live metrics from Upstash Redis via telemetry API
      const telRes = await fetch(`/api/admin/test-series/telemetry?examId=${activeExamId}`);
      if (telRes.ok) {
        const telData = await telRes.json();
        setActiveStudents(telData.activeStudents || 0);
        setTotalSubmissions(telData.totalSubmissions || 0);
        setAverageScore(telData.averageScore || 0);
        setBellCurveData(telData.bellCurve || []);
      }

      // 2. Fetch scorecards list from Supabase
      const { data: dbAttempts, error: dbErr } = await supabase
        .from('test_attempts')
        .select('*, profiles(full_name, email)')
        .eq('exam_id', activeExamId)
        .order('completed_at', { ascending: false });

      if (!dbErr && dbAttempts) {
        setAttemptsList(dbAttempts);
      }
    } catch (err) {
      console.warn('[Telemetry Tab] Query failed:', err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 5-second polling loop
  useEffect(() => {
    if (activeExamId) {
      fetchLiveTelemetry();
      const interval = setInterval(fetchLiveTelemetry, 5000);
      return () => clearInterval(interval);
    }
  }, [activeExamId]);

  const formatDuration = (secs) => {
    if (!secs) return '0m 0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  if (packageExams.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 space-y-3">
        <Activity className="w-10 h-10 text-slate-300 mx-auto" />
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
          No Exam Blueprints Available for Telemetry
        </h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Please compile at least one exam blueprint under this package to view live concurrent test takers and proctoring logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Exam Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Live Proctoring & Telemetry Cockpit
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Real-time concurrent test takers, Recharts bell curve, and student scorecard feeds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeExamId || ''}
            onChange={e => setActiveExamId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-indigo-500"
          >
            {packageExams.map(exam => (
              <option key={exam.id} value={exam.id}>
                {exam.title} ({exam.duration_minutes || 180}m)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchLiveTelemetry}
            disabled={isRefreshing}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Dynamic Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Active Takers</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-slate-900 font-mono flex items-center gap-2">
            <span>{activeStudents}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Concurrent Sessions</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Submissions</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 font-mono">{totalSubmissions}</p>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Completed Papers</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Average Score</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-700 font-mono">{averageScore} pts</p>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Class Mean Performance</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Duration</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xl font-black text-slate-900 font-mono">{currentExam?.duration_minutes || 180}m</p>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Timer Allotment</span>
        </div>
      </div>

      {/* Bell Curve & Submissions Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Area Bell Curve */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-black text-xs uppercase text-slate-800 tracking-wider">
                Score Distribution Bell Curve
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold">
                Cohort score distribution across percentage bands
              </p>
            </div>
            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase">
              Real-Time
            </span>
          </div>

          <div className="h-64 w-full bg-slate-50 border border-slate-200 rounded-2xl p-3">
            {totalSubmissions === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-slate-400 text-xs font-semibold">
                <Activity className="w-8 h-8 text-slate-350 animate-pulse" />
                <span>Waiting for candidate submissions to plot distribution curve...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bellCurveData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreBellGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="range" stroke="#64748B" fontSize={10} fontWeight="bold" />
                  <YAxis stroke="#64748B" fontSize={10} fontWeight="bold" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontFamily: 'sans-serif'
                    }}
                    itemStyle={{ color: '#1E293B', fontWeight: 'bold' }}
                    labelStyle={{ color: '#64748B', fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366F1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#scoreBellGrad)"
                    name="Candidates"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Live Proctor Activity Monitor Log */}
        <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm flex flex-col justify-between max-h-[380px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <h4 className="font-black text-xs uppercase text-slate-800 tracking-wider">
                Recent Submissions
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400">({attemptsList.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {attemptsList.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-12">
                No students have completed this exam paper yet.
              </p>
            ) : (
              attemptsList.slice(0, 15).map(att => (
                <div
                  key={att.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition"
                >
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-black text-slate-800 truncate">
                      {att.profiles?.full_name || att.profiles?.email?.split('@')[0] || 'Anonymous Candidate'}
                    </h5>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                      Duration: {formatDuration(att.total_duration_seconds)}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black rounded-lg">
                      {att.score} pts
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
