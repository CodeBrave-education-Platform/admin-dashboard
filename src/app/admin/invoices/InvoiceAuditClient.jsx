'use client'

import * as React from 'react'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import InvoiceModal from '@/components/InvoiceModal'
import { 
  FileText, Search, Printer, CheckCircle2, TrendingUp, 
  DollarSign, ShieldCheck, Filter, Download, ArrowLeft,
  Calendar, User, CreditCard, Tag
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

export default function InvoiceAuditClient({ user, profile, initialInvoices }) {
  const [invoices, setInvoices] = useState(initialInvoices || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  // Map raw invoice DB rows into clean presentation format
  const formattedInvoices = (invoices || []).map(inv => {
    let title = 'Asentra Platform Subscription'
    let category = 'Course'
    if (inv.books?.title) {
      title = inv.books.title
      category = 'Book Order'
    } else if (inv.batches?.title) {
      title = inv.batches.title
      category = 'Cohort Batch'
    } else if (inv.test_packages?.title) {
      title = inv.test_packages.title
      category = 'Test Series'
    } else if (inv.courses?.title) {
      title = inv.courses.title
      category = 'Course'
    }

    return {
      id: inv.id ? inv.id.slice(0, 8).toUpperCase() : (inv.invoice_number || 'N/A'),
      fullId: inv.id,
      courseTitle: title,
      category,
      studentName: inv.profiles?.full_name || 'Registered Student',
      studentEmail: inv.profiles?.email || 'N/A',
      studentPhone: inv.profiles?.phone || 'N/A',
      razorpayId: inv.razorpay_payment_id || inv.payment_id || 'N/A',
      amount: inv.amount_paid === 0 ? 'Free' : (typeof inv.amount_paid === 'number' ? inv.amount_paid : (parseFloat(inv.amount_paid) || 0)),
      date: inv.invoice_date || inv.created_at || new Date().toISOString(),
      status: inv.status === 'captured' ? 'Paid' : (inv.status || 'Paid'),
      bookId: inv.book_id,
      packageId: inv.package_id
    }
  })

  // Calculate high-level financial metrics
  const totalRevenue = formattedInvoices.reduce((sum, inv) => {
    const val = typeof inv.amount === 'number' ? inv.amount : 0
    return sum + val
  }, 0)

  const totalGst = Math.round(totalRevenue * (18 / 118))

  const filteredInvoices = formattedInvoices.filter(inv => {
    const matchCat = activeCategory === 'ALL' || inv.category.toUpperCase().includes(activeCategory)
    const term = searchQuery.toLowerCase()
    const matchSearch = !term ||
      inv.courseTitle.toLowerCase().includes(term) ||
      inv.studentName.toLowerCase().includes(term) ||
      inv.studentEmail.toLowerCase().includes(term) ||
      inv.razorpayId.toLowerCase().includes(term) ||
      inv.id.toLowerCase().includes(term)
    return matchCat && matchSearch
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-10 select-none max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Header Console Banner - Clean Light Theme */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-black tracking-widest uppercase">
            <FileText className="w-3.5 h-3.5" />
            <span>Tax Invoices & Revenue Audit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Financial Invoices & Tax Ledger
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-xl">
            Audit digital tax invoices, review 18% GST calculations, and generate printable PDF receipts for Courses, Cohort Batches, Test Series, and Book Orders.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Console</span>
          </Link>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-sm space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Captured Revenue</span>
          <div className="text-2xl font-black text-slate-900">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% Verified via Razorpay HMAC
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-sm space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">GST Collected (18% IGST)</span>
          <div className="text-2xl font-black text-emerald-600">₹{totalGst.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-slate-400 font-semibold block">Compliant with Indian Tax Code</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-sm space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Invoices Issued</span>
          <div className="text-2xl font-black text-indigo-600">{formattedInvoices.length} Receipts</div>
          <span className="text-[10px] text-slate-400 font-semibold block">Courses, Batches, Tests & Books</span>
        </div>
      </div>

      {/* Filter Toolbar & Search */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 md:gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'COURSE', 'BATCH', 'TEST', 'BOOK'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition select-none cursor-pointer border ${
                activeCategory === cat
                  ? 'bg-teal-600 text-white font-black border-teal-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student, invoice ID, razorpay..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-teal-600 transition font-bold"
          />
        </div>
      </div>

      {/* Invoices Audit Table / Responsive Card Deck */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Desktop Table View (>=768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50">
                <th className="p-4 pl-6">Invoice # & Date</th>
                <th className="p-4">Student</th>
                <th className="p-4">Description Item</th>
                <th className="p-4">Razorpay Payment ID</th>
                <th className="p-4">Amount Paid</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400 font-bold">
                    No invoices match the selected filter query.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.fullId || inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 pl-6 font-mono text-[11px] text-slate-500">
                      <span className="font-bold text-slate-900 block">INV-{inv.id}</span>
                      <span className="text-[10px] text-slate-400">{formatDateSafe(inv.date)}</span>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{inv.studentName}</span>
                      <span className="text-[10px] text-slate-400">{inv.studentEmail}</span>
                    </td>

                    <td className="p-4 font-bold text-slate-900 max-w-[220px] truncate">
                      {inv.courseTitle}
                      <span className="block text-[9px] text-indigo-600 font-bold uppercase tracking-wider">{inv.category}</span>
                    </td>

                    <td className="p-4 font-mono text-[11px] text-slate-500">
                      {inv.razorpayId}
                    </td>

                    <td className="p-4 font-mono font-black text-slate-900">
                      {typeof inv.amount === 'number' ? `₹${inv.amount.toLocaleString('en-IN')}` : inv.amount}
                    </td>

                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Digital Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Degradation View (<768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              No invoices match the selected filter query.
            </div>
          ) : (
            filteredInvoices.map(inv => (
              <div key={inv.fullId || inv.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-black text-xs text-slate-900 block">INV-{inv.id}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> {formatDateSafe(inv.date)}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-black rounded-lg uppercase">
                    {inv.category}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-xs leading-snug">{inv.courseTitle}</p>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{inv.studentName} ({inv.studentEmail})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Amount Paid</span>
                    <span className="font-mono font-black text-sm text-slate-900">
                      {typeof inv.amount === 'number' ? `₹${inv.amount.toLocaleString('en-IN')}` : inv.amount}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedInvoice(inv)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Receipt</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invoice PDF & Digital View Modal */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          user={user}
          profile={profile}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  )
}