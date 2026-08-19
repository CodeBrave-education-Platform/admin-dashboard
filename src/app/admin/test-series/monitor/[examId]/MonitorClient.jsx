'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts'
import { 
  Users, CheckCircle, Activity, Award, RefreshCw, 
  UserCheck, ShieldAlert, Clock, ArrowRight, Play
} from 'lucide-react'

export default function MonitorClient({ exam }) {
  const supabase = createClient()

  // Real-Time Stats
  const [activeStudents, setActiveStudents] = useState(0)
  const [totalSubmissions, setTotalSubmissions] = useState(0)
  const [averageScore, setAverageScore] = useState(0)
  const [bellCurveData, setBellCurveData] = useState([])
  const [attemptsList, setAttemptsList] = useState([])
  const [isRefreshing, setIsRefreshing] = useState(true)

  // Fetch telemetry from local API and Supabase
  const fetchLiveTelemetry = async () => {
    setIsRefreshing(true)
    try {
      // 1. Fetch live metrics from Upstash Redis via telemetry API
      const telRes = await fetch(`/api/admin/test-series/telemetry?examId=${exam.id}`)
      if (telRes.ok) {
        const telData = await telRes.json()
        setActiveStudents(telData.activeStudents || 0)
        setTotalSubmissions(telData.totalSubmissions || 0)
        setAverageScore(telData.averageScore || 0)
        setBellCurveData(telData.bellCurve || [])
      }

      // 2. Fetch full list of scorecards from database
      const { data: dbAttempts, error: dbErr } = await supabase
        .from('test_attempts')
        .select('*, profiles(full_name, email)')
        .eq('exam_id', exam.id)
        .order('completed_at', { ascending: false })

      if (dbErr) throw dbErr
      setAttemptsList(dbAttempts || [])
    } catch (err) {
      console.error('[Monitor] Telemetry query failed:', err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  // 5 seconds auto-polling loop
  useEffect(() => {
    fetchLiveTelemetry()
    const interval = setInterval(fetchLiveTelemetry, 5000)
    return () => clearInterval(interval)
  }, [exam.id])

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fade-in">
      
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Students', value: `${activeStudents} Live`, desc: 'Taking test concurrently', icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Submissions', value: `${totalSubmissions} Papers`, desc: 'Completed and submitted', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Average Score', value: `${averageScore} Pts`, desc: 'Overall class average', icon: Award, color: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Exam Duration', value: `${exam.duration_minutes} Mins`, desc: 'Total scheduled time', icon: Clock, color: 'text-slate-600 bg-slate-100 border-slate-200' }
        ].map((card, idx) => (
          <div key={idx} className={`p-6 bg-white border rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow duration-200`}>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</span>
              <h4 className="text-xl font-black text-slate-850 leading-none">{card.value}</h4>
              <span className="text-[10px] text-slate-400 font-semibold block">{card.desc}</span>
            </div>
            <div className={`p-3 rounded-2xl ${card.color} shrink-0`}>
              <card.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Bell-Curve Distribution & Live Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts Bell Curve Distribution */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-sm uppercase text-slate-800 tracking-wider">Score Bell Curve</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Distribution of scores across submitted exam scorecards</p>
            </div>
            <div className="flex items-center gap-2">
              {isRefreshing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">Live Updates</span>
            </div>
          </div>

          <div className="h-72 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4">
            {totalSubmissions === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-slate-400 text-xs font-semibold">
                <Activity className="w-8 h-8 text-slate-350 animate-pulse" />
                <span>Waiting for student submissions to generate curve...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bellCurveData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="range" stroke="#64748B" fontSize={10} fontWeight="bold" />
                  <YAxis stroke="#64748B" fontSize={10} fontWeight="bold" allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '12px', fontSize: '11px', fontFamily: 'sans-serif' }}
                    itemStyle={{ color: '#1E293B', fontWeight: 'bold' }}
                    labelStyle={{ color: '#64748B', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#scoreGrad)" name="Students" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Live Proctor Activity Monitor Log */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm flex flex-col justify-between max-h-[400px]">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="w-5 h-5 text-indigo-650" />
            <h3 className="font-extrabold text-sm uppercase text-slate-800 tracking-wider">Exam Submissions Log</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {attemptsList.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-12">
                No students have completed this exam.
              </p>
            ) : (
              attemptsList.map(att => (
                <div 
                  key={att.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-slate-800 leading-none truncate">
                      {att.profiles?.full_name || att.profiles?.email?.split('@')[0] || 'Candidate'}
                    </h4>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">
                      Duration: {formatDuration(att.total_duration_seconds)}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black rounded-lg">
                      {att.score} pts
                    </span>
                    <span className="text-[8px] text-slate-400 font-black block mt-1 uppercase">
                      +{att.correct_count} / -{att.incorrect_count}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
