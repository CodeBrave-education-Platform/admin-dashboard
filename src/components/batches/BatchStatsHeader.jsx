'use client'

import React from 'react';
import { Layers, Users, Radio, CheckCircle2, Clock, BookOpen } from 'lucide-react';

export default function BatchStatsHeader({ batches = [] }) {
  // Compute KPI metrics dynamically
  const totalBatches = batches.length;
  const publishedCount = batches.filter(b => (b.status || '').toLowerCase() === 'published' || b.status === true).length;
  const draftCount = batches.filter(b => (b.status || '').toLowerCase() === 'draft' || (b.status || '').toLowerCase() === 'hidden').length;
  const totalEnrolled = batches.reduce((acc, b) => acc + (b.students_count || (b.batch_enrollments?.length ?? 0)), 0);
  const totalLiveClasses = batches.reduce((acc, b) => acc + (b.live_sessions_count || (b.live_sessions?.length ?? 0)), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
      {/* Total Batches */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Total Batches</span>
          <Layers className="w-4 h-4 text-indigo-600" />
        </div>
        <p className="text-xl font-black text-slate-900 font-mono">{totalBatches}</p>
      </div>

      {/* Published Cohorts */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Published</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <p className="text-xl font-black text-emerald-700 font-mono">{publishedCount}</p>
      </div>

      {/* Drafts */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Drafts</span>
          <span className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
        <p className="text-xl font-black text-amber-700 font-mono">{draftCount}</p>
      </div>

      {/* Live Sessions */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Live Classes</span>
          <Radio className="w-4 h-4 text-rose-500" />
        </div>
        <p className="text-xl font-black text-slate-900 font-mono">{totalLiveClasses}</p>
      </div>

      {/* Total Enrolled Students */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs col-span-2 sm:col-span-4 lg:col-span-1 transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Enrolled Students</span>
          <Users className="w-4 h-4 text-indigo-600" />
        </div>
        <p className="text-xl font-black text-indigo-700 font-mono">{totalEnrolled.toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}
