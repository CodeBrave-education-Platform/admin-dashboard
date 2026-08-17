'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialogModal from '@/components/ConfirmDialogModal';
import BatchStatsHeader from '@/components/batches/BatchStatsHeader';
import BatchGrid from '@/components/batches/BatchGrid';
import BatchEditorDrawer from '@/components/batches/BatchEditorDrawer';
import BatchCreateModal from '@/components/batches/BatchCreateModal';
import BatchRosterImportModal from '@/components/batches/BatchRosterImportModal';
import StudentTelemetryModal from '@/components/batches/StudentTelemetryModal';

function BatchesManagementContent() {
  const supabase = React.useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const urlBatchId = searchParams.get('id') || searchParams.get('batchId');

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterTargetBatchId, setRosterTargetBatchId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  // Fetch batches with relational aggregates and resilient fallbacks
  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      let batchData = [];

      // Attempt relational query first
      const { data, error } = await supabase
        .from('batches')
        .select(`*, batch_enrollments (id), course_files (id), live_sessions (id), assessments (id)`);

      if (!error && Array.isArray(data)) {
        batchData = data.map(b => ({
          ...b,
          students_count: b.batch_enrollments?.length ?? 0,
          materials_count: b.course_files?.length ?? 0,
          live_sessions_count: b.live_sessions?.length ?? 0,
          exams_count: b.assessments?.length ?? 0
        }));
      } else {
        // Fallback to basic batches table query without assuming relationships
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('batches')
          .select('*');

        if (fallbackError) {
          console.warn('[Fetch Batches Warning]:', fallbackError.message);
          setBatches([]);
          return;
        }

        batchData = fallbackData || [];
      }

      // Resilient in-memory sort by created_at or start_date
      const sorted = [...batchData].sort((a, b) => {
        const timeA = new Date(a.created_at || a.start_date || 0).getTime();
        const timeB = new Date(b.created_at || b.start_date || 0).getTime();
        return timeB - timeA;
      });

      const enriched = sorted.map(b => ({
        ...b,
        target_focus: b.target_focus || 'JEE',
        status: b.status || 'published',
        price: b.price !== undefined && b.price !== null ? Number(b.price) : 0,
        students_count: b.students_count || b.batch_enrollments?.length || 0,
        materials_count: b.materials_count || b.course_files?.length || 0,
        live_sessions_count: b.live_sessions_count || b.live_sessions?.length || 0,
        exams_count: b.exams_count || b.assessments?.length || 0
      }));

      setBatches(enriched);
    } catch (err) {
      console.warn('[Fetch Batches Error]:', err.message);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  // URL deep-linking sync (?id=...)
  useEffect(() => {
    if (batches.length > 0) {
      if (urlBatchId) {
        const match = batches.find(b => b.id === urlBatchId);
        if (match) { setSelectedBatch(match); setIsDrawerOpen(true); }
      } else if (isDrawerOpen) {
        setIsDrawerOpen(false);
        setSelectedBatch(null);
      }
    }
  }, [urlBatchId, batches]);

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
    setIsDrawerOpen(true);
    router.replace(`/batches?id=${batch.id}`, { scroll: false });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedBatch(null);
    router.replace('/batches', { scroll: false });
  };

  const handleToggleBatchStatus = async (batchId, nextStatus) => {
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, status: nextStatus } : b));
    setSelectedBatch(prev => prev?.id === batchId ? { ...prev, status: nextStatus } : prev);

    try {
      const { error } = await supabase.from('batches').update({ status: nextStatus }).eq('id', batchId);
      if (error) throw error;
      showToast(`Batch status updated to ${nextStatus.toUpperCase()}`, 'success');
      await invalidateCache('batch', null, batchId);
    } catch (err) {
      console.error('[Toggle Batch Status Error]:', err.message);
      showToast('Failed to update status: ' + err.message, 'error');
      const reverted = nextStatus === 'published' ? 'draft' : 'published';
      setBatches(prev => prev.map(b => b.id === batchId ? { ...b, status: reverted } : b));
      setSelectedBatch(prev => prev?.id === batchId ? { ...prev, status: reverted } : prev);
    }
  };

  const handleBatchCreated = (newBatch) => {
    setBatches(prev => [newBatch, ...prev]);
    handleSelectBatch(newBatch);
  };

  const handleBatchUpdated = (updatedBatch) => {
    setBatches(prev => prev.map(b => b.id === updatedBatch.id ? { ...b, ...updatedBatch } : b));
    setSelectedBatch(prev => prev?.id === updatedBatch.id ? { ...prev, ...updatedBatch } : prev);
  };

  const handleBatchDeleted = (batchId) => {
    setBatches(prev => prev.filter(b => b.id !== batchId));
    if (selectedBatch?.id === batchId) handleCloseDrawer();
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    try {
      const { error } = await supabase.from('batches').delete().eq('id', deleteConfirmTarget.id);
      if (error) throw error;
      showToast('Cohort batch permanently deleted', 'success');
      await invalidateCache('batch', null, deleteConfirmTarget.id);
      handleBatchDeleted(deleteConfirmTarget.id);
    } catch (err) {
      showToast('Failed to delete batch: ' + err.message, 'error');
    } finally {
      setDeleteConfirmTarget(null);
    }
  };

  const handleOpenRosterModal = (batchId) => {
    setRosterTargetBatchId(batchId || selectedBatch?.id || null);
    setIsRosterModalOpen(true);
  };

  return (
    <AdminLayoutShell
      title="Cohort Batches & Enrollment Command Center"
      subtitle="Architect learning cohorts, coordinate live classes, and monitor student academic performance"
    >
      <div className="space-y-6">
        <BatchStatsHeader batches={batches} />
        <BatchGrid
          batches={batches}
          isLoading={loading}
          onSelectBatch={handleSelectBatch}
          onToggleBatchStatus={handleToggleBatchStatus}
          onDeleteBatch={(batchId) => {
            const match = batches.find(b => b.id === batchId);
            setDeleteConfirmTarget(match || { id: batchId, title: 'Cohort Batch' });
          }}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />
      </div>

      <BatchEditorDrawer
        isOpen={isDrawerOpen}
        batch={selectedBatch}
        onClose={handleCloseDrawer}
        onBatchUpdated={handleBatchUpdated}
        onBatchDeleted={handleBatchDeleted}
        onOpenRosterModal={handleOpenRosterModal}
        onInspectStudent={(student) => setSelectedStudent(student)}
      />

      <BatchCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onBatchCreated={handleBatchCreated}
      />

      <BatchRosterImportModal
        isOpen={isRosterModalOpen}
        batchId={rosterTargetBatchId}
        onClose={() => {
          setIsRosterModalOpen(false);
          setRosterTargetBatchId(null);
        }}
        onImportSuccess={fetchBatches}
      />

      <StudentTelemetryModal
        isOpen={!!selectedStudent}
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      <ConfirmDialogModal
        isOpen={!!deleteConfirmTarget}
        title="Delete Cohort Batch"
        message={`Are you sure you want to permanently delete "${deleteConfirmTarget?.title || 'this cohort'}" and revoke all associated student enrollments, worksheets, and live sessions?`}
        confirmLabel="Permanently Delete"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />
    </AdminLayoutShell>
  );
}

export default function BatchesManagementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
      </div>
    }>
      <BatchesManagementContent />
    </Suspense>
  );
}
