'use client'

import React, { useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ToastProvider';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function PdfUploader({
  isOpen = true,
  onClose,
  onUploadSuccess
}) {
  const supabase = createClient();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [targetExam, setTargetExam] = useState('JEE Main');
  const [subject, setSubject] = useState('Full Syllabus');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  // Handle file validation and state
  const handleFile = (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a valid PDF question paper file (.pdf)', 'error');
      return;
    }

    // 50MB limit check
    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showToast('File size exceeds 50MB limit. Please upload a smaller PDF.', 'error');
      return;
    }

    setSelectedFile(file);
    // Auto-generate clean title from filename if title is empty
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');
      setTitle(cleanName);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setTargetExam('JEE Main');
    setSubject('Full Syllabus');
    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadAndSave = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a PDF file to upload', 'error');
      return;
    }
    if (!title.trim()) {
      showToast('Please provide a title for this question paper', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      // 1. Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();

      // 2. Prepare unique storage filename
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageFilePath = `uploads/${timestamp}_${sanitizedName}`;

      setUploadProgress(35);

      // 3. Upload raw PDF directly to Supabase storage bucket 'question-papers'
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('question-papers')
        .upload(storageFilePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // If storage bucket is missing or permission fails, handle with detailed message
        console.error('[Storage Upload Error]:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload PDF to storage bucket');
      }

      setUploadProgress(70);

      // 4. Retrieve public URL
      const { data: urlData } = supabase
        .storage
        .from('question-papers')
        .getPublicUrl(storageFilePath);

      const publicUrl = urlData?.publicUrl || '';

      setUploadProgress(85);

      // 5. Insert metadata record into public.question_paper_documents
      const docPayload = {
        title: title.trim(),
        file_url: publicUrl,
        file_name: selectedFile.name,
        file_size_bytes: selectedFile.size,
        subject: subject,
        target_exam: targetExam,
        status: 'ready_to_compile',
        uploaded_by: user?.id || null,
        metadata: {
          original_name: selectedFile.name,
          storage_path: storageFilePath,
          uploaded_at: new Date().toISOString()
        }
      };

      const { data: insertedDoc, error: insertError } = await supabase
        .from('question_paper_documents')
        .insert([docPayload])
        .select()
        .single();

      if (insertError) {
        console.error('[Document DB Insert Error]:', insertError);
        throw new Error(insertError.message || 'Failed to save question paper metadata');
      }

      setUploadProgress(100);
      showToast('Question paper uploaded successfully to repository!', 'success');

      if (onUploadSuccess) {
        onUploadSuccess(insertedDoc);
      }

      resetForm();
      if (onClose) onClose();
    } catch (err) {
      console.error('[Upload Failed]:', err);
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in select-none">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Upload Question Paper PDF</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Saves to repository bucket and prepares for 1-click exam compilation
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              disabled={isUploading}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content & Form */}
        <form onSubmit={handleUploadAndSave} className="p-6 space-y-5">
          {/* Drag and drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]' 
                : selectedFile 
                  ? 'border-indigo-400 bg-indigo-50/30' 
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-xs">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  disabled={isUploading}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Drag and drop your question paper PDF here, or <span className="text-emerald-600 underline">browse</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Supports standard NTA/JEE question papers up to 50MB (.pdf)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Metadata inputs */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Question Paper Title *
              </label>
              <input
                type="text"
                placeholder="e.g. JEE Main 2026 Model Test Paper 01"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isUploading}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition disabled:opacity-50"
              />
            </div>

            {/* Target Exam & Subject */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Target Exam
                </label>
                <select
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                  disabled={isUploading}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition disabled:opacity-50 cursor-pointer"
                >
                  <option value="JEE Main">JEE Main</option>
                  <option value="JEE Advanced">JEE Advanced</option>
                  <option value="NEET">NEET</option>
                  <option value="Custom">Custom Blueprint</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Subject Focus
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isUploading}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition disabled:opacity-50 cursor-pointer"
                >
                  <option value="Full Syllabus">Full Syllabus (PCM/PCB)</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                </select>
              </div>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1.5 text-indigo-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading & Cataloging PDF...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isUploading || !selectedFile || !title.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Storage...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload & Catalog PDF</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
