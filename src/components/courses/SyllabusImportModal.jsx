'use client'

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import { UploadCloud, FileText, X, Plus, Trash2, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

// Dynamic CDN Script Loaders
const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('PDF.js can only be loaded in a browser context'));
      return;
    }
    const existing = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
    if (existing) {
      if (!existing.GlobalWorkerOptions) {
        existing.GlobalWorkerOptions = {};
      }
      if (!existing.GlobalWorkerOptions.workerSrc) {
        existing.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      window.pdfjsLib = existing;
      resolve(existing);
      return;
    }
    const scriptSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let script = document.querySelector(`script[src="${scriptSrc}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      document.head.appendChild(script);
    }
    const onScriptLoad = () => {
      const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      if (pdfjsLib) {
        if (!pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions = {};
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        window.pdfjsLib = pdfjsLib;
        resolve(pdfjsLib);
      } else {
        reject(new Error('Failed to access PDF.js library instance'));
      }
    };
    if (window.pdfjsLib || window['pdfjs-dist/build/pdf']) {
      onScriptLoad();
    } else {
      script.addEventListener('load', onScriptLoad);
      script.addEventListener('error', () => reject(new Error('Failed to load PDF.js engine from CDN')));
    }
  });
};

const loadMammoth = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Mammoth can only be loaded in a browser context'));
      return;
    }
    if (window.mammoth) {
      resolve(window.mammoth);
      return;
    }
    const scriptSrc = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    let script = document.querySelector(`script[src="${scriptSrc}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      document.head.appendChild(script);
    }
    if (window.mammoth) {
      resolve(window.mammoth);
    } else {
      script.addEventListener('load', () => {
        if (window.mammoth) {
          resolve(window.mammoth);
        } else {
          reject(new Error('Failed to access Mammoth docx library instance'));
        }
      });
      script.addEventListener('error', () => reject(new Error('Failed to load Mammoth docx parser from CDN')));
    }
  });
};

// 2D Spatial Text Layout Extraction
const extractTextWithLayout = async (page) => {
  const textContent = await page.getTextContent();
  const items = textContent.items;
  if (!items || items.length === 0) return '';

  const linesMap = {};
  for (const item of items) {
    if (!item.str || (!item.str.trim() && item.str !== ' ')) continue;
    const y = item.transform[5];
    let foundY = null;
    for (const key of Object.keys(linesMap)) {
      if (Math.abs(parseFloat(key) - y) < 3.5) {
        foundY = key;
        break;
      }
    }
    if (foundY !== null) {
      linesMap[foundY].push(item);
    } else {
      linesMap[y] = [item];
    }
  }

  const sortedYs = Object.keys(linesMap)
    .map(Number)
    .sort((a, b) => b - a);

  const lines = [];
  for (const y of sortedYs) {
    const lineItems = linesMap[y];
    lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
    const lineStr = lineItems.map(item => item.str).join(' ');
    lines.push(lineStr);
  }

  return lines.join('\n');
};

