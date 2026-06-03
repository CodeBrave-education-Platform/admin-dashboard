'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import CourseManageClient from '@/components/CourseManageClient';
import { BookOpen, RefreshCw, Layers, Award, AlertCircle } from 'lucide-react';

export default function CoursesManagementPage() {
  const supabase = createClient();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeLessons, setActiveLessons] = useState([]);
  const [activeFiles, setActiveFiles] = useState([]);
  const [activeExams, setActiveExams] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCourses(data || []);
      } catch (err) {
        console.error('[Fetch Courses Error]:', err.message);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [supabase]);

  const handleSelectCourse = async (courseId) => {
    setSelectedCourseId(courseId);
    if (!courseId) {
      setActiveCourse(null);
      return;
    }

    setLoadingCurriculum(true);
    try {
      const targetCourse = courses.find(c => c.id === courseId);
      setActiveCourse(targetCourse);

      // 1. Fetch lessons
      const { data: lessonsData, error: lesErr } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      if (lesErr) throw lesErr;
      setActiveLessons(lessonsData || []);

      // 2. Fetch course files
      const { data: filesData, error: filesErr } = await supabase
        .from('course_files')
        .select('*')
        .eq('course_id', courseId);
      if (filesErr) throw filesErr;
      setActiveFiles(filesData || []);

      // 3. Fetch linked exams/assessments
      const { data: examsData, error: examsErr } = await supabase
        .from('assessments')
        .select('*')
        .eq('course_id', courseId);
      if (examsErr) throw examsErr;
      setActiveExams(examsData || []);

    } catch (err) {
      console.error('[Ingest Curriculum Error]:', err.message);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  return (
    <AdminLayoutShell 
      title="Syllabus & Blueprint Manager"
      subtitle="Assemble dynamic lessons, upload reference worksheets, and orchestrate live classroom telemetry"
    >
      <div className="space-y-6 animate-fade-in font-sans">
        
        {/* Course Selection Deck with Skeleton Loader */}
        {loadingCourses ? (
          <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-300">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <div className="w-32 h-3 bg-slate-100 rounded" />
                <div className="w-48 h-2 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="w-full sm:w-64 h-10 bg-slate-50 border border-slate-150 rounded-xl" />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider font-sans">Active Course Blueprint</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Select a course registry to load syllabus blueprints</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedCourseId}
                onChange={e => handleSelectCourse(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs text-slate-800 rounded-xl outline-none focus:border-indigo-500 transition cursor-pointer font-bold w-full sm:w-64 shadow-xs"
              >
                <option value="">-- Choose Course Catalog --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Dynamic Display Panel with Skeleton Loader */}
        {loadingCurriculum ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-pulse">
            {/* Left sidebar skeleton */}
            <aside className="lg:col-span-1 space-y-2.5">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="w-full h-16 bg-white border border-slate-200 rounded-3xl p-4 flex flex-col justify-center space-y-2 shadow-xs">
                  <div className="w-24 h-2.5 bg-slate-100 rounded" />
                  <div className="w-36 h-2 bg-slate-100 rounded" />
                </div>
              ))}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-2 h-28 flex flex-col justify-center shadow-xs">
                <div className="w-16 h-2.5 bg-slate-100 rounded" />
                <div className="w-28 h-2 bg-slate-100 rounded" />
                <div className="w-28 h-2 bg-slate-100 rounded" />
              </div>
            </aside>
            {/* Main content skeleton */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 min-h-[480px] space-y-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="w-48 h-4 bg-slate-100 rounded" />
                <div className="w-64 h-2.5 bg-slate-100 rounded" />
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-slate-50 border border-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-50 border border-slate-100 rounded-xl" />
                  </div>
                  <div className="h-28 bg-slate-50 border border-slate-100 rounded-xl" />
                </div>
              </div>
              <div className="w-32 h-10 bg-slate-100 rounded-xl self-end" />
            </div>
          </div>
        ) : !selectedCourseId ? (
          <div className="text-center py-20 bg-slate-50/50 border border-slate-200 border-dashed rounded-3xl space-y-4 min-h-[350px] flex flex-col items-center justify-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
            <h3 className="font-extrabold text-sm text-slate-700">Blueprint Workspace Inactive</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
              Please choose a course catalog outline from the selection dropdown above to unlock the 7-tab configuration workspace.
            </p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <CourseManageClient 
              key={selectedCourseId}
              initialCourse={activeCourse}
              initialLessons={activeLessons}
              initialFiles={activeFiles}
              initialExams={activeExams}
            />
          </div>
        )}

      </div>
    </AdminLayoutShell>
  );
}
