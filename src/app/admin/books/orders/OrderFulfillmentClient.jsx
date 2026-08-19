'use client'

import * as React from 'react'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useToast } from '@/components/ToastProvider'
import { 
  Truck, Search, MapPin, CheckCircle2, ArrowLeft, 
  ExternalLink, Edit3, X, Loader2, PackageCheck, Clock, ShieldAlert,
  Calendar, User, BookOpen
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

export default function OrderFulfillmentClient({ user, profile, initialOrders }) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [orders, setOrders] = useState(initialOrders || [])
  const [activeStatus, setActiveStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingOrder, setEditingOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const [fulfillmentForm, setFulfillmentForm] = useState({
    status: 'dispatched',
    courier_partner: 'BlueDart Express',
    tracking_id: '',
    tracking_url: ''
  })

  const openDispatchModal = (order) => {
    setEditingOrder(order)
    setFulfillmentForm({
      status: order.status || 'dispatched',
      courier_partner: order.courier_partner || 'BlueDart Express',
      tracking_id: order.tracking_id || '',
      tracking_url: order.tracking_url || ''
    })
  }

  const handleUpdateFulfillment = async (e) => {
    e.preventDefault()
    if (!editingOrder) return

    setLoading(true)
    try {
      const updates = {
        status: fulfillmentForm.status,
        courier_partner: fulfillmentForm.courier_partner,
        tracking_id: fulfillmentForm.tracking_id,
        tracking_url: fulfillmentForm.tracking_url
      }

      if (fulfillmentForm.status === 'dispatched' && !editingOrder.dispatched_at) {
        updates.dispatched_at = new Date().toISOString()
      }
      if (fulfillmentForm.status === 'delivered' && !editingOrder.delivered_at) {
        updates.delivered_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('book_orders')
        .update(updates)
        .eq('id', editingOrder.id)
        .select()

      if (error) throw error

      setOrders(orders.map(o => o.id === editingOrder.id ? { ...o, ...updates } : o))
      setToastMsg(`🎉 Shipment updated for Order #${editingOrder.id.substring(0, 8)}`)
      setEditingOrder(null)

      setTimeout(() => setToastMsg(''), 4000)
    } catch (err) {
      console.error('[FULFILLMENT_UPDATE_ERROR]:', err)
      showToast('Failed to update shipment status: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = (orders || []).filter(order => {
    const matchesStatus = activeStatus === 'ALL' || order.status?.toUpperCase() === activeStatus
    const term = searchQuery.trim().toLowerCase()
    const studentName = order.profiles?.full_name?.toLowerCase() || ''
    const studentEmail = order.profiles?.email?.toLowerCase() || ''
    const bookTitle = order.books?.title?.toLowerCase() || ''
    const tracking = order.tracking_id?.toLowerCase() || ''

    const matchesSearch = !term || 
      studentName.includes(term) || 
      studentEmail.includes(term) || 
      bookTitle.includes(term) ||
      tracking.includes(term)

    return matchesStatus && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-10 select-none max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Header Banner - Light Theme */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-black tracking-widest uppercase">
            <Truck className="w-3.5 h-3.5" />
            <span>Physical Order Dispatch Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Book Order Fulfillment & Logistics
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-xl">
            Process student textbook shipments, assign courier tracking IDs, and maintain live delivery milestones.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <Link
            href="/admin/books"
            className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Inventory</span>
          </Link>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Filter Toolbar - Light Theme */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 md:gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'PLACED', 'PROCESSING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].map(st => (
            <button
              key={st}
              onClick={() => setActiveStatus(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition select-none cursor-pointer border ${
                activeStatus === st
                  ? 'bg-indigo-600 text-white font-black border-indigo-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student, book, tracking..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 transition font-bold"
          />
        </div>
      </div>

      {/* Orders Table / Mobile Card Deck */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Desktop Table View (>=768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50">
                <th className="p-4 pl-6">Order ID & Date</th>
                <th className="p-4">Student</th>
                <th className="p-4">Book Title</th>
                <th className="p-4">Shipping Address</th>
                <th className="p-4">Status & Tracking</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400 font-bold">
                    No physical book orders match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const addr = order.shipping_address || {}
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 pl-6 font-mono text-[11px] text-slate-500">
                        <span className="font-bold text-slate-900 block">#{order.id.substring(0, 8)}</span>
                        <span>{formatDateSafe(order.ordered_at || order.created_at)}</span>
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">{order.profiles?.full_name || 'Student Candidate'}</span>
                        <span className="text-[11px] text-slate-400">{order.profiles?.email || 'N/A'}</span>
                      </td>

                      <td className="p-4 font-bold text-slate-900">
                        {order.books?.title || 'Physical Reference Textbook'}
                      </td>

                      <td className="p-4 text-[11px] text-slate-500 max-w-xs leading-relaxed break-words">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                          <span>
                            {addr.address_line1 || 'N/A'}, {addr.city || ''}, {addr.state || ''} - {addr.pincode || ''} (Ph: {addr.phone || 'N/A'})
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-block border ${
                            order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            order.status === 'dispatched' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            order.status === 'in_transit' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {order.status || 'PLACED'}
                          </span>

                          {order.tracking_id && (
                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                              <span>{order.courier_partner}: {order.tracking_id}</span>
                              {order.tracking_url && (
                                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => openDispatchModal(order)}
                          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Fulfill Order</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (<768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              No physical book orders match the selected filter.
            </div>
          ) : (
            filteredOrders.map(order => {
              const addr = order.shipping_address || {}
              return (
                <div key={order.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-black text-xs text-slate-900 block">#{order.id.substring(0, 8)}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> {formatDateSafe(order.ordered_at || order.created_at)}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                      order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      order.status === 'dispatched' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      order.status === 'in_transit' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {order.status || 'PLACED'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{order.books?.title || 'Physical Reference Textbook'}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{order.profiles?.full_name || 'Student'} ({order.profiles?.email || 'N/A'})</span>
                    </p>
                  </div>

                  {/* Shipping Address with Graceful Multi-line Wrap */}
                  <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 leading-relaxed break-words flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                    <span>
                      {addr.address_line1 || 'N/A'}, {addr.city || ''}, {addr.state || ''} - {addr.pincode || ''} (Ph: {addr.phone || 'N/A'})
                    </span>
                  </div>

                  {order.tracking_id && (
                    <div className="text-[11px] font-mono text-slate-600 bg-indigo-50/50 p-2 rounded-xl flex items-center justify-between">
                      <span>{order.courier_partner}: {order.tracking_id}</span>
                      {order.tracking_url && (
                        <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold flex items-center gap-1">
                          Track <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => openDispatchModal(order)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Fulfill Order</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Fulfillment Modal - Light Theme */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleUpdateFulfillment} className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">
                Fulfill Order #{editingOrder.id.substring(0, 8)}
              </h3>
              <button type="button" onClick={() => setEditingOrder(null)} className="text-slate-400 hover:text-slate-700 font-bold text-sm">✕</button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Shipment Status</label>
                <select
                  value={fulfillmentForm.status}
                  onChange={e => setFulfillmentForm({ ...fulfillmentForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                >
                  <option value="placed">Order Placed</option>
                  <option value="processing">Processing & Packed</option>
                  <option value="dispatched">Dispatched via Courier</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered to Candidate</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Courier Partner Name</label>
                <input
                  type="text"
                  value={fulfillmentForm.courier_partner}
                  onChange={e => setFulfillmentForm({ ...fulfillmentForm, courier_partner: e.target.value })}
                  placeholder="e.g. BlueDart Express, DTDC, India Post"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Tracking Waybill ID</label>
                <input
                  type="text"
                  value={fulfillmentForm.tracking_id}
                  onChange={e => setFulfillmentForm({ ...fulfillmentForm, tracking_id: e.target.value })}
                  placeholder="e.g. BLUEDART-98420412"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Live Tracking URL (Optional)</label>
                <input
                  type="url"
                  value={fulfillmentForm.tracking_url}
                  onChange={e => setFulfillmentForm({ ...fulfillmentForm, tracking_url: e.target.value })}
                  placeholder="https://www.bluedart.com/tracking/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 outline-none focus:border-indigo-600 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Fulfillment Details</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}