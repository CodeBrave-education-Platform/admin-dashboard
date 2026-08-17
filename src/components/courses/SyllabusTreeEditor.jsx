'use client'

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import { 
  BookOpen, Plus, Trash2, Edit3, Save, X, Clock, Video, 
  UploadCloud, ChevronDown, ChevronUp, GripVertical, 
  CheckCircle2, ArrowUp, ArrowDown, Eye, Lock, FileText, Loader2, Sparkles
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

// Helper to extract 11-char YouTube ID
const extractYoutubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
};

export default function SyllabusTreeEditor({
  courseId,
  lessons = [],
  onLessonsUpdated,
  onOpenImportModal
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const [activeSubjectFilter, setActiveSubjectFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [expandedLessonId, setExpandedLessonId] = useState(null);

  // Form states for new lesson
  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState('60');
  const [newSubject, setNewSubject] = useState('General');
  const [newDescription, setNewDescription] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoSource, setNewVideoSource] = useState('youtube');
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  const [newAssignmentUrl, setNewAssignmentUrl] = useState('');
  const [newIsFreePreview, setNewIsFreePreview] = useState(false);
  const [newReadingMaterial, setNewReadingMaterial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Edit states for existing lesson
  const [editForm, setEditForm] = useState({});

  // Filter lessons
  const filteredLessons = lessons.filter(l => {
    if (activeSubjectFilter === 'All') return true;
    return (l.subject || 'General').toLowerCase() === activeSubjectFilter.toLowerCase();
  });

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!courseId) return;
    if (!newTitle.trim()) {
      showToast('Lesson title is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const nextOrder = lessons.length > 0
        ? Math.max(...lessons.map(l => l.order_index || 0)) + 1
        : 1;

      const ytId = extractYoutubeId(newVideoUrl);

      const payload = {
        course_id: courseId,
        title: newTitle.trim(),
        duration_minutes: parseInt(newDuration) || 60,
        subject: newSubject || 'General',
        is_free_preview: newIsFreePreview,
        is_free: newIsFreePreview,
        description: newDescription.trim() || null,
        video_url: newVideoUrl.trim() || null,
        video_source: newVideoSource || 'youtube',
        video_id: ytId || null,
        assignment_title: newAssignmentTitle.trim() || null,
        assignment_url: newAssignmentUrl.trim() || null,
        reading_material: newReadingMaterial.trim() || null,
        order_index: nextOrder
      };

      const { data, error } = await supabase
        .from('lessons')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      showToast('Lesson module created successfully', 'success');

      const updated = [...lessons, data].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      if (onLessonsUpdated) onLessonsUpdated(updated);

      await invalidateCache('course', courseId);

      // Reset form
      setNewTitle('');
      setNewDuration('60');
      setNewDescription('');
      setNewVideoUrl('');
      setNewAssignmentTitle('');
      setNewAssignmentUrl('');
      setNewIsFreePreview(false);
      setNewReadingMaterial('');
      setShowAddForm(false);
    } catch (err) {
      console.error('[Create Lesson Error]:', err.message);
      showToast('Failed to create lesson: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (lesson) => {
    setEditingLessonId(lesson.id);
    setEditForm({
      title: lesson.title,
      duration_minutes: lesson.duration_minutes || 60,
      subject: lesson.subject || 'General',
      is_free_preview: lesson.is_free_preview ?? lesson.is_free ?? false,
      is_free: lesson.is_free ?? lesson.is_free_preview ?? false,
      description: lesson.description || '',
      video_url: lesson.video_url || '',
      video_source: lesson.video_source || 'youtube',
      assignment_title: lesson.assignment_title || '',
      assignment_url: lesson.assignment_url || '',
      reading_material: lesson.reading_material || ''
    });
  };

  const handleSaveEdit = async (lessonId) => {
    setIsActionLoading(true);
    try {
      const ytId = extractYoutubeId(editForm.video_url);

      const updates = {
        title: editForm.title.trim(),
        duration_minutes: parseInt(editForm.duration_minutes) || 60,
        subject: editForm.subject || 'General',
        is_free_preview: !!editForm.is_free_preview,
        is_free: !!editForm.is_free_preview,
        description: editForm.description?.trim() || null,
        video_url: editForm.video_url?.trim() || null,
        video_source: editForm.video_source || 'youtube',
        video_id: ytId || null,
        assignment_title: editForm.assignment_title?.trim() || null,
        assignment_url: editForm.assignment_url?.trim() || null,
        reading_material: editForm.reading_material?.trim() || null
      };

      const { data, error } = await supabase
        .from('lessons')
        .update(updates)
        .eq('id', lessonId)
        .select()
        .single();

      if (error) throw error;

      showToast('Lesson updated successfully', 'success');

      const updated = lessons.map(l => l.id === lessonId ? { ...l, ...data } : l);
      if (onLessonsUpdated) onLessonsUpdated(updated);

      await invalidateCache('course', courseId);
      setEditingLessonId(null);
    } catch (err) {
      console.error('[Update Lesson Error]:', err.message);
      showToast('Failed to update lesson: ' + err.message, 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!confirm('Are you sure you want to permanently delete this lesson?')) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;

      showToast('Lesson deleted', 'success');

      const updated = lessons.filter(l => l.id !== lessonId);
      if (onLessonsUpdated) onLessonsUpdated(updated);

      await invalidateCache('course', courseId);
    } catch (err) {
      console.error('[Delete Lesson Error]:', err.message);
      showToast('Failed to delete lesson: ' + err.message, 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMoveLesson = async (lessonOrId, direction) => {
    const lessonId = typeof lessonOrId === 'object' && lessonOrId !== null ? lessonOrId.id : lessonOrId;
    const currentIndex = lessons.findIndex(l => l.id === lessonId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const newLessons = [...lessons];
    const temp = newLessons[currentIndex];
    newLessons[currentIndex] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;

    // Re-assign order_index
    const reordered = newLessons.map((item, idx) => ({
      ...item,
      order_index: idx + 1
    }));

    if (onLessonsUpdated) onLessonsUpdated(reordered);

    try {
      // Update in Supabase
      const updates = reordered.map(l => 
        supabase
          .from('lessons')
          .update({ order_index: l.order_index })
          .eq('id', l.id)
      );
      await Promise.all(updates);
      await invalidateCache('course', courseId);
    } catch (err) {
      console.error('[Reorder Error]:', err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
        {/* Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Physics', 'Chemistry', 'Mathematics', 'General'].map(subj => (
            <button
              key={subj}
              type="button"
              onClick={() => setActiveSubjectFilter(subj)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                activeSubjectFilter === subj
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Import from PDF or Word"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Auto-Import PDF/Docx</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(prev => !prev)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showAddForm ? 'Cancel' : 'Add Lesson'}</span>
          </button>
        </div>
      </div>

      {/* Inline Add Lesson Form */}
      {showAddForm && (
        <form onSubmit={handleCreateLesson} className="bg-indigo-50/40 border border-indigo-200 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Create New Lesson Unit</span>
            </h4>
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100 px-2 py-0.5 rounded-md">
              Sequence #{lessons.length + 1}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                Lesson Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Center of Mass & Conservation of Momentum"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                Subject
              </label>
              <select
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="General">General</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                value={newDuration}
                onChange={e => setNewDuration(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                Video Lecture URL (YouTube / Vimeo / HLS)
              </label>
              <input
                type="url"
                value={newVideoUrl}
                onChange={e => setNewVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                Assignment / Worksheet Title (Optional)
              </label>
              <input
                type="text"
                value={newAssignmentTitle}
                onChange={e => setNewAssignmentTitle(e.target.value)}
                placeholder="e.g. DPP #04 Problem Set"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                Assignment PDF / Link
              </label>
              <input
                type="url"
                value={newAssignmentUrl}
                onChange={e => setNewAssignmentUrl(e.target.value)}
                placeholder="https://drive.google.com/... or /worksheets/..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
              Unit Notes & KaTeX Math Outline (Markdown)
            </label>
            <textarea
              value={newReadingMaterial}
              onChange={e => setNewReadingMaterial(e.target.value)}
              placeholder="Module summary, key formulas ($F = ma$), and lecture notes..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium outline-none focus:border-indigo-500 h-20 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsFreePreview}
                onChange={e => setNewIsFreePreview(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enable Free Trial Preview (Publicly accessible to prospective students)</span>
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Lesson</span>
            </button>
          </div>
        </form>
      )}

      {/* Lesson Hierarchy List */}
      <div className="space-y-2.5">
        {filteredLessons.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 border border-slate-200 border-dashed rounded-2xl p-6">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h5 className="text-xs font-bold text-slate-700">No lessons created yet</h5>
            <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs mx-auto">
              Click "Add Lesson" to build your syllabus manually or "Auto-Import PDF/Docx" to extract from a document.
            </p>
          </div>
        ) : (
          filteredLessons.map((lesson, idx) => {
            const isEditing = editingLessonId === lesson.id;
            const isExpanded = expandedLessonId === lesson.id;
            const globalIdx = lessons.findIndex(l => l.id === lesson.id);
            const canMoveUp = globalIdx > 0;
            const canMoveDown = globalIdx !== -1 && globalIdx < lessons.length - 1;

            if (isEditing) {
              return (
                <div key={lesson.id} className="bg-white border-2 border-indigo-400 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-indigo-700 uppercase">
                      Editing Unit #{lesson.order_index || (globalIdx !== -1 ? globalIdx + 1 : idx + 1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingLessonId(null)}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Title</label>
                      <input
                        type="text"
                        required
                        value={editForm.title}
                        onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Subject</label>
                      <select
                        value={editForm.subject}
                        onChange={e => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                      >
                        <option value="General">General</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Mathematics">Mathematics</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Duration (mins)</label>
                      <input
                        type="number"
                        min="1"
                        value={editForm.duration_minutes}
                        onChange={e => setEditForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Video URL</label>
                      <input
                        type="url"
                        value={editForm.video_url}
                        onChange={e => setEditForm(prev => ({ ...prev, video_url: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Notes / Outline</label>
                    <textarea
                      value={editForm.reading_material}
                      onChange={e => setEditForm(prev => ({ ...prev, reading_material: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500 h-16 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.is_free_preview || false}
                        onChange={e => setEditForm(prev => ({ ...prev, is_free_preview: e.target.checked, is_free: e.target.checked }))}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Enable Free Trial Preview</span>
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingLessonId(null)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(lesson.id)}
                      disabled={isActionLoading}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={lesson.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-3.5 transition shadow-2xs group"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Reorder Arrows & Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex flex-col items-center gap-0.5 shrink-0 text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(lesson.id, 'up')}
                        disabled={!canMoveUp}
                        className="hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-black text-slate-500">
                        {lesson.order_index || (globalIdx !== -1 ? globalIdx + 1 : idx + 1)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(lesson.id, 'down')}
                        disabled={!canMoveDown}
                        className="hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-xs font-extrabold text-slate-900 truncate">
                          {lesson.title}
                        </h5>
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {lesson.subject || 'General'}
                        </span>
                        {(lesson.is_free_preview || lesson.is_free) && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>Free Preview</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold mt-1">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{lesson.duration_minutes || 60}m</span>
                        </span>
                        {lesson.video_url && (
                          <span className="flex items-center gap-1 text-indigo-600">
                            <Video className="w-3 h-3" />
                            <span>Video Linked</span>
                          </span>
                        )}
                        {lesson.assignment_title && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <FileText className="w-3 h-3" />
                            <span>Worksheet</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedLessonId(isExpanded ? null : lesson.id)}
                      className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition"
                      title={isExpanded ? 'Collapse' : 'Expand Details'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditing(lesson)}
                      className="p-1.5 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition"
                      title="Edit Lesson"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition"
                      title="Delete Lesson"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details View */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2 bg-slate-50/50 p-3 rounded-xl">
                    {lesson.description && (
                      <p className="text-[11px] text-slate-600 font-medium">
                        <strong className="text-slate-800 font-bold">Overview:</strong> {lesson.description}
                      </p>
                    )}
                    {lesson.video_url && (
                      <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-bold text-slate-800">Video Source:</span>
                        <a href={lesson.video_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate max-w-sm">
                          {lesson.video_url}
                        </a>
                      </p>
                    )}
                    {lesson.assignment_title && (
                      <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-bold text-slate-800">Assignment:</span> {lesson.assignment_title}
                        {lesson.assignment_url && (
                          <a href={lesson.assignment_url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">
                            (View Asset)
                          </a>
                        )}
                      </p>
                    )}
                    {lesson.reading_material && (
                      <div className="mt-2 bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Notes / KaTeX Outline:</span>
                        <p className="text-[11px] text-slate-700 whitespace-pre-wrap font-serif">
                          {lesson.reading_material}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
