'use client'

import * as React from 'react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import ConfirmDialogModal from '@/components/ConfirmDialogModal'
import { useToast } from '@/components/ToastProvider'
import { 
  Book, Plus, Search, Edit3, Trash2, CheckCircle2, 
  Truck, ArrowRight, ShieldAlert, Sparkles, X, Eye, PackageCheck, RefreshCw, Loader2
} from 'lucide-react'

export default function BookInventoryClient({ user, profile, initialBooks }) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [books, setBooks] = useState(initialBooks || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

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
      author: 'Asentra Academic Board',
      target_exam_tag: 'JEE MAINS',
      price: '549',
      original_price: '799',
      stock_quantity: '50',
      cover_url: '',
      sample_pdf_url: '',
      is_active: true
    })
    setIsModalOpen(true)
  }

  const openEditModal = (book) => {
    setEditingBook(book)
    setFormData({
      title: book.title || '',
      subtitle: book.subtitle || '',
      author: book.author || '',
      target_exam_tag: book.target_exam_tag || 'JEE MAINS',
      price: book.price || '',
      original_price: book.original_price || '',
      stock_quantity: book.stock_quantity || 0,
      cover_url: book.cover_url || '',
      sample_pdf_url: book.sample_pdf_url || '',
      is_active: book.is_active ?? true
    })
    setIsModalOpen(true)
  }

  const handleSaveBook = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        author: formData.author.trim(),
        target_exam_tag: formData.target_exam_tag,
        price: Number(formData.price),
        original_price: Number(formData.original_price),
        stock_quantity: Number(formData.stock_quantity),
        cover_url: formData.cover_url.trim(),
        sample_pdf_url: formData.sample_pdf_url.trim(),
        is_active: formData.is_active
      }

      if (editingBook) {
        const { data, error } = await supabase
          .from('books')
          .update(payload)
          .eq('id', editingBook.id)
          .select()

        if (error) throw error
        setBooks(books.map(b => b.id === editingBook.id ? { ...b, ...payload } : b))
        setToastMsg(`🎉 Updated textbook "${payload.title}"`)
      } else {
        const { data, error } = await supabase
          .from('books')
          .insert([payload])
          .select()

        if (error) throw error
        if (data) setBooks([data[0], ...books])
        setToastMsg(`🎉 Added new textbook "${payload.title}"`)
      }

      setIsModalOpen(false)
      setTimeout(() => setToastMsg(''), 4000)
    } catch (err) {
      console.error('[BOOK_SAVE_ERROR]:', err)
      showToast('Failed to save book: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBook = (id, title) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Textbook',
      message: `⚠️ Are you sure you want to remove textbook "${title}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('books').delete().eq('id', id)
          if (error) throw error
          setBooks(books.filter(b => b.id !== id))
          setToastMsg(`🗑️ Removed "${title}"`)
          setTimeout(() => setToastMsg(''), 4000)
        } catch (err) {
          showToast('Failed to delete book: ' + err.message, 'error')
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const filteredBooks = (books || []).filter(b => {
    const matchesTag = activeTag === 'ALL' || b.target_exam_tag === activeTag
    const term = searchQuery.trim().toLowerCase()
    const matchesSearch = !term || 
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.target_exam_tag.toLowerCase().includes(term)

    return matchesTag && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-10 select-none">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header - Light Theme */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black tracking-widest uppercase">
              <Book className="w-3.5 h-3.5" />
              <span>Textbook Inventory Catalog</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Physical Textbook & Module Inventory
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-xl">
              Add new hardcopy solution handbooks, adjust pricing, update stock counts, and link sample PDF previews.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10">
            <Link
              href="/admin/books/orders"
              className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition"
            >
              <Truck className="w-4 h-4 text-teal-600" />
              <span>View Book Fulfillments</span>
            </Link>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Textbook</span>
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Filter Toolbar - Light Theme */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {['ALL', 'JEE MAINS', 'JEE ADVANCED', 'NEET UG', 'FOUNDATION'].map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition select-none cursor-pointer border ${
                  activeTag === tag
                    ? 'bg-indigo-600 text-white font-black border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search title, author, target exam..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-600 transition font-bold"
            />
          </div>
        </div>

        {/* Books Grid - Light Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map(book => (
            <div key={book.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black rounded-lg uppercase tracking-wider">
                    {book.target_exam_tag}
                  </span>
                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase ${
                    book.stock_quantity > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {book.stock_quantity > 0 ? `${book.stock_quantity} in stock` : 'Out of stock'}
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 leading-snug">{book.title}</h3>
                <p className="text-xs text-slate-500 font-medium line-clamp-2">{book.subtitle}</p>
                <p className="text-[11px] text-slate-400 font-bold">Author: {book.author}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-lg font-black text-slate-900 font-mono">₹{book.price}</span>
                  {book.original_price && (
                    <span className="text-xs text-slate-400 line-through font-mono ml-2">₹{book.original_price}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(book)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBook(book.id, book.title)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Modal - Light Theme */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveBook} className="bg-white border border-slate-200 p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">
                {editingBook ? `Edit ${editingBook.title}` : 'Add New Physical Textbook'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm">✕</button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Textbook Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Physics 20-Year Chapterwise PYQ Handbook"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Target Exam Tag</label>
                  <select
                    value={formData.target_exam_tag}
                    onChange={e => setFormData({ ...formData, target_exam_tag: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  >
                    <option value="JEE MAINS">JEE MAINS</option>
                    <option value="JEE ADVANCED">JEE ADVANCED</option>
                    <option value="NEET UG">NEET UG</option>
                    <option value="FOUNDATION">FOUNDATION</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Stock Count</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Original MRP (₹)</label>
                  <input
                    type="number"
                    value={formData.original_price}
                    onChange={e => setFormData({ ...formData, original_price: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Author / Editorial Board</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={e => setFormData({ ...formData, author: e.target.value })}
                  placeholder="e.g. Asentra Academic Board"
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
                disabled={loading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Textbook Item</span>
              </button>
            </div>
          </form>
        </div>
      )}

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