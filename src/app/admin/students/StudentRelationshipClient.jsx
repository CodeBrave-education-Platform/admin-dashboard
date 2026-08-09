'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Users, UserCheck, ShieldAlert, Edit, Trash2, Plus, Search, 
  BookOpen, Package, Award, CheckCircle2, AlertCircle, RefreshCw, Send, Lock, Unlock, ArrowLeft 
} from 'lucide-react'

export default function StudentRelationshipClient({ user, initialStudents }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Student directory state
  const [students, setStudents] = useState([
    {
      id: 'stu-9401',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@gmail.com',
      joinedDate: '12 Jan 2026',
      status: 'Active',
      enrolledCourses: [
        { id: 'c1', title: 'JEE Mains & Advanced Complete Physics Mastery 2026', accessDate: '15 Jan 2026' },
        { id: 'c3', title: 'NEET Medical Biology Complete NCERT Breakdown', accessDate: '20 Jan 2026' }
      ],
      attemptsCount: 8,
      bookOrdersCount: 2,
      lastActive: '10 Mins Ago'
    },
    {
      id: 'stu-8219',
      name: 'Vikram Singh',
      email: 'vikram.singh@Asentra.edu.in',
      joinedDate: '08 Feb 2026',
      status: 'Active',
      enrolledCourses: [
        { id: 'b-achievers', title: 'JEE Advanced 2026 Top Rankers Achievers Cohort', accessDate: '10 Feb 2026' }
      ],
      attemptsCount: 4,
      bookOrdersCount: 1,
      lastActive: '1 Hour Ago'
    },
    {
      id: 'stu-7721',
      name: 'Neha Kapoor',
      email: 'neha.k@outlook.com',
      joinedDate: '22 Feb 2026',
      status: 'Active',
      enrolledCourses: [
        { id: 'c2', title: 'Organic & Inorganic Chemistry Reaction Mechanics', accessDate: '24 Feb 2026' }
      ],
      attemptsCount: 12,
      bookOrdersCount: 3,
      lastActive: '5 Mins Ago'
    }
  ])

  // Form edit states
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [announcementMsg, setAnnouncementMsg] = useState('')

  const handleOpenEdit = (student) => {
    setSelectedStudent(student)
    setEditName(student.name)
    setEditEmail(student.email)
    setEditModalOpen(true)
  }

  const handleSaveStudent = () => {
    if (!selectedStudent) return
    setStudents(students.map(s => s.id === selectedStudent.id ? { ...s, name: editName, email: editEmail } : s))
    setEditModalOpen(false)
    alert(`🎉 Student profile for ${editName} updated successfully!`)
  }

  const handleDeleteStudent = (studentId, studentName) => {
    if (confirm(`⚠️ Are you sure you want to delete student account "${studentName}" and revoke all associated course content & attempt scorecards?`)) {
      setStudents(students.filter(s => s.id !== studentId))
      alert(`Student "${studentName}" has been removed from the platform.`)
    }
  }

  const handleRevokeCourse = (studentId, courseId, courseTitle) => {
    if (confirm(`Revoke course "${courseTitle}" from candidate?`)) {
      setStudents(students.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            enrolledCourses: s.enrolledCourses.filter(c => c.id !== courseId)
          }
        }
        return s
      }))
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(prev => ({
          ...prev,
          enrolledCourses: prev.enrolledCourses.filter(c => c.id !== courseId)
        }))
      }
      alert(`Course "${courseTitle}" revoked.`)
    }
  }

  const handleGrantNewCourse = (studentId) => {
    const courseTitle = prompt("Enter Course Title to Grant Access to Student:", "JEE Mains & Advanced Complete Physics Mastery 2026")
    if (courseTitle) {
      const newCourse = {
        id: `c-granted-${Date.now()}`,
        title: courseTitle,
        accessDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      }
      setStudents(students.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            enrolledCourses: [newCourse, ...s.enrolledCourses]
          }
        }
        return s
      }))
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(prev => ({
          ...prev,
          enrolledCourses: [newCourse, ...prev.enrolledCourses]
        }))
      }
      alert(`Course access granted: "${courseTitle}"!`)
    }
  }

  const handleBroadcastAnnouncement = (e) => {
    e.preventDefault()
    if (!announcementMsg.trim()) return
    alert(`📢 Global Student Broadcast Dispatched: "${announcementMsg}"`)
    setAnnouncementMsg('')
  }

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6 md:p-10 space-y-8 select-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold">
              <ArrowLeft className="w-4 h-4" /> Admin Console
            </Link>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Student Relationship & Content Manager</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Grant or revoke student course enrollments, update account details, delete invalid attempt scorecards, and dispatch broadcast notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{students.length} Enrolled Candidates</span>
          </span>
        </div>
      </div>

      {/* Broadcast Announcement Bar */}
      <form onSubmit={handleBroadcastAnnouncement} className="bg-slate-950 p-5 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-black text-teal-400 shrink-0">
          <Send className="w-4 h-4" />
          <span>Broadcast Notification:</span>
        </div>
        <input
          type="text"
          value={announcementMsg}
          onChange={e => setAnnouncementMsg(e.target.value)}
          placeholder="Type announcement message sent directly to student dashboards..."
          className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-teal-500 font-medium"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer shrink-0"
        >
          Send Announcement
        </button>
      </form>

      {/* Search Toolbar */}
      <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student by name, email or ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-2 text-xs text-white outline-none focus:border-teal-500 font-bold"
          />
        </div>

        <span className="text-xs text-slate-400 font-bold">Showing {filteredStudents.length} Candidates</span>
      </div>

      {/* Student Directory Table */}
      <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-900 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Student Candidate</th>
                <th className="p-4">Enrolled Courses</th>
                <th className="p-4">CBT Attempts</th>
                <th className="p-4">Book Shipments</th>
                <th className="p-4">Last Activity</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-900/50 transition">
                  <td className="p-4">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-white text-sm">{student.name}</h4>
                      <p className="text-slate-400 text-[11px] font-mono">{student.email} • {student.id}</p>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg font-bold">
                      {student.enrolledCourses.length} Enrolled Courses
                    </span>
                  </td>

                  <td className="p-4 font-bold text-white">
                    {student.attemptsCount} Completed Tests
                  </td>

                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg font-bold">
                      {student.bookOrdersCount} Orders
                    </span>
                  </td>

                  <td className="p-4 text-slate-400">
                    {student.lastActive}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(student)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-800 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Manage Content</span>
                      </button>

                      <button
                        onClick={() => handleDeleteStudent(student.id, student.name)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition cursor-pointer"
                        title="Delete Student Account & Content"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student & Content Modal */}
      {editModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-xl w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white">Manage Student Content: {selectedStudent.name}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Candidate Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Candidate Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 font-bold"
                />
              </div>

              {/* Enrolled Courses Management List */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">Active Course Enrollments ({selectedStudent.enrolledCourses.length}):</span>
                  <button
                    onClick={() => handleGrantNewCourse(selectedStudent.id)}
                    className="px-2.5 py-1 bg-teal-500 text-slate-950 font-black rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Grant Course
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedStudent.enrolledCourses.length === 0 ? (
                    <p className="text-slate-500 text-center py-4 italic">No active courses enrolled.</p>
                  ) : (
                    selectedStudent.enrolledCourses.map(course => (
                      <div key={course.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-white text-xs truncate">{course.title}</p>
                          <p className="text-[10px] text-slate-500">Granted: {course.accessDate}</p>
                        </div>

                        <button
                          onClick={() => handleRevokeCourse(selectedStudent.id, course.id, course.title)}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold transition cursor-pointer shrink-0"
                        >
                          Revoke Access
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStudent}
                className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
