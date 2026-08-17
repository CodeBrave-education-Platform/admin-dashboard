'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialogModal from '@/components/ConfirmDialogModal';
import { 
  X, Layers, Users, FileText, Radio, ClipboardList, 
  Save, Trash2, ExternalLink, CheckCircle2, AlertCircle, 
  Loader2, Plus, Calendar, IndianRupee, Tag, Clock, 
  Search, UploadCloud, Eye, UserX, AlertTriangle, ShieldCheck
} from 'lucide-react';

export default function BatchEditorDrawer({
  batch,
  isOpen,
  onClose,
  onBatchUpdated,
  onBatchDeleted,
  onOpenRosterModal,
  onInspectStudent
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'students' | 'materials' | 'live' | 'exams'

  // Overview form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState('published');
  const [targetFocus, setTargetFocus] = useState('JEE');
  const [isSavingOverview, setIsSavingOverview] = useState(false);

  // Sub-resource lists
  const [students, setStudents] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [exams, setExams] = useState([]);
  const [availableAssessments, setAvailableAssessments] = useState([]);
  const [loadingSubresources, setLoadingSubresources] = useState(false);

  // Filter for students tab
  const [studentSearch, setStudentSearch] = useState('');

  // Material form fields
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialPath, setNewMaterialPath] = useState('');
  const [newMaterialIsPremium, setNewMaterialIsPremium] = useState(false);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  // Live session form fields
  const [newLiveTitle, setNewLiveTitle] = useState('');
  const [newLiveDate, setNewLiveDate] = useState('');
  const [newLiveStartTime, setNewLiveStartTime] = useState('');
  const [newLiveEndTime, setNewLiveEndTime] = useState('');
  const [newLiveRoomUrl, setNewLiveRoomUrl] = useState('');
  const [isAddingLive, setIsAddingLive] = useState(false);

  // Exam schedule form fields
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [startWindow, setStartWindow] = useState('');
  const [endWindow, setEndWindow] = useState('');
  const [isSchedulingExam, setIsSchedulingExam] = useState(false);

  // Confirmation dialog targets
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(false);
  const [deleteMaterialTarget, setDeleteMaterialTarget] = useState(null);
  const [deleteLiveTarget, setDeleteLiveTarget] = useState(null);
  const [unscheduleExamTarget, setUnscheduleExamTarget] = useState(null);
  const [unenrollStudentTarget, setUnenrollStudentTarget] = useState(null);

  // Fetch all subresources for the batch
  const fetchSubresources = useCallback(async (batchId) => {
    if (!batchId) return;
    setLoadingSubresources(true);
    try {
      // 1. Enrolled students
      const { data: enrollmentsData, error: enrollmentsErr } = await supabase
        .from('batch_enrollments')
        .select('*, profiles(*)')
        .eq('batch_id', batchId);

      if (!enrollmentsErr && Array.isArray(enrollmentsData)) {
        const studentProfiles = enrollmentsData
          .map(e => ({
            ...(e.profiles || {}),
            enrollment_id: e.id,
            enrollment_status: e.status,
            user_id: e.user_id
          }))
          .filter(Boolean);
        setStudents(studentProfiles);
      } else {
        // Resilient fallback if foreign key join is unavailable
        const { data: fallbackEnrollments } = await supabase
          .from('batch_enrollments')
          .select('*')
          .eq('batch_id', batchId);

        if (fallbackEnrollments && Array.isArray(fallbackEnrollments)) {
          const userIds = fallbackEnrollments.map(e => e.user_id).filter(Boolean);
          let profilesMap = {};
          if (userIds.length > 0) {
            const { data: profs } = await supabase.from('profiles').select('*').in('id', userIds);
            if (profs && Array.isArray(profs)) {
              profs.forEach(p => { profilesMap[p.id] = p; });
            }
          }
          const studentProfiles = fallbackEnrollments.map(e => ({
            ...(profilesMap[e.user_id] || {}),
            enrollment_id: e.id,
            enrollment_status: e.status,
            user_id: e.user_id
          }));
          setStudents(studentProfiles);
        } else {
          setStudents([]);
        }
      }

      // 2. Materials
      const { data: materialsData } = await supabase
        .from('course_files')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });
      setMaterials(materialsData || []);

      // 3. Live sessions
      const { data: liveData } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('batch_id', batchId)
        .order('scheduled_start', { ascending: true });
      setLiveSessions(liveData || []);

      // 4. Exams
      const { data: examsData } = await supabase
        .from('assessments')
        .select('*')
        .eq('batch_id', batchId)
        .order('start_window', { ascending: true });
      setExams(examsData || []);

      // 5. Available assessments for linking
      const { data: allAssessments } = await supabase
        .from('assessments')
        .select('id, title, duration_minutes, type')
        .order('title', { ascending: true });
      setAvailableAssessments(allAssessments || []);
    } catch (err) {
      console.error('[Fetch Batch Subresources Error]:', err.message);
    } finally {
      setLoadingSubresources(false);
    }
  }, [supabase]);

  // Sync batch props to state
  useEffect(() => {
    if (batch) {
      setTitle(batch.title || '');
      setDescription(batch.description || '');
      setPrice(batch.price !== undefined && batch.price !== null ? String(batch.price) : '0');
      setStartDate(batch.start_date ? new Date(batch.start_date).toISOString().split('T')[0] : '');
      setStatus(batch.status || 'published');
      setTargetFocus(batch.target_focus || 'JEE');

      fetchSubresources(batch.id);
    }
  }, [batch, fetchSubresources]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // --- Handlers: Overview Tab ---
  const handleSaveOverview = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Batch title is required', 'error');
      return;
    }

    setIsSavingOverview(true);
    try {
      const updates = {
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        price: parseFloat(price) || 0,
        status: status,
        target_focus: targetFocus
      };

      const { data, error } = await supabase
        .from('batches')
        .update(updates)
        .eq('id', batch.id)
        .select()
        .single();

      if (error) throw error;

      showToast('Batch overview updated successfully', 'success');
      await invalidateCache('batch', null, batch.id);

      if (onBatchUpdated) {
        onBatchUpdated({
          ...data,
          students_count: students.length,
          materials_count: materials.length,
          live_sessions_count: liveSessions.length,
          exams_count: exams.length
        });
      }
    } catch (err) {
      console.error('[Update Batch Overview Error]:', err.message);
      showToast('Failed to save batch overview: ' + err.message, 'error');
    } finally {
      setIsSavingOverview(false);
    }
  };

  const handleConfirmDeleteBatch = async () => {
    if (!batch) return;
    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batch.id);

      if (error) throw error;

      showToast(`Cohort batch "${batch.title}" permanently deleted`, 'success');
      await invalidateCache('batch', null, batch.id);

      if (onBatchDeleted) {
        onBatchDeleted(batch.id);
      }
      onClose();
    } catch (err) {
      console.error('[Delete Batch Error]:', err.message);
      showToast('Failed to delete batch: ' + err.message, 'error');
    } finally {
      setConfirmDeleteBatch(false);
    }
  };

  // --- Handlers: Students Tab ---
  const handleConfirmUnenroll = async () => {
    if (!unenrollStudentTarget || !batch) return;
    try {
      const { error } = await supabase
        .from('batch_enrollments')
        .delete()
        .eq('batch_id', batch.id)
        .eq('user_id', unenrollStudentTarget.user_id || unenrollStudentTarget.id);

      if (error) throw error;

      setStudents(prev => prev.filter(s => (s.user_id || s.id) !== (unenrollStudentTarget.user_id || unenrollStudentTarget.id)));
      showToast(`Student ${unenrollStudentTarget.full_name || 'enrollee'} removed from cohort`, 'success');
      await invalidateCache('batch', null, batch.id);

      if (onBatchUpdated) {
        onBatchUpdated({
          ...batch,
          students_count: Math.max(0, students.length - 1)
        });
      }
    } catch (err) {
      console.error('[Unenroll Error]:', err.message);
      showToast('Failed to unenroll student: ' + err.message, 'error');
    } finally {
      setUnenrollStudentTarget(null);
    }
  };

  // --- Handlers: Materials Tab ---
  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterialName.trim() || !newMaterialPath.trim()) {
      showToast('Material name and resource path/URL are required', 'error');
      return;
    }

    setIsAddingMaterial(true);
    try {
      const { data, error } = await supabase
        .from('course_files')
        .insert([{
          file_name: newMaterialName.trim(),
          file_path: newMaterialPath.trim(),
          is_premium: newMaterialIsPremium,
          batch_id: batch.id
        }])
        .select()
        .single();

      if (error) throw error;

      setMaterials(prev => [data, ...prev]);
      setNewMaterialName('');
      setNewMaterialPath('');
      setNewMaterialIsPremium(false);

      showToast('Worksheet material linked to batch successfully', 'success');
      await invalidateCache('batch', null, batch.id);

      if (onBatchUpdated) {
        onBatchUpdated({
          ...batch,
          materials_count: materials.length + 1
        });
      }
    } catch (err) {
      console.error('[Add Material Error]:', err.message);
      showToast('Failed to add material: ' + err.message, 'error');
    } finally {
      setIsAddingMaterial(false);
    }
  };

  const handleConfirmDeleteMaterial = async () => {
    if (!deleteMaterialTarget) return;
    try {
      const { error } = await supabase
        .from('course_files')
        .delete()
        .eq('id', deleteMaterialTarget.id);

      if (error) throw error;

      setMaterials(prev => prev.filter(m => m.id !== deleteMaterialTarget.id));
      showToast('Material removed from vault', 'success');
      await invalidateCache('batch', null, batch.id);

      if (onBatchUpdated) {
        onBatchUpdated({
          ...batch,
          materials_count: Math.max(0, materials.length - 1)
        });
      }
    } catch (err) {
      showToast('Failed to delete material: ' + err.message, 'error');
    } finally {
      setDeleteMaterialTarget(null);
    }
  };

  // --- Handlers: Live Sessions Tab ---
  const handleAddLiveSession = async (e) => {
    e.preventDefault();
    if (!newLiveTitle.trim() || !newLiveDate || !newLiveStartTime || !newLiveEndTime || !newLiveRoomUrl.trim()) {
      showToast('Please fill out all live class parameters', 'error');
      return;
    }

    setIsAddingLive(true);
    try {
      const startStr = `${newLiveDate}T${newLiveStartTime}:00`;
      const startDt = new Date(startStr);
      const endStr = `${newLiveDate}T${newLiveEndTime}:00`;
      const endDt = new Date(endStr);
      const diffMinutes = Math.round((endDt.getTime() - startDt.getTime()) / (60 * 1000));

      if (diffMinutes <= 0) {
        showToast('End time must be after start time', 'error');
        setIsAddingLive(false);
        return;
      }

      const { data, error } = await supabase
        .from('live_sessions')
        .insert([{
          title: newLiveTitle.trim(),
          meeting_url: newLiveRoomUrl.trim(),
          scheduled_start: startDt.toISOString(),
          duration_minutes: diffMinutes,
          status: 'upcoming',
          batch_id: batch.id
        }])
        .select()
        .single();

      if (error) throw error;

      setLiveSessions(prev => [...prev, data].sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start)));
      setNewLiveTitle('');
      setNewLiveDate('');
      setNewLiveStartTime('');
      setNewLiveEndTime('');
      setNewLiveRoomUrl('');

      showToast('Live classroom session scheduled!', 'success');
      await invalidateCache('batch', null, batch.id);

      if (onBatchUpdated) {
        onBatchUpdated({
          ...batch,
          live_sessions_count: liveSessions.length + 1
        });
      }
    } catch (err) {
      console.error('[Add Live Session Error]:', err.message);
      showToast('Failed to schedule session: ' + err.message, 'error');
    } finally {
      setIsAddingLive(false);
    }
  };

  const handleConfirmDeleteLive = async () => {
    if (!deleteLiveTarget) return;
    try {
      const { error } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', deleteLiveTarget.id);

      if (error) throw error;

      setLiveSessions(prev => prev.filter(l => l.id !== deleteLiveTarget.id));
      showToast('Live session cancelled and removed', 'success');
      await invalidateCache('batch', null, batch.id);

      if (onBatchUpdated) {
        onBatchUpdated({
          ...batch,
          live_sessions_count: Math.max(0, liveSessions.length - 1)
        });
      }
    } catch (err) {
      showToast('Failed to delete live session: ' + err.message, 'error');
    } finally {
      setDeleteLiveTarget(null);
    }
  };

  // --- Handlers: Exams Tab ---
  const handleScheduleExam = async (e) => {
    e.preventDefault();
    if (!selectedAssessmentId || !startWindow || !endWindow) {
      showToast('Assessment and start/end active windows are required', 'error');
      return;
    }

    const startDt = new Date(startWindow);
    const endDt = new Date(endWindow);
    if (endDt.getTime() <= startDt.getTime()) {
      showToast('End active window must be after start window', 'error');
      return;
    }

    setIsSchedulingExam(true);
    try {
      const { data, error } = await supabase
        .from('assessments')
        .update({
          batch_id: batch.id,
          start_window: startDt.toISOString(),
          end_window: endDt.toISOString()
        })
        .eq('id', selectedAssessmentId)
        .select()
        .single();

      if (error) throw error;

      setExams(prev => {
        const index = prev.findIndex(x => x.id === data.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [data, ...prev];
      });

      setSelectedAssessmentId('');
      setStartWindow('');
      setEndWindow('');

      showToast('Assessment scheduled to cohort batch!', 'success');
      await invalidateCache('batch', null, batch.id);

      if (onBatchUpdated) {
        onBatchUpdated({
          ...batch,
          exams_count: exams.length + 1
        });
      }
    } catch (err) {
      console.error('[Schedule Exam Error]:', err.message);
      showToast('Failed to schedule exam: ' + err.message, 'error');
    } finally {
      setIsSchedulingExam(false);
    }
  };

  const handleConfirmUnscheduleExam = async () => {
    if (!unscheduleExamTarget) return;
    try {
      const { error } = await supabase
        .from('assessments')
        .update({
          batch_id: null,
          start_window: null,
          end_window: null
        })
        .eq('id', unscheduleExamTarget.id);

      if (error) throw error;

      setExams(prev => prev.filter(x => x.id !== unscheduleExamTarget.id));
      showToast('Assessment unscheduled from this batch', 'success');
      await invalidateCache('batch', null, batch.id);

      if (onBatchUpdated) {
        onBatchUpdated({
          ...batch,
          exams_count: Math.max(0, exams.length - 1)
        });
      }
    } catch (err) {
      showToast('Failed to unschedule exam: ' + err.message, 'error');
    } finally {
      setUnscheduleExamTarget(null);
    }
  };

  if (!isOpen || !batch) return null;

  // Filter students by search term
  const filteredStudents = students.filter(s => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.target_focus || '').toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer transition-opacity"
        />

        {/* Slide-out Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-3xl lg:max-w-4xl bg-white shadow-2xl z-10 flex flex-col h-full overflow-hidden text-slate-800"
        >
          {/* Top Sticky Header */}
          <div className="px-6 py-4.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900 truncate">
                    {batch.title}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border tracking-wider shrink-0 ${
                    status === 'published'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                  ID: <span className="font-mono">{batch.id}</span> • Stream: <span className="font-bold text-slate-600">{targetFocus}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition cursor-pointer shrink-0"
              title="Close Drawer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation Ribbon */}
          <div className="px-6 border-b border-slate-200 bg-slate-50/70 flex items-center gap-1.5 overflow-x-auto shrink-0 py-2.5">
            {[
              { id: 'overview', label: 'Overview', icon: Layers },
              { id: 'students', label: 'Students Roster', icon: Users, count: students.length },
              { id: 'materials', label: 'Material Vault', icon: FileText, count: materials.length },
              { id: 'live', label: 'Live Classes', icon: Radio, count: liveSessions.length },
              { id: 'exams', label: 'Exam Scheduler', icon: ClipboardList, count: exams.length }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-2xs border border-slate-200/80 font-black'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                      isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200/70 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Drawer Body Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <form onSubmit={handleSaveOverview} className="space-y-5">
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Cohort Parameters & Identity</span>
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Cohort Batch Title
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Target Track
                        </label>
                        <select
                          value={targetFocus}
                          onChange={e => setTargetFocus(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer"
                        >
                          <option value="JEE">JEE (Mains & Advanced)</option>
                          <option value="NEET">NEET Medical</option>
                          <option value="Foundation">Foundation</option>
                          <option value="General">General</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Pricing (INR)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3.5 py-2.5 text-xs text-slate-900 font-bold font-mono outline-none focus:border-indigo-500 focus:bg-white transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Cohort Status
                        </label>
                        <select
                          value={status}
                          onChange={e => setStatus(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer"
                        >
                          <option value="published">Published / Active</option>
                          <option value="draft">Draft / Hidden</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Launch Commencement Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Cohort Description & Roadmap
                      </label>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition h-24 resize-none"
                        placeholder="Detail target audience, study prerequisites, and class scheduling guidelines..."
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingOverview}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {isSavingOverview ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Overview</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Danger Zone */}
                <div className="bg-rose-50/50 border border-rose-200/80 rounded-3xl p-5 sm:p-6 space-y-3">
                  <div className="flex items-center gap-2.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <h4 className="text-xs font-black uppercase tracking-wider">Danger Zone: Cohort Deletion</h4>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Permanently deleting this batch will revoke all associated student enrollments, worksheets, live class schedules, and CBT exam assignments.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteBatch(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Cohort Batch</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: STUDENTS ROSTER */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                {/* Control bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Search enrolled candidates..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenRosterModal && onOpenRosterModal(batch.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Import Roster (PDF/Word)</span>
                  </button>
                </div>

                {loadingSubresources ? (
                  <div className="py-12 text-center space-y-2">
                    <Loader2 className="w-8 h-8 mx-auto text-indigo-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-500">Loading student roster...</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-16 text-center space-y-3 bg-white border border-slate-200 rounded-3xl p-8">
                    <Users className="w-10 h-10 text-slate-300 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-800">No Students Enrolled</h4>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        {studentSearch ? 'No candidates match your search query.' : 'Upload a roster file or wait for student portal registrations.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenRosterModal && onOpenRosterModal(batch.id)}
                      className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-black transition inline-flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Import Roster</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredStudents.map(student => {
                      const isNeet = (student.target_focus || student.academic_batch || '').toUpperCase().includes('NEET');
                      const initials = (student.full_name || 'ST').substring(0, 2).toUpperCase();

                      return (
                        <div
                          key={student.id || student.user_id}
                          onClick={() => onInspectStudent && onInspectStudent(student)}
                          className="bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-2xl transition shadow-2xs hover:shadow-sm cursor-pointer group flex items-start justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs uppercase shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-slate-900 truncate group-hover:text-indigo-600 transition">
                                {student.full_name || 'Anonymous Student'}
                              </h5>
                              <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                                {student.email}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                                  isNeet
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  {isNeet ? 'NEET' : 'JEE'}
                                </span>
                                {student.daily_study_hours && (
                                  <span className="text-[9px] text-slate-500 font-bold">
                                    {student.daily_study_hours}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUnenrollStudentTarget(student);
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0"
                            title="Unenroll Student"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MATERIAL VAULT */}
            {activeTab === 'materials' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Materials List */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                      Worksheets & PDFs ({materials.length})
                    </h4>
                  </div>

                  {materials.length === 0 ? (
                    <div className="py-12 text-center space-y-2 bg-white border border-slate-200 rounded-3xl p-6">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-500">No materials attached yet</p>
                      <p className="text-[10px] text-slate-400">Use the form on the right to upload reference documents.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {materials.map(mat => (
                        <div
                          key={mat.id}
                          className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-teal-50 border border-teal-100 text-teal-700 rounded-xl shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">{mat.file_name}</p>
                              <a
                                href={mat.file_path}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-indigo-600 hover:underline font-mono truncate block mt-0.5"
                              >
                                {mat.file_path}
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {mat.is_premium && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-black uppercase">
                                Premium
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteMaterialTarget(mat)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              title="Delete Material"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Material Form */}
                <div className="lg:col-span-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-teal-600" />
                      <span>Add Resource File</span>
                    </h4>

                    <form onSubmit={handleAddMaterial} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Document Title
                        </label>
                        <input
                          type="text"
                          required
                          value={newMaterialName}
                          onChange={e => setNewMaterialName(e.target.value)}
                          placeholder="e.g. Thermodynamics Formula Vault.pdf"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-teal-500 transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Storage Path / URL
                        </label>
                        <input
                          type="text"
                          required
                          value={newMaterialPath}
                          onChange={e => setNewMaterialPath(e.target.value)}
                          placeholder="https://storage.supabase.co/..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold font-mono outline-none focus:border-teal-500 transition"
                        />
                      </div>

                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={newMaterialIsPremium}
                          onChange={e => setNewMaterialIsPremium(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span>Requires Premium Tier Access</span>
                      </label>

                      <button
                        type="submit"
                        disabled={isAddingMaterial}
                        className="w-full mt-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        {isAddingMaterial ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Linking Material...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Link Material</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: LIVE CLASS COORDINATOR */}
            {activeTab === 'live' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Live Sessions List */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                      Broadcast Classrooms ({liveSessions.length})
                    </h4>
                  </div>

                  {liveSessions.length === 0 ? (
                    <div className="py-12 text-center space-y-2 bg-white border border-slate-200 rounded-3xl p-6">
                      <Radio className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-500">No live sessions scheduled</p>
                      <p className="text-[10px] text-slate-400">Schedule Google Meet or Zoom classes on the right.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {liveSessions.map(session => {
                        const dt = new Date(session.scheduled_start);
                        const isPast = Date.now() > dt.getTime() + (session.duration_minutes || 60) * 60000;

                        return (
                          <div
                            key={session.id}
                            className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl shrink-0">
                                <Radio className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">{session.title}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span className="font-bold">{dt.toLocaleDateString()} at {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span>•</span>
                                  <span className="font-mono">{session.duration_minutes} Mins</span>
                                </div>
                                <a
                                  href={session.meeting_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-indigo-600 hover:underline font-bold flex items-center gap-1 mt-1 inline-flex"
                                >
                                  <span>Launch Room Link</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                isPast
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {isPast ? 'Completed' : 'Upcoming'}
                              </span>

                              <button
                                type="button"
                                onClick={() => setDeleteLiveTarget(session)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                title="Delete Live Session"
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

                {/* Schedule Live Session Form */}
                <div className="lg:col-span-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-rose-600" />
                      <span>Schedule Live Class</span>
                    </h4>

                    <form onSubmit={handleAddLiveSession} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Session Title
                        </label>
                        <input
                          type="text"
                          required
                          value={newLiveTitle}
                          onChange={e => setNewLiveTitle(e.target.value)}
                          placeholder="e.g. Rotational Dynamics Doubt Solving"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-rose-500 transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Date
                        </label>
                        <input
                          type="date"
                          required
                          value={newLiveDate}
                          onChange={e => setNewLiveDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-rose-500 transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                            Start Time
                          </label>
                          <input
                            type="time"
                            required
                            value={newLiveStartTime}
                            onChange={e => setNewLiveStartTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:border-rose-500 transition"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                            End Time
                          </label>
                          <input
                            type="time"
                            required
                            value={newLiveEndTime}
                            onChange={e => setNewLiveEndTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:border-rose-500 transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Meeting Room URL (Meet/Zoom)
                        </label>
                        <input
                          type="url"
                          required
                          value={newLiveRoomUrl}
                          onChange={e => setNewLiveRoomUrl(e.target.value)}
                          placeholder="https://meet.google.com/xyz-abc"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold font-mono outline-none focus:border-rose-500 transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isAddingLive}
                        className="w-full mt-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        {isAddingLive ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Scheduling...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Schedule Live Class</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: EXAM SCHEDULER */}
            {activeTab === 'exams' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Exams List */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                      Assigned Assessments ({exams.length})
                    </h4>
                  </div>

                  {exams.length === 0 ? (
                    <div className="py-12 text-center space-y-2 bg-white border border-slate-200 rounded-3xl p-6">
                      <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-500">No assessments scheduled</p>
                      <p className="text-[10px] text-slate-400">Link CBT exams and configure test windows on the right.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {exams.map(exam => {
                        const now = Date.now();
                        const start = exam.start_window ? new Date(exam.start_window).getTime() : 0;
                        const end = exam.end_window ? new Date(exam.end_window).getTime() : Infinity;

                        let statusLabel = 'Upcoming';
                        let statusBadge = 'bg-sky-50 text-sky-700 border-sky-200';

                        if (now >= start && now <= end) {
                          statusLabel = 'Active / Open';
                          statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse';
                        } else if (now > end) {
                          statusLabel = 'Expired';
                          statusBadge = 'bg-slate-100 text-slate-500 border-slate-200';
                        }

                        return (
                          <div
                            key={exam.id}
                            className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl shrink-0">
                                <ClipboardList className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">{exam.title}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span className="font-mono">{exam.duration_minutes || 180} Mins</span>
                                  <span>•</span>
                                  <span className="uppercase font-bold">{exam.type || 'JEE Mock'}</span>
                                </div>
                                {exam.start_window && exam.end_window && (
                                  <p className="text-[9px] text-slate-400 mt-1 font-mono">
                                    Window: {new Date(exam.start_window).toLocaleDateString()} {new Date(exam.start_window).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(exam.end_window).toLocaleDateString()} {new Date(exam.end_window).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${statusBadge}`}>
                                {statusLabel}
                              </span>

                              <button
                                type="button"
                                onClick={() => setUnscheduleExamTarget(exam)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                title="Unschedule Exam"
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

                {/* Schedule Assessment Form */}
                <div className="lg:col-span-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Schedule Assessment</span>
                    </h4>

                    <form onSubmit={handleScheduleExam} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Select Assessment Blueprint
                        </label>
                        <select
                          required
                          value={selectedAssessmentId}
                          onChange={e => setSelectedAssessmentId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-amber-500 transition cursor-pointer"
                        >
                          <option value="">-- Choose Exam --</option>
                          {availableAssessments.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.title} ({a.duration_minutes}m)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Start Window (Date & Time)
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={startWindow}
                          onChange={e => setStartWindow(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-amber-500 transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          End Window (Date & Time)
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={endWindow}
                          onChange={e => setEndWindow(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-amber-500 transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSchedulingExam}
                        className="w-full mt-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        {isSchedulingExam ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Scheduling Exam...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Schedule to Batch</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Safe Deletion Confirm Dialogs */}
        <ConfirmDialogModal
          isOpen={confirmDeleteBatch}
          title="Delete Cohort Batch"
          message={`Are you sure you want to permanently delete "${batch.title}" and remove all associated student records?`}
          confirmLabel="Delete Batch"
          type="danger"
          onConfirm={handleConfirmDeleteBatch}
          onCancel={() => setConfirmDeleteBatch(false)}
        />

        <ConfirmDialogModal
          isOpen={!!unenrollStudentTarget}
          title="Unenroll Student"
          message={`Are you sure you want to remove "${unenrollStudentTarget?.full_name || 'this student'}" from this batch?`}
          confirmLabel="Unenroll"
          type="danger"
          onConfirm={handleConfirmUnenroll}
          onCancel={() => setUnenrollStudentTarget(null)}
        />

        <ConfirmDialogModal
          isOpen={!!deleteMaterialTarget}
          title="Remove Vault Material"
          message={`Are you sure you want to remove "${deleteMaterialTarget?.file_name || 'this document'}" from the batch materials vault?`}
          confirmLabel="Remove"
          type="danger"
          onConfirm={handleConfirmDeleteMaterial}
          onCancel={() => setDeleteMaterialTarget(null)}
        />

        <ConfirmDialogModal
          isOpen={!!deleteLiveTarget}
          title="Cancel Live Session"
          message={`Are you sure you want to cancel and delete the live session "${deleteLiveTarget?.title || 'this session'}"?`}
          confirmLabel="Cancel Session"
          type="danger"
          onConfirm={handleConfirmDeleteLive}
          onCancel={() => setDeleteLiveTarget(null)}
        />

        <ConfirmDialogModal
          isOpen={!!unscheduleExamTarget}
          title="Unschedule Assessment"
          message={`Are you sure you want to unschedule "${unscheduleExamTarget?.title || 'this exam'}" from this batch?`}
          confirmLabel="Unschedule"
          type="warning"
          onConfirm={handleConfirmUnscheduleExam}
          onCancel={() => setUnscheduleExamTarget(null)}
        />
      </div>
    </AnimatePresence>
  );
}
