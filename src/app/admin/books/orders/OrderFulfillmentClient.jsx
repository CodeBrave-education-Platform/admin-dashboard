'use client'

import * as React from 'react'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { 
  Truck, Search, MapPin, CheckCircle2, ArrowLeft, 
  ExternalLink, Edit3, X, Loader2, PackageCheck, Clock, ShieldAlert
} from 'lucide-react'

export default function OrderFulfillmentClient({ user, profile, initialOrders }) {
  const supabase = createClient()
  const [orders, setOrders] = useState(initialOrders)
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
        .select('*, books(title, cover_url, price), profiles(full_name, email)')
        .single()

      if (error) throw error

      setOrders(orders.map(o => o.id === editingOrder.id ? data : o))
      setToastMsg(`Order status updated to ${fulfillmentForm.status}!`)
      setEditingOrder(null)
      setTimeout(() => setToastMsg(''), 3000)
    } catch (err) {
      console.error('Error updating order:', err)
      alert('Failed to update shipment status: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchStatus = activeStatus === 'ALL' || o.status.toUpperCase() === activeStatus
    const matchSearch = (o.books?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (o.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (o.profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (o.tracking_id || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-10 select-none">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Console Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[80px]" />
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-black tracking-widest uppercase">
              <Truck className="w-3.5 h-3.5" />
              <span>Physical Order Dispatch Console</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Book Order Fulfillment & Logistics
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Process student book purchases, attach courier tracking IDs, and update live shipment statuses.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10">
            <Link
              href="/admin/books"
              className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Book Inventory</span>
            </Link>
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
            {['ALL', 'PLACED', 'PROCESSING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].map(st => (
              <button
                key={st}
                onClick={() => setActiveStatus(st)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition select-none cursor-pointer border ${
                  activeStatus === st
                    ? 'bg-teal-500 text-slate-950 font-black border-teal-400'
                    : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Student, Book, Tracking..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:border-teal-500 transition font-bold"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/60">
                  <th className="p-4 pl-6">Order ID & Date</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Book Title</th>
                  <th className="p-4">Shipping Address</th>
                  <th className="p-4">Status & Tracking</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-xs">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-500 font-bold">
                      No physical book orders match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => {
                    const addr = order.shipping_address || {}
                    return (
                      <tr key={order.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="p-4 pl-6 font-bold">
                          <span className="font-mono text-white block">#{order.id.slice(0, 8).toUpperCase()}</span>
                          <span className="text-[10px] text-slate-500">{new Date(order.ordered_at).toLocaleString()}</span>
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-white block">{order.profiles?.full_name || 'Student'}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{order.profiles?.email}</span>
                        </td>

                        <td className="p-4 font-bold text-teal-400 max-w-[200px] truncate">
                          {order.books?.title || 'Physical Book'}
                          <span className="block text-[10px] text-slate-400 font-normal">₹{order.amount_paid} Paid</span>
                        </td>

                        <td className="p-4 max-w-[220px]">
                          <div className="text-[11px] text-slate-300 leading-snug">
                            <span className="font-bold block">{addr.fullName} ({addr.phone})</span>
                            <span className="text-slate-400 block truncate">{addr.addressLine1}, {addr.city}, {addr.state} - {addr.pincode}</span>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border inline-block mb-1 ${
                            order.status === 'delivered' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>
                          {order.tracking_id && (
                            <span className="block text-[10px] font-mono text-slate-400">
                              {order.courier_partner}: {order.tracking_id}
                            </span>
                          )}
                        </td>

                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => openDispatchModal(order)}
                            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer"
                          >
                            Update Dispatch
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fulfillment Modal */}
        {editingOrder && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] max-w-md w-full p-8 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-teal-400" />
                  <span>Update Order Dispatch</span>
                </h3>
                <button onClick={() => setEditingOrder(null)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <p className="text-xs font-bold text-white">{editingOrder.books?.title}</p>
                <p className="text-[10px] text-slate-400">Recipient: {editingOrder.shipping_address?.fullName} ({editingOrder.shipping_address?.phone})</p>
                <p className="text-[10px] text-slate-400">Pincode: {editingOrder.shipping_address?.pincode}</p>
              </div>

              <form onSubmit={handleUpdateFulfillment} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Shipment Status *</label>
                  <select
                    value={fulfillmentForm.status}
                    onChange={e => setFulfillmentForm({ ...fulfillmentForm, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold"
                  >
                    <option value="placed">Placed (Pending Processing)</option>
                    <option value="processing">Processing (Packing)</option>
                    <option value="dispatched">Dispatched (Handed to Courier)</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Courier Partner</label>
                  <input
                    type="text"
                    value={fulfillmentForm.courier_partner}
                    onChange={e => setFulfillmentForm({ ...fulfillmentForm, courier_partner: e.target.value })}
                    placeholder="e.g. BlueDart Express / SpeedPost / Delhivery"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tracking ID / AWB Number</label>
                  <input
                    type="text"
                    value={fulfillmentForm.tracking_id}
                    onChange={e => setFulfillmentForm({ ...fulfillmentForm, tracking_id: e.target.value })}
                    placeholder="e.g. BD123456789IN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Live Tracking URL (Optional)</label>
                  <input
                    type="text"
                    value={fulfillmentForm.tracking_url}
                    onChange={e => setFulfillmentForm({ ...fulfillmentForm, tracking_url: e.target.value })}
                    placeholder="https://www.bluedart.com/tracking?id=..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Shipment Updates</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}