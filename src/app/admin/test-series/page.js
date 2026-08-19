'use client'

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialogModal from '@/components/ConfirmDialogModal';
import TestSeriesStatsHeader from '@/components/test-series/TestSeriesStatsHeader';
import TestSeriesGrid from '@/components/test-series/TestSeriesGrid';
import TestSeriesEditorDrawer from '@/components/test-series/TestSeriesEditorDrawer';
import TestSeriesCreateModal from '@/components/test-series/TestSeriesCreateModal';

function TestSeriesManagementContent() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const urlPackageId = searchParams.get('id') || searchParams.get('packageId');

  const [packages, setPackages] = useState([]);
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [packageEnrollments, setPackageEnrollments] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  // Fetch test packages, linked exams, attempts, and enrollment tallies
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [packagesRes, examsRes, attemptsRes, invoicesRes] = await Promise.all([
        supabase.from('test_packages').select('*, test_exams(*)').order('created_at', { ascending: false }),
        supabase.from('test_exams').select('*').order('created_at', { ascending: false }),
        supabase.from('test_attempts').select('*, profiles(full_name, email), test_exams(title)').order('completed_at', { ascending: false }),
        supabase.from('invoices').select('package_id').not('package_id', 'is', null)
      ]);

      if (packagesRes.data) {
        setPackages(packagesRes.data);
      } else if (packagesRes.error) {
        // Fallback simple query
        const fallback = await supabase.from('test_packages').select('*').order('created_at', { ascending: false });
        if (fallback.data) setPackages(fallback.data);
      }

      if (examsRes.data) setExams(examsRes.data);
      if (attemptsRes.data) setAttempts(attemptsRes.data);

      if (invoicesRes.data) {
        const counts = {};
        invoicesRes.data.forEach(inv => {
          counts[inv.package_id] = (counts[inv.package_id] || 0) + 1;
        });
        setPackageEnrollments(counts);
      }
    } catch (err) {
      console.error('[Fetch Test Series Error]:', err.message);
      showToast('Failed to load test series catalog', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // URL deep-linking (?id=...) sync with back-button support
  useEffect(() => {
    if (packages.length > 0) {
      if (urlPackageId) {
        const match = packages.find(p => p.id === urlPackageId);
        if (match) {
          setSelectedPackage(match);
          setIsDrawerOpen(true);
        }
      } else if (isDrawerOpen) {
        setIsDrawerOpen(false);
        setSelectedPackage(null);
      }
    }
  }, [urlPackageId, packages]);

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setIsDrawerOpen(true);
    router.replace(`/admin/test-series?id=${pkg.id}`, { scroll: false });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedPackage(null);
    router.replace('/admin/test-series', { scroll: false });
  };

  const handleTogglePackageStatus = async (pkgOrId, nextStatus) => {
    const pkgId = typeof pkgOrId === 'object' && pkgOrId !== null ? pkgOrId.id : pkgOrId;
    const currentPkg = packages.find(p => p.id === pkgId);
    const targetStatus = typeof nextStatus === 'boolean'
      ? nextStatus
      : (typeof pkgOrId === 'object' && pkgOrId !== null ? !(pkgOrId.is_active !== false) : !(currentPkg?.is_active !== false));

    // Optimistic UI state update
    setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, is_active: targetStatus } : p));
    setSelectedPackage(prev => prev?.id === pkgId ? { ...prev, is_active: targetStatus } : prev);

    try {
      const { error } = await supabase
        .from('test_packages')
        .update({ is_active: targetStatus })
        .eq('id', pkgId);

      if (error) throw error;

      showToast(`Package status set to ${targetStatus ? 'Active' : 'Inactive'}`, 'success');
      await invalidateCache('catalog', pkgId);
    } catch (err) {
      console.error('[Toggle Package Status Error]:', err.message);
      showToast('Failed to update package status: ' + err.message, 'error');
      // Revert optimistic update
      setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, is_active: !targetStatus } : p));
      setSelectedPackage(prev => prev?.id === pkgId ? { ...prev, is_active: !targetStatus } : prev);
    }
  };

  const handlePackageCreated = (newPkg) => {
    setPackages(prev => [newPkg, ...prev]);
    handleSelectPackage(newPkg);
  };

  const handlePackageUpdated = (updatedPkg) => {
    setPackages(prev => prev.map(p => p.id === updatedPkg.id ? { ...p, ...updatedPkg } : p));
    setSelectedPackage(prev => prev?.id === updatedPkg.id ? { ...prev, ...updatedPkg } : prev);
  };

  const handlePackageDeleted = async (pkgId) => {
    setPackages(prev => prev.filter(p => p.id !== pkgId));
    if (selectedPackage?.id === pkgId) {
      handleCloseDrawer();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    try {
      const { error } = await supabase.from('test_packages').delete().eq('id', deleteConfirmTarget.id);
      if (error) throw error;
      showToast('Test package blueprint successfully deleted', 'success');
      await invalidateCache('catalog', deleteConfirmTarget.id);
      handlePackageDeleted(deleteConfirmTarget.id);
    } catch (err) {
      showToast('Failed to delete package: ' + err.message, 'error');
    } finally {
      setDeleteConfirmTarget(null);
    }
  };

  // Quick stats calculations
  const totalPackages = packages.length;
  const totalExams = exams.length;
  const activeCandidates = Object.values(packageEnrollments).reduce((a, b) => a + b, 0) || attempts.length;
  const premiumPackages = packages.filter(p => p.price_ledger?.status === 'premium' || Number(p.price_ledger?.price || 0) > 0).length;
  const averageScore = attempts.length > 0 
    ? Math.round(attempts.reduce((sum, att) => sum + (att.score || 0), 0) / attempts.length) 
    : 0;

  const handleExamsUpdated = useCallback((updatedExams) => {
    setExams(updatedExams);
  }, []);

  return (
    <AdminLayoutShell
      title="Test Series & CBT Assessment Studio"
      subtitle="Configure CBT Mock Test Blueprints, Author Question Weightages, and Track Live Proctoring Telemetry"
    >
      <div className="space-y-6">
        {/* Metric Summary Ribbon */}
        <TestSeriesStatsHeader
          totalPackages={totalPackages}
          totalExams={totalExams}
          activeCandidates={activeCandidates}
          premiumPackages={premiumPackages}
          averageScore={averageScore}
        />

        {/* Bento Grid Layout */}
        <TestSeriesGrid
          packages={packages}
          isLoading={loading}
          packageEnrollments={packageEnrollments}
          selectedPackage={selectedPackage}
          onSelectPackage={handleSelectPackage}
          onCreatePackageClick={() => setIsCreateModalOpen(true)}
          onTogglePackageStatus={handleTogglePackageStatus}
          onDeletePackage={(pkgOrId) => {
            const pkgId = typeof pkgOrId === 'object' && pkgOrId !== null ? pkgOrId.id : pkgOrId;
            const match = packages.find(p => p.id === pkgId);
            setDeleteConfirmTarget(match || (typeof pkgOrId === 'object' && pkgOrId !== null ? pkgOrId : { id: pkgId, title: 'Test Package' }));
          }}
        />
      </div>

      {/* Slide-out Test Series Drawer */}
      <TestSeriesEditorDrawer
        isOpen={isDrawerOpen}
        packageData={selectedPackage}
        exams={exams}
        onClose={handleCloseDrawer}
        onPackageUpdated={handlePackageUpdated}
        onPackageDeleted={handlePackageDeleted}
        onExamsUpdated={handleExamsUpdated}
      />

      {/* Fast Test Package Blueprint Creation Modal */}
      <TestSeriesCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPackageCreated={handlePackageCreated}
      />

      {/* Safe Deletion Confirmation Dialog */}
      <ConfirmDialogModal
        isOpen={!!deleteConfirmTarget}
        title="Delete Test Series Package"
        message={`Are you sure you want to permanently delete "${deleteConfirmTarget?.title || 'this package'}" and all its linked exam blueprints and question papers?`}
        confirmLabel="Permanently Delete"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />
    </AdminLayoutShell>
  );
}

export default function TestSeriesDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
      </div>
    }>
      <TestSeriesManagementContent />
    </Suspense>
  );
}
