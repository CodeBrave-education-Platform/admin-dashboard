'use client'

import React from 'react';
import Link from 'next/link';
import { 
  ClipboardList, 
  FileText, 
  Sparkles, 
  Users, 
  Plus, 
  UploadCloud, 
  Layers,
  FileCheck
} from 'lucide-react';

export default function TestPortalTabs({
  activeTab = 'all_tests',
  onTabChange,
  totalExams = 0,
  totalPdfs = 0,
  readyToCompileCount = 0,
  totalAttempts = 0,
  onOpenUploadModal
}) {
  return (
    <div className="space-y-6">
      {/* Portal Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/70 backdrop-blur-xl border border-slate-200/80 p-5 sm:p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Test Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Manage standalone exams, multi-format blueprints, and PDF question paper repository
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 font-bold text-xs rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            <span>Upload Question Paper PDF</span>
          </button>

          <Link
            href="/admin/test-series/compiler"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4.5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Exam</span>
          </Link>
        </div>
      </div>

      {/* Real-time Metric KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Standalone & Compiled Exams */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Exams</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">{totalExams}</p>
          <span className="text-[11px] text-slate-500 font-medium">Standalone & packaged tests</span>
        </div>

        {/* PDF Question Papers */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">PDF Question Papers</span>
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-700 font-mono tracking-tight">{totalPdfs}</p>
          <span className="text-[11px] text-slate-500 font-medium">In Supabase storage bucket</span>
        </div>

        {/* Ready to Compile */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ready to Compile</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight">{readyToCompileCount}</p>
            {readyToCompileCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                Pending action
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">1-Click auto ingestion ready</span>
        </div>

        {/* Student Exam Attempts */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Student Attempts</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-700 font-mono tracking-tight">
            {Number(totalAttempts || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">Candidate test submissions</span>
        </div>
      </div>

      {/* High-visibility 2-Tab Navigation Bar */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4">
        <button
          type="button"
          onClick={() => onTabChange('all_tests')}
          className={`group flex items-center gap-2.5 pb-3.5 px-3 sm:px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer select-none ${
            activeTab === 'all_tests'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <ClipboardList className={`w-4 h-4 ${activeTab === 'all_tests' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
          <span>All Tests</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'all_tests'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
          }`}>
            {totalExams}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('pdf_repository')}
          className={`group flex items-center gap-2.5 pb-3.5 px-3 sm:px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer select-none ${
            activeTab === 'pdf_repository'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'pdf_repository' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
          <span>PDF Question Papers</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'pdf_repository'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
          }`}>
            {totalPdfs}
          </span>
          {readyToCompileCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-ping" />
          )}
        </button>
      </div>
    </div>
  );
}
