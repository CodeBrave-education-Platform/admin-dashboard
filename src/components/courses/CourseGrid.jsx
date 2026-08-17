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
  Search, Filter, PlusCircle, UploadCloud, BookOpen, 
  Layers, FileText, ClipboardList, Trash2, Edit3, 
  ChevronDown, ChevronUp, ChevronsUpDown, ArrowUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Users, CheckCircle2, IndianRupee, Sparkles, Download, Eye
} from 'lucide-react';

export default function CourseGrid({
  courses = [],
  isLoading = false,
  onSelectCourse,
  onCreateCourseClick,
  onImportSyllabusClick,
  onToggleCourseStatus,
  onDeleteCourse
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sorting, setSorting] = useState([{ id: 'created_at', desc: true }]);
  const [rowSelection, setRowSelection] = useState({});

  // Filter courses by level and status
  const filteredData = useMemo(() => {
    return courses.filter(c => {
      if (levelFilter !== 'ALL' && (c.level || '').toLowerCase() !== levelFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== 'ALL') {
        const isActive = c.is_active !== false;
        if (statusFilter === 'ACTIVE' && !isActive) return false;
        if (statusFilter === 'INACTIVE' && isActive) return false;
      }
      return true;
    });
  }, [courses, levelFilter, statusFilter]);

  // Custom global search filter covering title, subject, description, target_audience, and level
  const globalFilterFn = useMemo(() => (row, columnId, filterValue) => {
    const search = String(filterValue || '').toLowerCase().trim();
    if (!search) return true;
    const course = row.original;
    const matchTitle = String(course.title || '').toLowerCase().includes(search);
    const matchSubject = String(course.subject || '').toLowerCase().includes(search);
    const matchDesc = String(course.description || '').toLowerCase().includes(search);
    const matchAudience = String(course.target_audience || course.badge || '').toLowerCase().includes(search);
    const matchLevel = String(course.level || '').toLowerCase().includes(search);
    return matchTitle || matchSubject || matchDesc || matchAudience || matchLevel;
  }, []);

  // Column definitions for TanStack Table
  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          aria-label="Select row"
        />
      ),
      size: 40,
      enableSorting: false
    },
    {
      accessorKey: 'created_at',
      id: 'created_at',
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Created</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      enableHiding: true
    },
    {
      accessorKey: 'duration',
      id: 'duration',
      header: 'Duration',
      enableHiding: true
    },
    {
      accessorKey: 'display_order',
      id: 'display_order',
      header: 'Display Order',
      enableHiding: true
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Course Identity</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const course = row.original;
        return (
          <div className="flex items-center gap-3 min-w-[220px]">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-slate-900 truncate max-w-[260px] group-hover:text-indigo-600 transition">
                  {course.title}
                </p>
                {course.badge && (
                  <span className="text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-md">
                    {course.badge}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {course.subject || 'General'} • Created {new Date(course.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'level',
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Audience Level</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const level = (row.original.level || 'foundation').toLowerCase();
        let badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
        let label = 'JEE Foundation';

        if (level === 'mains') {
          badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
          label = 'JEE Mains';
        } else if (level === 'advanced') {
          badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
          label = 'JEE Advanced';
        }

        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${badgeStyle}`}>
            {label}
          </span>
        );
      }
    },
    {
      id: 'metrics',
      header: () => (
        <span className="text-[10px] font-black uppercase text-slate-500">Curriculum Metrics</span>
      ),
      cell: ({ row }) => {
        const course = row.original;
        const lessonCount = course.lessons_count || (course.lessons?.length ?? 0);
        const filesCount = course.files_count || (course.course_files?.length ?? 0);
        const examsCount = course.exams_count || (course.assessments?.length ?? 0);

        return (
          <div className="flex items-center gap-2 flex-wrap min-w-[180px]">
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
              <span>{examsCount} Exams</span>
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: 'is_active',
      id: 'status',
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Status</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const course = row.original;
        const isActive = course.is_active !== false;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleCourseStatus) {
                onToggleCourseStatus(course.id, !isActive);
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
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Pricing</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
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
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <span>Enrolled</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
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
      header: () => (
        <span className="text-[10px] font-black uppercase text-slate-500 text-right block">Actions</span>
      ),
      cell: ({ row }) => {
        const course = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onSelectCourse(course)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
              title="Open Course Editor Drawer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => onDeleteCourse(course.id)}
              className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="Delete Course Blueprint"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ], [onSelectCourse, onDeleteCourse, onToggleCourseStatus]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
      sorting,
      rowSelection
    },
    globalFilterFn,
    autoResetPageIndex: true,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      },
      sorting: [{ id: 'created_at', desc: true }]
    }
  });

  const handleLevelFilterChange = (level) => {
    setLevelFilter(level);
    table.setPageIndex(0);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    table.setPageIndex(0);
  };

  const handleGlobalFilterChange = (val) => {
    setGlobalFilter(val);
    table.setPageIndex(0);
  };

  const selectedCount = Object.keys(rowSelection).length;

  const handleExportCSV = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const exportData = selectedRows.length > 0
      ? selectedRows.map(r => r.original)
      : table.getFilteredRowModel().rows.map(r => r.original);

    const headers = ['ID', 'Title', 'Level', 'Subject', 'Status', 'Price', 'Original Price', 'Students Count', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const item of exportData) {
      csvRows.push([
        `"${item.id}"`,
        `"${(item.title || '').replace(/"/g, '""')}"`,
        `"${item.level || ''}"`,
        `"${item.subject || ''}"`,
        item.is_active !== false ? '"ACTIVE"' : '"INACTIVE"',
        item.price || 0,
        item.original_price || '',
        item.students_count || 0,
        `"${item.created_at || ''}"`
      ].join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `courses_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Control Deck: Search Omnibar + Filter Pills + Action Buttons */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Search Omnibar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={e => handleGlobalFilterChange(e.target.value)}
            placeholder="Search catalog by title, subject, or keywords..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Level & Status Filter Pills */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
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
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
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
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onImportSyllabusClick()}
            className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Import Syllabus from PDF / Word"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Import Syllabus</span>
          </button>

          <button
            type="button"
            onClick={onCreateCourseClick}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Floating Bar (when rows are selected) */}
      {selectedCount > 0 && (
        <div className="bg-indigo-900 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{selectedCount} course blueprint(s) selected</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="text-xs text-indigo-200 hover:text-white font-bold cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* TanStack Table Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-xs font-bold text-slate-500">Loading course registry...</p>
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-700">No Course Blueprints Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {globalFilter
                  ? `No courses matching "${globalFilter}". Try clearing your search filter.`
                  : 'Start by creating your first course catalog blueprint or importing a syllabus.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onCreateCourseClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Course Blueprint</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-slate-50/80 border-b border-slate-200">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-3.5 font-bold text-slate-500 select-none">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    onClick={() => onSelectCourse(row.original)}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
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
        )}

        {/* Pagination Footer */}
        {!isLoading && table.getRowModel().rows.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-150 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
              <span>
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredData.length)}{' '}
                of {filteredData.length} entries
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[10px] uppercase font-black text-slate-400">Rows:</span>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={e => table.setPageSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  {[10, 20, 30, 50].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-extrabold text-slate-700 px-2 font-mono">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>

              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
