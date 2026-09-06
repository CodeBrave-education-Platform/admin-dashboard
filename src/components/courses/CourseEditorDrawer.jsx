'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import { 
  X, BookOpen, Layers, FileText, ClipboardList, 
  Video, MessageSquare, Save, Trash2, ExternalLink, 
  CheckCircle2, AlertCircle, Loader2, Sparkles, Plus, 
  Calendar, IndianRupee, Tag, Image as ImageIcon, Eye, Clock, Radio, Check
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import SyllabusTreeEditor from './SyllabusTreeEditor';
import CourseFilesManager from './CourseFilesManager';
import CourseExamCompilerTab from '@/components/courses/CourseExamCompilerTab';
import AutonomousCompileModal from '@/components/test-series/AutonomousCompileModal';

export default function CourseEditorDrawer({
  isOpen,
  course,
  onClose,
  onCourseUpdated,
  onCourseDeleted,
  onImportSyllabusRequested
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'syllabus' | 'files' | 'exams' | 'live_doubts'
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  // Sub-resource data states
  const [lessons, setLessons] = useState([]);
  const [files, setFiles] = useState([]);
  const [exams, setExams] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [availableDocs, setAvailableDocs] = useState([]);
  const [selectedDocIdToCompile, setSelectedDocIdToCompile] = useState('');
  const [compileDocTarget, setCompileDocTarget] = useState(null);
  const [loadingSubresources, setLoadingSubresources] = useState(false);

  // Overview form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [originalPrice, setOriginalPrice] = useState('');
  const [level, setLevel] = useState('foundation');
  const [subject, setSubject] = useState('General');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [badge, setBadge] = useState('');
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');

  // Exam addition form
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDuration, setNewExamDuration] = useState('180');
  const [newExamType, setNewExamType] = useState('jee_mock');
  const [isAddingExam, setIsAddingExam] = useState(false);

  // Live session addition form
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionUrl, setNewSessionUrl] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('');
  const [isAddingSession, setIsAddingSession] = useState(false);

  const [editingExam, setEditingExam] = useState(null);

  // Fetch instructors
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('role', ['teacher', 'instructor', 'admin', 'superadmin'])
          .order('full_name');
        if (data) setInstructors(data);
      } catch (err) {
        console.warn('[CourseEditorDrawer] Fetch instructors error:', err?.message);
      }
    };
    if (isOpen) {
      fetchInstructors();
    }
  }, [isOpen]);

  // Use Effect: Load Subresources when course changes
  useEffect(() => {
    if (!isOpen || !course?.id) return;

    setTitle(course.title || '');
    setSlug(course.slug || '');
    setDescription(course.description || '');
    setPrice(course.price !== undefined && course.price !== null ? String(course.price) : '0');
    setOriginalPrice(course.original_price ? String(course.original_price) : '');
    setLevel(course.level || 'foundation');
    setSubject(course.subject || 'General');
    setStartDate(course.start_date || '');
    setEndDate(course.end_date || '');
    setThumbnailUrl(course.thumbnail_url || '');
    setBadge(course.badge || '');
    setSelectedInstructorId(course.instructor_id || '');

    setActiveTab('overview');
    setEditingExam(null);

    fetchSubresources(course.id);
  }, [course, isOpen]);

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

  const fetchSubresources = async (courseId) => {
    if (!courseId) return;
    setLoadingSubresources(true);
    try {
      // 1. Lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      setLessons(lessonsData || []);

      // 2. Files
      const { data: filesData } = await supabase
        .from('course_files')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      setFiles(filesData || []);

      // 3. Exams
      const { data: examsData } = await supabase
        .from('assessments')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      setExams(examsData || []);

      // 4. Live Sessions
      const { data: liveData } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('course_id', courseId)
        .order('scheduled_start', { ascending: false });
      setLiveSessions(liveData || []);

      // 5. Doubts
      const lessonIds = (lessonsData || []).map(l => l.id);
      if (lessonIds.length > 0) {
        const { data: doubtsData } = await supabase
          .from('lesson_doubts')
          .select('*')
          .in('lesson_id', lessonIds)
          .order('created_at', { ascending: false });
        setDoubts(doubtsData || []);
      } else {
        setDoubts([]);
      }

      // 6. Available Question Paper PDFs for 1-click autonomous compile
      try {
        const docsRes = await fetch('/api/admin/test-series/documents');
        const docsJson = await docsRes.json();
        if (Array.isArray(docsJson.documents)) {
          setAvailableDocs(docsJson.documents);
          if (docsJson.documents.length > 0) {
            setSelectedDocIdToCompile(docsJson.documents[0].id);
          }
        }
      } catch (dErr) {
        console.warn('[CourseEditorDrawer] Error fetching PDF documents:', dErr);
      }
    } catch (err) {
      console.error('[Fetch Subresources Error]:', err.message);
    } finally {
      setLoadingSubresources(false);
    }
  };

  const handleSaveOverview = async (e) => {
    e.preventDefault();
    if (!course?.id) return;
    if (!title.trim()) {
      showToast('Course title is required', 'error');
      return;
    }

    setIsSavingOverview(true);
    try {
      const chosenInstructor = instructors.find(i => i.id === selectedInstructorId);
      const updates = {
        title: title.trim(),
        description: description.trim() || null,
        price: parseFloat(price) || 0,
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        level: level || 'foundation',
        subject: subject || 'General',
        start_date: startDate || null,
        end_date: endDate || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        badge: badge.trim() || null,
        instructor_id: selectedInstructorId || null,
        instructor_name: chosenInstructor ? (chosenInstructor.full_name || chosenInstructor.email) : null,
        instructor_role: chosenInstructor ? (chosenInstructor.role === 'teacher' ? 'Faculty Lead' : 'Senior Instructor') : null
      };

      const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', course.id)
        .select()
        .single();

      if (error) throw error;

      showToast('Course blueprint updated successfully', 'success');

      // Purge Redis caches
      await invalidateCache('catalog', course.id);
      await invalidateCache('course', course.id);

      if (onCourseUpdated) {
        onCourseUpdated(data);
      }
    } catch (err) {
      console.error('[Save Course Error]:', err.message);
      showToast('Failed to update course: ' + err.message, 'error');
    } finally {
      setIsSavingOverview(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!course?.id) return;
    if (!confirm(`Are you sure you want to permanently delete "${course.title}" and all related lessons, worksheets, and exams?`)) return;

    setIsDeletingCourse(true);
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', course.id);

      if (error) throw error;

      showToast('Course successfully deleted', 'success');

      await invalidateCache('catalog', course.id);
      await invalidateCache('course', course.id);

      if (onCourseDeleted) {
        onCourseDeleted(course.id);
      }
      onClose();
    } catch (err) {
      console.error('[Delete Course Error]:', err.message);
      showToast('Failed to delete course: ' + err.message, 'error');
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const handleAddExam = async (e) => {
    e.preventDefault();
    if (!course?.id || !newExamTitle.trim()) return;

    setIsAddingExam(true);
    try {
      const payload = {
        course_id: course.id,
        title: newExamTitle.trim(),
        duration_minutes: parseInt(newExamDuration) || 180,
        type: newExamType
      };

      const { data, error } = await supabase
        .from('assessments')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      showToast('CBT Assessment registered', 'success');
      setExams(prev => [data, ...prev]);
      setNewExamTitle('');
      setNewExamDuration('180');
    } catch (err) {
      console.error('[Add Exam Error]:', err.message);
      showToast('Failed to add exam: ' + err.message, 'error');
    } finally {
      setIsAddingExam(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!confirm('Are you sure you want to remove this assessment?')) return;
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', examId);
      if (error) throw error;
      setExams(prev => prev.filter(x => x.id !== examId));
      showToast('Assessment deleted', 'success');
    } catch (err) {
      showToast('Failed to delete exam: ' + err.message, 'error');
    }
  };

  const handleAddLiveSession = async (e) => {
    e.preventDefault();
    if (!course?.id || !newSessionTitle.trim()) return;

    setIsAddingSession(true);
    try {
      const payload = {
        course_id: course.id,
        title: newSessionTitle.trim(),
        meeting_url: newSessionUrl.trim() || null,
        scheduled_start: newSessionTime || new Date().toISOString(),
        duration_minutes: 90,
        status: 'scheduled'
      };

      const { data, error } = await supabase
        .from('live_sessions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      showToast('Live session scheduled', 'success');
      setLiveSessions(prev => [data, ...prev]);
      setNewSessionTitle('');
      setNewSessionUrl('');
      setNewSessionTime('');
    } catch (err) {
      console.error('[Add Live Session Error]:', err.message);
      showToast('Failed to schedule session: ' + err.message, 'error');
    } finally {
      setIsAddingSession(false);
    }
  };

  const handleToggleDoubtResolved = async (doubtId, currentResolved) => {
    try {
      const { error } = await supabase
        .from('lesson_doubts')
        .update({ resolved: !currentResolved })
        .eq('id', doubtId);
      if (error) throw error;
      setDoubts(prev => prev.map(d => d.id === doubtId ? { ...d, resolved: !currentResolved } : d));
      showToast('Doubt status updated', 'success');
    } catch (err) {
      showToast('Failed to update doubt: ' + err.message, 'error');
    }
  };

  if (!isOpen || !course) return null;

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
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 truncate">
                  {course.title}
                </h2>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${
                  level === 'foundation' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                  level === 'mains' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {level}
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  ₹{course.price || 0}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                ID: <span className="font-mono">{course.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDeleteCourse}
              disabled={isDeletingCourse}
              className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 hover:text-rose-700 transition cursor-pointer border border-transparent hover:border-rose-100"
              title="Delete Course"
            >
              {isDeletingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
            { id: 'overview', label: 'Overview & Details', icon: BookOpen },
            { id: 'syllabus', label: `Curriculum (${lessons.length})`, icon: Layers },
            { id: 'files', label: `Worksheets (${files.length})`, icon: FileText },
            { id: 'exams', label: `Exams & CBT (${exams.length})`, icon: ClipboardList },
            { id: 'compiler', label: editingExam ? 'Edit Assessment' : 'Exam Compiler', icon: Layers },
            { id: 'live_doubts', label: `Live & Doubts (${liveSessions.length + doubts.length})`, icon: Video }
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

        {/* Tab Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <form onSubmit={handleSaveOverview} className="space-y-6 max-w-2xl">
              {/* Title & Slug */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  Course Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white"
                />
                {slug && (
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Slug: /courses/{slug}
                  </p>
                )}
              </div>

              {/* Level & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Audience Level
                  </label>
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    <option value="foundation">JEE Foundation</option>
                    <option value="mains">JEE Mains Capsule</option>
                    <option value="advanced">JEE Advanced Rigorous</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Primary Subject
                  </label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    <option value="General">General / Comprehensive</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                  </select>
                </div>
              </div>

              {/* Assigned Faculty Instructor */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  Assigned Faculty / Instructor
                </label>
                <select
                  value={selectedInstructorId}
                  onChange={e => setSelectedInstructorId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                >
                  <option value="">-- Unassigned / Platform Default --</option>
                  {instructors.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.full_name || inst.email} ({inst.role ? inst.role.toUpperCase() : 'INSTRUCTOR'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price & MRP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Price (INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Original Price (MRP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={originalPrice}
                      onChange={e => setOriginalPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Thumbnail URL & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Thumbnail Image URL
                  </label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={e => setThumbnailUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={e => setBadge(e.target.value)}
                    placeholder="e.g. Bestseller"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  Course Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white h-24 resize-none"
                  placeholder="Detailed course overview..."
                />
              </div>

              {/* Save Button */}
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingOverview}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSavingOverview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Course Details</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SYLLABUS */}
          {activeTab === 'syllabus' && (
            <SyllabusTreeEditor
              courseId={course.id}
              lessons={lessons}
              onLessonsUpdated={updated => setLessons(updated)}
              onOpenImportModal={() => {
                if (onImportSyllabusRequested) onImportSyllabusRequested(course);
              }}
            />
          )}

          {/* TAB 3: REFERENCE FILES */}
          {activeTab === 'files' && (
            <CourseFilesManager
              courseId={course.id}
              lessons={lessons}
              files={files}
              onFilesUpdated={updated => setFiles(updated)}
            />
          )}

          {/* TAB 4: EXAMS & CBT */}
          {activeTab === 'exams' && (
            <div className="space-y-6">
              {/* 1-Click Autonomous Question Paper Compiler for this Course */}
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/80 rounded-2xl p-5 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        1-Click Autonomous PDF Exam Compiler
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Automatically extract questions, bind answer keys, and attach full mock test to this course.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase">
                    AI Multimodal
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select
                    value={selectedDocIdToCompile}
                    onChange={e => setSelectedDocIdToCompile(e.target.value)}
                    className="flex-1 w-full bg-white border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {availableDocs.length === 0 ? (
                      <option value="">No PDF question papers uploaded yet</option>
                    ) : (
                      availableDocs.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          📄 {doc.title || doc.file_name} ({doc.target_exam || 'JEE Main'})
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    disabled={availableDocs.length === 0}
                    onClick={() => {
                      const found = availableDocs.find(d => d.id === selectedDocIdToCompile) || availableDocs[0];
                      if (found) setCompileDocTarget(found);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20 disabled:opacity-50 select-none active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Auto-Compile into Course</span>
                  </button>
                </div>
              </div>

              {/* Add Exam Form */}
              <form onSubmit={handleAddExam} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-indigo-600" />
                  <span>Link Custom CBT Assessment or Quiz</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                      Exam Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newExamTitle}
                      onChange={e => setNewExamTitle(e.target.value)}
                      placeholder="e.g. JEE Advanced Full Mock Test #01"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      value={newExamDuration}
                      onChange={e => setNewExamDuration(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="examType"
                        value="jee_mock"
                        checked={newExamType === 'jee_mock'}
                        onChange={e => setNewExamType(e.target.value)}
                        className="text-indigo-600"
                      />
                      <span>JEE Mock Exam (Full CBT)</span>
                    </label>
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="examType"
                        value="quiz"
                        checked={newExamType === 'quiz'}
                        onChange={e => setNewExamType(e.target.value)}
                        className="text-indigo-600"
                      />
                      <span>Topic Quiz</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingExam}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {isAddingExam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Add Assessment</span>
                  </button>
                </div>
              </form>

              {/* Exams List */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Configured Assessments ({exams.length})
                </h5>
                {exams.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50/50 border border-slate-200 border-dashed rounded-2xl p-6">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No assessments linked yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Add mock tests or chapter quizzes using the form above.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {exams.map(exam => (
                      <div key={exam.id} className="p-3.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shrink-0">
                            <ClipboardList className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-slate-900 truncate">{exam.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                              <span className="font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">
                                {exam.type || 'jee_mock'}
                              </span>
                              <span>{exam.duration_minutes || 180} mins</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExam(exam);
                              setActiveTab('compiler');
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                          >
                            Build Questions
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: COMPILER */}
          {activeTab === 'compiler' && (
            <CourseExamCompilerTab
              courseData={course}
              editingExam={editingExam}
              onExamCompiled={(updatedExam) => {
                setExams(prev => prev.map(e => e.id === updatedExam.id ? updatedExam : e));
                setEditingExam(null);
                setActiveTab('exams');
              }}
              onCancelEdit={() => {
                setEditingExam(null);
                setActiveTab('exams');
              }}
            />
          )}

          {/* TAB 5: LIVE SESSIONS & DOUBTS */}
          {activeTab === 'live_doubts' && (
            <div className="space-y-6">
              {/* Schedule Live Session */}
              <form onSubmit={handleAddLiveSession} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-indigo-600" />
                  <span>Schedule Live Classroom Broadcast</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                      Session Topic <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newSessionTitle}
                      onChange={e => setNewSessionTitle(e.target.value)}
                      placeholder="e.g. Live Doubts & Numerical Problem Solving"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                      Scheduled Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newSessionTime}
                      onChange={e => setNewSessionTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                      Google Meet / Zoom Room URL
                    </label>
                    <input
                      type="url"
                      value={newSessionUrl}
                      onChange={e => setNewSessionUrl(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isAddingSession}
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                    >
                      {isAddingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                      <span>Broadcast Class</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Student Doubts Thread List */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Student Doubt Inquiries ({doubts.length})
                </h5>
                {doubts.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 border border-slate-200 border-dashed rounded-2xl p-6">
                    <MessageSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No student doubts filed for this course yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {doubts.map(doubt => (
                      <div key={doubt.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 transition">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-800 font-bold">{doubt.content}</p>
                          <p className="text-[10px] text-slate-400">
                            {doubt.resolved ? (
                              <span className="text-emerald-600 font-bold">Resolved</span>
                            ) : (
                              <span className="text-amber-600 font-bold">Pending Instructor Review</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleDoubtResolved(doubt.id, doubt.resolved)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                            doubt.resolved
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {doubt.resolved ? 'Mark Unresolved' : 'Mark Resolved'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* 1-Click Autonomous Exam Compile Modal for this Course */}
      <AutonomousCompileModal
        isOpen={!!compileDocTarget}
        doc={compileDocTarget}
        defaultCourseId={course?.id}
        onClose={() => setCompileDocTarget(null)}
        onCompileSuccess={async (exam) => {
          setCompileDocTarget(null);
          showToast(`Exam "${exam.title}" compiled and attached to this course!`, 'success');
          if (course?.id) {
            await fetchSubresources(course.id);
          }
        }}
      />
    </div>
  );
}
