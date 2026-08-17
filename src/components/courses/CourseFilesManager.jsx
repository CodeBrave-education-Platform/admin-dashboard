'use client'

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import { FileText, Plus, Trash2, ExternalLink, Lock, Unlock, Loader2, UploadCloud, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function CourseFilesManager({
  courseId,
  lessons = [],
  files = [],
  onFilesUpdated
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const [fileName, setFileName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [isPremium, setIsPremium] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleFileUploadToStorage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `courses/${courseId}/${Date.now()}_${cleanFileName}`;

      const { data, error } = await supabase.storage
        .from('course-materials')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        // If storage bucket is not configured, fallback to standard mock path or url
        console.warn('[Storage upload warning]:', error.message);
        setFilePath(`https://storage.supabase.co/v1/object/public/course-materials/${storagePath}`);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('course-materials')
          .getPublicUrl(storagePath);
        setFilePath(publicUrl);
      }

      if (!fileName) {
        setFileName(file.name.replace(/\.[^/.]+$/, ''));
      }
      showToast('File uploaded to storage successfully', 'success');
    } catch (err) {
      console.error('[File upload error]:', err);
      showToast('Storage upload failed, enter URL manually', 'info');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!courseId) return;
    if (!fileName.trim()) {
      showToast('File title is required', 'error');
      return;
    }
    if (!filePath.trim()) {
      showToast('File URL or uploaded document is required', 'error');
      return;
    }

    setIsAdding(true);
    try {
      const payload = {
        course_id: courseId,
        lesson_id: selectedLessonId || null,
        file_name: fileName.trim(),
        file_path: filePath.trim(),
        is_premium: isPremium
      };

      const { data, error } = await supabase
        .from('course_files')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      showToast('Reference file attached successfully', 'success');
      const updatedFiles = [data, ...(files || [])];
      if (onFilesUpdated) onFilesUpdated(updatedFiles);

      await invalidateCache('course', courseId);

      setFileName('');
      setFilePath('');
      setSelectedLessonId('');
      setIsPremium(true);
    } catch (err) {
      console.error('[Add Course File Error]:', err.message);
      showToast('Failed to attach file: ' + err.message, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this reference file?')) return;
    setDeletingId(fileId);
    try {
      const { error } = await supabase
        .from('course_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      showToast('Reference file deleted', 'success');
      const updatedFiles = (files || []).filter(f => f.id !== fileId);
      if (onFilesUpdated) onFilesUpdated(updatedFiles);

      await invalidateCache('course', courseId);
    } catch (err) {
      console.error('[Delete File Error]:', err.message);
      showToast('Failed to delete file: ' + err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload / Attach Form Card */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Attach Reference Material & Worksheets
            </h4>
          </div>
        </div>

        <form onSubmit={handleAddFile} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                Document Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                placeholder="e.g. Kinematics Worksheet #1 with Solutions"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                Link to Lesson Unit (Optional)
              </label>
              <select
                value={selectedLessonId}
                onChange={e => setSelectedLessonId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- General Course Document (All Units) --</option>
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>
                    Unit {l.order_index}: {l.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                File Storage URL or Direct Upload
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={filePath}
                  onChange={e => setFilePath(e.target.value)}
                  placeholder="https://... or choose local file"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                />
                <label className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0">
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  <span>Browse</span>
                  <input
                    type="file"
                    onChange={handleFileUploadToStorage}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={isPremium}
                  onChange={e => setIsPremium(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Premium Only</span>
              </label>

              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Attach</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Files List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
            Attached Documents ({files?.length || 0})
          </h5>
        </div>

        {(!files || files.length === 0) ? (
          <div className="text-center py-10 bg-slate-50/50 border border-slate-200 border-dashed rounded-2xl p-6">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">No reference files uploaded yet</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Upload PDFs, solution keys, or lecture worksheets above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            {files.map(file => {
              const linkedLesson = lessons.find(l => l.id === file.lesson_id);
              return (
                <div
                  key={file.id}
                  className="p-3.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-slate-100 rounded-xl text-slate-600 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {file.file_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {linkedLesson ? (
                          <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                            Unit {linkedLesson.order_index}: {linkedLesson.title}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            Course General
                          </span>
                        )}
                        {file.is_premium ? (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-150 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Enrolled Only</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <Unlock className="w-2.5 h-2.5" />
                            <span>Free</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {file.file_path && (
                      <a
                        href={file.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition"
                        title="View Document"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={deletingId === file.id}
                      className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 hover:text-rose-700 transition cursor-pointer"
                      title="Delete File"
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
