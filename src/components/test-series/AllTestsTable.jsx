'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Clock, 
  HelpCircle, 
  Users, 
  Trash2, 
  Edit3, 
  Printer, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Layers,
  X
} from 'lucide-react';
import KatexRenderer from '@/components/KatexRenderer';

// Formats blueprint badge with authentic competitive exam colorways
function BlueprintBadge({ blueprint = 'custom' }) {
  const norm = String(blueprint || 'custom').toLowerCase().replace('-', '_');
  
  switch (norm) {
    case 'jee_main':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          JEE Main
        </span>
      );
    case 'jee_advanced':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
          JEE Advanced
        </span>
      );
    case 'neet':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          NEET
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Custom Blueprint
        </span>
      );
  }
}

// Extracts unique subjects and sections from exam configuration
function getExamSubjectsAndSections(exam) {
  if (Array.isArray(exam.sections_config) && exam.sections_config.length > 0) {
    const subjects = [...new Set(exam.sections_config.map(s => s.subject || s.name || 'General'))];
    const sectionsCount = exam.sections_config.length;
    return {
      subjectsText: subjects.join(', '),
      sectionsCount: sectionsCount
    };
  }

  if (Array.isArray(exam.questions) && exam.questions.length > 0) {
    const subjects = [...new Set(exam.questions.map(q => q.subject || 'General').filter(Boolean))];
    return {
      subjectsText: subjects.length > 0 ? subjects.join(', ') : 'PCM Full Syllabus',
      sectionsCount: 2
    };
  }

  return {
    subjectsText: 'Full Syllabus',
    sectionsCount: 1
  };
}

