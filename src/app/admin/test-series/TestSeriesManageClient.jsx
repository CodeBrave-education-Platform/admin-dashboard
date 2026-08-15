'use client'

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialogModal from '@/components/ConfirmDialogModal';
import { 
  Award, BookOpen, Clock, Users, PlusCircle, RefreshCw, Trash2, 
  ChevronRight, Play, LayoutGrid, ClipboardCheck, BarChart3, 
  HelpCircle, Settings, Layers, Calendar, Loader2, Sparkles, X, Plus, AlertCircle, Image as ImageIcon
} from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function TestSeriesManageClient({
  initialPackages = [],
  initialExams = [],
  initialAttempts = []
}) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  // Primary states
  const [packages, setPackages] = useState(initialPackages || []);
  const [exams, setExams] = useState(initialExams || []);
  const [attempts, setAttempts] = useState(initialAttempts || []);
  
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // In-Website Confirmation Dialog State (No Browser Native Popups!)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Modal Triggers
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  // Form States: New / Edit Test Package
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgTag, setPkgTag] = useState('JEE Main');
  const [pkgBranch, setPkgBranch] = useState('Hyderabad Main Campus');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgThumbnail, setPkgThumbnail] = useState('');
  const [drillsCount, setDrillsCount] = useState('0');
  const [mocksCount, setMocksCount] = useState('0');
  const [liveCount, setLiveCount] = useState('0');
  const [isPremium, setIsPremium] = useState(false);
  const [pkgPrice, setPkgPrice] = useState('499');
  const [pkgOriginalPrice, setPkgOriginalPrice] = useState('');
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);

  // Fetch / Sync data
  const syncDashboardData = async () => {
    setRefreshing(true);
    try {
      const [packagesRes, examsRes, attemptsRes] = await Promise.all([
        supabase.from('test_packages').select('*').order('created_at', { ascending: false }),
        supabase.from('test_exams').select('id, package_id, title, duration_minutes, total_questions, is_live_ranking, activation_timestamp, created_at').order('created_at', { ascending: false }),
        supabase.from('test_attempts').select('*, profiles(full_name, email), test_exams(title)').order('completed_at', { ascending: false }).limit(10)
      ]);

      if (packagesRes.data) setPackages(packagesRes.data);
      if (examsRes.data) setExams(examsRes.data);
      if (attemptsRes.data) setAttempts(attemptsRes.data);
    } catch (err) {
      console.error('[Dashboard Sync Failed]:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setPkgTitle(pkg.title || '');
    setPkgTag(pkg.target_exam_tag || 'JEE Main');
    setPkgDescription(pkg.description || '');
    setPkgThumbnail(pkg.thumbnail_url || '');
    setDrillsCount(String(pkg.test_distribution?.chapter_drills || 0));
    setMocksCount(String(pkg.test_distribution?.full_mocks || 0));
    setLiveCount(String(pkg.test_distribution?.live_papers || 0));
    setIsPremium(pkg.price_ledger?.status === 'premium');
    setPkgPrice(String(pkg.price_ledger?.price || 499));
    setPkgOriginalPrice(String(pkg.price_ledger?.original_price || ''));
    setShowAddPackageModal(true);
  };

  const handleOpenCreatePackage = () => {
    setEditingPackage(null);
    setPkgTitle('');
    setPkgTag('JEE Main');
    setPkgDescription('');
    setPkgThumbnail('');
    setDrillsCount('0');
    setMocksCount('0');
    setLiveCount('0');
    setIsPremium(false);
    setPkgPrice('499');
    setPkgOriginalPrice('');
    setShowAddPackageModal(true);
  };

  // Create or Update package handler
  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!pkgTitle.trim()) return;

    setIsCreatingPackage(true);
    try {
      const payload = {
        title: pkgTitle.trim(),
        target_exam_tag: pkgTag.trim(),
        description: pkgDescription.trim() || 'Comprehensive NTA proctored CBT test series package.',
        thumbnail_url: pkgThumbnail.trim() || 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=800&q=80',
        test_distribution: {
          chapter_drills: parseInt(drillsCount) || 0,
          full_mocks: parseInt(mocksCount) || 0,
          live_papers: parseInt(liveCount) || 0
        },
        price_ledger: {
          status: isPremium ? 'premium' : 'free',
          price: isPremium ? (parseFloat(pkgPrice) || 0) : 0,
          original_price: isPremium ? (parseFloat(pkgOriginalPrice) || 0) : 0
        }
      };

      if (editingPackage) {
        const { data, error } = await supabase
          .from('test_packages')
          .update(payload)
          .eq('id', editingPackage.id)
          .select()
          .single();

        if (error) console.warn('[Package Update Warning]:', error.message);
        setPackages(prev => prev.map(p => p.id === editingPackage.id ? (data || { ...p, ...payload }) : p));
      } else {
        const { data, error } = await supabase
          .from('test_packages')
          .insert([{ ...payload, total_tests_count: 0 }])
          .select()
          .single();

        if (error) console.warn('[Package Insert Warning]:', error.message);
        setPackages(prev => [data || { id: `pkg-${Date.now()}`, ...payload, total_tests_count: 0, created_at: new Date().toISOString() }, ...prev]);
      }

      setPkgTitle('');
      setShowAddPackageModal(false);
      setEditingPackage(null);
    } catch (err) {
      console.error('Save error:', err.message);
    } finally {
      setIsCreatingPackage(false);
    }
  };

  // Delete package handler with In-Website ConfirmDialogModal
  const handleDeletePackage = (pkgId, pkgTitle) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Test Series Package',
      message: `Are you sure you want to permanently delete "${pkgTitle}"? All linked mock exam blueprints inside it will be removed.`,
      onConfirm: async () => {
        try {
          await supabase.from('test_packages').delete().eq('id', pkgId);
          setPackages(prev => prev.filter(p => p.id !== pkgId));
          if (selectedPackageId === pkgId) setSelectedPackageId(null);
        } catch (err) {
          console.error('Delete error:', err.message);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Delete Exam handler
  const handleDeleteExam = async (examId, examTitle, pkgId) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the exam blueprint "${examTitle}"? This cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('test_exams')
        .delete()
        .eq('id', examId);

      if (error) throw error;

      // Update local state
      setExams(prev => prev.filter(e => e.id !== examId));

      // Decrement test count in package
      const targetPkg = packages.find(p => p.id === pkgId);
      if (targetPkg) {
        const newCount = Math.max(0, (targetPkg.total_tests_count || 1) - 1);
        await supabase
          .from('test_packages')
          .update({ total_tests_count: newCount })
          .eq('id', pkgId);
        
        setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, total_tests_count: newCount } : p));
      }

      alert('Exam blueprint successfully deleted.');
    } catch (err) {
      alert('Failed to delete exam: ' + err.message);
    }
  };

  // Filtered exams for selected package
  const activeExams = (exams || []).filter(e => e.package_id === selectedPackageId);
  const selectedPackage = (packages || []).find(p => p.id === selectedPackageId);

  return (
    <div className="space-y-8  font-sans text-slate-800">
      
      {/* Action Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
            <Award className="w-5 h-5 text-indigo-600" />
            <span>Manage Test Packages & Mock Exams</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Author test packages, link compiled exam blueprints, and track CBT scorecards</p>
        </div>

        <div className="flex items-center gap-2 select-none">
          <button
            onClick={syncDashboardData}
            disabled={refreshing}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-2 select-none cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Blueprints</span>
          </button>

          <button
            onClick={handleOpenCreatePackage}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm border border-indigo-700 hover:scale-[1.01] active:scale-[0.99]"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>New Test Package</span>
          </button>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Col 1 & 2): Test Packages List & Selection Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Packages List */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Available Test Series Packages ({packages.length})</span>
            </h3>

            {packages.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No test packages established. Click "New Test Package" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages.map(pkg => {
                  const isSelected = selectedPackageId === pkg.id;
                  const distribution = pkg.test_distribution || {};
                  const priceInfo = pkg.price_ledger || {};
                  const isPremiumPkg = priceInfo.status === 'premium';

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`p-5 border rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer transition relative group hover:border-slate-350 ${
                        isSelected 
                          ? 'bg-indigo-50/10 border-indigo-300 shadow-sm' 
                          : 'bg-slate-50/50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 mb-4 border border-slate-200">
                          <img 
                            src={pkg.thumbnail_url || 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=800&q=80'} 
                            alt={pkg.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        </div>

                        <div className="flex justify-between items-start mt-2">
                          <span className="px-2 py-0.5 bg-slate-900 text-teal-400 text-[9px] font-black uppercase tracking-wider rounded-lg">
                            {pkg.target_exam_tag}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                            isPremiumPkg 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-250'
                          }`}>
                            {isPremiumPkg ? `₹${priceInfo.price}` : 'FREE'}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition truncate max-w-[240px]">
                          {pkg.title}
                        </h4>

                        <div className="grid grid-cols-3 gap-2 text-[9px] font-bold text-slate-500 uppercase">
                          <div className="bg-white/80 dark:bg-zinc-900 border border-slate-150 p-1.5 rounded-lg text-center">
                            <span>Drills</span>
                            <span className="block font-black text-slate-800 mt-0.5">{distribution.chapter_drills || 0}</span>
                          </div>
                          <div className="bg-white/80 dark:bg-zinc-900 border border-slate-150 p-1.5 rounded-lg text-center">
                            <span>Mocks</span>
                            <span className="block font-black text-slate-800 mt-0.5">{distribution.full_mocks || 0}</span>
                          </div>
                          <div className="bg-white/80 dark:bg-zinc-900 border border-slate-150 p-1.5 rounded-lg text-center">
                            <span>Tests</span>
                            <span className="block font-black text-slate-800 mt-0.5">{pkg.total_tests_count || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-150/60 pt-3 mt-3">
                        <span className="text-[9px] text-slate-400 font-bold" suppressHydrationWarning>
                          Created {formatDate(pkg.created_at)}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditPackage(pkg);
                            }}
                            className="p-1.5 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                            title="Edit Package Details"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePackage(pkg.id, pkg.title);
                            }}
                            className="p-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Delete Package"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition ${isSelected ? 'translate-x-1 text-indigo-600' : ''}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Exams list inside Selected Package */}
          {selectedPackageId && selectedPackage && (
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] text-indigo-600 font-black uppercase tracking-wider block">Package Console</span>
                  <h3 className="text-sm font-black text-slate-800 leading-snug">
                    Exams inside "{selectedPackage.title}"
                  </h3>
                </div>

                <button
                  onClick={() => router.push(`/admin/test-series/compiler?packageId=${selectedPackageId}`)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-indigo-600"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Compile New Exam</span>
                </button>
              </div>

              {activeExams.length === 0 ? (
                <div className="text-center text-slate-450 text-xs py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
                  <ClipboardCheck className="w-8 h-8 text-slate-350 mx-auto" />
                  <p className="font-semibold">No mock exams compiled under this package.</p>
                  <button
                    onClick={() => router.push(`/admin/test-series/compiler?packageId=${selectedPackageId}`)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase rounded-lg transition"
                  >
                    Launch Exam Compiler
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeExams.map(exam => {
                    const now = Date.now();
                    const start = exam.activation_timestamp ? new Date(exam.activation_timestamp).getTime() : null;
                    const isUpcoming = start && now < start;

                    return (
                      <div
                        key={exam.id}
                        className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-slate-800 truncate max-w-[260px] sm:max-w-[340px]">
                              {exam.title}
                            </h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                              isUpcoming
                                ? 'bg-amber-50 text-amber-700 border-amber-250'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-250'
                            }`}>
                              {isUpcoming ? 'Scheduled' : 'Live'}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-450 font-bold uppercase">
                            <span>Duration: {exam.duration_minutes}m</span>
                            <span>•</span>
                            <span>Questions: {exam.total_questions}</span>
                            <span>•</span>
                            <span>Live Board: {exam.is_live_ranking ? 'Yes' : 'No'}</span>
                          </div>

                          <span className="text-[9px] text-slate-400 font-bold block">
                            Opens: {new Date(exam.activation_timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 justify-end shrink-0 select-none">
                          <button
                            onClick={() => router.push(`/admin/test-series/monitor/${exam.id}`)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition shadow-sm border border-emerald-650 flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-white text-emerald-200" />
                            <span>Monitor</span>
                          </button>

                          <button
                            onClick={() => handleDeleteExam(exam.id, exam.title, selectedPackageId)}
                            className="p-2 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Delete Exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (Col 3): Recent Scorecard Submissions */}
        <div className="space-y-6 lg:col-span-1">
          
          <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span>Recent CBT Attempts</span>
            </h3>

            <div className="space-y-3">
              {attempts.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                  No mock test attempts registered yet.
                </div>
              ) : (
                attempts.map(att => {
                  const minutes = Math.floor(att.total_duration_seconds / 60);
                  const seconds = att.total_duration_seconds % 60;

                  return (
                    <div
                      key={att.id}
                      className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2 hover:border-slate-300 transition"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-805 truncate max-w-[140px]">
                          {att.profiles?.full_name || 'Anonymous Student'}
                        </span>
                        <span className="text-xs font-black text-indigo-700">
                          {att.score} pts
                        </span>
                      </div>

                      <p className="text-[10px] font-bold text-slate-500 truncate leading-none">
                        Exam: {att.test_exams?.title || 'Unknown Test'}
                      </p>

                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold border-t border-slate-150/60 pt-1.5 mt-1.5">
                        <span>Duration: {minutes}m {seconds}s</span>
                        <span suppressHydrationWarning>{formatDate(att.completed_at)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL: ADD TEST PACKAGE */}
      <AnimatePresence>
        {showAddPackageModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddPackageModal(false)}
              className="fixed inset-0 bg-slate-900 z-50 cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-0 m-auto max-w-lg h-fit bg-white z-50 shadow-2xl p-6 rounded-[2rem] border border-slate-200 flex flex-col gap-5 justify-between"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-sm uppercase text-slate-800 tracking-wider">
                    {editingPackage ? 'Edit Test Series Package' : 'New Test Series Package'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddPackageModal(false)}
                  className="p-1 rounded-full text-slate-405 hover:bg-slate-50 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePackage} className="flex flex-col max-h-[70vh] overflow-hidden">
                <div className="overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-4">
                  
                  {/* Section 1: Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider">1. Basic Details</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Package Title</label>
                      <input
                        type="text"
                        required
                        value={pkgTitle}
                        onChange={e => setPkgTitle(e.target.value)}
                        placeholder="JEE Main High-Yield Test Series 2026"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold placeholder-slate-400"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Competitive Tag</label>
                        <select
                          value={pkgTag}
                          onChange={e => setPkgTag(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
                        >
                          <option value="JEE Main">JEE Main</option>
                          <option value="JEE Advanced">JEE Advanced</option>
                          <option value="NEET">NEET Focus</option>
                          <option value="KVPY">KVPY / Olympiad</option>
                          <option value="Foundation">Foundation Drills</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Campus Branch</label>
                        <select
                          value={pkgBranch}
                          onChange={e => setPkgBranch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
                        >
                          <option value="Hyderabad Main Campus">Hyderabad Main Campus</option>
                          <option value="Vijayawada Center">Vijayawada Center</option>
                          <option value="Vizag Branch">Vizag Branch</option>
                          <option value="Bengaluru Hub">Bengaluru Hub</option>
                          <option value="Online Pan-India">Online Pan-India</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Visuals & Description */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider">2. Marketing Details</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Thumbnail URL</label>
                      <input
                        type="text"
                        value={pkgThumbnail}
                        onChange={e => setPkgThumbnail(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-mono"
                      />
                      {pkgThumbnail && (
                        <div className="mt-2 p-1 bg-slate-50 border border-slate-200 rounded-lg max-w-[150px]">
                          <img src={pkgThumbnail} alt="Preview" className="h-12 w-full object-cover rounded" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Description & Highlights</label>
                      <textarea
                        rows={2}
                        value={pkgDescription}
                        onChange={e => setPkgDescription(e.target.value)}
                        placeholder="Provide test series highlights..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold resize-none custom-scrollbar"
                      />
                    </div>
                  </div>

                  {/* Section 3: Contents & Pricing */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider">3. Commercials & Access</h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Chapter Drills</label>
                        <input
                          type="number"
                          value={drillsCount}
                          onChange={e => setDrillsCount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Full Mocks</label>
                        <input
                          type="number"
                          value={mocksCount}
                          onChange={e => setMocksCount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Live Papers</label>
                        <input
                          type="number"
                          value={liveCount}
                          onChange={e => setLiveCount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Pricing Ledger</span>
                        <label className="flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isPremium}
                            onChange={e => setIsPremium(e.target.checked)}
                            className="accent-indigo-600 h-4 w-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-indigo-700 ml-2">Premium Package</span>
                        </label>
                      </div>

                      {isPremium && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Selling Price (₹)</label>
                            <input
                              type="number"
                              required={isPremium}
                              value={pkgPrice}
                              onChange={e => setPkgPrice(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Original Price (₹)</label>
                            <input
                              type="number"
                              value={pkgOriginalPrice}
                              onChange={e => setPkgOriginalPrice(e.target.value)}
                              placeholder="e.g. 1999"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddPackageModal(false)}
                    className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingPackage}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isCreatingPackage && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingPackage ? 'Update Package' : 'Create Package'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* In-Website Confirmation Modal (Replacing Native Browser Alerts) */}
      <ConfirmDialogModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
