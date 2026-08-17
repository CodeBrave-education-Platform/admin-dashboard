'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { 
  useLegacyTable as useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  legacyCreateColumnHelper as createColumnHelper
} from '@tanstack/react-table/legacy'
import { flexRender } from '@tanstack/react-table'
import { 
  Users, Edit, Trash2, Plus, Search, 
  RefreshCw, Send, ArrowLeft, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp
} from 'lucide-react'

export default function StudentRelationshipClient({ user, initialStudents }) {
  const supabase = createClient()
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  // Student directory state
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  // Form edit states
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [announcementMsg, setAnnouncementMsg] = useState('')

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('profiles').select('*')
      const source = (data && !error) ? data : (initialStudents || [])
      const sorted = [...source].filter(Boolean).sort((a, b) => {
        const timeA = a?.created_at ? (!isNaN(new Date(a.created_at).getTime()) ? new Date(a.created_at).getTime() : 0) : 0
        const timeB = b?.created_at ? (!isNaN(new Date(b.created_at).getTime()) ? new Date(b.created_at).getTime() : 0) : 0
        return timeB - timeA
      })
      setStudents(sorted.map(p => ({
        ...p,
        id: p.id,
        name: p.full_name || 'Unknown User',
        email: p.email || 'No Email',
        joinedDate: p.created_at ? (!isNaN(new Date(p.created_at).getTime()) ? new Date(p.created_at).toLocaleDateString() : 'N/A') : 'N/A',
        status: 'Active',
        enrolledCourses: [],
        attemptsCount: p.weekly_tests_attempted ? (parseInt(p.weekly_tests_attempted) || 0) : 0,
        bookOrdersCount: 0,
        lastActive: p.last_active_date || 'Recently'
      })))
    } catch (e) {
      console.warn('[Fetch Students Warning]:', e?.message)
      const source = initialStudents || []
      const sorted = [...source].filter(Boolean).sort((a, b) => {
        const timeA = a?.created_at ? (!isNaN(new Date(a.created_at).getTime()) ? new Date(a.created_at).getTime() : 0) : 0
        const timeB = b?.created_at ? (!isNaN(new Date(b.created_at).getTime()) ? new Date(b.created_at).getTime() : 0) : 0
        return timeB - timeA
      })
      setStudents(sorted.map(p => ({
        ...p,
        id: p.id,
        name: p.full_name || 'Unknown User',
        email: p.email || 'No Email',
        joinedDate: p.created_at ? (!isNaN(new Date(p.created_at).getTime()) ? new Date(p.created_at).toLocaleDateString() : 'N/A') : 'N/A',
        status: 'Active',
        enrolledCourses: [],
        attemptsCount: p.weekly_tests_attempted ? (parseInt(p.weekly_tests_attempted) || 0) : 0,
        bookOrdersCount: 0,
        lastActive: p.last_active_date || 'Recently'
      })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const handleOpenDrawer = (student) => {
    setSelectedStudent(student)
    setEditName(student.name)
    setEditEmail(student.email)
    setDrawerOpen(true)
  }

  const handleSaveStudent = async () => {
    if (!selectedStudent) return
    const { error } = await supabase.from('profiles').update({
      full_name: editName,
      email: editEmail
    }).eq('id', selectedStudent.id)

    if (!error) {
      fetchStudents()
      setDrawerOpen(false)
      alert(`🎉 Student profile for ${editName} updated successfully!`)
    } else {
      alert(`Error updating student profile`)
    }
  }

  const handleDeleteStudent = async (studentId, studentName) => {
    if (confirm(`⚠️ Are you sure you want to delete student account "${studentName}" and revoke all associated course content & attempt scorecards?`)) {
      const { error } = await supabase.from('profiles').delete().eq('id', studentId)
      if (!error) {
        fetchStudents()
        alert(`Student "${studentName}" has been removed from the platform.`)
      }
    }
  }

  const handleRevokeCourse = (studentId, courseId, courseTitle) => {
    if (confirm(`Revoke course "${courseTitle}" from candidate?`)) {
      setStudents(students.map(s => {
        if (s.id === studentId) {
          return { ...s, enrolledCourses: s.enrolledCourses.filter(c => c.id !== courseId) }
        }
        return s
      }))
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(prev => ({ ...prev, enrolledCourses: prev.enrolledCourses.filter(c => c.id !== courseId) }))
      }
    }
  }

  const handleGrantNewCourse = (studentId) => {
    const courseTitle = prompt("Enter Course Title to Grant Access to Student:", "JEE Advanced Mastery")
    if (courseTitle) {
      const newCourse = { id: `c-granted-${Date.now()}`, title: courseTitle, accessDate: new Date().toLocaleDateString('en-GB') }
      setStudents(students.map(s => {
        if (s.id === studentId) {
          return { ...s, enrolledCourses: [newCourse, ...s.enrolledCourses] }
        }
        return s
      }))
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(prev => ({ ...prev, enrolledCourses: [newCourse, ...prev.enrolledCourses] }))
      }
    }
  }

  const handleBroadcastAnnouncement = (e) => {
    e.preventDefault()
    if (!announcementMsg.trim()) return
    alert(`📢 Notification broadcasted to all enrolled students:\n\n"${announcementMsg}"`)
    setAnnouncementMsg('')
  }

  // --- TanStack Table Setup ---
  const [rowSelection, setRowSelection] = useState({})

  const columnHelper = createColumnHelper()
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Student Candidate',
      cell: info => (
        <div className="space-y-0.5">
          <h4 className="font-bold text-slate-900 text-sm">{info.getValue() || 'Unknown User'}</h4>
          <p className="text-slate-500 text-[11px] font-mono">{info.row.original.email || 'No Email'} • {info.row.original.id?.substring(0,8) || 'N/A'}</p>
        </div>
      ),
    }),
    columnHelper.accessor('enrolledCourses', {
      header: 'Enrolled Courses',
      cell: info => (
        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-bold">
          {(info.getValue() || []).length} Courses
        </span>
      ),
    }),
    columnHelper.accessor('attemptsCount', {
      header: 'CBT Attempts',
      cell: info => <span className="font-bold text-slate-700">{info.getValue() ?? 0} Tests</span>,
    }),
    columnHelper.accessor('lastActive', {
      header: 'Last Activity',
      cell: info => <span className="text-slate-500 font-medium">{info.getValue() || 'N/A'}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleOpenDrawer(row.original)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 rounded-lg font-bold text-[11px] transition shadow-sm flex items-center gap-1 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Manage</span>
          </button>
          <button
            onClick={() => handleDeleteStudent(row.original.id, row.original.name)}
            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition cursor-pointer"
            title="Delete Student"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    })
  ], [students])

  const table = useReactTable({
    data: students,
    columns,
    state: {
      globalFilter,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 }
    }
  })

  const selectedCount = Object.keys(rowSelection).length

  const handleBulkDelete = async () => {
    const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id)
    if (confirm(`⚠️ Delete ${selectedIds.length} students?`)) {
      const { error } = await supabase.from('profiles').delete().in('id', selectedIds)
      if (!error) {
        fetchStudents()
        setRowSelection({})
      }
    }
  }

  const handleBulkExport = () => {
    const selectedRows = table.getSelectedRowModel().rows
    const exportData = selectedRows.length > 0
      ? selectedRows.map(r => r.original)
      : table.getFilteredRowModel().rows.map(r => r.original)

    if (exportData.length === 0) {
      alert('No student records to export.')
      return
    }

    const headers = ['ID', 'Candidate Name', 'Email', 'Joined Date', 'CBT Attempts', 'Last Active']
    const csvRows = [headers.join(',')]

    for (const item of exportData) {
      csvRows.push([
        `"${item.id || ''}"`,
        `"${(item.name || item.full_name || 'Unknown User').replace(/"/g, '""')}"`,
        `"${(item.email || '').replace(/"/g, '""')}"`,
        `"${item.joinedDate || 'N/A'}"`,
        item.attemptsCount || 0,
        `"${item.lastActive || 'N/A'}"`
      ].join(','))
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students_export_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setRowSelection({})
  }

  return (
    <div className="p-6 md:p-10 space-y-8 select-none max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-2xl p-6 rounded-3xl border border-white shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold">
              <ArrowLeft className="w-4 h-4" /> Admin Console
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Manager</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Hyper-optimized data grid for managing student enrollments and content access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
            <Users className="w-4 h-4" />
            <span>{students.length} Total Students</span>
          </span>
        </div>
      </div>

      {/* Broadcast Announcement Bar */}
      <form onSubmit={handleBroadcastAnnouncement} className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-2 text-xs font-black text-violet-600 shrink-0">
          <Send className="w-4 h-4" />
          <span>Broadcast:</span>
        </div>
        <input
          type="text"
          value={announcementMsg}
          onChange={e => setAnnouncementMsg(e.target.value)}
          placeholder="Type an announcement to send to all student dashboards..."
          className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-violet-500 focus:bg-white font-medium transition"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs rounded-xl transition shadow-md shadow-violet-500/20 cursor-pointer shrink-0"
        >
          Send
        </button>
      </form>

      {/* TanStack Table Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(String(e.target.value))}
              placeholder="Omnibar Search (Name, ID, Email)..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold transition shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-bold mr-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="p-4 whitespace-nowrap cursor-pointer select-none" onClick={header.column.getToggleSortingHandler()}>
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUp className="w-3 h-3 text-blue-500" />,
                          desc: <ChevronDown className="w-3 h-3 text-blue-500" />,
                        }[header.column.getIsSorted()] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="p-10 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-10 text-center text-slate-400 font-bold">
                    No records found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className={`hover:bg-slate-50 transition group ${row.getIsSelected() ? 'bg-blue-50/50' : ''}`}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="p-4 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Action Sticky Bar (Appears when rows selected) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-40 animate-fade-in-up">
          <div className="text-white font-bold text-sm">
            <span className="text-blue-400">{selectedCount}</span> students selected
          </div>
          <div className="flex gap-3">
            <button onClick={handleBulkExport} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">
              Export CSV
            </button>
            <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition border border-rose-500/20 cursor-pointer">
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Sliding Drawer Over Modal Pattern */}
      {drawerOpen && selectedStudent && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity" onClick={() => setDrawerOpen(false)} />
          
          {/* Right Drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-left border-l border-slate-100">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Manage Student</h3>
                <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{selectedStudent.id?.substring(0,12) || 'N/A'}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Profile Details</h4>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold text-xs block">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold text-xs block">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold transition"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Active Enrollments</h4>
                  <button
                    onClick={() => handleGrantNewCourse(selectedStudent.id)}
                    className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1 hover:bg-emerald-100"
                  >
                    <Plus className="w-3 h-3" /> Add Course
                  </button>
                </div>

                <div className="space-y-2">
                  {(!selectedStudent.enrolledCourses || selectedStudent.enrolledCourses.length === 0) ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                      <p className="text-slate-400 text-xs font-bold">No active courses enrolled.</p>
                    </div>
                  ) : (
                    selectedStudent.enrolledCourses.map(course => (
                      <div key={course.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-slate-300 transition">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-900 text-xs truncate">{course.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Granted: {course.accessDate}</p>
                        </div>
                        <button
                          onClick={() => handleRevokeCourse(selectedStudent.id, course.id, course.title)}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-500 rounded-lg text-[10px] font-bold transition cursor-pointer shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          Revoke
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStudent}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