// Printable Exam Booklet Modal Component
function PrintableBookletModal({ exam, isOpen, onClose }) {
  if (!isOpen || !exam) return null;

  const questions = Array.isArray(exam.questions) ? exam.questions : [];
  const { subjectsText } = getExamSubjectsAndSections(exam);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Controls Toolbar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800">Printable Exam Booklet Preview</h3>
            <span className="text-xs text-slate-400">({questions.length} Questions)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 font-serif print:p-0 print:overflow-visible">
          {/* Authentic Competitive Exam Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center space-y-1">
            <p className="text-[10px] font-sans font-black tracking-widest text-slate-600 uppercase">
              ASENTRA NATIONAL ASSESSMENT PRACTICE PORTAL
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {exam.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs font-sans font-semibold text-slate-700 pt-1">
              <span><strong>Duration:</strong> {exam.duration_minutes || 180} Minutes</span>
              <span><strong>Maximum Marks:</strong> {(exam.total_questions || questions.length || 75) * 4}</span>
              <span><strong>Subjects:</strong> {subjectsText}</span>
              <span><strong>Pattern:</strong> {exam.blueprint_type ? exam.blueprint_type.toUpperCase().replace('_', ' ') : 'NTA STANDARD'}</span>
            </div>
          </div>

          {/* Candidate Registration Block */}
          <div className="border border-slate-400 rounded-lg p-3.5 mb-6 text-xs font-sans grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Candidate Name</span>
              <div className="border-b border-dotted border-slate-400 mt-2 h-4"></div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Roll Number</span>
              <div className="border-b border-dotted border-slate-400 mt-2 h-4"></div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Exam Centre</span>
              <div className="border-b border-dotted border-slate-400 mt-2 h-4"></div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Candidate Signature</span>
              <div className="border-b border-dotted border-slate-400 mt-2 h-4"></div>
            </div>
          </div>

          {/* General Instructions */}
          <div className="bg-slate-50 border-l-4 border-indigo-600 p-3 mb-6 text-[11px] font-sans text-slate-600 leading-relaxed">
            <strong>GENERAL INSTRUCTIONS:</strong> This booklet contains {questions.length > 0 ? questions.length : 'standalone'} questions. 
            For Section A MCQs: +4 for correct, -1 for incorrect. For Section B Numerical: +4 for correct, 0 for incorrect (Attempt maximum 5 of 10 in standard JEE pattern). 
            Rough work may be done in the blank spaces at the end of this paper.
          </div>

          {/* Two-Column Question Layout */}
          {questions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-sans italic">
              No questions loaded in this exam schema yet. Questions can be added via the Exam Compiler.
            </div>
          ) : (
            <div className="space-y-6 columns-1 md:columns-2 gap-8 text-sm leading-relaxed">
              {questions.map((q, idx) => (
                <div key={q.id || idx} className="break-inside-avoid border-b border-slate-200 pb-4 mb-4">
                  <div className="flex items-start gap-2 font-sans font-bold text-xs text-slate-900 mb-1.5">
                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[11px]">
                      Q.{idx + 1}
                    </span>
                    <span className="text-slate-500 font-normal text-[11px]">
                      [{q.subject || 'General'} • {q.section || 'Section A'}]
                    </span>
                    <span className="ml-auto text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded">
                      +{q.marks_positive ?? 4}/-{Math.abs(q.marks_negative ?? 1)}
                    </span>
                  </div>

                  {/* Question Stem with KaTeX math rendering */}
                  <div className="text-slate-900 text-xs font-serif mb-2.5">
                    <KatexRenderer content={q.content} />
                  </div>

                  {/* Options for MCQ / MSQ */}
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="grid grid-cols-1 gap-1 text-xs font-sans text-slate-800 pl-2">
                      {q.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <div key={optIdx} className="flex items-start gap-1.5">
                            <span className="font-bold text-slate-600">({letter})</span>
                            <KatexRenderer content={opt} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Numerical indicator */}
                  {(!q.options || q.options.length === 0) && (
                    <div className="text-[11px] font-sans text-slate-500 italic mt-1 pl-2">
                      Answer: [____________________] (Enter numerical value)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* End-of-Paper Answer Key Table */}
          {questions.length > 0 && (
            <div className="mt-8 pt-6 border-t-2 border-slate-800 break-inside-avoid font-sans">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 text-center">
                Answer Key & Solutions Reference Matrix
              </h4>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center text-xs">
                {questions.map((q, idx) => {
                  let ansDisplay = '--';
                  if (typeof q.correct_option_index === 'number' && q.options && q.options[q.correct_option_index]) {
                    ansDisplay = String.fromCharCode(65 + q.correct_option_index);
                  } else if (q.correct_answer) {
                    ansDisplay = String(q.correct_answer);
                  }
                  return (
                    <div key={idx} className="border border-slate-200 p-1 rounded bg-slate-50">
                      <div className="text-[10px] text-slate-400 font-mono">Q{idx + 1}</div>
                      <div className="font-black text-slate-800 text-[11px] truncate">{ansDisplay}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AllTestsTable({
  exams = [],
  attempts = [],
  isLoading = false,
  onDeleteExam
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [blueprintFilter, setBlueprintFilter] = useState('all');
  const [printableModalExam, setPrintableModalExam] = useState(null);

  // Group attempts by exam_id for real-time counts & metrics
  const attemptsByExam = useMemo(() => {
    const map = {};
    if (Array.isArray(attempts)) {
      attempts.forEach(att => {
        if (!att.exam_id) return;
        if (!map[att.exam_id]) {
          map[att.exam_id] = { count: 0, totalScore: 0 };
        }
        map[att.exam_id].count += 1;
        map[att.exam_id].totalScore += Number(att.score || 0);
      });
    }
    return map;
  }, [attempts]);

  // Filter exams based on search query and blueprint selection
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      // Blueprint filter
      if (blueprintFilter !== 'all') {
        const norm = String(exam.blueprint_type || 'custom').toLowerCase().replace('-', '_');
        if (norm !== blueprintFilter) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (exam.title || '').toLowerCase().includes(query);
        const blueprintMatch = (exam.blueprint_type || '').toLowerCase().includes(query);
        return titleMatch || blueprintMatch;
      }

      return true;
    });
  }, [exams, blueprintFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search Omnibar and Blueprint Quick Filters */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Omnibar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exams by title, exam pattern, or blueprint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Blueprint Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {[
            { id: 'all', label: 'All Patterns' },
            { id: 'jee_main', label: 'JEE Main' },
            { id: 'jee_advanced', label: 'JEE Advanced' },
            { id: 'neet', label: 'NEET' },
            { id: 'custom', label: 'Custom' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBlueprintFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                blueprintFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Direct Exam Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold">Loading compiled standalone exams...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No exams found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || blueprintFilter !== 'all'
                ? 'No exams match the selected filter criteria. Try resetting your search.'
                : 'No compiled exams exist in the repository yet. Create a new exam in the compiler or compile from an uploaded PDF.'}
            </p>
            <Link
              href="/admin/test-series/compiler"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
            >
              + Compile First Exam
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 sm:px-6">Exam Title & Blueprint</th>
                  <th className="py-3.5 px-4">Subjects & Sections</th>
                  <th className="py-3.5 px-4">Questions & Duration</th>
                  <th className="py-3.5 px-4">Student Attempts</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredExams.map(exam => {
                  const { subjectsText, sectionsCount } = getExamSubjectsAndSections(exam);
                  const attemptData = attemptsByExam[exam.id] || { count: 0, totalScore: 0 };
                  const avgScore = attemptData.count > 0 
                    ? Math.round(attemptData.totalScore / attemptData.count) 
                    : null;
                  const qCount = exam.total_questions || (Array.isArray(exam.questions) ? exam.questions.length : 0);
                  const isStandalone = !exam.package_id;

                  return (
                    <tr 
                      key={exam.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Title & Blueprint */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-indigo-600 transition">
                              {exam.title}
                            </span>
                            {isStandalone && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                Standalone
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <BlueprintBadge blueprint={exam.blueprint_type} />
                            {exam.created_at && (
                              <span className="text-[10px] text-slate-400">
                                Created {new Date(exam.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subjects & Sections */}
                      <td className="py-4 px-4 text-slate-600">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 block truncate max-w-[180px]" title={subjectsText}>
                            {subjectsText}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {sectionsCount} {sectionsCount === 1 ? 'Section' : 'Sections'}
                          </span>
                        </div>
                      </td>

                      {/* Questions & Duration */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{qCount} Questions</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{exam.duration_minutes || 180} Mins</span>
                          </div>
                        </div>
                      </td>

                      {/* Student Attempts & Performance */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{attemptData.count} {attemptData.count === 1 ? 'Attempt' : 'Attempts'}</span>
                          </div>
                          {avgScore !== null ? (
                            <span className="text-[11px] font-semibold text-emerald-700 block">
                              Avg: {avgScore} pts
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 block">No attempts yet</span>
                          )}
                        </div>
                      </td>

                      {/* Published / Status */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Published
                        </span>
                      </td>

                      {/* Actions Dock */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit in Compiler */}
                          <Link
                            href={`/admin/test-series/compiler?examId=${exam.id}`}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                            title="Edit in Visual Exam Compiler"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          {/* Printable PDF Booklet */}
                          <button
                            type="button"
                            onClick={() => setPrintableModalExam(exam)}
                            className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition cursor-pointer"
                            title="Export Printable NTA Booklet"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Delete Exam */}
                          {onDeleteExam && (
                            <button
                              type="button"
                              onClick={() => onDeleteExam(exam)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              title="Delete Exam"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Booklet Modal */}
      <PrintableBookletModal
        exam={printableModalExam}
        isOpen={!!printableModalExam}
        onClose={() => setPrintableModalExam(null)}
      />
    </div>
  );
}
