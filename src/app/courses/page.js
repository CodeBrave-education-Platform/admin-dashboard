'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialogModal from '@/components/ConfirmDialogModal';
import CourseGrid from '@/components/courses/CourseGrid';
import CourseEditorDrawer from '@/components/courses/CourseEditorDrawer';
import CourseCreateModal from '@/components/courses/CourseCreateModal';
import SyllabusImportModal from '@/components/courses/SyllabusImportModal';
import { BookOpen, Layers, Users, Sparkles, Trophy } from 'lucide-react';

function CoursesManagementContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const urlCourseId = searchParams.get('id') || searchParams.get('courseId');

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetCourse, setImportTargetCourse] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  // Fetch courses with nested curriculum counts
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('courses')
        .select(`
          *,
          lessons (id),
          course_files (id),
          assessments (id)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        // Fallback to simple select if relations differ
        const fallback = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        setCourses(fallback.data || []);
      } else {
        const enriched = (data || []).map(c => ({
          ...c,
          lessons_count: c.lessons?.length ?? 0,
          files_count: c.course_files?.length ?? 0,
          exams_count: c.assessments?.length ?? 0
        }));
        setCourses(enriched);
      }
    } catch (err) {
      console.error('[Fetch Courses Error]:', err.message);
      showToast('Failed to load courses catalog', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // URL sync for deep linking (?id=...) with resilient back-navigation handling
  useEffect(() => {
    if (courses.length > 0) {
      if (urlCourseId) {
        const match = courses.find(c => c.id === urlCourseId);
        if (match) {
          setSelectedCourse(match);
          setIsDrawerOpen(true);
        }
      } else if (isDrawerOpen) {
        setIsDrawerOpen(false);
        setSelectedCourse(null);
      }
    }
  }, [urlCourseId, courses]);

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setIsDrawerOpen(true);
    router.replace(`/courses?id=${course.id}`, { scroll: false });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedCourse(null);
    router.replace('/courses', { scroll: false });
  };

  const handleToggleCourseStatus = async (target, nextStatus) => {
    const courseId = typeof target === 'object' && target?.id ? target.id : target;
    const currentCourse = courses.find(c => c.id === courseId);
    const targetStatus = nextStatus !== undefined ? nextStatus : (currentCourse ? !currentCourse.is_active : true);

    // Optimistic state update
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, is_active: targetStatus } : c));
    setSelectedCourse(prev => prev?.id === courseId ? { ...prev, is_active: targetStatus } : prev);

    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_active: targetStatus })
        .eq('id', courseId);

      if (error) throw error;

      showToast(`Course status updated to ${targetStatus ? 'Active' : 'Inactive'}`, 'success');
      await invalidateCache('catalog', courseId);
      await invalidateCache('course', courseId);
    } catch (err) {
      console.error('[Toggle Course Status Error]:', err.message);
      showToast('Failed to update course status: ' + err.message, 'error');
      // Revert optimistic update
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, is_active: !targetStatus } : c));
      setSelectedCourse(prev => prev?.id === courseId ? { ...prev, is_active: !targetStatus } : prev);
    }
  };

  const handleCourseCreated = (newCourse) => {
    setCourses(prev => [newCourse, ...prev]);
    handleSelectCourse(newCourse);
  };

  const handleCourseUpdated = (updatedCourse) => {
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? { ...c, ...updatedCourse } : c));
    setSelectedCourse(prev => prev?.id === updatedCourse.id ? { ...prev, ...updatedCourse } : prev);
  };

  const handleCourseDeleted = async (courseId) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
    if (selectedCourse?.id === courseId) {
      handleCloseDrawer();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    try {
      const { error } = await supabase.from('courses').delete().eq('id', deleteConfirmTarget.id);
      if (error) throw error;
      showToast('Course successfully deleted', 'success');
      await invalidateCache('catalog', deleteConfirmTarget.id);
      await invalidateCache('course', deleteConfirmTarget.id);
      handleCourseDeleted(deleteConfirmTarget.id);
    } catch (err) {
      showToast('Failed to delete course: ' + err.message, 'error');
    } finally {
      setDeleteConfirmTarget(null);
    }
  };

  // Quick stats calculations
  const totalCourses = courses.length;
  const foundationCount = courses.filter(c => (c.level || '').toLowerCase() === 'foundation').length;
  const mainsCount = courses.filter(c => (c.level || '').toLowerCase() === 'mains').length;
  const advancedCount = courses.filter(c => (c.level || '').toLowerCase() === 'advanced').length;
  const totalStudents = courses.reduce((acc, c) => acc + (c.students_count || 0), 0);

  return (
    <AdminLayoutShell
      title="Course Catalog & Blueprint Command Center"
      subtitle="Architect high-performance syllabi, manage CBT examinations, and monitor classroom enrollment"
    >
      <div className="space-y-6">
        {/* Metric Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Total Courses</span>
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xl font-black text-slate-900 font-mono">{totalCourses}</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Foundation</span>
              <span className="w-2 h-2 rounded-full bg-sky-500" />
            </div>
            <p className="text-xl font-black text-slate-900 font-mono">{foundationCount}</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Mains</span>
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            </div>
            <p className="text-xl font-black text-slate-900 font-mono">{mainsCount}</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Advanced</span>
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <p className="text-xl font-black text-slate-900 font-mono">{advancedCount}</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs col-span-2 sm:col-span-4 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Active Candidates</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-700 font-mono">{totalStudents.toLocaleString()}</p>
          </div>
        </div>

        {/* Bento Grid Layout Component */}
        <CourseGrid
          courses={courses}
          isLoading={loading}
          onSelectCourse={handleSelectCourse}
          onCreateCourse={() => setIsCreateModalOpen(true)}
          onCreateCourseClick={() => setIsCreateModalOpen(true)}
          onImportSyllabusClick={(course) => {
            setImportTargetCourse(course || selectedCourse || courses[0] || null);
            setIsImportModalOpen(true);
          }}
          onImportSyllabus={(course) => {
            setImportTargetCourse(course || selectedCourse || courses[0] || null);
            setIsImportModalOpen(true);
          }}
          onToggleCourseStatus={handleToggleCourseStatus}
          onDeleteCourse={async (target) => {
            const courseId = typeof target === 'object' && target?.id ? target.id : target;
            const match = courses.find(c => c.id === courseId);
            setDeleteConfirmTarget(match || (typeof target === 'object' ? target : { id: courseId, title: 'Course' }));
          }}
        />
      </div>

      {/* Slide-out Course Management Drawer */}
      <CourseEditorDrawer
        isOpen={isDrawerOpen}
        course={selectedCourse}
        onClose={handleCloseDrawer}
        onCourseUpdated={handleCourseUpdated}
        onCourseDeleted={handleCourseDeleted}
        onImportSyllabusRequested={(course) => {
          setImportTargetCourse(course);
          setIsImportModalOpen(true);
        }}
      />

      {/* Fast Blueprint Creation Modal */}
      <CourseCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCourseCreated={handleCourseCreated}
      />

      {/* Universal Document Syllabus Importer Modal */}
      <SyllabusImportModal
        isOpen={isImportModalOpen}
        course={importTargetCourse}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportTargetCourse(null);
        }}
        onLessonsImported={async () => {
          await fetchCourses();
        }}
      />

      {/* Safe Deletion Confirmation Dialog */}
      <ConfirmDialogModal
        isOpen={!!deleteConfirmTarget}
        title="Delete Course Blueprint"
        message={`Are you sure you want to permanently delete "${deleteConfirmTarget?.title || 'this course'}" and all its lessons, worksheets, and exams?`}
        confirmLabel="Permanently Delete"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />
    </AdminLayoutShell>
  );
}

export default function CoursesManagementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
      </div>
    }>
      <CoursesManagementContent />
    </Suspense>
  );
}
