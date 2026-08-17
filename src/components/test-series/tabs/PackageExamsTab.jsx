'use client'

import React from 'react';
import { 
  ClipboardList, Plus, Play, Edit3, Trash2, 
  Clock, Award, Radio, AlertCircle, CheckCircle2 
} from 'lucide-react';

export default function PackageExamsTab({
  packageData,
  exams = [],
  onCompileNewExamClick,
  onSelectExamForCompiler,
  onSelectExamForMonitor,
  onDeleteExam
}) {
  const packageExams = (exams || []).filter(e => e.package_id === packageData?.id);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            <span>Compiled Exam Blueprints ({packageExams.length})</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            CBT examination papers scheduled under &ldquo;{packageData?.title}&rdquo;
          </p>
        </div>

        <button
          type="button"
          onClick={onCompileNewExamClick}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Compile New Exam</span>
        </button>
      </div>

      {/* Exams List */}
      {packageExams.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 space-y-3">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            No Exam Blueprints Linked
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Assemble your first CBT mock test paper using questions from the bank or AI PDF ingestion.
          </p>
          <button
            type="button"
            onClick={onCompileNewExamClick}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Exam Compiler</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {packageExams.map(exam => {
            const now = Date.now();
            const start = exam.activation_timestamp ? new Date(exam.activation_timestamp).getTime() : null;
            const isUpcoming = start && now < start;

            return (
              <div
                key={exam.id}
                className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition shadow-2xs group"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-xs font-black text-slate-900 truncate max-w-[280px] sm:max-w-[400px]">
                      {exam.title}
                    </h4>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border tracking-wider ${
                      isUpcoming
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {isUpcoming ? 'Scheduled' : 'Live Active'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-bold">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{exam.duration_minutes || 180} Mins</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-3 h-3 text-indigo-500" />
                      <span>{exam.total_questions || (exam.questions?.length ?? 0)} Questions</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-500" />
                      <span>Live Board: {exam.is_live_ranking ? 'Enabled' : 'Disabled'}</span>
                    </span>
                  </div>

                  {exam.activation_timestamp && (
                    <span className="text-[10px] text-slate-400 font-semibold block" suppressHydrationWarning>
                      Opens: {new Date(exam.activation_timestamp).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectExamForMonitor(exam)}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                    title="Open Live Proctoring Monitor"
                  >
                    <Play className="w-3 h-3" />
                    <span>Telemetry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectExamForCompiler(exam)}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                    title="Edit Questions & Blueprint"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Questions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteExam(exam)}
                    className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Delete Exam Blueprint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
