'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import { 
  X, Award, ClipboardList, Layers, Activity, 
  BarChart3, Trash2, Loader2, Sparkles 
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialogModal from '@/components/ConfirmDialogModal';
import PackageOverviewTab from './tabs/PackageOverviewTab';
import PackageExamsTab from './tabs/PackageExamsTab';
import ExamCompilerTab from './tabs/ExamCompilerTab';
import LiveTelemetryTab from './tabs/LiveTelemetryTab';
import SubmissionsTab from './tabs/SubmissionsTab';

export default function TestSeriesEditorDrawer({
  isOpen,
  packageData,
  exams: initialExams = [],
  onClose,
  onPackageUpdated,
  onPackageDeleted,
  onExamsUpdated
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'exams' | 'compiler' | 'telemetry' | 'submissions'
  const [exams, setExams] = useState(initialExams || []);
  const [editingExam, setEditingExam] = useState(null);
  const [telemetryExamId, setTelemetryExamId] = useState(null);
  const [isDeletingPackage, setIsDeletingPackage] = useState(false);
  const [deleteExamConfirmTarget, setDeleteExamConfirmTarget] = useState(null);
  const [deletePackageConfirmOpen, setDeletePackageConfirmOpen] = useState(false);

  // Fetch / refresh linked exams for the package
  const fetchPackageExams = useCallback(async () => {
    if (!packageData?.id) return;
    try {
      const { data, error } = await supabase
        .from('test_exams')
        .select('*')
        .eq('package_id', packageData.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setExams(data);
        if (onExamsUpdated) onExamsUpdated(data);
      }
    } catch (err) {
      console.warn('[Drawer] Failed to fetch linked exams:', err.message);
    }
  }, [packageData?.id, supabase, onExamsUpdated]);

  useEffect(() => {
    if (packageData) {
      fetchPackageExams();
    }
  }, [packageData, fetchPackageExams]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Delete entire package
  const handleConfirmDeletePackage = async () => {
    if (!packageData?.id) return;
    setIsDeletingPackage(true);
    try {
      const { error } = await supabase
        .from('test_packages')
        .delete()
        .eq('id', packageData.id);

      if (error) throw error;

      showToast('Test series package successfully deleted', 'success');
      await invalidateCache('catalog', packageData.id);

      if (onPackageDeleted) {
        onPackageDeleted(packageData.id);
      }
      onClose();
    } catch (err) {
      console.error('[Delete Package Error]:', err.message);
      showToast('Failed to delete package: ' + err.message, 'error');
    } finally {
      setIsDeletingPackage(false);
      setDeletePackageConfirmOpen(false);
    }
  };

  // Delete single exam
  const handleConfirmDeleteExam = async () => {
    if (!deleteExamConfirmTarget?.id) return;
    try {
      const { error } = await supabase
        .from('test_exams')
        .delete()
        .eq('id', deleteExamConfirmTarget.id);

      if (error) throw error;

      // Update package count
      const newCount = Math.max(0, (packageData.total_tests_count || exams.length) - 1);
      await supabase
        .from('test_packages')
        .update({ total_tests_count: newCount })
        .eq('id', packageData.id);

      await invalidateCache('catalog', packageData.id);

      showToast('Exam blueprint deleted successfully', 'success');
      setExams(prev => prev.filter(e => e.id !== deleteExamConfirmTarget.id));
      await fetchPackageExams();
    } catch (err) {
      showToast('Failed to delete exam: ' + err.message, 'error');
    } finally {
      setDeleteExamConfirmTarget(null);
    }
  };

  // Callback when exam is compiled/updated in compiler tab
  const handleExamCompiled = async () => {
    await fetchPackageExams();
    setEditingExam(null);
    setActiveTab('exams');
  };

  if (!isOpen || !packageData) return null;

  const packageExamsList = exams.filter(e => e.package_id === packageData.id);
  const priceInfo = packageData.price_ledger || {};
  const isPremium = priceInfo.status === 'premium' || Number(priceInfo.price || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer transition-opacity"
      />

      {/* Drawer Content Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative w-full max-w-3xl lg:max-w-4xl bg-white shadow-2xl z-10 flex flex-col h-full overflow-hidden text-slate-800"
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 truncate">
                  {packageData.title}
                </h2>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-200">
                  {packageData.target_exam_tag || 'JEE Main'}
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                  isPremium
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isPremium ? `₹${priceInfo.price || 0}` : 'FREE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                ID: <span className="font-mono">{packageData.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDeletePackageConfirmOpen(true)}
              disabled={isDeletingPackage}
              className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 hover:text-rose-700 transition cursor-pointer border border-transparent hover:border-rose-100"
              title="Delete Test Package"
            >
              {isDeletingPackage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'overview', label: 'Overview & Details', icon: Award },
            { id: 'exams', label: `Exam Blueprints (${packageExamsList.length})`, icon: ClipboardList },
            { id: 'compiler', label: editingExam ? 'Edit Blueprint' : 'Exam Compiler', icon: Layers },
            { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
            { id: 'submissions', label: 'Candidate Gradebook', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'compiler') setEditingExam(null);
                }}
                className={`py-3.5 px-3 text-xs font-black transition border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 bg-white/60'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <PackageOverviewTab
              packageData={packageData}
              onPackageUpdated={onPackageUpdated}
            />
          )}

          {/* TAB 2: EXAMS LIST */}
          {activeTab === 'exams' && (
            <PackageExamsTab
              packageData={packageData}
              exams={exams}
              onCompileNewExamClick={() => {
                setEditingExam(null);
                setActiveTab('compiler');
              }}
              onSelectExamForCompiler={(exam) => {
                setEditingExam(exam);
                setActiveTab('compiler');
              }}
              onSelectExamForMonitor={(exam) => {
                setTelemetryExamId(exam.id);
                setActiveTab('telemetry');
              }}
              onDeleteExam={(exam) => setDeleteExamConfirmTarget(exam)}
            />
          )}

          {/* TAB 3: EXAM COMPILER */}
          {activeTab === 'compiler' && (
            <ExamCompilerTab
              packageData={packageData}
              editingExam={editingExam}
              onExamCompiled={handleExamCompiled}
              onCancelEdit={() => {
                setEditingExam(null);
                setActiveTab('exams');
              }}
            />
          )}

          {/* TAB 4: LIVE TELEMETRY */}
          {activeTab === 'telemetry' && (
            <LiveTelemetryTab
              packageData={packageData}
              exams={exams}
              selectedExamId={telemetryExamId}
            />
          )}

          {/* TAB 5: SUBMISSIONS GRADEBOOK */}
          {activeTab === 'submissions' && (
            <SubmissionsTab
              packageData={packageData}
              exams={exams}
            />
          )}
        </div>

        {/* Delete Package Confirmation Dialog */}
        <ConfirmDialogModal
          isOpen={deletePackageConfirmOpen}
          title="Delete Test Series Package"
          message={`Are you sure you want to permanently delete "${packageData?.title}" and all its linked exam blueprints and question papers?`}
          confirmLabel="Permanently Delete"
          type="danger"
          onConfirm={handleConfirmDeletePackage}
          onCancel={() => setDeletePackageConfirmOpen(false)}
        />

        {/* Delete Exam Confirmation Dialog */}
        <ConfirmDialogModal
          isOpen={!!deleteExamConfirmTarget}
          title="Delete Exam Blueprint"
          message={`Are you sure you want to permanently remove "${deleteExamConfirmTarget?.title}"? All scheduled candidate attempts will be affected.`}
          confirmLabel="Delete Exam"
          type="danger"
          onConfirm={handleConfirmDeleteExam}
          onCancel={() => setDeleteExamConfirmTarget(null)}
        />
      </motion.div>
    </div>
  );
}
