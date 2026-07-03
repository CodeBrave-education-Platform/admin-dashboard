'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import CourseManageClient from '@/components/CourseManageClient';
import { BookOpen, Layers, PlusCircle, X, Plus, Loader2, Trash2, UploadCloud, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invalidateCache } from '@/utils/invalidateCache';

const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('PDF.js can only be loaded in a browser context'));
      return;
    }
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      window.pdfjsLib = pdfjsLib;
      resolve(pdfjsLib);
    };
    script.onerror = (err) => reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(script);
  });
};

const loadMammoth = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Mammoth can only be loaded in a browser context'));
      return;
    }
    if (window.mammoth) {
      resolve(window.mammoth);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.onload = () => {
      resolve(window.mammoth);
    };
    script.onerror = (err) => reject(new Error('Failed to load Mammoth docx parser from CDN'));
    document.head.appendChild(script);
  });
};

const extractTextWithLayout = async (page) => {
  const textContent = await page.getTextContent();
  const items = textContent.items;
  if (!items || items.length === 0) return '';

  const linesMap = {};
  for (const item of items) {
    if (!item.str || (!item.str.trim() && item.str !== ' ')) continue;
    const y = item.transform[5];
    let foundY = null;
    for (const key of Object.keys(linesMap)) {
      if (Math.abs(parseFloat(key) - y) < 3.5) {
        foundY = key;
        break;
      }
    }
    if (foundY !== null) {
      linesMap[foundY].push(item);
    } else {
      linesMap[y] = [item];
    }
  }

  const sortedYs = Object.keys(linesMap)
    .map(Number)
    .sort((a, b) => b - a);

  const lines = [];
  for (const y of sortedYs) {
    const lineItems = linesMap[y];
    lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
    const lineStr = lineItems.map(item => item.str).join(' ');
    lines.push(lineStr);
  }

  return lines.join('\n');
};

const parseSyllabusText = (text) => {
  if (!text) return [];
  const lines = text.split('\n');
  const parsedLessons = [];
  let orderIndex = 1;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;

    // Filter out typical document headers / page numbers
    if (/^(?:page|chapter|syllabus|table of contents|index|course overview|curriculum)/i.test(trimmed)) continue;
    if (/^\d+\s*$/i.test(trimmed)) continue;

    let title = trimmed;
    let duration = 60; // default 60 minutes

    // Look for duration pattern like (120 mins) or [2 hours] or - 90 minutes
    const durationRegex = /(?:[-–—(📎[]\s*)?(\d+)\s*(?:min|minute|hour|hr|h|m)s?[\)\]]?\s*$/i;
    const durMatch = durationRegex.exec(trimmed);
    if (durMatch) {
      const val = parseInt(durMatch[1]);
      const unit = durMatch[0].toLowerCase();
      if (unit.includes('hour') || unit.includes('hr') || unit.includes('h')) {
        duration = val * 60;
      } else {
        duration = val;
      }
      title = trimmed.replace(durationRegex, '').trim();
    }

    // Clean title prefix like "1.", "Lesson 1:", "Module 2 -"
    const prefixRegex = /^(?:\d+[\.\-\s)]+|lesson\s*\d+[\.\-\s)]+|module\s*\d+[\.\-\s)]+|topic\s*\d+[\.\-\s)]+)\s*/i;
    title = title.replace(prefixRegex, '').trim();

    // Clean trailing dashes/punctuation
    title = title.replace(/^[:\-\s\+]+|[:\-\s\+]+$/g, '').trim();

    if (title && title.length > 2) {
      parsedLessons.push({
        id: `lesson-draft-${orderIndex}-${Date.now()}`,
        title,
        duration_minutes: duration,
        description: `Syllabus Unit: ${title}`,
        order_index: orderIndex++
      });
    }
  }

  return parsedLessons;
};

function CoursesManagementContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('id') || searchParams.get('courseId');

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeLessons, setActiveLessons] = useState([]);
  const [activeFiles, setActiveFiles] = useState([]);
  const [activeExams, setActiveExams] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  // Course addition states
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCoursePrice, setNewCoursePrice] = useState('0');
  const [newCourseLevel, setNewCourseLevel] = useState('foundation');
  const [newCourseStartDate, setNewCourseStartDate] = useState('');
  const [newCourseEndDate, setNewCourseEndDate] = useState('');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Syllabus Importer states
  const [showImportSyllabusModal, setShowImportSyllabusModal] = useState(false);
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [draftLessons, setDraftLessons] = useState([]);
  const [isImportingSyllabus, setIsImportingSyllabus] = useState(false);

  const handleSyllabusFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyllabusLoading(true);
    try {
      let extractedText = '';

      if (file.type === 'application/pdf') {
        const pdfjsLib = await loadPdfJs();
        const fileReader = new FileReader();
        const arrayBuffer = await new Promise((resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result);
          fileReader.onerror = () => reject(fileReader.error);
          fileReader.readAsArrayBuffer(file);
        });

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const pageText = await extractTextWithLayout(page);
          fullText += pageText + '\n';
        }
        extractedText = fullText;
      } else if (file.name.endsWith('.docx')) {
        const mammoth = await loadMammoth();
        const fileReader = new FileReader();
        const arrayBuffer = await new Promise((resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result);
          fileReader.onerror = () => reject(fileReader.error);
          fileReader.readAsArrayBuffer(file);
        });

        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else {
        throw new Error('Only PDF (.pdf) and Word (.docx) files are supported');
      }

      if (!extractedText.trim()) {
        throw new Error('No readable text content could be extracted from this document.');
      }

      const parsed = parseSyllabusText(extractedText);
      if (parsed.length === 0) {
        throw new Error('Could not identify any modules or lessons in this syllabus.');
      }

      setDraftLessons(parsed);
      alert(`Extracted ${parsed.length} curriculum lessons successfully! Feel free to review and tweak before final import.`);
    } catch (err) {
      alert(err.message || 'Failed to parse file');
      console.error('[Syllabus Import Failure]:', err);
    } finally {
      setSyllabusLoading(false);
      e.target.value = '';
    }
  };

  const handleImportSyllabus = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return alert('No course selected');
    if (draftLessons.length === 0) return alert('No lessons to import');

    setIsImportingSyllabus(true);
    try {
      const payload = draftLessons.map(l => ({
        course_id: selectedCourseId,
        title: l.title.trim(),
        duration_minutes: parseInt(l.duration_minutes) || 60,
        description: l.description.trim() || null,
        order_index: parseInt(l.order_index) || 1
      }));

      const { error } = await supabase
        .from('lessons')
        .insert(payload);

      if (error) throw error;

      alert('Curriculum successfully imported!');
      setShowImportSyllabusModal(false);
      setDraftLessons([]);

      // Reload the selected course content so the new lessons display instantly
      await handleSelectCourse(selectedCourseId);
      await invalidateCache('course', null, selectedCourseId);
    } catch (err) {
      console.error('[Import Syllabus Error]:', err.message);
      alert('Failed to import syllabus: ' + err.message);
    } finally {
      setIsImportingSyllabus(false);
    }
  };

  // Fetch courses list once on mount
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

  useEffect(() => {
    fetchCourses();
  }, [supabase]);

  // Load curriculum for selected course
  const handleSelectCourse = async (courseId) => {
    setSelectedCourseId(courseId);
    if (!courseId) {
      setActiveCourse(null);
      return;
    }

    setLoadingCurriculum(true);
    try {
      const targetCourse = courses.find(c => c.id === courseId);
      setActiveCourse(targetCourse || null);

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

  const handleDeleteCourse = async (courseId) => {
    const targetCourse = courses.find(c => c.id === courseId);
    if (!confirm(`Are you sure you want to permanently delete the course "${targetCourse?.title || ''}" and all its contents (lessons, files, exams, live classes)?`)) return;
    
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
        
      if (error) throw error;
      
      alert('Course successfully deleted');
      setCourses(prev => prev.filter(c => c.id !== courseId));
      setSelectedCourseId('');
      setActiveCourse(null);
      
      // Invalidate caches
      invalidateCache('catalog', courseId);
      invalidateCache('course', courseId);
    } catch (err) {
      console.error('[Delete Course Error]:', err.message);
      alert('Failed to delete course: ' + err.message);
    }
  };

  // Sync selection state with the URL query parameter
  useEffect(() => {
    if (courses.length > 0) {
      if (courseIdParam) {
        handleSelectCourse(courseIdParam);
      } else {
        setSelectedCourseId('');
        setActiveCourse(null);
      }
    }
  }, [courseIdParam, courses]);

  // Handle course creation submit
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return alert('Course title is required');
    
    setIsCreatingCourse(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated user session.');

      const { data, error } = await supabase
        .from('courses')
        .insert([{
          title: newCourseTitle.trim(),
          description: newCourseDesc.trim() || null,
          price: parseFloat(newCoursePrice) || 0,
          level: newCourseLevel,
          start_date: newCourseStartDate || null,
          end_date: newCourseEndDate || null,
          instructor_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Update state and list
      setCourses(prev => [data, ...prev]);
      setShowAddCourseModal(false);
      alert('Course blueprint established successfully!');
      
      // Reset fields
      setNewCourseTitle('');
      setNewCourseDesc('');
      setNewCoursePrice('0');
      setNewCourseLevel('foundation');
      setNewCourseStartDate('');
      setNewCourseEndDate('');

      // Invalidate caches
      invalidateCache('catalog', data.id);
      invalidateCache('course', data.id);

      // Auto-select the newly created course blueprint
      handleSelectCourse(data.id);
    } catch (err) {
      console.error('[Create Course Error]:', err.message);
      alert('Failed to establish course blueprint: ' + err.message);
    } finally {
      setIsCreatingCourse(false);
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

              {selectedCourseId && (
                <>
                  <button
                    onClick={() => setShowImportSyllabusModal(true)}
                    className="px-3.5 py-2.5 bg-indigo-50 border border-indigo-150 hover:bg-indigo-650 hover:text-white text-indigo-650 rounded-xl text-xs font-bold transition flex items-center gap-2 select-none cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98] shrink-0"
                    title="Import Syllabus from PDF/Word"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Import Syllabus</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(selectedCourseId)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition cursor-pointer shadow-xs border border-rose-100 hover:scale-[1.02] active:scale-[0.98] shrink-0"
                    title="Delete this Course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}

              <button
                onClick={() => setShowAddCourseModal(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 select-none cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98] tactile-press shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Course</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Display Panel with Skeleton Loader */}
        {loadingCurriculum ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-pulse">
            <aside className="lg:col-span-1 space-y-2.5">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="w-full h-16 bg-white border border-slate-200 rounded-3xl p-4 flex flex-col justify-center space-y-2 shadow-xs">
                  <div className="w-24 h-2.5 bg-slate-100 rounded" />
                  <div className="w-36 h-2 bg-slate-100 rounded" />
                </div>
              ))}
            </aside>
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 min-h-[480px] space-y-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="w-48 h-4 bg-slate-100 rounded" />
                <div className="w-64 h-2.5 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        ) : !selectedCourseId ? (
          <div className="text-center py-20 bg-slate-50/50 border border-slate-200 border-dashed rounded-3xl space-y-4 min-h-[350px] flex flex-col items-center justify-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
            <h3 className="font-extrabold text-sm text-slate-700">Blueprint Workspace Inactive</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
              Please choose a course catalog outline from the selection dropdown above, sidebar, or click "Add Course" to establish a new blueprint.
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

      {/* Course Creation Modal Overlay */}
      <AnimatePresence>
        {showAddCourseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddCourseModal(false)}
              className="absolute inset-0 cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full flex flex-col shadow-2xl relative text-slate-800 overflow-hidden z-10 p-6 md:p-8"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Create Course Blueprint</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Establish a new course catalog mapping</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddCourseModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4 pt-4 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Course Title</label>
                  <input
                    type="text"
                    required
                    value={newCourseTitle}
                    onChange={e => setNewCourseTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 transition font-bold"
                    placeholder="e.g. Adv Mechanics and Rotation"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Price (INR)</label>
                    <input
                      type="number"
                      required
                      value={newCoursePrice}
                      onChange={e => setNewCoursePrice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 transition font-bold"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Audience Level</label>
                    <select
                      value={newCourseLevel}
                      onChange={e => setNewCourseLevel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 transition cursor-pointer font-bold"
                    >
                      <option value="foundation">JEE Foundation</option>
                      <option value="mains">JEE Mains Capsule</option>
                      <option value="advanced">JEE Advanced Rigorous</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Start Date</label>
                    <input
                      type="date"
                      value={newCourseStartDate}
                      onChange={e => setNewCourseStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">End Date</label>
                    <input
                      type="date"
                      value={newCourseEndDate}
                      onChange={e => setNewCourseEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Syllabus Description</label>
                  <textarea
                    value={newCourseDesc}
                    onChange={e => setNewCourseDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 transition h-24 resize-none font-bold"
                    placeholder="Brief overview of course modules..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddCourseModal(false)}
                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingCourse}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {isCreatingCourse ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Establish Catalog</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showImportSyllabusModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!syllabusLoading && !isImportingSyllabus) {
                  setShowImportSyllabusModal(false);
                  setDraftLessons([]);
                }
              }}
              className="absolute inset-0 cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full flex flex-col shadow-2xl relative text-slate-800 overflow-hidden z-10 p-6 md:p-8 max-h-[85vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-650">
                    <UploadCloud className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Syllabus Auto-Importer</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Parse and load course lessons from PDF or Word documents</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportSyllabusModal(false);
                    setDraftLessons([]);
                  }}
                  disabled={syllabusLoading || isImportingSyllabus}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 transition cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {syllabusLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-600">Scanning document structures and compiling lesson modules...</p>
                  <p className="text-[10px] text-slate-400">This happens locally in your browser.</p>
                </div>
              )}

              {!syllabusLoading && draftLessons.length === 0 && (
                <div className="flex-1 py-12 flex flex-col items-center justify-center">
                  <div className="w-full max-w-md border-2 border-dashed border-slate-200 hover:border-indigo-455 rounded-2xl p-8 text-center bg-slate-50/50 transition cursor-pointer relative group">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleSyllabusFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud className="w-12 h-12 text-slate-350 mx-auto mb-4 group-hover:text-indigo-500 transition-colors" />
                    <h4 className="text-xs font-bold text-slate-700 mb-1">Click to browse or drag & drop</h4>
                    <p className="text-[10px] text-slate-400 mb-4">Syllabus PDF (.pdf) or Word Document (.docx)</p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-150 rounded-lg text-[9px] text-slate-500 font-semibold shadow-2xs">
                      <FileText className="w-3 h-3 text-indigo-500" />
                      <span>Processed locally & secure</span>
                    </div>
                  </div>
                </div>
              )}

              {!syllabusLoading && draftLessons.length > 0 && (
                <form onSubmit={handleImportSyllabus} className="flex-1 flex flex-col min-h-0 pt-4">
                  <div className="text-[10px] text-indigo-650 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 font-bold mb-4 flex items-center justify-between">
                    <span>Double-check extracted topics, tweak titles, or add/remove rows before committing.</span>
                    <button
                      type="button"
                      onClick={() => setDraftLessons([])}
                      className="text-[9px] text-indigo-650 hover:underline font-extrabold uppercase"
                    >
                      Reset File
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-xl mb-4">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-3 text-[9px] font-black text-slate-505 uppercase w-16">Seq</th>
                          <th className="p-3 text-[9px] font-black text-slate-505 uppercase">Lesson Unit Title</th>
                          <th className="p-3 text-[9px] font-black text-slate-505 uppercase w-28 text-center">Duration (mins)</th>
                          <th className="p-3 text-[9px] font-black text-slate-505 uppercase">Description</th>
                          <th className="p-3 text-[9px] font-black text-slate-550 uppercase w-12 text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftLessons.map((lesson) => (
                          <tr key={lesson.id} className="border-b border-slate-150 hover:bg-slate-50/50 transition">
                            <td className="p-2.5">
                              <input
                                type="number"
                                required
                                value={lesson.order_index}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setDraftLessons(prev => prev.map(item => item.id === lesson.id ? { ...item, order_index: val } : item));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 text-center font-bold outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                required
                                value={lesson.title}
                                onChange={(e) => {
                                  setDraftLessons(prev => prev.map(item => item.id === lesson.id ? { ...item, title: e.target.value } : item));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-850 font-bold outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                required
                                value={lesson.duration_minutes}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 60;
                                  setDraftLessons(prev => prev.map(item => item.id === lesson.id ? { ...item, duration_minutes: val } : item));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-800 text-center font-bold outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={lesson.description}
                                onChange={(e) => {
                                  setDraftLessons(prev => prev.map(item => item.id === lesson.id ? { ...item, description: e.target.value } : item));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-650 outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftLessons(prev => prev.filter(item => item.id !== lesson.id));
                                }}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-between items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const newSeq = draftLessons.length + 1;
                        setDraftLessons(prev => [
                          ...prev,
                          {
                            id: `lesson-draft-new-${Date.now()}`,
                            title: 'New Lesson Unit',
                            duration_minutes: 60,
                            description: 'Syllabus Unit',
                            order_index: newSeq
                          }
                        ]);
                      }}
                      className="px-4 py-2 bg-slate-105 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Row</span>
                    </button>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowImportSyllabusModal(false);
                          setDraftLessons([]);
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isImportingSyllabus}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        {isImportingSyllabus ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5" />
                        )}
                        <span>Import {draftLessons.length} Lessons</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayoutShell>
  );
}

export default function CoursesManagementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-650"></div>
      </div>
    }>
      <CoursesManagementContent />
    </Suspense>
  );
}
