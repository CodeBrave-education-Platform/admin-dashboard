'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Sparkles, 
  ExternalLink, 
  Trash2, 
  Eye, 
  Download, 
  Search, 
  Calendar, 
  HardDrive, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  X,
  Plus,
  BookOpen
} from 'lucide-react';

function formatFileSize(bytes = 0) {
  const num = Number(bytes) || 0;
  if (num === 0) return '0 KB';
  if (num < 1024 * 1024) {
    return `${(num / 1024).toFixed(1)} KB`;
  }
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

// Status badge renderer for question paper document
function DocumentStatusBadge({ status = 'ready_to_compile' }) {
  switch (status) {
    case 'ready_to_compile':
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          Ready to Compile
        </span>
      );
    case 'compiled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
          <CheckCircle2 className="w-3 h-3 text-indigo-600" />
          Compiled
        </span>
      );
    case 'uploading':
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600 animate-spin" />
          Processing
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
}

// PDF Preview Modal with embedded iframe
function PdfPreviewModal({ doc, isOpen, onClose }) {
  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 truncate">{doc.title}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>{doc.target_exam || 'JEE Main'}</span>
                <span>•</span>
                <span>{formatFileSize(doc.file_size_bytes)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {doc.file_url && (
              <a
                href={doc.file_url}
                target="_blank"
                rel="noreferrer"
                download={doc.file_name || 'question_paper.pdf'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Iframe */}
        <div className="flex-1 bg-slate-100 relative">
          {doc.file_url ? (
            <iframe
              src={`${doc.file_url}#toolbar=1&navpanes=0`}
              title={doc.title}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
              No PDF URL available for preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PdfQuestionPaperGrid({
  documents = [],
  isLoading = false,
  onOpenUploadModal,
  onDeleteDocument
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [targetExamFilter, setTargetExamFilter] = useState('all');
  const [previewDoc, setPreviewDoc] = useState(null);

  // Filter documents by search and target exam
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (targetExamFilter !== 'all') {
        const norm = String(doc.target_exam || '').toLowerCase().replace(/\s+/g, '_');
        if (!norm.includes(targetExamFilter)) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (doc.title || '').toLowerCase().includes(query);
        const fileNameMatch = (doc.file_name || '').toLowerCase().includes(query);
        const subjectMatch = (doc.subject || '').toLowerCase().includes(query);
        return titleMatch || fileNameMatch || subjectMatch;
      }

      return true;
    });
  }, [documents, targetExamFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search & Exam Filters */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Omnibar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search question papers by title, file name, or subject..."
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

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {[
            { id: 'all', label: 'All Exams' },
            { id: 'jee_main', label: 'JEE Main' },
            { id: 'jee_advanced', label: 'JEE Advanced' },
            { id: 'neet', label: 'NEET' }
          ].map(pill => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setTargetExamFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                targetExamFilter === pill.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of PDF Question Paper Cards */}
      {isLoading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Loading PDF question papers...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No question papers uploaded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || targetExamFilter !== 'all'
              ? 'No PDF documents match your search filter criteria. Try resetting the search.'
              : 'Upload standard question paper PDFs directly to the Supabase storage repository to enable 1-click compilation.'}
          </p>
          {onOpenUploadModal && (
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Question Paper PDF</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => {
            const isReady = doc.status === 'ready_to_compile' || doc.status === 'ready';
            const isCompiled = doc.status === 'compiled';

            return (
              <div
                key={doc.id}
                className="bg-white border border-slate-200/90 hover:border-indigo-300 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Header & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <DocumentStatusBadge status={doc.status} />
                  </div>

                  {/* Document Title */}
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug line-clamp-2 mb-2">
                    {doc.title}
                  </h4>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                      {doc.target_exam || 'JEE Main'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {doc.subject || 'Full Syllabus'}
                    </span>
                  </div>

                  {/* File Details: Size & Upload Date */}
                  <div className="space-y-1 text-[11px] text-slate-500 font-medium pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatFileSize(doc.file_size_bytes)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="truncate max-w-[150px] font-mono text-[10px]">{doc.file_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1.5">
                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                      title="Preview PDF Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    {onDeleteDocument && (
                      <button
                        type="button"
                        onClick={() => onDeleteDocument(doc)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Delete Question Paper PDF"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* 1-Click "Compile into Exam" Primary Action */}
                  <Link
                    href={`/admin/test-series/compiler?pdfDocId=${doc.id}`}
                    className={`flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      isCompiled
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-500/20'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isCompiled ? 'Recompile Exam' : 'Compile into Exam'}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        doc={previewDoc}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
