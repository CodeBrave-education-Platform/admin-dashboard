'use client'

import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Layers, 
  HelpCircle, 
  Loader2, 
  X, 
  ArrowRight,
  BookOpen,
  Award,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function AutonomousCompileModal({
  isOpen,
  doc,
  packages = [],
  courses = [],
  defaultCourseId = null,
  onClose,
  onCompileSuccess
}) {
  const { showToast } = useToast();

  const [title, setTitle] = useState(doc?.title || '');
  const [destinationMode, setDestinationMode] = useState(defaultCourseId ? 'course' : (packages.length > 0 ? 'package' : 'standalone'));
  const [targetPackageId, setTargetPackageId] = useState(packages[0]?.id || '');
  const [targetCourseId, setTargetCourseId] = useState(defaultCourseId || '');
  const [availableCourses, setAvailableCourses] = useState(courses);
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [blueprintType, setBlueprintType] = useState('jee_main');
  
  // States: 'config' | 'compiling' | 'success' | 'error'
  const [step, setStep] = useState('config');
  const [compilingStep, setCompilingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [compiledExam, setCompiledExam] = useState(null);

  // Sync title if doc changes
  React.useEffect(() => {
    if (doc) {
      setTitle(doc.title || '');
      setStep('config');
      setErrorMsg('');
      setCompiledExam(null);
    }
  }, [doc]);

  // Load courses if not passed
  React.useEffect(() => {
    if (availableCourses.length === 0) {
      import('@/utils/supabase/client').then(({ createClient }) => {
        const client = createClient();
        client.from('courses').select('id, title, thumbnail_url').order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data && data.length > 0) {
              setAvailableCourses(data);
              if (!targetCourseId) setTargetCourseId(data[0].id);
            }
          });
      });
    }
  }, [availableCourses.length, targetCourseId]);

  if (!isOpen || !doc) return null;

  const steps = [
    'Reading PDF question paper bytes...',
    'Scanning questions, formulas & options...',
    'Auto-scanning end-of-PDF Answer Key matrix...',
    'Auto-segmenting Physics, Chemistry & Maths sections...',
    'Generating ready-to-take exam in target test suite...'
  ];

  const handleStartCompile = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please provide an Exam Title', 'error');
      return;
    }

    setStep('compiling');
    setCompilingStep(0);
    setErrorMsg('');

    // Interval animation for user feedback while server processes
    const stepInterval = setInterval(() => {
      setCompilingStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      const payload = {
        document_id: doc.id,
        file_url: doc.file_url,
        storage_path: doc.metadata?.storage_path,
        title: title.trim(),
        package_id: destinationMode === 'package' ? (targetPackageId || null) : null,
        course_id: destinationMode === 'course' ? (targetCourseId || null) : null,
        duration_minutes: Number(durationMinutes) || 180,
        blueprint_type: blueprintType
      };

      const res = await fetch('/api/admin/test-series/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(stepInterval);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Autonomous compilation failed');
      }

      setCompiledExam(data.exam);
      setStep('success');
      showToast(data.message || 'Exam successfully compiled autonomously!', 'success');

      if (onCompileSuccess) {
        onCompileSuccess(data.exam);
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error('[Autonomous Compile Error]:', err);
      setErrorMsg(err.message || 'An error occurred during AI compilation');
      setStep('error');
      showToast(err.message, 'error');
    }
  };

  const selectedPkg = packages.find(p => p.id === targetPackageId);

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in select-none">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">1-Click Autonomous Exam Compiler</h3>
              <p className="text-xs text-slate-500 font-medium">Zero manual editing • Multimodal AI Digitizer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={step === 'compiling'}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition cursor-pointer disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* STEP 1: CONFIGURATION */}
          {step === 'config' && (
            <form onSubmit={handleStartCompile} className="space-y-5">
              {/* Document Reference Info */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="min-w-0 pr-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Source PDF</span>
                  <span className="text-xs font-bold text-slate-800 truncate block">{doc.file_name || doc.title}</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase rounded-full shrink-0">
                  Ready to Compile
                </span>
              </div>

              {/* Exam Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Compiled Exam Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. JEE Main 2026 Full Syllabus Mock Test 01"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              {/* Destination Mode Selector: Package vs Course vs Standalone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Assign Destination
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDestinationMode('package')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      destinationMode === 'package'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Test Package</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestinationMode('course')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      destinationMode === 'course'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Course</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestinationMode('standalone')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      destinationMode === 'standalone'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Standalone</span>
                  </button>
                </div>

                {destinationMode === 'package' && (
                  <div className="pt-1">
                    <select
                      value={targetPackageId}
                      onChange={e => setTargetPackageId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    >
                      {packages.length === 0 ? (
                        <option value="">No packages available - will save as standalone</option>
                      ) : (
                        packages.map(pkg => (
                          <option key={pkg.id} value={pkg.id}>
                            📦 {pkg.title} ({pkg.target_exam_tag || 'All India'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {destinationMode === 'course' && (
                  <div className="pt-1">
                    <select
                      value={targetCourseId}
                      onChange={e => setTargetCourseId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    >
                      {availableCourses.length === 0 ? (
                        <option value="">No courses available</option>
                      ) : (
                        availableCourses.map(c => (
                          <option key={c.id} value={c.id}>
                            🎓 {c.title}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {destinationMode === 'standalone' && (
                  <p className="text-[11px] text-slate-500 font-medium px-1">
                    Accessible directly by all students in Standalone Mock Tests without package enrollment.
                  </p>
                )}
              </div>

              {/* Blueprint & Duration Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Exam Blueprint</label>
                  <select
                    value={blueprintType}
                    onChange={e => setBlueprintType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    <option value="jee_main">JEE Main (MCQ + Numerical)</option>
                    <option value="jee_advanced">JEE Advanced (Multi-Select)</option>
                    <option value="neet">NEET (Biology, Physics, Chem)</option>
                    <option value="custom">Custom Format</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="10"
                    max="360"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:shadow-indigo-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Autonomous Compile</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: COMPILING PROGRESS */}
          {step === 'compiling' && (
            <div className="py-8 space-y-6 text-center">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-pulse"></div>
                <div className="w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                <Sparkles className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto" />
              </div>

              <div className="space-y-2 max-w-sm mx-auto">
                <h4 className="text-base font-black text-slate-900">AI Digitizer is Analyzing Paper</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Scanning equations, diagrams, and auto-binding the answer key matrix from the final pages.
                </p>
              </div>

              {/* Progress Milestones List */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 max-w-md mx-auto">
                {steps.map((text, idx) => {
                  const isDone = idx < compilingStep;
                  const isCurrent = idx === compilingStep;
                  return (
                    <div key={idx} className="flex items-center gap-3 text-xs font-bold">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={isDone ? 'text-slate-800' : isCurrent ? 'text-indigo-600 font-black' : 'text-slate-400'}>
                        {text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CELEBRATION */}
          {step === 'success' && compiledExam && (
            <div className="py-4 space-y-6 text-center">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">Exam Successfully Compiled!</h4>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedPkg ? `Added to package "${selectedPkg.title}"` : 'Published as Standalone Mock Test'}
                </p>
              </div>

              {/* Exam Specs Matrix */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center max-w-md mx-auto">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Questions</span>
                  <span className="text-base font-black text-slate-900">{compiledExam.total_questions || 75} Qs</span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                  <span className="text-base font-black text-slate-900">{compiledExam.duration_minutes} Mins</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Bound</span>
                  <span className="text-base font-black text-emerald-600">100% Auto</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ERROR STATE */}
          {step === 'error' && (
            <div className="py-6 space-y-5 text-center">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900">Compilation Failed</h4>
                <p className="text-xs text-rose-600 font-medium max-w-sm mx-auto">{errorMsg}</p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('config')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
