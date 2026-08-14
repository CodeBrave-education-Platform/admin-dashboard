'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { 
  Tag, Plus, Edit, Trash2, Search, CheckCircle2, 
  AlertCircle, ShieldAlert, ArrowLeft, Percent, DollarSign, ToggleLeft, ToggleRight 
} from 'lucide-react'

export default function CouponsStudioClient({ user }) {
  const supabase = createClient()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  // Data fetched from Supabase

  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])

  // Form fields
  const [formCode, setFormCode] = useState('')
  const [formType, setFormType] = useState('percentage')
  const [formValue, setFormValue] = useState(20)
  const [formMinOrder, setFormMinOrder] = useState(999)
  const [formDescription, setFormDescription] = useState('')

  const fetchCoupons = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (data) {
      setCoupons(data.map(c => ({
        id: c.id,
        code: c.code,
        discountType: c.discount_type,
        discountValue: c.discount_value,
        minOrderValue: c.min_order_value,
        status: c.status,
        usagesCount: c.usages_count,
        description: c.description
      })))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const handleOpenCreate = () => {
    setEditingCoupon(null)
    setFormCode('')
    setFormType('percentage')
    setFormValue(20)
    setFormMinOrder(999)
    setFormDescription('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon)
    setFormCode(coupon.code)
    setFormType(coupon.discountType)
    setFormValue(coupon.discountValue)
    setFormMinOrder(coupon.minOrderValue)
    setFormDescription(coupon.description)
    setIsModalOpen(true)
  }

  const handleSaveCoupon = async (e) => {
    e.preventDefault()
    if (!formCode.trim()) return

    const uppercaseCode = formCode.trim().toUpperCase()

    if (editingCoupon) {
      const { error } = await supabase.from('coupons').update({
        code: uppercaseCode,
        discount_type: formType,
        discount_value: Number(formValue),
        min_order_value: Number(formMinOrder),
        description: formDescription
      }).eq('id', editingCoupon.id)

      if (!error) {
        fetchCoupons()
        alert(`🎉 Promo Code "${uppercaseCode}" updated!`)
      }
    } else {
      const { error } = await supabase.from('coupons').insert([{
        code: uppercaseCode,
        discount_type: formType,
        discount_value: Number(formValue),
        min_order_value: Number(formMinOrder),
        status: 'Active',
        usages_count: 0,
        description: formDescription || `${uppercaseCode} Promo Discount`
      }])

      if (!error) {
        fetchCoupons()
        alert(`🎉 New Promo Code "${uppercaseCode}" issued!`)
      }
    }

    setIsModalOpen(false)
  }

  const handleToggleStatus = async (id) => {
    const coupon = coupons.find(c => c.id === id)
    if (coupon) {
      const newStatus = coupon.status === 'Active' ? 'Inactive' : 'Active'
      const { error } = await supabase.from('coupons').update({ status: newStatus }).eq('id', id)
      if (!error) fetchCoupons()
    }
  }

  const handleDeleteCoupon = async (id, code) => {
    if (confirm(`⚠️ Are you sure you want to delete promo code "${code}"?`)) {
      const { error } = await supabase.from('coupons').delete().eq('id', id)
      if (!error) fetchCoupons()
    }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredCoupons.map(c => c.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sId => sId !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkDelete = async () => {
    if (confirm(`⚠️ Delete ${selectedIds.length} promo codes?`)) {
      const { error } = await supabase.from('coupons').delete().in('id', selectedIds)
      if (!error) {
        fetchCoupons()
        setSelectedIds([])
      }
    }
  }

  const handleBulkStatusToggle = async () => {
    // Basic implementation: set all selected to Inactive
    const { error } = await supabase.from('coupons')
      .update({ status: 'Inactive' })
      .in('id', selectedIds)
      
    if (!error) {
      fetchCoupons()
      setSelectedIds([])
    }
  }

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-10 space-y-8 select-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-bold">
              <ArrowLeft className="w-4 h-4" /> Admin Console
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Discount Coupon & Promo Code Studio</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Issue, edit, activate, or deactivate percentage & flat discount promo codes across courses, batches, and book kits.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Promo Code</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search promo code or description..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-teal-500 font-bold uppercase"
          />
        </div>

        <span className="text-xs text-slate-500 font-bold">{filteredCoupons.length} Active Codes</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 w-10">
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === filteredCoupons.length && filteredCoupons.length > 0} className="w-4 h-4 accent-teal-600 bg-white border-slate-200 rounded cursor-pointer" />
                </th>
                <th className="p-4">Promo Code</th>
                <th className="p-4">Discount Rate</th>
                <th className="p-4">Min. Order Value</th>
                <th className="p-4">Redemptions</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-600">
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} className={`hover:bg-slate-50/50 transition ${selectedIds.includes(coupon.id) ? 'bg-teal-50/50' : ''}`}>
                  <td className="p-4 w-10">
                    <input type="checkbox" checked={selectedIds.includes(coupon.id)} onChange={() => handleSelect(coupon.id)} className="w-4 h-4 accent-teal-600 bg-white border-slate-200 rounded cursor-pointer" />
                  </td>
                  <td className="p-4">
                    <div className="space-y-0.5">
                      <span className="px-3 py-1 bg-teal-500/10 text-teal-600 border border-teal-500/20 rounded-lg font-black font-mono text-sm tracking-wide">
                        {coupon.code}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">{coupon.description}</p>
                    </div>
                  </td>

                  <td className="p-4 font-bold text-slate-900">
                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `Flat ₹${coupon.discountValue} OFF`}
                  </td>

                  <td className="p-4 text-slate-500 font-mono">
                    ₹{coupon.minOrderValue}
                  </td>

                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg font-bold">
                      {coupon.usagesCount} Redeemed
                    </span>
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() => handleToggleStatus(coupon.id)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${coupon.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {coupon.status}
                    </button>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(coupon)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-teal-600 border border-slate-200 rounded-lg transition cursor-pointer"
                        title="Edit Promo Code"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg transition cursor-pointer"
                        title="Delete Promo Code"
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

      {/* Bulk Action Sticky Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-slate-200 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 animate-fade-in">
          <div className="text-slate-900 font-bold text-sm">
            <span className="text-teal-600">{selectedIds.length}</span> coupons selected
          </div>
          <div className="flex gap-3">
            <button onClick={handleBulkStatusToggle} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
              Toggle Status
            </button>
            <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition border border-rose-200">
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveCoupon} className="bg-slate-50 border border-slate-200 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingCoupon ? `Edit Coupon ${editingCoupon.code}` : 'Issue New Promo Code'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900 font-bold text-sm">✕</button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Promo Code String</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  placeholder="e.g. JEE2026"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-teal-500 font-black uppercase tracking-wider"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Discount Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 outline-none focus:border-teal-500 font-bold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Discount Value</label>
                  <input
                    type="number"
                    value={formValue}
                    onChange={e => setFormValue(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-teal-500 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Min. Order Requirement (₹)</label>
                <input
                  type="number"
                  value={formMinOrder}
                  onChange={e => setFormMinOrder(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-teal-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Public Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="e.g. 25% Special Discount on JEE Courses"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-teal-500 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl transition cursor-pointer"
              >
                Save Promo Code
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
