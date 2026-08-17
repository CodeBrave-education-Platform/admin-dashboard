'use client'

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import { Award, X, Plus, Loader2, IndianRupee, Layers, Tag, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function TestSeriesCreateModal({
  isOpen,
  onClose,
  onPackageCreated
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [targetTag, setTargetTag] = useState('JEE Main');
  const [campusBranch, setCampusBranch] = useState('Hyderabad Main Campus');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [drillsCount, setDrillsCount] = useState('0');
  const [mocksCount, setMocksCount] = useState('0');
  const [liveCount, setLiveCount] = useState('0');
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('499');
  const [originalPrice, setOriginalPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Package title is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        target_exam_tag: targetTag.trim(),
        description: description.trim() || 'Comprehensive NTA proctored CBT test series package.',
        thumbnail_url: thumbnailUrl.trim() || 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=800&q=80',
        test_distribution: {
          chapter_drills: parseInt(drillsCount) || 0,
          full_mocks: parseInt(mocksCount) || 0,
          live_papers: parseInt(liveCount) || 0
        },
        price_ledger: {
          status: isPremium ? 'premium' : 'free',
          price: isPremium ? (parseFloat(price) || 0) : 0,
          original_price: isPremium && originalPrice ? (parseFloat(originalPrice) || 0) : null
        },
        total_tests_count: 0,
        is_active: true
      };

      const { data, error } = await supabase
        .from('test_packages')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      showToast('Test package blueprint created successfully!', 'success');

      // Purge Redis cache
      if (data?.id) {
        await invalidateCache('catalog', data.id);
      }

      // Reset form
      setTitle('');
      setTargetTag('JEE Main');
      setCampusBranch('Hyderabad Main Campus');
      setDescription('');
      setThumbnailUrl('');
      setDrillsCount('0');
      setMocksCount('0');
      setLiveCount('0');
      setIsPremium(false);
      setPrice('499');
      setOriginalPrice('');

      if (onPackageCreated) {
        onPackageCreated(data);
      }
      onClose();
    } catch (err) {
      console.error('[Create Package Error]:', err.message);
      showToast('Failed to create test package: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 cursor-pointer"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl relative text-slate-800 overflow-hidden z-10 my-auto p-6 md:p-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Create Test Package Blueprint
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Establish a new CBT test series bundle and configure distribution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-1">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Package Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition font-bold"
              placeholder="e.g. JEE Main High-Yield Full Mock Series 2026"
            />
          </div>

          {/* Target Tag & Campus Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Competitive Tag
              </label>
              <select
                value={targetTag}
                onChange={e => setTargetTag(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer font-bold"
              >
                <option value="JEE Main">JEE Main</option>
                <option value="JEE Advanced">JEE Advanced</option>
                <option value="NEET">NEET Focus</option>
                <option value="Foundation">Foundation Drills</option>
                <option value="KVPY">KVPY / Olympiad</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Campus Branch
              </label>
              <select
                value={campusBranch}
                onChange={e => setCampusBranch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer font-bold"
              >
                <option value="Hyderabad Main Campus">Hyderabad Main Campus</option>
                <option value="Vijayawada Center">Vijayawada Center</option>
                <option value="Vizag Branch">Vizag Branch</option>
                <option value="Bengaluru Hub">Bengaluru Hub</option>
                <option value="Online Pan-India">Online Pan-India</option>
              </select>
            </div>
          </div>

          {/* Thumbnail URL */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Thumbnail Image URL
            </label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={e => setThumbnailUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition font-mono"
            />
            {thumbnailUrl && (
              <div className="mt-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl max-w-[140px]">
                <img src={thumbnailUrl} alt="Thumbnail preview" className="h-12 w-full object-cover rounded-lg" />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Description & Highlights
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition resize-none font-bold"
              placeholder="Provide test series highlights, target audience, and syllabus coverage..."
            />
          </div>

          {/* Test Distribution */}
          <div className="space-y-2 border-t border-slate-150 pt-3">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Expected Test Distribution
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase block">Chapter Drills</label>
                <input
                  type="number"
                  min="0"
                  value={drillsCount}
                  onChange={e => setDrillsCount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase block">Full Mocks</label>
                <input
                  type="number"
                  min="0"
                  value={mocksCount}
                  onChange={e => setMocksCount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase block">Live Papers</label>
                <input
                  type="number"
                  min="0"
                  value={liveCount}
                  onChange={e => setLiveCount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Pricing Ledger */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                Commercials & Pricing
              </span>
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPremium}
                  onChange={e => setIsPremium(e.target.checked)}
                  className="accent-indigo-600 h-4 w-4 cursor-pointer rounded"
                />
                <span className="text-xs font-bold text-indigo-700 ml-2">Premium Series</span>
              </label>
            </div>

            {isPremium && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Selling Price (₹)</label>
                  <input
                    type="number"
                    required={isPremium}
                    min="0"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Original Price (MRP)</label>
                  <input
                    type="number"
                    min="0"
                    value={originalPrice}
                    onChange={e => setOriginalPrice(e.target.value)}
                    placeholder="Optional strike price"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-150 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Establish Package</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
