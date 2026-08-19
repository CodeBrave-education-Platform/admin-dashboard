'use client'

import React, { useState, useMemo } from 'react';
import {
  useLegacyTable as useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel
} from '@tanstack/react-table/legacy';
import { flexRender } from '@tanstack/react-table';
import { 
  Search, PlusCircle, UploadCloud, BookOpen, 
  Layers, FileText, ClipboardList, Trash2, Edit3, 
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Users, CheckCircle2, IndianRupee, Sparkles, Download, Eye,
  Atom, FlaskConical, Pi, GraduationCap, Package, LayoutGrid,
  Table as TableIcon, Filter, Check, X, ArrowUpRight, ShieldCheck,
  Tag, Clock, Calendar, CheckSquare, Square
} from 'lucide-react';

/**
 * Dynamic Subject-Specific Fallback & Thumbnail Image Component
 */
function CourseThumbnail({ course, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const subject = (course.subject || 'General').toLowerCase();

  const getSubjectFallback = () => {
    if (subject.includes('phys')) {
      return {
        icon: Atom,
        label: 'Physics Mastery',
        gradient: 'from-slate-950 via-indigo-950 to-blue-900',
        accentBg: 'bg-indigo-500/20 text-cyan-300 border-cyan-400/30',
        glowColor: 'bg-cyan-500/20'
      };
    }
    if (subject.includes('chem')) {
      return {
        icon: FlaskConical,
        label: 'Chemistry Blueprint',
        gradient: 'from-slate-950 via-emerald-950 to-teal-900',
        accentBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
        glowColor: 'bg-emerald-500/20'
      };
    }
    if (subject.includes('math') || subject.includes('calc')) {
      return {
        icon: Pi,
        label: 'Mathematics Studio',
        gradient: 'from-slate-950 via-purple-950 to-amber-950',
        accentBg: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
        glowColor: 'bg-amber-500/20'
      };
    }
    return {
      icon: BookOpen,
      label: course.subject || 'General Course',
      gradient: 'from-slate-950 via-indigo-950 to-slate-900',
      accentBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
      glowColor: 'bg-indigo-500/20'
    };
  };

  const fallback = getSubjectFallback();
  const FallbackIcon = fallback.icon;

  if (course.thumbnail_url && !imgError) {
    return (
      <div className={`relative w-full h-full overflow-hidden bg-slate-900 ${className}`}>
        <img
          src={course.thumbnail_url}
          alt={course.title || 'Course Thumbnail'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        {/* Dark Scrim Gradients for text & badge clarity */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/60 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-br ${fallback.gradient} flex items-center justify-center ${className}`}>
      {/* Dynamic ambient mesh glow circles */}
      <div className={`absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl ${fallback.glowColor} pointer-events-none`} />
      <div className={`absolute -bottom-10 -left-10 w-36 h-36 rounded-full blur-2xl ${fallback.glowColor} pointer-events-none`} />

      {/* Sleek Grid/Subtle geometry */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" 
      />

      {/* Centered glassmorphic emblem */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center space-y-2 group-hover:scale-105 transition-transform duration-500">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl backdrop-blur-md ${fallback.accentBg}`}>
          <FallbackIcon className="w-7 h-7 animate-pulse" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-200/90 drop-shadow-sm font-mono">
          {fallback.label}
        </span>
      </div>

      {/* Dark Scrim Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/60 pointer-events-none" />
    </div>
  );
}

/**
 * Audience Level Badge Configuration Helper
 */
function getLevelBadge(levelStr) {
  const level = (levelStr || 'foundation').toLowerCase();
  if (level.includes('advanced')) {
    return {
      label: 'JEE Advanced',
      pillClass: 'bg-purple-500/25 border-purple-400/40 text-purple-200'
    };
  }
  if (level.includes('mains') || level.includes('main')) {
    return {
      label: 'JEE Mains',
      pillClass: 'bg-indigo-500/25 border-indigo-400/40 text-indigo-200'
    };
  }
  return {
    label: 'Foundation',
    pillClass: 'bg-sky-500/25 border-sky-400/40 text-sky-200'
  };
}

export default function CourseGrid({
  courses = [],
  isLoading = false,
  onSelectCourse,
  onCreateCourse,
  onCreateCourseClick,
  onImportSyllabus,
  onImportSyllabusClick,
  onToggleCourseStatus,
  onDeleteCourse
}) {
  // Support both prop variants seamlessly
  const handleCreateCourse = onCreateCourse || onCreateCourseClick || (() => {});
  const handleImportSyllabus = onImportSyllabusClick || onImportSyllabus || (() => {});

  const [viewMode, setViewMode] = useState('bento'); // 'bento' | 'table'
  const [globalFilter, setGlobalFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('created_desc'); // 'created_desc' | 'created_asc' | 'title_asc' | 'price_desc' | 'price_asc' | 'students_desc' | 'lessons_desc'
  const [rowSelection, setRowSelection] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // 1. Filter courses by level and status
  const filteredData = useMemo(() => {
    let result = courses.filter(c => {
      // Level filter
      if (levelFilter !== 'ALL' && (c.level || '').toLowerCase() !== levelFilter.toLowerCase()) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL') {
        const isActive = c.is_active !== false;
        if (statusFilter === 'ACTIVE' && !isActive) return false;
        if (statusFilter === 'INACTIVE' && isActive) return false;
      }
      // Search term filter
      if (globalFilter.trim()) {
        const search = globalFilter.toLowerCase().trim();
        const matchTitle = String(c.title || '').toLowerCase().includes(search);
        const matchSubject = String(c.subject || '').toLowerCase().includes(search);
        const matchDesc = String(c.description || '').toLowerCase().includes(search);
        const matchAudience = String(c.target_audience || c.badge || '').toLowerCase().includes(search);
        const matchLevel = String(c.level || '').toLowerCase().includes(search);
        const matchInstructor = String(c.instructor_name || c.instructor || '').toLowerCase().includes(search);
        if (!matchTitle && !matchSubject && !matchDesc && !matchAudience && !matchLevel && !matchInstructor) {
          return false;
        }
      }
      return true;
    });

    // 2. Sort courses based on sortOption
    result = [...result].sort((a, b) => {
      if (sortOption === 'created_desc') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortOption === 'created_asc') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortOption === 'title_asc') {
        return String(a.title || '').localeCompare(String(b.title || ''));
      }
      if (sortOption === 'price_desc') {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (sortOption === 'price_asc') {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (sortOption === 'students_desc') {
        return Number(b.students_count || 0) - Number(a.students_count || 0);
      }
      if (sortOption === 'lessons_desc') {
        const countA = a.lessons_count || a.lessons?.length || 0;
        const countB = b.lessons_count || b.lessons?.length || 0;
        return countB - countA;
      }
      return 0;
    });

    return result;
  }, [courses, levelFilter, statusFilter, globalFilter, sortOption]);

  // Pagination for Bento Grid
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Handle filter changes with page index reset
  const handleLevelFilterChange = (level) => {
    setLevelFilter(level);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleGlobalFilterChange = (val) => {
    setGlobalFilter(val);
    setCurrentPage(1);
  };

  const toggleSelectCourse = (courseId, e) => {
    e?.stopPropagation();
    setRowSelection(prev => {
      const next = { ...prev };
      if (next[courseId]) {
        delete next[courseId];
      } else {
        next[courseId] = true;
      }
      return next;
    });
  };

  const isAllSelected = paginatedCourses.length > 0 && paginatedCourses.every(c => rowSelection[c.id]);
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setRowSelection(prev => {
        const next = { ...prev };
        paginatedCourses.forEach(c => delete next[c.id]);
        return next;
      });
    } else {
      setRowSelection(prev => {
        const next = { ...prev };
        paginatedCourses.forEach(c => { next[c.id] = true; });
        return next;
      });
    }
  };

  const selectedCount = Object.keys(rowSelection).length;

  const handleExportCSV = () => {
    const exportData = selectedCount > 0
      ? courses.filter(c => rowSelection[c.id])
      : filteredData;

    const headers = ['ID', 'Title', 'Level', 'Subject', 'Status', 'Price', 'Original Price', 'Students Count', 'Lessons Count', 'Files Count', 'Exams Count', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const item of exportData) {
      const lessonCount = item.lessons_count || item.lessons?.length || 0;
      const filesCount = item.files_count || item.course_files?.length || 0;
      const examsCount = item.exams_count || item.assessments?.length || 0;

      csvRows.push([
        `"${item.id}"`,
        `"${(item.title || '').replace(/"/g, '""')}"`,
        `"${item.level || ''}"`,
        `"${item.subject || ''}"`,
        item.is_active !== false ? '"ACTIVE"' : '"INACTIVE"',
        item.price || 0,
        item.original_price || '',
        item.students_count || 0,
        lessonCount,
        filesCount,
        examsCount,
        `"${item.created_at || ''}"`
      ].join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `courses_catalog_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // TanStack Table columns (for Table view mode)
  const columns = useMemo(() => [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={handleToggleSelectAll}
          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          aria-label="Select all courses"
        />
      ),
      cell: ({ row }) => {
        const course = row.original;
        const isSelected = !!rowSelection[course.id];
        return (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => toggleSelectCourse(course.id, e)}
            onClick={(e) => e.stopPropagation()}
            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            aria-label="Select course"
          />
        );
      },
      size: 40
    },
    {
      accessorKey: 'title',
      header: 'Course Blueprint',
      cell: ({ row }) => {
        const course = row.original;
        return (
          <div className="flex items-center gap-3 min-w-[240px]">
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
              <CourseThumbnail course={course} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate max-w-[280px] group-hover:text-indigo-600 transition">
                {course.title}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5" suppressHydrationWarning>
                {course.subject || 'General'} • Created {new Date(course.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'level',
      header: 'Target Level',
      cell: ({ row }) => {
        const levelBadge = getLevelBadge(row.original.level);
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${
            levelBadge.label === 'JEE Advanced' 
              ? 'bg-purple-50 text-purple-700 border-purple-200' 
              : levelBadge.label === 'JEE Mains'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-sky-50 text-sky-700 border-sky-200'
          }`}>
            {levelBadge.label}
          </span>
        );
      }
    },
    {
      id: 'metrics',
      header: 'Curriculum Density',
      cell: ({ row }) => {
        const course = row.original;
        const lessonCount = course.lessons_count || (course.lessons?.length ?? 0);
        const filesCount = course.files_count || (course.course_files?.length ?? 0);
        const examsCount = course.exams_count || (course.assessments?.length ?? 0);

        return (
          <div className="flex items-center gap-1.5 flex-wrap min-w-[190px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold" title="Lesson Units">
              <Layers className="w-3 h-3 text-indigo-500" />
              <span>{lessonCount} Units</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold" title="Worksheet Files">
              <FileText className="w-3 h-3 text-teal-500" />
              <span>{filesCount} Files</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold" title="CBT Assessments">
              <ClipboardList className="w-3 h-3 text-amber-500" />
              <span>{examsCount} CBTs</span>
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const course = row.original;
        const isActive = course.is_active !== false;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleCourseStatus) {
                onToggleCourseStatus(course.id || course, !isActive);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border transition cursor-pointer ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
            title={isActive ? 'Click to Deactivate' : 'Click to Activate'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>{isActive ? 'Active' : 'Inactive'}</span>
          </button>
        );
      }
    },
    {
      accessorKey: 'price',
      header: 'Pricing',
      cell: ({ row }) => {
        const price = row.original.price || 0;
        const originalPrice = row.original.original_price;
        return (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-black text-slate-900 font-mono">
              ₹{Number(price).toLocaleString('en-IN')}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[10px] text-slate-400 line-through font-mono">
                ₹{Number(originalPrice).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'students_count',
      header: 'Enrolled',
      cell: ({ row }) => {
        const count = row.original.students_count || 0;
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
            <Users className="w-3 h-3" />
            <span>{count} Students</span>
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const course = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onSelectCourse && onSelectCourse(course)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
              title="Open Course Editor Drawer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => handleImportSyllabus(course)}
              className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl transition cursor-pointer"
              title="Import Syllabus from PDF / Word"
            >
              <UploadCloud className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onDeleteCourse && onDeleteCourse(course.id || course)}
              className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="Delete Course Blueprint"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ], [onSelectCourse, onDeleteCourse, onToggleCourseStatus, isAllSelected, rowSelection, handleImportSyllabus]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Control Bar Deck */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
        {/* Left: Search Omnibar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={globalFilter}
            onChange={e => handleGlobalFilterChange(e.target.value)}
            placeholder="Search courses by title, subject, faculty, or tags..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9.5 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 font-bold outline-none focus:border-indigo-500 focus:bg-white transition"
          />
          {globalFilter && (
            <button
              type="button"
              onClick={() => handleGlobalFilterChange('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Middle: Level & Status Filter Pills */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 xl:pb-0">
          {/* Level Filter Pills */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Levels' },
              { id: 'FOUNDATION', label: 'Foundation' },
              { id: 'MAINS', label: 'Mains' },
              { id: 'ADVANCED', label: 'Advanced' }
            ].map(pill => {
              const isActive = levelFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => handleLevelFilterChange(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'INACTIVE', label: 'Inactive' }
            ].map(pill => {
              const isActive = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => handleStatusFilterChange(pill.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Sort, Layout Toggle & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap xl:flex-nowrap shrink-0">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-slate-700 dark:text-slate-200 outline-none cursor-pointer hover:bg-slate-100 transition"
              aria-label="Sort catalog"
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="students_desc">Most Enrolled</option>
              <option value="lessons_desc">Curriculum Density</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('bento')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'bento'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
              title="Bento Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
              title="Compact Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Import Syllabus Action */}
          <button
            type="button"
            onClick={() => handleImportSyllabus()}
            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Import Syllabus from PDF / Word"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Import Syllabus</span>
          </button>

          {/* Create Course Action */}
          <button
            type="button"
            onClick={handleCreateCourse}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {/* Floating Bulk Actions Bar (when items are selected) */}
      {selectedCount > 0 && (
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-xl border border-slate-800 animate-fade-in">
          <div className="flex items-center gap-3 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{selectedCount} course blueprint(s) selected</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="text-xs text-slate-300 hover:text-white font-bold cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-xs font-bold text-slate-500">Loading course registry & blueprints...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="py-24 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">No Course Blueprints Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {globalFilter
                ? `No course matching "${globalFilter}". Try clearing your search query.`
                : 'Start by creating your first competitive course blueprint or importing a syllabus.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateCourse}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Course Blueprint</span>
          </button>
        </div>
      ) : viewMode === 'bento' ? (
        /* ========================================================================= */
        /* PREMIUM ASYMMETRIC BENTO GRID LAYOUT                                      */
        /* ========================================================================= */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedCourses.map((course, index) => {
              const isHeroCard = index === 0 && paginatedCourses.length > 1;
              const isSelected = !!rowSelection[course.id];
              const isActive = course.is_active !== false;
              const levelBadge = getLevelBadge(course.level);
              const lessonCount = course.lessons_count || (course.lessons?.length ?? 0);
              const filesCount = course.files_count || (course.course_files?.length ?? 0);
              const examsCount = course.exams_count || (course.assessments?.length ?? 0);
              const price = Number(course.price || 0);
              const originalPrice = course.original_price ? Number(course.original_price) : null;
              const discountPercent = originalPrice && originalPrice > price
                ? Math.round(((originalPrice - price) / originalPrice) * 100)
                : null;

              return (
                <div
                  key={course.id}
                  onClick={() => onSelectCourse && onSelectCourse(course)}
                  className={`group relative flex flex-col justify-between bg-white dark:bg-slate-900 border ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/30 dark:border-indigo-500'
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-400/80 dark:hover:border-indigo-500/80'
                  } rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer ${
                    isHeroCard ? 'col-span-1 md:col-span-2 lg:col-span-2' : 'col-span-1'
                  }`}
                >
                  {/* Top Media Section with Floating Glassmorphic Badges */}
                  <div>
                    <div className={`relative w-full ${isHeroCard ? 'aspect-[16/9] sm:aspect-[21/9]' : 'aspect-video'} overflow-hidden`}>
                      <CourseThumbnail course={course} />

                      {/* Top-Left Floating Badges: Multi-select Checkbox + Level Pill + Badge */}
                      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 flex-wrap max-w-[80%]">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => toggleSelectCourse(course.id, e)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center backdrop-blur-md border transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : 'bg-slate-900/60 border-slate-700/60 text-white/70 hover:bg-slate-900/90'
                          }`}
                          title="Select Course for bulk export"
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Square className="w-3 h-3 opacity-60" />}
                        </button>

                        {/* Level Pill */}
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border backdrop-blur-md uppercase tracking-wider ${levelBadge.pillClass}`}>
                          {levelBadge.label}
                        </span>

                        {/* Marketing Badge */}
                        {course.badge && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-500/30 border border-amber-400/40 text-amber-200 backdrop-blur-md flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>{course.badge}</span>
                          </span>
                        )}
                      </div>

                      {/* Top-Right Floating Badge: Interactive Status Toggle Switch */}
                      <div className="absolute top-3 right-3 z-20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleCourseStatus) {
                              onToggleCourseStatus(course.id || course, !isActive);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black border backdrop-blur-md transition flex items-center gap-1.5 cursor-pointer shadow-lg ${
                            isActive
                              ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/35'
                              : 'bg-slate-900/70 border-slate-700/60 text-slate-300 hover:bg-slate-900/90'
                          }`}
                          title={isActive ? 'Click to Deactivate Course' : 'Click to Activate Course'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                          <span>{isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </div>

                      {/* Bottom Floating Badges: Price Pill & Enrolled Count */}
                      <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between gap-2">
                        {/* Price Pill */}
                        <div className="px-2.5 py-1 rounded-xl bg-slate-950/75 border border-slate-800/80 backdrop-blur-md flex items-baseline gap-1.5 shadow-lg">
                          <span className="text-xs font-black text-white font-mono">
                            ₹{price.toLocaleString('en-IN')}
                          </span>
                          {originalPrice && originalPrice > price && (
                            <span className="text-[10px] text-slate-400 line-through font-mono">
                              ₹{originalPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                          {discountPercent && (
                            <span className="text-[9px] font-black px-1 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                              {discountPercent}% OFF
                            </span>
                          )}
                        </div>

                        {/* Enrolled Students Pill */}
                        <div className="px-2.5 py-1 rounded-xl bg-slate-950/75 border border-slate-800/80 backdrop-blur-md flex items-center gap-1.5 text-[10px] font-black text-emerald-300 font-mono shadow-lg">
                          <Users className="w-3 h-3 text-emerald-400" />
                          <span>{Number(course.students_count || 0).toLocaleString('en-IN')} Enrolled</span>
                        </div>
                      </div>
                    </div>

                    {/* Bento Body Compartment */}
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Subject & Faculty Attribution */}
                      <div className="flex items-center justify-between text-[11px] font-black">
                        <span className="uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                          {course.subject || 'General'}
                        </span>
                        <span className="text-slate-400 font-medium truncate max-w-[140px]" title={course.instructor_name || 'Asentra Faculty'}>
                          {course.instructor_name || 'Asentra Faculty'}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className={`font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition leading-snug line-clamp-2 ${
                        isHeroCard ? 'text-lg sm:text-xl' : 'text-sm'
                      }`}>
                        {course.title}
                      </h3>

                      {/* Description Snippet */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                        {course.description || 'Comprehensive curriculum with high-definition video modules, structured worksheets, and proctored CBT examinations.'}
                      </p>

                      {/* Bundled Physical Kit Indicator (if configured) */}
                      {course.book_kit && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 px-2.5 py-1 rounded-xl">
                          <Package className="w-3.5 h-3.5 shrink-0 text-violet-500" />
                          <span className="truncate">{course.book_kit}</span>
                        </div>
                      )}

                      {/* Curriculum Density Bento Strip */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-black" title="Syllabus Lesson Units">
                          <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>{lessonCount} Units</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-black" title="Reference Worksheets">
                          <FileText className="w-3 h-3 text-teal-500 shrink-0" />
                          <span>{filesCount} Files</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-black" title="CBT Mock Assessments">
                          <ClipboardList className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{examsCount} CBTs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bento Footer: Creation Date & Quick Admin Controls Deck */}
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 font-medium truncate" suppressHydrationWarning>
                      {new Date(course.created_at || Date.now()).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Fast Import Syllabus Button */}
                      <button
                        type="button"
                        onClick={() => handleImportSyllabus(course)}
                        className="p-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 rounded-xl text-xs font-black transition cursor-pointer shadow-2xs"
                        title="Import Syllabus from PDF / Word (.docx)"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                      </button>

                      {/* Primary Edit Course Button */}
                      <button
                        type="button"
                        onClick={() => onSelectCourse && onSelectCourse(course)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Open Blueprint Studio Drawer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteCourse && onDeleteCourse(course.id || course)}
                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete Course Blueprint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bento Grid Pagination Footer */}
          {filteredData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-bold">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} courses
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[10px] uppercase font-black text-slate-400">Cards:</span>
                  <select
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    {[8, 12, 24, 48].map(size => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 px-2 font-mono">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* COMPACT TABLE DATA GRID VIEW                                              */
        /* ========================================================================= */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-3.5 font-bold text-xs text-slate-500 select-none">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    onClick={() => onSelectCourse && onSelectCourse(row.original)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
              <span>
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredData.length)}{' '}
                of {filteredData.length} entries
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 px-2 font-mono">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
