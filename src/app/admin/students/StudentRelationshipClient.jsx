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
import { useToast } from '@/components/ToastProvider'
import { 
  Users, Edit, Trash2, Plus, Search, 
  RefreshCw, Send, ArrowLeft, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp,
  GraduationCap, Calendar, Clock, BookOpen, Award
} from 'lucide-react'

// Safe date formatter to avoid SSR hydration mismatch
const formatDateSafe = (dateStr) => {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'N/A'
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return 'N/A'
  }
}

export default function StudentRelationshipClient({ user, initialStudents }) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  // Student directory state
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [availableCourses, setAvailableCourses] = useState([])
  const [grantCourseModalOpen, setGrantCourseModalOpen] = useState(false)
  const [selectedCourseToGrant, setSelectedCourseToGrant] = useState('')
  const [grantingLoading, setGrantingLoading] = useState(false)

  // Form edit states
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [announcementMsg, setAnnouncementMsg] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  const fetchAvailableCourses = async () => {
    try {
      const { data } = await supabase
        .from('courses')
        .select('id, title, price, level')
        .order('title')
      if (data) setAvailableCourses(data)
    } catch (e) {
      console.warn('[Fetch Courses Warning]:', e?.message)
    }
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          enrollments (
            id,
            course_id,
            status,
            created_at,
            courses (
              id,
              title,
              thumbnail_url
            )
          ),
          assessment_attempts (
            id
          )
        `)
      const source = (data && !error) ? data : (initialStudents || [])
      const sorted = [...source].filter(Boolean).sort((a, b) => {
        const timeA = a?.created_at ? (!isNaN(new Date(a.created_at).getTime()) ? new Date(a.created_at).getTime() : 0) : 0
        const timeB = b?.created_at ? (!isNaN(new Date(b.created_at).getTime()) ? new Date(b.created_at).getTime() : 0) : 0
        return timeB - timeA
      })
      setStudents(sorted.map(p => {
        const activeEnrollments = (p.enrollments || [])
          .filter(e => e.status !== 'cancelled')
          .map(e => ({
            id: e.courses?.id || e.course_id,
            enrollmentId: e.id,
            title: e.courses?.title || 'Enrolled Course',
            accessDate: formatDateSafe(e.created_at),
            status: e.status || 'active'
          }))

        const attemptsTotal = Array.isArray(p.assessment_attempts)
          ? p.assessment_attempts.length
          : (p.weekly_tests_attempted ? (parseInt(p.weekly_tests_attempted) || 0) : 0)

        return {
          ...p,
          id: p.id,
          name: p.full_name || 'Unknown User',
          email: p.email || 'No Email',
          joinedDate: formatDateSafe(p.created_at),
          status: 'Active',
          enrolledCourses: activeEnrollments,
          attemptsCount: attemptsTotal,
          bookOrdersCount: 0,
          lastActive: p.last_active_date || 'Recently'
        }
      }))
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
        joinedDate: formatDateSafe(p.created_at),
        status: 'Active',
        enrolledCourses: Array.isArray(p.enrolledCourses) ? p.enrolledCourses : [],
        attemptsCount: p.attemptsCount ?? (p.weekly_tests_attempted ? (parseInt(p.weekly_tests_attempted) || 0) : 0),
        bookOrdersCount: 0,
        lastActive: p.last_active_date || 'Recently'
      })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchAvailableCourses()
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
      showToast(`Student profile for ${editName} updated successfully!`, 'success')
    } else {
      showToast(`Error updating student profile: ` + (error.message || ''), 'error')
    }
  }

  const handleDeleteStudent = async (studentId, studentName) => {
    if (confirm(`⚠️ Are you sure you want to delete student account "${studentName}" and revoke all associated course content & attempt scorecards?`)) {
      const { error } = await supabase.from('profiles').delete().eq('id', studentId)
      if (!error) {
        fetchStudents()
        showToast(`Student "${studentName}" has been removed from the platform.`, 'success')
      }
    }
  }

  const handleRevokeCourse = async (studentId, courseId, courseTitle, enrollmentId) => {
    if (confirm(`Revoke course "${courseTitle}" from candidate?`)) {
      try {
        let query = supabase.from('enrollments').delete()
        if (enrollmentId) {
          query = query.eq('id', enrollmentId)
        } else {
          query = query.match({ user_id: studentId, course_id: courseId })
        }
        const { error } = await query

        if (error) {
          showToast(`Failed to revoke course: ${error.message}`, 'error')
          return
        }

        setStudents(prev => prev.map(s => {
          if (s.id === studentId) {
            return { ...s, enrolledCourses: s.enrolledCourses.filter(c => (c.id !== courseId && c.enrollmentId !== enrollmentId)) }
          }
          return s
        }))
        if (selectedStudent && selectedStudent.id === studentId) {
          setSelectedStudent(prev => ({
            ...prev,
            enrolledCourses: prev.enrolledCourses.filter(c => (c.id !== courseId && c.enrollmentId !== enrollmentId))
          }))
        }
        showToast(`Course "${courseTitle}" revoked successfully.`, 'success')
      } catch (err) {
        showToast(`Revocation error: ${err.message}`, 'error')
      }
    }
  }

  const handleOpenGrantModal = () => {
    if (availableCourses.length > 0) {
      setSelectedCourseToGrant(availableCourses[0].id)
    }
    setGrantCourseModalOpen(true)
  }

  const handleConfirmGrantCourse = async () => {
    if (!selectedStudent || !selectedCourseToGrant) return
    const targetCourse = availableCourses.find(c => c.id === selectedCourseToGrant)
    if (!targetCourse) return

    setGrantingLoading(true)
    try {
      const { data: newEnrollment, error } = await supabase
        .from('enrollments')
        .upsert([{
          user_id: selectedStudent.id,
          course_id: selectedCourseToGrant,
          status: 'active'
        }], { onConflict: 'user_id,course_id' })
        .select('id, course_id, status, created_at, courses(id, title)')
        .single()

      if (error) throw error

      const newCourseEntry = {
        id: targetCourse.id,
        enrollmentId: newEnrollment?.id,
        title: targetCourse.title,
        accessDate: formatDateSafe(newEnrollment?.created_at || new Date().toISOString()),
        status: 'active'
      }

      setStudents(prev => prev.map(s => {
        if (s.id === selectedStudent.id) {
          const exists = s.enrolledCourses.some(c => c.id === targetCourse.id)
          return {
            ...s,
            enrolledCourses: exists ? s.enrolledCourses : [newCourseEntry, ...s.enrolledCourses]
          }
        }
        return s
      }))

      setSelectedStudent(prev => {
        const exists = (prev.enrolledCourses || []).some(c => c.id === targetCourse.id)
        return {
          ...prev,
          enrolledCourses: exists ? prev.enrolledCourses : [newCourseEntry, ...(prev.enrolledCourses || [])]
        }
      })

      showToast(`Course "${targetCourse.title}" successfully granted!`, 'success')
      setGrantCourseModalOpen(false)
    } catch (err) {
      console.error('[Grant Course Error]:', err)
      showToast(`Failed to grant course: ${err.message}`, 'error')
    } finally {
      setGrantingLoading(false)
    }
  }

  const handleBroadcastAnnouncement = async (e) => {
    e.preventDefault()
    if (!announcementMsg.trim()) return
    setIsBroadcasting(true)
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{
          title: 'Platform Announcement',
          message: announcementMsg.trim(),
          target_audience: 'all',
          author_id: user?.id || null,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      showToast(`Announcement broadcasted and saved: "${announcementMsg.trim()}"`, 'success')
      setAnnouncementMsg('')
    } catch (err) {
      console.error('[Broadcast Announcement Error]:', err)
      showToast(`Failed to broadcast announcement: ${err.message}`, 'error')
    } finally {
      setIsBroadcasting(false)
    }
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
      showToast('No student records to export.', 'error')
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
    <div className="p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8 select-none max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-2xl p-5 sm:p-6 rounded-3xl border border-white shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold">
              <ArrowLeft className="w-4 h-4" /> Admin Console
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Manager</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Directory of enrolled student candidates, course permissions, and CBT performance records.
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
      <form onSubmit={handleBroadcastAnnouncement} className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shadow-xs">
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
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs rounded-xl transition shadow-md shadow-violet-500/20 cursor-pointer shrink-0 text-center"
        >
          Send
        </button>
      </form>

      {/* Responsive Grid / Table Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col">
        {/* Table Toolbar with Mobile Breakpoints */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(String(e.target.value))}
              placeholder="Omnibar Search (Name, ID, Email)..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold transition shadow-xs"
            />
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] text-slate-500 font-bold mr-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <div className="flex items-center gap-1">
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
        </div>

        {/* Desktop Table View (hidden on <640px) */}
        <div className="hidden sm:block overflow-x-auto min-h-[380px]">
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
                    No student candidate records found.
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

        {/* Mobile Card Degradation View (visible on <640px) */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
              <p className="text-xs font-bold text-slate-400">Loading student directory...</p>
            </div>
          ) : table.getRowModel().rows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              No student candidate records found.
            </div>
          ) : (
            table.getRowModel().rows.map(row => {
              const student = row.original
              const isSelected = row.getIsSelected()

              return (
                <div
                  key={row.id}
                  className={`p-4 space-y-3 transition ${isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        checked={isSelected}
                        onChange={row.getToggleSelectedHandler()}
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{student.name}</h4>
                        <p className="text-slate-500 text-[11px] font-mono truncate">{student.email}</p>
                        <span className="text-[9px] font-mono text-slate-400">ID: {student.id?.substring(0, 8)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenDrawer(student)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Manage</span>
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id, student.name)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition cursor-pointer"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-emerald-700">
                        {(student.enrolledCourses || []).length} Courses
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-800">
                        {student.attemptsCount || 0} CBT Tests
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>Joined: {student.joinedDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>Active: {student.lastActive}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Bulk Action Sticky Bar (Appears when rows selected) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl px-5 sm:px-6 py-3.5 sm:py-4 flex items-center gap-4 sm:gap-6 z-40 max-w-[95vw]">
          <div className="text-white font-bold text-xs sm:text-sm whitespace-nowrap">
            <span className="text-blue-400">{selectedCount}</span> selected
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button onClick={handleBulkExport} className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap">
              Export CSV
            </button>
            <button onClick={handleBulkDelete} className="px-3 sm:px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition border border-rose-500/20 cursor-pointer whitespace-nowrap">
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Sliding Drawer Over Modal Pattern */}
      {drawerOpen && selectedStudent && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 transition-opacity" onClick={() => setDrawerOpen(false)} />
          
          {/* Right Drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Manage Student</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5 font-mono uppercase tracking-wider">{selectedStudent.id?.substring(0, 12) || 'N/A'}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Profile Details</h4>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold text-xs block">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold transition text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold text-xs block">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold transition text-xs"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Active Enrollments</h4>
                  <button
                    onClick={handleOpenGrantModal}
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
                      <div key={course.enrollmentId || course.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-slate-300 transition">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-900 text-xs truncate">{course.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Granted: {course.accessDate}</p>
                        </div>
                        <button
                          onClick={() => handleRevokeCourse(selectedStudent.id, course.id, course.title, course.enrollmentId)}
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

            <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
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

      {/* Grant Course Picker Modal */}
      {grantCourseModalOpen && selectedStudent && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-60" onClick={() => setGrantCourseModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-slate-900 text-sm">Grant Course Access</h3>
                </div>
                <button onClick={() => setGrantCourseModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">
                  Select a course from the platform catalog to enroll <span className="font-bold text-slate-800">{selectedStudent.name}</span>:
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Available Catalog Courses</label>
                  <select
                    value={selectedCourseToGrant}
                    onChange={e => setSelectedCourseToGrant(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-emerald-500 focus:bg-white transition cursor-pointer"
                  >
                    {availableCourses.length === 0 ? (
                      <option value="">No courses available</option>
                    ) : (
                      availableCourses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} {c.level ? `(${c.level.toUpperCase()})` : ''} - ₹{c.price || 0}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGrantCourseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmGrantCourse}
                  disabled={grantingLoading || !selectedCourseToGrant}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {grantingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Grant Enrollment</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
