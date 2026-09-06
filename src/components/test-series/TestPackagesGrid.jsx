'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  Plus, 
  Search, 
  Clock, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  ClipboardList, 
  Play, 
  Trash2, 
  CheckCircle2, 
  Sparkles,
  Users,
  Activity,
  UploadCloud,
  FileText,
  Eye,
  ExternalLink
} from 'lucide-react';

function formatPrice(amount = 0) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
}

export default function TestPackagesGrid({
  packages = [],
  exams = [],
  attempts = [],
  isLoading = false,
  onCreatePackage,
  onOpenUploadModal,
  onDeleteExam,
  onDeletePackage
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPkgId, setExpandedPkgId] = useState(packages[0]?.id || null);

  const toggleExpand = (id) => {
    setExpandedPkgId(prev => (prev === id ? null : id));
  };

  const filteredPackages = packages.filter(pkg => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (pkg.title || '').toLowerCase().includes(q) ||
      (pkg.target_exam_tag || '').toLowerCase().includes(q) ||
      (pkg.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Search & Actions Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search test packages by title or target exam..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload PDF Paper</span>
          </button>
        </div>
      </div>

      {/* Packages Grid */}
      {filteredPackages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Test Packages Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create a test package or upload a PDF question paper to compile new tests.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPackages.map(pkg => {
            const pkgExams = exams.filter(e => e.package_id === pkg.id);
            const isExpanded = expandedPkgId === pkg.id;
            const price = pkg.price_ledger?.price ?? pkg.price ?? 0;
            const isFree = price === 0;

            return (
              <div
                key={pkg.id}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs transition hover:shadow-md"
              >
                {/* Package Header Row */}
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 to-white">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-2xl shadow-sm shrink-0">
                      <Layers className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {pkg.target_exam_tag || 'All Exams'}
                        </span>
                        {isFree ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Free Package
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            ₹{price} Pro
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-bold">
                          • {pkgExams.length} Mock Tests Included
                        </span>
                      </div>

                      <h3 className="text-base font-black text-slate-900 leading-snug">
                        {pkg.title}
                      </h3>

                      {pkg.description && (
                        <p className="text-xs text-slate-500 font-medium line-clamp-1">
                          {pkg.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(pkg.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer select-none"
                    >
                      <span>{isExpanded ? 'Collapse Tests' : `View ${pkgExams.length} Tests`}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Test Roster inside this Package */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 sm:p-6 bg-slate-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Tests Inside Package ({pkgExams.length})
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Students enrolled in this package have access to all tests below
                      </span>
                    </div>

                    {pkgExams.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-2">
                        <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">No mock tests compiled into this package yet</p>
                        <p className="text-[11px] text-slate-400">
                          Go to the PDF Question Papers tab and click "Compile into Exam" to add tests to this package!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pkgExams.map(exam => {
                          const examAttempts = attempts.filter(a => a.exam_id === exam.id);

                          return (
                            <div
                              key={exam.id}
                              className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-indigo-300 transition"
                            >
                              <div className="space-y-1 min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-xs font-black text-slate-900 truncate">
                                    {exam.title}
                                  </h5>
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600">
                                    {exam.blueprint_type || 'jee_main'}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    {exam.duration_minutes} Mins
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                                    {exam.total_questions} Questions
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 text-purple-700 font-bold">
                                    <Users className="w-3.5 h-3.5 text-purple-600" />
                                    {examAttempts.length} Submissions
                                  </span>
                                </div>
                              </div>

                              {/* Exam Actions */}
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <Link
                                  href={`/admin/test-series/monitor/${exam.id}`}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-bold transition"
                                >
                                  <Activity className="w-3.5 h-3.5" />
                                  <span>Proctoring</span>
                                </Link>

                                {onDeleteExam && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteExam(exam)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                    title="Delete Exam"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
