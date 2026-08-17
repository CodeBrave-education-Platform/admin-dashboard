'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import { Save, Loader2, Award, IndianRupee, Layers, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function PackageOverviewTab({
  packageData,
  onPackageUpdated
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [targetTag, setTargetTag] = useState('JEE Main');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [drillsCount, setDrillsCount] = useState('0');
  const [mocksCount, setMocksCount] = useState('0');
  const [liveCount, setLiveCount] = useState('0');
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('499');
  const [originalPrice, setOriginalPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (packageData) {
      setTitle(packageData.title || '');
      setTargetTag(packageData.target_exam_tag || 'JEE Main');
      setDescription(packageData.description || '');
      setThumbnailUrl(packageData.thumbnail_url || '');
      
      const dist = packageData.test_distribution || {};
      setDrillsCount(String(dist.chapter_drills || 0));
      setMocksCount(String(dist.full_mocks || 0));
      setLiveCount(String(dist.live_papers || 0));

      const priceInfo = packageData.price_ledger || {};
      setIsPremium(priceInfo.status === 'premium' || Number(priceInfo.price || 0) > 0);
      setPrice(String(priceInfo.price || 499));
      setOriginalPrice(priceInfo.original_price ? String(priceInfo.original_price) : '');
    }
  }, [packageData]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!packageData?.id) return;
    if (!title.trim()) {
      showToast('Package title is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        title: title.trim(),
        target_exam_tag: targetTag.trim(),
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        test_distribution: {
          chapter_drills: parseInt(drillsCount) || 0,
          full_mocks: parseInt(mocksCount) || 0,
          live_papers: parseInt(liveCount) || 0
        },
        price_ledger: {
          status: isPremium ? 'premium' : 'free',
          price: isPremium ? (parseFloat(price) || 0) : 0,
          original_price: isPremium && originalPrice ? (parseFloat(originalPrice) || 0) : null
        }
      };

      const { data, error } = await supabase
        .from('test_packages')
        .update(updates)
        .eq('id', packageData.id)
        .select()
        .single();

      if (error) throw error;

      showToast('Package details updated successfully', 'success');

      // Purge caches
      await invalidateCache('catalog', packageData.id);

      if (onPackageUpdated) {
        onPackageUpdated(data);
      }
    } catch (err) {
      console.error('[Save Package Error]:', err.message);
      showToast('Failed to update package: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
          Package Title <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition"
        />
      </div>

      {/* Target Tag */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
            Competitive Target Tag
          </label>
          <select
            value={targetTag}
            onChange={e => setTargetTag(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
          >
            <option value="JEE Main">JEE Main</option>
            <option value="JEE Advanced">JEE Advanced</option>
            <option value="NEET">NEET Focus</option>
            <option value="Foundation">Foundation Drills</option>
            <option value="KVPY">KVPY / Olympiad</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
            Thumbnail URL
          </label>
          <input
            type="url"
            value={thumbnailUrl}
            onChange={e => setThumbnailUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {thumbnailUrl && (
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl max-w-xs">
          <img src={thumbnailUrl} alt="Thumbnail Preview" className="h-28 w-full object-cover rounded-xl" />
        </div>
      )}

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
          Description & Syllabus Highlights
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white resize-none"
          placeholder="Detailed package description..."
        />
      </div>

      {/* Test Distribution */}
      <div className="space-y-2 border-t border-slate-150 pt-4">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Test Series Blueprint Distribution</span>
        </h4>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase block">Chapter Drills</label>
            <input
              type="number"
              min="0"
              value={drillsCount}
              onChange={e => setDrillsCount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase block">Full Mocks</label>
            <input
              type="number"
              min="0"
              value={mocksCount}
              onChange={e => setMocksCount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase block">Live Papers</label>
            <input
              type="number"
              min="0"
              value={liveCount}
              onChange={e => setLiveCount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Commercials & Pricing */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Commercials & Pricing Ledger
          </span>
          <label className="flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPremium}
              onChange={e => setIsPremium(e.target.checked)}
              className="accent-indigo-600 h-4 w-4 cursor-pointer rounded"
            />
            <span className="text-xs font-bold text-indigo-700 ml-2">Premium Package</span>
          </label>
        </div>

        {isPremium && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Selling Price (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  required={isPremium}
                  min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Original MRP (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={originalPrice}
                  onChange={e => setOriginalPrice(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Package Blueprint</span>
        </button>
      </div>
    </form>
  );
}
