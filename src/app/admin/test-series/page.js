'use client'

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialogModal from '@/components/ConfirmDialogModal';
import TestPortalTabs from '@/components/test-series/TestPortalTabs';
import AllTestsTable from '@/components/test-series/AllTestsTable';
import PdfQuestionPaperGrid from '@/components/test-series/PdfQuestionPaperGrid';
import PdfUploader from '@/components/test-series/PdfUploader';

function TestPortalContent() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const tabParam = searchParams.get('tab');
  const initialTab = (tabParam === 'pdf' || tabParam === 'pdf_repository') 
    ? 'pdf_repository' 
    : 'all_tests';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [exams, setExams] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'exam' | 'document', data: object }

  // Sync tab with URL if changed
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const newUrl = tab === 'pdf_repository' 
      ? '/admin/test-series?tab=pdf' 
      : '/admin/test-series';
    router.replace(newUrl, { scroll: false });
  };

  // Callback for child components to update exam lists
  const handleExamsUpdated = useCallback((newExams) => {
    if (Array.isArray(newExams)) {
      setExams(newExams);
    }
  }, []);

  // Fetch test_exams, question_paper_documents, and test_attempts
  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true);
      const [examsRes, docsRes, attemptsRes] = await Promise.all([
        supabase
          .from('test_exams')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('question_paper_documents')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('test_attempts')
          .select('id, exam_id, score, status, completed_at')
          .order('completed_at', { ascending: false })
      ]);

      if (examsRes.data) {
        setExams(examsRes.data);
      } else if (examsRes.error) {
        console.warn('[Fetch Exams Error]:', examsRes.error.message);
      }

      if (docsRes.data) {
        setDocuments(docsRes.data);
      } else if (docsRes.error) {
        console.warn('[Fetch Question Paper Documents Error]:', docsRes.error.message);
      }

      if (attemptsRes.data) {
        setAttempts(attemptsRes.data);
      } else if (attemptsRes.error) {
        console.warn('[Fetch Attempts Error]:', attemptsRes.error.message);
      }
    } catch (err) {
      console.error('[Fetch Test Portal Data Error]:', err.message);
      showToast('Failed to load test portal data', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  // Handle uploaded PDF document
  const handleDocumentUploaded = (newDoc) => {
    setDocuments(prev => [newDoc, ...prev]);
    // Switch to PDF tab to show the newly uploaded paper
    setActiveTab('pdf_repository');
  };

  // Safe deletion execution for either exam or question paper document
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const { type, data } = deleteTarget;

    try {
      if (type === 'exam') {
        const { error } = await supabase
          .from('test_exams')
          .delete()
          .eq('id', data.id);

        if (error) throw error;

        setExams(prev => prev.filter(e => e.id !== data.id));
        showToast(`Exam "${data.title}" successfully deleted`, 'success');
        await invalidateCache('exams', data.id);
      } else if (type === 'document') {
        // Attempt removing file from Supabase storage bucket
        if (data.metadata?.storage_path) {
          try {
            await supabase.storage.from('question-papers').remove([data.metadata.storage_path]);
          } catch (storageErr) {
            console.warn('[Storage delete warning]:', storageErr.message);
          }
        }

        const { error } = await supabase
          .from('question_paper_documents')
          .delete()
          .eq('id', data.id);

        if (error) throw error;

        setDocuments(prev => prev.filter(d => d.id !== data.id));
        showToast(`Question paper "${data.title}" successfully deleted`, 'success');
      }
    } catch (err) {
      console.error('[Delete Error]:', err.message);
      showToast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Metrics calculations
  const totalExams = exams.length;
  const totalPdfs = documents.length;
  const readyToCompileCount = documents.filter(
    d => d.status === 'ready_to_compile' || d.status === 'ready'
  ).length;
  const totalAttempts = attempts.length;

  return (
    <AdminLayoutShell
      title="Test Portal"
      subtitle="Manage standalone exams, multi-format blueprints, and PDF question paper repository"
    >
      <div className="space-y-6">
        {/* Unified Header, Metrics Ribbon & 2-Tab Navigation */}
        <TestPortalTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          totalExams={totalExams}
          totalPdfs={totalPdfs}
          readyToCompileCount={readyToCompileCount}
          totalAttempts={totalAttempts}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
        />

        {/* Tab 1: All Tests (Compiled Standalone Exams Direct Table) */}
        {activeTab === 'all_tests' && (
          <AllTestsTable
            exams={exams}
            attempts={attempts}
            isLoading={loading}
            onDeleteExam={(exam) => setDeleteTarget({ type: 'exam', data: exam })}
          />
        )}

        {/* Tab 2: PDF Question Papers (Question Paper Repository Grid) */}
        {activeTab === 'pdf_repository' && (
          <PdfQuestionPaperGrid
            documents={documents}
            isLoading={loading}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onDeleteDocument={(doc) => setDeleteTarget({ type: 'document', data: doc })}
          />
        )}
      </div>

      {/* Modern Drag-and-Drop PDF Uploader Modal */}
      <PdfUploader
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleDocumentUploaded}
      />

      {/* Confirmation Dialog for Deletions */}
      <ConfirmDialogModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.type === 'exam' ? 'Delete Exam' : 'Delete Question Paper PDF'}
        message={
          deleteTarget?.type === 'exam'
            ? `Are you sure you want to permanently delete the exam "${deleteTarget?.data?.title}"? All associated attempt records and cached questions will be removed.`
            : `Are you sure you want to permanently delete the question paper "${deleteTarget?.data?.title}"? The PDF file will be removed from storage.`
        }
        confirmLabel="Permanently Delete"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayoutShell>
  );
}

export default function TestPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
      </div>
    }>
      <TestPortalContent />
    </Suspense>
  );
}
