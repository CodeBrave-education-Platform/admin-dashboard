'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import UniversalPdfImporterModal from '@/components/UniversalPdfImporterModal'
import { 
  BookOpen, Plus, Edit, Trash2, Search, CheckCircle2, 
  Package, GraduationCap, ArrowLeft, Star, Users, DollarSign, Sparkles 
} from 'lucide-react'

export default function CourseStudioClient({ user }) {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [courses, setCourses] = useState([
    {
      id: 'c1',
      title: 'JEE Mains & Advanced Complete Physics Mastery 2026',
      instructor: 'Dr. H.C. Verma & CodeBrave Team',
      subject: 'Physics',
      level: 'JEE Advanced',
      price: 2999,
      originalPrice: 4999,
      studentsCount: 1420,
      badge: '⭐ Bestseller',
      bookKit: 'Mechanics & Wave Motion 2-Vol Hardcopy Kit'
    },
    {
      id: 'c2',
      title: 'Organic & Inorganic Chemistry Reaction Mechanics',
      instructor: 'Prof. Ananya Ray',
      subject: 'Chemistry',
      level: 'JEE Mains',
      price: 1999,
      originalPrice: 3499,
      studentsCount: 980,
      badge: '🔥 42% Off',
      bookKit: '20-Year Chapterwise Chemistry PYQ Solution Handbook'
    },
    {
      id: 'c3',
      title: 'NEET Medical Biology Complete NCERT Breakdown',
      instructor: 'Dr. Vikram Sethi',
      subject: 'Biology',
      level: 'NEET UG',
      price: 2499,
      originalPrice: 3999,
      studentsCount: 2150,
      badge: '🏆 Top Rated',
      bookKit: 'NEET Biology 10,000 MCQ Bank & Diagram Handbook'
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)

  // Form fields
  const [formTitle, setFormTitle] = useState('')
  const [formInstructor, setFormInstructor] = useState('')
  const [formSubject, setFormSubject] = useState('Physics')
  const [formLevel, setFormLevel] = useState('JEE Advanced')
  const [formPrice, setFormPrice] = useState(2999)
  const [formOriginalPrice, setFormOriginalPrice] = useState(4999)
  const [formBookKit, setFormBookKit] = useState('')

  const handleOpenCreate = () => {
    setEditingCourse(null)
    setFormTitle('')
    setFormInstructor('CodeBrave Senior Faculty')
    setFormSubject('Physics')
    setFormLevel('JEE Advanced')
    setFormPrice(2499)
    setFormOriginalPrice(4499)
    setFormBookKit('Complete Printed Textbook Box Set')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (course) => {
    setEditingCourse(course)
    setFormTitle(course.title)
    setFormInstructor(course.instructor)
    setFormSubject(course.subject)
    setFormLevel(course.level)
    setFormPrice(course.price)
    setFormOriginalPrice(course.originalPrice)
    setFormBookKit(course.bookKit)
    setIsModalOpen(true)
  }

  const handleSaveCourse = (e) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    if (editingCourse) {
      setCourses(courses.map(c => c.id === editingCourse.id ? {
        ...c,
        title: formTitle.trim(),
        instructor: formInstructor.trim(),
        subject: formSubject,
        level: formLevel,
        price: Number(formPrice),
        originalPrice: Number(formOriginalPrice),
        bookKit: formBookKit.trim()
      } : c))
      alert(`🎉 Course blueprint "${formTitle}" updated!`)
    } else {
      const newCourse = {
        id: `c-${Date.now()}`,
        title: formTitle.trim(),
        instructor: formInstructor.trim(),
        subject: formSubject,
        level: formLevel,
        price: Number(formPrice),
        originalPrice: Number(formOriginalPrice),
        studentsCount: 0,
        badge: '⚡ New Release',
        bookKit: formBookKit.trim() || 'Standard Textbook Kit'
      }
      setCourses([newCourse, ...courses])
      alert(`🎉 New Course "${formTitle}" published!`)
    }

    setIsModalOpen(false)
  }

  const handleDeleteCourse = (id, title) => {
    if (confirm(`⚠️ Are you sure you want to delete course blueprint "${title}"?`)) {
      setCourses(courses.filter(c => c.id !== id))
    }
  }

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-10 space-y-8 select-none">
      {/* Top Header - Light Theme */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-bold">
              <ArrowLeft className="w-4 h-4" /> Admin Console
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Course & Batch Blueprint Studio</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create, edit, price, and manage competitive course syllabi and bundled physical textbook kits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Import Course Quiz from PDF</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Course</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar - Light Theme */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search course title, subject or instructor..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-indigo-600 font-bold"
          />
        </div>

        <span className="text-xs text-slate-500 font-bold">{filteredCourses.length} Published Blueprints</span>
      </div>

      {/* Course Catalog Table - Light Theme */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Course Blueprint</th>
                <th className="p-4">Subject & Level</th>
                <th className="p-4">Pricing</th>
                <th className="p-4">Enrolled Candidates</th>
                <th className="p-4">Bundled Textbook Kit</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-slate-900 text-sm">{course.title}</h4>
                      <p className="text-slate-400 text-[11px]">Instructor: {course.instructor}</p>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold">
                      {course.subject} • {course.level}
                    </span>
                  </td>

                  <td className="p-4 font-bold text-slate-900 font-mono">
                    ₹{course.price} <span className="text-slate-400 text-[11px] line-through">₹{course.originalPrice}</span>
                  </td>

                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold">
                      {course.studentsCount} Students
                    </span>
                  </td>

                  <td className="p-4 text-slate-500 text-[11px]">
                    {course.bookKit}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(course)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-indigo-700 border border-slate-200 rounded-lg transition cursor-pointer"
                        title="Edit Course"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteCourse(course.id, course.title)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
                        title="Delete Course"
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

      {/* Create / Edit Modal - Light Theme */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveCourse} className="bg-white border border-slate-200 p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingCourse ? `Edit ${editingCourse.title}` : 'Publish New Course Blueprint'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm">✕</button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Course Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. JEE Mains & Advanced Complete Physics Mastery 2026"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Subject</label>
                  <select
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Target Level</label>
                  <select
                    value={formLevel}
                    onChange={e => setFormLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  >
                    <option value="JEE Advanced">JEE Advanced</option>
                    <option value="JEE Mains">JEE Mains</option>
                    <option value="NEET UG">NEET UG</option>
                    <option value="Foundation">Foundation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Course Fee (₹)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Original MRP (₹)</label>
                  <input
                    type="number"
                    value={formOriginalPrice}
                    onChange={e => setFormOriginalPrice(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Instructor Name & Role</label>
                <input
                  type="text"
                  value={formInstructor}
                  onChange={e => setFormInstructor(e.target.value)}
                  placeholder="e.g. Dr. H.C. Verma & CodeBrave Team"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Included Bundled Book Kit Title</label>
                <input
                  type="text"
                  value={formBookKit}
                  onChange={e => setFormBookKit(e.target.value)}
                  placeholder="e.g. Mechanics 2-Vol Printed Hardcopy Kit"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition cursor-pointer"
              >
                Save Course Blueprint
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Universal AI PDF & Document Importer Modal */}
      <UniversalPdfImporterModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        targetModuleName="Course Quiz & Practice Sets"
        onConfirmIngest={(newQuestions) => {
          alert(`🎉 Ingested ${newQuestions.length} practice questions with diagrams into Course Modules!`);
        }}
      />
    </div>
  )
}