// Deterministic Syllabus Text Parser
const parseSyllabusText = (text) => {
  if (!text) return [];
  const lines = text.split('\n');
  const parsedLessons = [];
  let orderIndex = 1;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;

    // Filter out typical document standalone headers / page numbers
    if (/^(?:page(?:\s+\d+)?|syllabus|table of contents|index|course overview|curriculum)\s*$/i.test(trimmed)) continue;
    if (/^\d+\s*$/i.test(trimmed)) continue;

    let title = trimmed;
    let duration = 60; // default 60 minutes

    // Look for compound duration pattern like (2h 30m) or 2 hours 15 mins or [1 hr 45 min]
    const compoundRegex = /(?:[-–—(📎[]\s*)?(?:(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h))[\s,]+(?:(\d+)\s*(?:mins?|minutes?|m))[\)\]]?\s*$/i;
    const compMatch = compoundRegex.exec(trimmed);
    if (compMatch) {
      const h = parseFloat(compMatch[1]) || 0;
      const m = parseInt(compMatch[2]) || 0;
      duration = Math.round(h * 60 + m);
      title = trimmed.replace(compoundRegex, '').trim();
    } else {
      // Look for single duration pattern like (120 mins) or (1.5 hours) or [2 hrs] or - 90 minutes
      const durationRegex = /(?:[-–—(📎[]\s*)?(\d+(?:\.\d+)?)\s*(?:min|minute|mins|minutes|hour|hours|hr|hrs|h|m)[\)\]]?\s*$/i;
      const durMatch = durationRegex.exec(trimmed);
      if (durMatch) {
        const val = parseFloat(durMatch[1]);
        const rawUnit = durMatch[0].toLowerCase();
        const isHour = /hours?|hrs?|(?<![a-z])h/i.test(rawUnit);
        if (isHour) {
          duration = Math.round(val * 60);
        } else {
          duration = Math.round(val);
        }
        title = trimmed.replace(durationRegex, '').trim();
      }
    }

    // Clean title prefix like "1.", "Chapter 1:", "Lesson 1:", "Module 2 -", "Topic 3:", "Unit 4:", "Lecture 5:", Roman numerals like "I."
    const prefixRegex = /^(?:(?:chapter|lesson|module|topic|unit|lecture)\s*\d+[\.\-\s:]+|[ivxlcdm]+[\.\-\s:]+|\d+[\.\-\s)]+)\s*/i;
    title = title.replace(prefixRegex, '').trim();

    // Clean trailing dashes/punctuation
    title = title.replace(/^[:\-\s\+]+|[:\-\s\+]+$/g, '').trim();

    if (title && title.length > 2) {
      parsedLessons.push({
        id: `draft-${orderIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        duration_minutes: duration,
        description: `Syllabus Unit: ${title}`,
        order_index: orderIndex++
      });
    }
  }

  return parsedLessons;
};

export default function SyllabusImportModal({
  isOpen,
  course,
  courseId: explicitCourseId,
  courseTitle: explicitCourseTitle,
  onClose,
  onLessonsImported
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const targetCourseId = course?.id || explicitCourseId;
  const targetCourseTitle = course?.title || explicitCourseTitle || 'Active Course';

  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [draftLessons, setDraftLessons] = useState([]);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    try {
      let extractedText = '';

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const pdfjsLib = await loadPdfJs();
        const fileReader = new FileReader();
        const arrayBuffer = await new Promise((resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result);
          fileReader.onerror = () => reject(fileReader.error);
          fileReader.readAsArrayBuffer(file);
        });

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const pageText = await extractTextWithLayout(page);
          fullText += pageText + '\n';
        }
        extractedText = fullText;
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        const mammoth = await loadMammoth();
        const fileReader = new FileReader();
        const arrayBuffer = await new Promise((resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result);
          fileReader.onerror = () => reject(fileReader.error);
          fileReader.readAsArrayBuffer(file);
        });

        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else {
        throw new Error('Only PDF (.pdf) and Word (.docx) files are supported');
      }

      if (!extractedText.trim()) {
        throw new Error('No readable text content could be extracted from this document.');
      }

      const parsed = parseSyllabusText(extractedText);
      if (parsed.length === 0) {
        throw new Error('Could not identify any modules or lessons in this syllabus document.');
      }

      setDraftLessons(parsed);
      showToast(`Parsed ${parsed.length} lessons from ${file.name}`, 'success');
    } catch (err) {
      console.error('[Syllabus Parse Error]:', err);
      showToast(err.message || 'Failed to parse file', 'error');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleCommitImport = async (e) => {
    e.preventDefault();
    if (!targetCourseId) {
      showToast('No target course specified for import', 'error');
      return;
    }
    if (draftLessons.length === 0) {
      showToast('No parsed lessons available to import', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const payload = draftLessons.map(l => ({
        course_id: targetCourseId,
        title: l.title.trim(),
        duration_minutes: parseInt(l.duration_minutes) || 60,
        description: l.description?.trim() || null,
        order_index: parseInt(l.order_index) || 1
      }));

      const { data, error } = await supabase
        .from('lessons')
        .insert(payload)
        .select();

      if (error) throw error;

      showToast(`Successfully imported ${payload.length} syllabus lessons!`, 'success');

      // Invalidate Redis caches
      await invalidateCache('course', targetCourseId);
      await invalidateCache('catalog', targetCourseId);

      if (onLessonsImported) {
        onLessonsImported(targetCourseId, data || payload);
      }

      setDraftLessons([]);
      setFileName('');
      onClose();
    } catch (err) {
      console.error('[Import Syllabus Error]:', err.message);
      showToast('Failed to import syllabus: ' + err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (!isLoading && !isImporting) onClose();
        }}
        className="fixed inset-0 cursor-pointer"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full flex flex-col shadow-2xl relative text-slate-800 overflow-hidden z-10 p-6 md:p-8 max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 border border-teal-100 rounded-2xl text-teal-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Universal Syllabus Importer
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target: <span className="font-bold text-slate-700">{targetCourseTitle}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading || isImporting}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-600 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-700">
                Parsing document layout and compiling syllabus modules...
              </p>
              <p className="text-[10px] text-slate-400">
                Spatial 2D coordinate extraction running locally in browser.
              </p>
            </div>
          </div>
        )}

        {/* Upload Dropzone (When No Drafts) */}
        {!isLoading && draftLessons.length === 0 && (
          <div className="flex-1 py-12 flex flex-col items-center justify-center">
            <div className="w-full max-w-lg border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-3xl p-10 text-center bg-slate-50/50 hover:bg-indigo-50/20 transition cursor-pointer relative group">
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center mx-auto mb-4 group-hover:scale-105 group-hover:border-indigo-200 transition-all">
                <UploadCloud className="w-7 h-7 text-indigo-600" />
              </div>
              <h4 className="text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">
                Upload Syllabus Outline
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mb-4">
                Drag and drop PDF (.pdf) or Word (.docx) document to auto-extract lessons
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] text-slate-600 font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Zero-cloud client-side layout parser</span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Staging Review Table */}
        {!isLoading && draftLessons.length > 0 && (
          <form onSubmit={handleCommitImport} className="flex-1 flex flex-col min-h-0 pt-4">
            <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 font-bold mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Extracted {draftLessons.length} topics from "{fileName}". Edit, reorder, or add rows below:</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftLessons([]);
                  setFileName('');
                }}
                className="text-[10px] text-indigo-700 hover:text-indigo-900 hover:underline font-black uppercase cursor-pointer"
              >
                Reset Document
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-2xl mb-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <th className="p-3 text-[10px] font-black text-slate-500 uppercase w-16 text-center">Seq</th>
                    <th className="p-3 text-[10px] font-black text-slate-500 uppercase">Lesson Unit Title</th>
                    <th className="p-3 text-[10px] font-black text-slate-500 uppercase w-32 text-center">Duration (mins)</th>
                    <th className="p-3 text-[10px] font-black text-slate-500 uppercase">Description</th>
                    <th className="p-3 text-[10px] font-black text-slate-500 uppercase w-14 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draftLessons.map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-2.5">
                        <input
                          type="number"
                          required
                          value={lesson.order_index}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setDraftLessons(prev => prev.map(item => item.id === lesson.id ? { ...item, order_index: val } : item));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 text-center font-bold outline-none focus:border-indigo-500 focus:bg-white"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          required
                          value={lesson.title}
                          onChange={(e) => {
                            setDraftLessons(prev => prev.map(item => item.id === lesson.id ? { ...item, title: e.target.value } : item));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          required
                          min="1"
                          value={lesson.duration_minutes}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 60;
                            setDraftLessons(prev => prev.map(item => item.id === lesson.id ? { ...item, duration_minutes: val } : item));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-900 text-center font-bold outline-none focus:border-indigo-500 focus:bg-white"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={lesson.description || ''}
                          onChange={(e) => {
                            setDraftLessons(prev => prev.map(item => item.id === lesson.id ? { ...item, description: e.target.value } : item));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:bg-white font-medium"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setDraftLessons(prev =>
                              prev
                                .filter(item => item.id !== lesson.id)
                                .map((item, idx) => ({ ...item, order_index: idx + 1 }))
                            );
                          }}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-150 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDraftLessons(prev => {
                    const newSeq = prev.length + 1;
                    return [
                      ...prev,
                      {
                        id: `draft-new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        title: `New Lesson Unit ${newSeq}`,
                        duration_minutes: 60,
                        description: 'Syllabus Unit',
                        order_index: newSeq
                      }
                    ];
                  });
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lesson Row</span>
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UploadCloud className="w-4 h-4" />
                  )}
                  <span>Commit {draftLessons.length} Lessons</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
