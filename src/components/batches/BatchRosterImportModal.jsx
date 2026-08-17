'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import { useToast } from '@/components/ToastProvider';
import { 
  X, Users, UploadCloud, FileText, Loader2, 
  CheckCircle2, AlertCircle, Info, Plus, Trash2, ArrowRight
} from 'lucide-react';

const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('PDF.js can only be loaded in a browser context'));
      return;
    }
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      window.pdfjsLib = pdfjsLib;
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js engine from CDN'));
    document.head.appendChild(script);
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
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.onload = () => {
      resolve(window.mammoth);
    };
    script.onerror = () => reject(new Error('Failed to load Mammoth DOCX parser from CDN'));
    document.head.appendChild(script);
  });
};

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

const cleanExtractedText = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^\s*page\s*\d+\s*(?:of\s*\d+)?$/i.test(trimmed)) return false;
    if (/^\s*\d+\s*of\s*\d+$/i.test(trimmed)) return false;
    if (/^\s*\d+\s*$/i.test(trimmed)) return false;
    return true;
  });
  return cleanedLines.join('\n');
};

const parseRosterText = (text) => {
  if (!text) return [];
  const lines = text.split('\n');
  const roster = [];
  const seenEmails = new Set();
  let tempId = 1;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(?:name|email|student|roster|list|phone|class|stream|focus)/i.test(trimmed)) continue;

    const emailMatch = trimmed.match(emailRegex);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      if (seenEmails.has(email)) continue;
      seenEmails.add(email);

      let namePart = trimmed.replace(email, '');
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      namePart = namePart.replace(phoneRegex, '');
      namePart = namePart.replace(/\b(neet|jee|foundation|medical|engineering|class|batch|stream)\b/gi, ' ');
      namePart = namePart.replace(/[,;:\(\)\[\]\-]+/g, ' ');
      let name = namePart.replace(/\s+/g, ' ').trim();

      if (!name) {
        name = email.split('@')[0].replace(/[._\-]+/g, ' ');
        name = name.replace(/\b\w/g, c => c.toUpperCase());
      }

      let targetFocus = 'JEE';
      if (/neet/i.test(trimmed) || /medical/i.test(trimmed) || /bio/i.test(trimmed)) {
        targetFocus = 'NEET';
      }

      roster.push({
        id: `draft-${tempId++}-${Date.now()}`,
        full_name: name,
        email: email,
        target_focus: targetFocus,
        academic_batch: targetFocus
      });
    }
  }

  return roster;
};

export default function BatchRosterImportModal({
  isOpen,
  onClose,
  batchId,
  onImportSuccess
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const [draftRoster, setDraftRoster] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDraftRoster([]);
      setParsing(false);
      setImporting(false);
      setFileName('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setFileName(file.name);
    setDraftRoster([]);

    try {
      const lowerName = file.name.toLowerCase();
      let rawText = '';

      if (lowerName.endsWith('.pdf')) {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extracted = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const pageText = await extractTextWithLayout(page);
          extracted += pageText + '\n';
        }
        rawText = cleanExtractedText(extracted);
      } else if (lowerName.endsWith('.docx')) {
        const mammoth = await loadMammoth();
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        rawText = result.value || '';
      } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.csv')) {
        rawText = await file.text();
      } else {
        throw new Error('Unsupported file format. Please upload PDF, Word (.docx), CSV, or Text (.txt) files.');
      }

      const roster = parseRosterText(rawText);
      if (roster.length === 0) {
        showToast('No valid student entries with email addresses detected in file', 'error');
      } else {
        setDraftRoster(roster);
        showToast(`Parsed ${roster.length} student records from document`, 'success');
      }
    } catch (err) {
      console.error('[Roster Parse Error]:', err.message);
      showToast('Failed to parse document: ' + err.message, 'error');
    } finally {
      setParsing(false);
      e.target.value = '';
    }
  };

  const handleCommitImport = async () => {
    if (draftRoster.length === 0) {
      showToast('No students to import', 'error');
      return;
    }
    if (!batchId) {
      showToast('No cohort batch selected for roster enrollment', 'error');
      return;
    }

    setImporting(true);
    try {
      const emails = draftRoster.map(x => x.email);
      const names = draftRoster.map(x => x.full_name);
      const focuses = draftRoster.map(x => x.academic_batch || 'JEE');

      const { data, error } = await supabase.rpc('import_batch_roster', {
        _batch_id: batchId,
        _emails: emails,
        _names: names,
        _focuses: focuses
      });

      if (error) throw error;

      const successCount = (data || []).filter(x => x.status === 'success').length;
      const skippedCount = (data || []).filter(x => x.status === 'skipped').length;

      showToast(`Roster imported! ${successCount} registered/enrolled, ${skippedCount} skipped (already enrolled)`, 'success');
      await invalidateCache('batch', null, batchId);

      if (onImportSuccess) {
        onImportSuccess();
      }
      onClose();
    } catch (err) {
      console.error('[Roster Commit Error]:', err.message);
      showToast('Failed to import roster: ' + err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 md:p-6 animate-fade-in">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative text-slate-800 overflow-hidden z-10 p-6 md:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Import Batch Roster</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Ingest student registries via PDF, DOCX, CSV, or TXT</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {draftRoster.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 text-center transition cursor-pointer relative group bg-slate-50/50 hover:bg-indigo-50/20">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  disabled={parsing}
                />
                <div className="space-y-3">
                  {parsing ? (
                    <div className="space-y-2 py-4">
                      <Loader2 className="w-10 h-10 mx-auto text-indigo-600 animate-spin" />
                      <p className="text-xs font-bold text-indigo-600">Parsing document contents...</p>
                      <p className="text-[10px] text-slate-400">Extracting names, email accounts, and program streams</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-10 h-10 mx-auto text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      <div>
                        <p className="text-xs font-black text-slate-800">Click or Drag Roster File Here</p>
                        <p className="text-[10px] text-slate-400 mt-1">Supports PDF, Word (.docx), CSV, or Plain Text (.txt)</p>
                      </div>
                      <div className="pt-2">
                        <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          Choose File
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Preview summary bar */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-black text-slate-900">
                      Roster Preview ({draftRoster.length} students detected)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftRoster([]);
                      setFileName('');
                    }}
                    className="text-[10px] font-black uppercase text-rose-600 hover:text-rose-700 transition cursor-pointer"
                  >
                    Clear File
                  </button>
                </div>

                {/* Staging table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="max-h-[260px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider text-slate-500">Name</th>
                          <th className="px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider text-slate-500">Email Address</th>
                          <th className="px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider text-slate-500">Track</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {draftRoster.map((student, idx) => (
                          <tr key={student.id || idx} className="hover:bg-slate-50/60 transition">
                            <td className="px-4 py-2.5 font-bold text-slate-900">{student.full_name}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">{student.email}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                student.academic_batch === 'NEET'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}>
                                {student.academic_batch || 'JEE'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Information Notice */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3.5 flex gap-3 text-slate-600">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-[11px] leading-relaxed">
                <span className="font-bold text-indigo-900 block">Roster Import Instructions:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                  <li>The importer identifies valid email addresses and assigns students to this cohort.</li>
                  <li>New profiles will be created if the student is not yet registered on the platform.</li>
                  <li>Existing enrollments for this batch will be preserved without creating duplicate records.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={draftRoster.length === 0 || importing}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enrolling Roster...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Commit Roster ({draftRoster.length})</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
