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
        
        {/* Course Selection Deck */}
        <div className="bg-[#030303]/60 border border-zinc-900 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs uppercase text-zinc-400 tracking-wider">Active Course Blueprint</h3>
              <p className="text-[10px] text-zinc-550 mt-0.5 font-sans">Select a course registry to load syllabus blueprints</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {loadingCourses ? (
              <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin" />
            ) : (
              <select
                value={selectedCourseId}
                onChange={e => handleSelectCourse(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-white rounded-xl outline-none focus:border-indigo-500 transition cursor-pointer font-bold w-full sm:w-64"
              >
                <option value="">-- Choose Course Catalog --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Dynamic Display Panel */}
        {loadingCurriculum ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Compiling Syllabus Blueprint Data...</p>
          </div>
        ) : !selectedCourseId ? (
          <div className="text-center py-20 bg-[#030303]/20 border border-zinc-900 rounded-3xl space-y-4">
            <BookOpen className="w-12 h-12 text-zinc-700 mx-auto animate-pulse" />
            <h3 className="font-extrabold text-sm text-zinc-400">Blueprint Workspace Inactive</h3>
            <p className="text-xs text-zinc-550 max-w-sm mx-auto leading-relaxed">
              Please choose a course catalog outline from the selection dropdown above to unlock the 5-tab configuration workspace.
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
