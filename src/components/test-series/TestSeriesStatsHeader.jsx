'use client'

import React from 'react';
import { Award, ClipboardList, Users, Sparkles, Trophy } from 'lucide-react';

export default function TestSeriesStatsHeader({
  totalPackages = 0,
  totalExams = 0,
  activeCandidates = 0,
  premiumPackages = 0,
  averageScore = 0
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
      {/* 1. Total Packages */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Total Packages</span>
          <Award className="w-4 h-4 text-indigo-600" />
        </div>
        <p className="text-xl font-black text-slate-900 font-mono">{totalPackages}</p>
      </div>

      {/* 2. Total Exams */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Total Exams</span>
          <ClipboardList className="w-4 h-4 text-sky-600" />
        </div>
        <p className="text-xl font-black text-slate-900 font-mono">{totalExams}</p>
      </div>

      {/* 3. Active Candidates */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Active Candidates</span>
          <Users className="w-4 h-4 text-emerald-600" />
        </div>
        <p className="text-xl font-black text-emerald-700 font-mono">
          {Number(activeCandidates || 0).toLocaleString()}
        </p>
      </div>

      {/* 4. Premium Packages */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Premium Series</span>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </div>
        <p className="text-xl font-black text-slate-900 font-mono">{premiumPackages}</p>
      </div>

      {/* 5. Avg Score */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs col-span-2 sm:col-span-4 lg:col-span-1">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Avg Score</span>
          <Trophy className="w-4 h-4 text-purple-600" />
        </div>
        <p className="text-xl font-black text-purple-700 font-mono">
          {averageScore > 0 ? `${averageScore} pts` : '--'}
        </p>
      </div>
    </div>
  );
}
