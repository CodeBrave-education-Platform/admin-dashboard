'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import UniversalPdfImporterModal from '@/components/UniversalPdfImporterModal'
import ConfirmDialogModal from '@/components/ConfirmDialogModal'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { createClient } from '@/utils/supabase/client'
import { 
  BookOpen, Plus, Edit, Trash2, Search, CheckCircle2, GripVertical,
  Package, GraduationCap, ArrowLeft, Star, Users, DollarSign, Sparkles 
} from 'lucide-react'

export default function CourseStudioClient({ user }) {
  const supabase = createClient()
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  // Data fetched from Supabase

  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  // Form fields
  const [formTitle, setFormTitle] = useState('')
  const [formInstructor, setFormInstructor] = useState('')
  const [formSubject, setFormSubject] = useState('Physics')
  const [formLevel, setFormLevel] = useState('JEE Advanced')
  const [formPrice, setFormPrice] = useState(2999)
  const [formOriginalPrice, setFormOriginalPrice] = useState(4999)
  const [formBookKit, setFormBookKit] = useState('')
  const [formThumbnail, setFormThumbnail] = useState('')
  const [formDescription, setFormDescription] = useState('')

  const fetchCourses = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
    if (data) {
      setCourses(data.map(c => ({
        id: c.id,
        title: c.title,
        instructor: c.instructor_name || 'Instructor',
        subject: c.subject || 'Subject',
        level: c.level || 'Level',
        price: c.price || 0,
        originalPrice: c.original_price || c.price || 0,
        studentsCount: c.students_count || 0,
        badge: c.badge || '',
        bookKit: c.book_kit || '',
        thumbnail_url: c.thumbnail_url || '',
        description: c.description || ''
      })))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const handleOpenCreate = () => {
    setEditingCourse(null)
    setFormTitle('')
    setFormInstructor('Asentra Senior Faculty')
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

  const handleSaveCourse = async (e) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    if (editingCourse) {
      const { error } = await supabase.from('courses').update({
        title: formTitle.trim(),
        instructor_name: formInstructor.trim(),
        subject: formSubject,
        level: formLevel,
        price: Number(formPrice),
        book_kit: formBookKit.trim(),
        thumbnail_url: formThumbnail.trim() || editingCourse.thumbnail_url,
        description: formDescription.trim() || editingCourse.description
      }).eq('id', editingCourse.id)

      if (!error) fetchCourses()
    } else {
      const { error } = await supabase.from('courses').insert([{
        title: formTitle.trim(),
        instructor_name: formInstructor.trim(),
        subject: formSubject,
        level: formLevel,
        price: Number(formPrice),
        students_count: 0,
        badge: '⚡ New Release',
        book_kit: formBookKit.trim() || 'Standard Textbook Kit',
        thumbnail_url: formThumbnail.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
        description: formDescription.trim() || 'Complete syllabus breakdown with textbook kit.'
      }])

      if (!error) fetchCourses()
    }

    setIsModalOpen(false)
  }

  const handleDeleteCourse = (id, title) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Course',
      message: `⚠️ Are you sure you want to delete course blueprint "${title}"? This cannot be undone.`,
      onConfirm: async () => {
        const { error } = await supabase.from('courses').delete().eq('id', id)
        if (!error) fetchCourses()
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(courses)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setCourses(items)
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
                <th className="p-4 w-10"></th>
                <th className="p-4">Course Blueprint</th>
                <th className="p-4">Subject & Level</th>
                <th className="p-4">Pricing</th>
                <th className="p-4">Enrolled Candidates</th>
                <th className="p-4">Bundled Textbook Kit</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="courses">
                {(provided) => (
                  <tbody 
                    className="divide-y divide-slate-100 font-medium text-slate-700"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {filteredCourses.map((course, index) => (
                      <Draggable key={course.id} draggableId={course.id} index={index}>
                        {(provided, snapshot) => (
                          <tr 
                            className={`transition ${snapshot.isDragging ? 'bg-indigo-50/80 shadow-lg' : 'hover:bg-slate-50/80'}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <td className="p-4 w-10">
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                                <GripVertical className="w-5 h-5" />
                              </div>
                            </td>
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
                                  title="Edit Blueprint"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteCourse(course.id, course.title)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition cursor-pointer"
                                  title="Delete Blueprint"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </DragDropContext>
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
                  placeholder="e.g. Dr. H.C. Verma & Asentra Team"
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

      {/* PDF Importer Modal */}
      <UniversalPdfImporterModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        contextType="course_material"
      />

      <ConfirmDialogModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
