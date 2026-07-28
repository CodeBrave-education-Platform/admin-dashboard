'use client'

import * as React from 'react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { 
  Book, Plus, Search, Edit3, Trash2, CheckCircle2, 
  Truck, ArrowRight, ShieldAlert, Sparkles, X, Eye, PackageCheck, RefreshCw, Loader2
} from 'lucide-react'

export default function BookInventoryClient({ user, profile, initialBooks }) {
  const supabase = createClient()
  const [books, setBooks] = useState(initialBooks)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    author: '',
    target_exam_tag: 'JEE MAINS',
    price: '',
    original_price: '',
    stock_quantity: '50',
    cover_url: '',
    sample_pdf_url: '',
    is_active: true
  })

  const openCreateModal = () => {
    setEditingBook(null)
    setFormData({
      title: '',
      subtitle: '',
      author: 'CodeBrave Academic Board',
      target_exam_tag: 'JEE MAINS',
      price: '549',
      original_price: '799',
      stock_quantity: '50',
      cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      sample_pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      is_active: true
    })
    setIsModalOpen(true)
  }

  const openEditModal = (book) => {
    setEditingBook(book)
    setFormData({
      title: book.title,
      subtitle: book.subtitle || '',
      author: book.author || '',
      target_exam_tag: book.target_exam_tag || 'JEE MAINS',
      price: String(book.price),
      original_price: String(book.original_price || ''),
      stock_quantity: String(book.stock_quantity),
      cover_url: book.cover_url || '',
      sample_pdf_url: book.sample_pdf_url || '',
      is_active: book.is_active !== false
    })
    setIsModalOpen(true)
  }

  const handleSaveBook = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.price || !formData.stock_quantity) {
      alert('Please fill all required book fields.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: formData.title,
        subtitle: formData.subtitle,
        author: formData.author,
        target_exam_tag: formData.target_exam_tag,
        price: Number(formData.price),
        original_price: Number(formData.original_price || 0),
        stock_quantity: Number(formData.stock_quantity),
        cover_url: formData.cover_url,
        sample_pdf_url: formData.sample_pdf_url,
        is_active: formData.is_active
      }

      if (editingBook) {
        const { data, error } = await supabase
          .from('books')
          .update(payload)
          .eq('id', editingBook.id)
          .select()
          .single()

        if (error) throw error
        setBooks(books.map(b => b.id === editingBook.id ? data : b))
        setToastMsg('Book updated successfully!')
      } else {
        const { data, error } = await supabase
          .from('books')
          .insert(payload)
          .select()
          .single()

        if (error) throw error
        setBooks([data, ...books])
        setToastMsg('New study book published!')
      }

      setIsModalOpen(false)
      setTimeout(() => setToastMsg(''), 3000)
    } catch (err) {
      console.error('Error saving book:', err)
      alert('Failed to save book: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (book) => {
    try {
      const updated = !book.is_active
      const { error } = await supabase
        .from('books')
        .update({ is_active: updated })
        .eq('id', book.id)

      if (error) throw error
      setBooks(books.map(b => b.id === book.id ? { ...b, is_active: updated } : b))
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const filteredBooks = books.filter(b => {
    const matchTag = activeTag === 'ALL' || (b.target_exam_tag && b.target_exam_tag.toUpperCase() === activeTag)
    const matchSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (b.author || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchTag && matchSearch
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-10 select-none">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Console Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[80px]" />
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-black tracking-widest uppercase">
              <Book className="w-3.5 h-3.5" />
              <span>Study Material Inventory</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              CodeBrave Book Publications Manager
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Publish theory modules, PYQ workbooks, and formula handbooks for students. Manage pricing, stock counts, and sample PDFs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10">
            <Link
              href="/admin/books/orders"
              className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider transition"
            >
              <Truck className="w-4 h-4 text-teal-400" />
              <span>Order Fulfillment</span>
            </Link>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-teal-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Book</span>
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/30 border border-slate-900 p-4 rounded-2xl backdrop-blur-sm">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {['ALL', 'JEE MAINS', 'JEE ADVANCED', 'FOUNDATION'].map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition select-none cursor-pointer border ${
                  activeTag === tag
                    ? 'bg-teal-500 text-slate-950 font-black border-teal-400'
                    : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Books..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:border-teal-500 transition font-bold"
            />
          </div>
        </div>

        {/* Grid of Books */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map(book => (
            <div
              key={book.id}
              className="bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded-[2rem] overflow-hidden flex flex-col justify-between transition-all duration-300 relative group"
            >
              <div className="relative aspect-[4/3] bg-slate-950 p-6 flex flex-col justify-between overflow-hidden border-b border-slate-900">
                <img
                  src={book.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'}
                  alt={book.title}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />

                <div className="flex justify-between items-start z-20">
                  <span className="px-3 py-1 bg-slate-900/90 text-teal-400 border border-teal-500/20 text-[9px] font-black uppercase tracking-wider rounded-full backdrop-blur-md">
                    {book.target_exam_tag || 'JEE PREP'}
                  </span>

                  <button
                    onClick={() => handleToggleActive(book)}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border transition cursor-pointer ${
                      book.is_active 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {book.is_active ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <div className="z-20">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                    Stock: {book.stock_quantity} units
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-sm text-white">{book.title}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{book.subtitle}</p>
                  <p className="text-[10px] text-teal-400 font-bold uppercase">Author: {book.author || 'CodeBrave Faculty'}</p>
                </div>

                <div className="flex items-baseline justify-between pt-2 border-t border-slate-900">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-white">₹{Number(book.price).toLocaleString('en-IN')}</span>
                    {book.original_price > book.price && (
                      <span className="text-xs text-slate-500 line-through">₹{Number(book.original_price).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openEditModal(book)}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] max-w-xl w-full p-8 space-y-6 shadow-2xl my-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-extrabold text-white">
                  {editingBook ? 'Edit Book Details' : 'Publish New Study Material'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBook} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. JEE Advanced Physics Blueprint"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subtitle / Description</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Brief syllabus topics covered"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Author / Faculty</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={e => setFormData({ ...formData, author: e.target.value })}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Target Exam Tag</label>
                    <select
                      value={formData.target_exam_tag}
                      onChange={e => setFormData({ ...formData, target_exam_tag: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold"
                    >
                      <option value="JEE MAINS">JEE MAINS</option>
                      <option value="JEE ADVANCED">JEE ADVANCED</option>
                      <option value="FOUNDATION">FOUNDATION</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="549"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">MRP Price (₹)</label>
                    <input
                      type="number"
                      value={formData.original_price}
                      onChange={e => setFormData({ ...formData, original_price: e.target.value })}
                      placeholder="799"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Initial Stock *</label>
                    <input
                      type="number"
                      required
                      value={formData.stock_quantity}
                      onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                      placeholder="50"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cover Image URL</label>
                  <input
                    type="text"
                    value={formData.cover_url}
                    onChange={e => setFormData({ ...formData, cover_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sample PDF Preview URL</label>
                  <input
                    type="text"
                    value={formData.sample_pdf_url}
                    onChange={e => setFormData({ ...formData, sample_pdf_url: e.target.value })}
                    placeholder="https://domain.com/sample.pdf"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active_cb"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-teal-500"
                  />
                  <label htmlFor="is_active_cb" className="text-xs font-bold text-slate-300">Active and visible in Student Store</label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingBook ? 'Save Book Changes' : 'Publish Study Material'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}