'use client'

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialogModal from '@/components/ConfirmDialogModal';
import TestPortalTabs from '@/components/test-series/TestPortalTabs';
import TestPackagesGrid from '@/components/test-series/TestPackagesGrid';
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
    : (tabParam === 'all_tests' || tabParam === 'tests')
      ? 'all_tests'
      : 'test_packages';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [packages, setPackages] = useState([]);
  const [exams, setExams] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'exam' | 'document' | 'package', data: object }

  // Sync tab with URL if changed
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    let newUrl = '/admin/test-series';
    if (tab === 'pdf_repository') {
      newUrl = '/admin/test-series?tab=pdf';
    } else if (tab === 'all_tests') {
      newUrl = '/admin/test-series?tab=tests';
    } else {
      newUrl = '/admin/test-series?tab=packages';
    }
    router.replace(newUrl, { scroll: false });
  };

  // Callback for child components to update exam lists
  const handleExamsUpdated = useCallback((newExams) => {
    if (Array.isArray(newExams)) {
      setExams(newExams);
    }
  }, []);

  // Fetch test_packages, test_exams, question_paper_documents, and test_attempts
  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch documents via dual-source sync API (Supabase storage uploads + DB)
      const docsPromise = fetch('/api/admin/test-series/documents')
        .then(res => res.json())
        .then(data => data.documents || [])
        .catch(async () => {
          const { data } = await supabase.from('question_paper_documents').select('*').order('created_at', { ascending: false });
          return data || [];
        });

      // 2. Query packages, exams, attempts in parallel
      const [packagesRes, examsRes, docsData, attemptsRes] = await Promise.all([
        supabase
          .from('test_packages')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('test_exams')
          .select('*')
          .order('created_at', { ascending: false }),
        docsPromise,
        supabase
          .from('test_attempts')
          .select('id, exam_id, score, status, completed_at')
          .order('completed_at', { ascending: false })
      ]);

      if (packagesRes.data) {
        setPackages(packagesRes.data);
      } else if (packagesRes.error) {
        console.warn('[Fetch Packages Error]:', packagesRes.error.message);
      }

      if (examsRes.data) {
        setExams(examsRes.data);
      } else if (examsRes.error) {
        console.warn('[Fetch Exams Error]:', examsRes.error.message);
      }

      if (Array.isArray(docsData)) {
        setDocuments(docsData);
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
    setActiveTab('pdf_repository');
    showToast('Question paper uploaded and stored securely', 'success');
  };

  // Safe deletion execution for either exam, package, or question paper document
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
      } else if (type === 'package') {
        const { error } = await supabase
          .from('test_packages')
          .delete()
          .eq('id', data.id);

        if (error) throw error;

        setPackages(prev => prev.filter(p => p.id !== data.id));
        showToast(`Test Package "${data.title}" successfully deleted`, 'success');
        await invalidateCache('packages', data.id);
      } else if (type === 'document') {
        const res = await fetch(`/api/admin/test-series/documents?id=${encodeURIComponent(data.id)}`, {
          method: 'DELETE',
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'Failed to delete question paper document');
        }

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
  const totalPackages = packages.length;
  const totalExams = exams.length;
  const totalPdfs = documents.length;
  const readyToCompileCount = documents.filter(
    d => d.status === 'ready_to_compile' || d.status === 'ready'
  ).length;
  const totalAttempts = attempts.length;

  return (
    <AdminLayoutShell
      title="Test Portal"
      subtitle="Manage test packages, standalone exams, and autonomous PDF question paper compiler"
    >
      <div className="space-y-6">
        {/* Unified Header, Metrics Ribbon & 3-Tab Navigation */}
        <TestPortalTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          totalPackages={totalPackages}
          totalExams={totalExams}
          totalPdfs={totalPdfs}
          readyToCompileCount={readyToCompileCount}
          totalAttempts={totalAttempts}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
        />

        {/* Tab 1: Test Packages (Bundles containing multiple tests) */}
        {activeTab === 'test_packages' && (
          <TestPackagesGrid
            packages={packages}
            exams={exams}
            attempts={attempts}
            isLoading={loading}
            onPackageUpdated={fetchPortalData}
            onDeletePackage={(pkg) => setDeleteTarget({ type: 'package', data: pkg })}
            onDeleteExam={(exam) => setDeleteTarget({ type: 'exam', data: exam })}
          />
        )}

        {/* Tab 2: PDF Question Papers (Question Paper Repository Grid & 1-Click Auto Compile) */}
        {activeTab === 'pdf_repository' && (
          <PdfQuestionPaperGrid
            documents={documents}
            packages={packages}
            isLoading={loading}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onDeleteDocument={(doc) => setDeleteTarget({ type: 'document', data: doc })}
            onExamCompiled={fetchPortalData}
          />
        )}

        {/* Tab 3: All Tests (Compiled Exams Table) */}
        {activeTab === 'all_tests' && (
          <AllTestsTable
            exams={exams}
            attempts={attempts}
            isLoading={loading}
            onDeleteExam={(exam) => setDeleteTarget({ type: 'exam', data: exam })}
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
        title={
          deleteTarget?.type === 'package'
            ? 'Delete Test Package'
            : deleteTarget?.type === 'exam'
              ? 'Delete Exam'
              : 'Delete Question Paper PDF'
        }
        message={
          deleteTarget?.type === 'package'
            ? `Are you sure you want to permanently delete the test package "${deleteTarget?.data?.title}"? Tests inside will become standalone.`
            : deleteTarget?.type === 'exam'
              ? `Are you sure you want to permanently delete the exam "${deleteTarget?.data?.title}"? All associated attempt records and questions will be removed.`
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
