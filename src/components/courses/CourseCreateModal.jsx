'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import { BookOpen, X, Plus, Loader2, IndianRupee, Calendar, Tag, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function CourseCreateModal({
  isOpen,
  onClose,
  onCourseCreated
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [originalPrice, setOriginalPrice] = useState('');
  const [level, setLevel] = useState('foundation');
  const [subject, setSubject] = useState('General');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [badge, setBadge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate slug when title changes
  useEffect(() => {
    if (title) {
      const generated = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(generated);
    } else {
      setSlug('');
    }
  }, [title]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Course title is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const instructorId = user?.id || null;

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        price: parseFloat(price) || 0,
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        level: level || 'foundation',
        subject: subject || 'General',
        start_date: startDate || null,
        end_date: endDate || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        badge: badge.trim() || null,
        instructor_id: instructorId
      };

      const { data, error } = await supabase
        .from('courses')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      showToast('Course blueprint established successfully!', 'success');

      // Purge Redis caches
      if (data?.id) {
        await invalidateCache('catalog', data.id);
        await invalidateCache('course', data.id);
      }

      // Reset form
      setTitle('');
      setSlug('');
      setDescription('');
      setPrice('0');
      setOriginalPrice('');
      setLevel('foundation');
      setSubject('General');
      setStartDate('');
      setEndDate('');
      setThumbnailUrl('');
      setBadge('');

      if (onCourseCreated) {
        onCourseCreated(data);
      }
      onClose();
    } catch (err) {
      console.error('[Create Course Error]:', err.message);
      showToast('Failed to create course: ' + (err.message || 'Unknown error'), 'error');
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
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Create Course Blueprint
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Establish a new course catalog mapping & curriculum shell
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
          {/* Title & Slug */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Course Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition font-bold"
              placeholder="e.g. Advanced Mechanics and Rotation Dynamics"
            />
            {slug && (
              <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Slug: /courses/{slug}</span>
              </p>
            )}
          </div>

          {/* Level & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Audience Level
              </label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer font-bold"
              >
                <option value="foundation">JEE Foundation</option>
                <option value="mains">JEE Mains Capsule</option>
                <option value="advanced">JEE Advanced Rigorous</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Primary Subject
              </label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer font-bold"
              >
                <option value="General">General / Comprehensive</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Price (INR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition font-bold"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Original Price (MRP)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={originalPrice}
                  onChange={e => setOriginalPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition font-bold"
                  placeholder="Optional strike-through price"
                />
              </div>
            </div>
          </div>

          {/* Schedule Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition font-bold"
              >
              </input>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition font-bold"
              >
              </input>
            </div>
          </div>

          {/* Thumbnail & Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Thumbnail Image URL
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={e => setThumbnailUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition font-bold"
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Badge / Tag
              </label>
              <input
                type="text"
                value={badge}
                onChange={e => setBadge(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition font-bold"
                placeholder="e.g. Bestseller, Intensive"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Course Description & Syllabus Summary
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition h-20 resize-none font-bold"
              placeholder="Detailed overview of syllabus modules, pedagogical goals, and target score outcomes..."
            />
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
              <span>Establish Blueprint</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
