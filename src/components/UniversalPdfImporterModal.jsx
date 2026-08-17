'use client'

import React, { useState } from 'react';
import KatexRenderer from '@/components/KatexRenderer';
import { Sparkles, Upload, FileText, CheckCircle2, Trash2, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

/**
 * Reads a File or Blob asynchronously as a Base64 Data URL (data:application/pdf;base64,...)
 * Native browser FileReader API with zero external dependencies and non-blocking streaming.
 */
const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error || new Error('Failed to read file as Base64 Data URL'));
    reader.readAsDataURL(file);
  });
};

export default function UniversalPdfImporterModal({ 
  isOpen, 
  onClose, 
  onConfirmIngest, 
  targetModuleName = 'Question Bank',
  contextType
}) {
  const { showToast } = useToast();
  const [aiStep, setAiStep] = useState('input'); // 'input' | 'review'
  const [parserType, setParserType] = useState('gemini_ai_multimodal'); // 'gemini_ai_multimodal' | 'structured_table'
  const [aiRawText, setAiRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [aiProgressText, setAiProgressText] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleRunAiParser = async () => {
    if (!selectedFile && !aiRawText.trim()) {
      showToast('Please select a PDF file or paste question text!', 'error');
      return;
    }

    setAiParsing(true);
    let allParsedQuestions = [];

    try {
      if (selectedFile) {
        // Import pdfjs-dist (installed as npm dependency)
        const pdfjs = await import('pdfjs-dist/build/pdf.js');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString();

        const fileArrayBuffer = await selectedFile.arrayBuffer();
        const pdfDoc = await pdfjs.getDocument({ data: fileArrayBuffer }).promise;
        const totalPages = pdfDoc.numPages;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          setAiProgressText(`Extracting page ${pageNum} of ${totalPages}...`);
          
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 }); // High-res scale for OCR
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const imageBase64 = canvas.toDataURL('image/jpeg', 0.9); // 90% quality JPEG

          const res = await fetch('/api/admin/ai/parse-pdf-page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64,
              mimeType: 'image/jpeg'
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.questions)) {
              allParsedQuestions = [...allParsedQuestions, ...data.questions];
            }
          } else {
            console.warn(`Failed to parse page ${pageNum}: ${res.status}`);
          }
        }
      } else if (aiRawText.trim()) {
        const formData = new FormData();
        formData.append('parserType', parserType || 'gemini_ai_multimodal');
        formData.append('rawText', aiRawText.trim());
        
        const res = await fetch('/api/admin/ai/parse-pdf', {
          method: 'POST',
          body: formData
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.questions)) {
            allParsedQuestions = data.questions;
          }
        }
      }

      if (allParsedQuestions.length > 0) {
        const marked = allParsedQuestions.map((q, idx) => {
          const contentStr = q.content || q.questionText || '';
          const diagramUrlStr = q.diagram_url || q.diagramUrl || '';
          const correctAns = q.correct_answer || q.correctAnswer || (Array.isArray(q.options) && typeof q.correct_option_index === 'number' ? q.options[q.correct_option_index] : '');

          return {
            id: q.id || `pdf-q-${idx + 1}-${Date.now()}`,
            subject: q.subject || 'GENERAL',
            sub_topic: q.sub_topic || q.topic || 'General',
            difficulty: q.difficulty || 'MEDIUM',
            formatType: q.formatType || 'single_mcq',
            content: contentStr,
            questionText: contentStr,
            diagram_url: diagramUrlStr,
            diagramUrl: diagramUrlStr,
            options: Array.isArray(q.options) ? q.options : [],
            correct_option_index: typeof q.correct_option_index === 'number' ? q.correct_option_index : 0,
            correct_answer: correctAns,
            correctAnswer: correctAns,
            explanation: q.explanation || q.solution_text || '',
            marks: q.marks || { positive: 4, negative: -1 },
            selected: true
          };
        });

        setParsedQuestions(marked);
        setAiStep('review');
        showToast(`🎉 Successfully extracted ${marked.length} questions!`, 'success');
      } else {
        showToast(`Extraction error: No questions could be extracted from this document.`, 'error');
      }
    } catch (err) {
      console.error('PDF Parsing failed:', err);
      showToast(`PDF Extraction failed: ${err.message || 'Network or Server Error'}`, 'error');
    } finally {
      setAiParsing(false);
      setAiProgressText('');
    }
  };

  const handleFinalIngest = () => {
    const selected = parsedQuestions.filter(q => q.selected);
    if (selected.length === 0) {
      showToast('Please select at least 1 question to ingest!', 'error');
      return;
    }
    
    if (typeof onConfirmIngest === 'function') {
      onConfirmIngest(selected);
    }
    onClose();
    setAiStep('input');
    setAiRawText('');
    setSelectedFile(null);
    setParsedQuestions([]);
    showToast(`🎉 Successfully ingested ${selected.length} questions with diagrams into ${targetModuleName}!`, 'success');
  };

  const toggleSelectAll = () => {
    const allSelected = parsedQuestions.every(q => q.selected);
    setParsedQuestions(parsedQuestions.map(q => ({ ...q, selected: !allSelected })));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className={`bg-white border border-slate-200 p-8 rounded-3xl w-full space-y-6 shadow-2xl transition-all ${
        aiStep === 'review' ? 'max-w-4xl' : 'max-w-xl'
      }`}>
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
            <div>
              <h3 className="text-base font-black text-slate-900">
                {aiStep === 'review' ? 'AI Extraction & Diagram Inspection Studio' : 'Universal PDF & Document AI Importer'}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Target: {targetModuleName} (Multimodal Gemini Vision Pipeline)
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => { onClose(); setAiStep('input'); }} 
            className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {aiStep === 'input' ? (
          <>
            <div className="space-y-4 text-xs font-medium">
              {/* Document Layout Engine Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Document Layout Engine</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setParserType('gemini_ai_multimodal')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      parserType === 'gemini_ai_multimodal' || parserType === 'unstructured_pdf'
                        ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold shadow-xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-extrabold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Gemini AI Multimodal</span>
                    </div>
                    <div className="text-[10px] opacity-80 mt-0.5">Scanned & digital exam PDFs with diagrams, formulas & tables</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParserType('structured_table')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      parserType === 'structured_table' 
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold shadow-xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-extrabold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Tabular / Grid Format</span>
                    </div>
                    <div className="text-[10px] opacity-80 mt-0.5">Calculus, Limits & Math Grid questions (Question / Option / Solution / Marks)</div>
                  </button>
                </div>
              </div>

              {/* Drag & Drop PDF File Upload Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-3 transition ${
                  isDragging 
                    ? 'border-teal-500 bg-teal-50/50 scale-[1.01]' 
                    : 'border-slate-200 hover:border-teal-500 bg-slate-50/70'
                }`}
              >
                <Upload className={`w-8 h-8 text-teal-600 mx-auto ${isDragging ? 'scale-110' : 'animate-bounce'}`} />
                <div>
                  <label className="font-bold text-slate-800 cursor-pointer hover:text-teal-600 text-sm block">
                    Upload Question Paper PDF (.pdf, .docx, .txt)
                    <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} className="hidden" />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {selectedFile ? (
                      <span className="text-teal-700 font-bold">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    ) : (
                      'Drag & drop PDF here or click to browse'
                    )}
                  </p>
                </div>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedFile(null);
                    }}
                    className="text-[11px] text-rose-500 hover:underline font-semibold inline-block"
                  >
                    Remove selected file
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">OR PASTE RAW TEXT</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              <textarea
                rows="4"
                value={aiRawText}
                onChange={e => setAiRawText(e.target.value)}
                placeholder="Paste question paper text here..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 outline-none focus:border-teal-600 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onClose()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunAiParser}
                disabled={aiParsing}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
              >
                {aiParsing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{aiProgressText || 'Processing Gemini Multimodal...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Smart AI Extraction</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Inspection Review Grid */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="flex justify-between items-center bg-teal-50 border border-teal-200 p-3.5 rounded-2xl text-xs text-teal-900 font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Multimodal extraction complete. Review extracted questions before importing:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] text-teal-700 hover:underline font-extrabold cursor-pointer"
                  >
                    {parsedQuestions.every(q => q.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="bg-teal-600 text-white px-2.5 py-0.5 rounded-full text-[11px]">
                    {parsedQuestions.filter(q => q.selected).length} / {parsedQuestions.length} Selected
                  </span>
                </div>
              </div>

              {parsedQuestions.map((pq, qIdx) => (
                <div key={pq.id || qIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pq.selected}
                        onChange={e => {
                          const updated = [...parsedQuestions];
                          updated[qIdx].selected = e.target.checked;
                          setParsedQuestions(updated);
                        }}
                        className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer"
                      />
                      <span className="text-xs font-black text-slate-900">
                        Q#{qIdx + 1} • <span className="text-teal-700 uppercase">{pq.subject || 'GENERAL'}</span> ({pq.formatType || 'MCQ'})
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setParsedQuestions(parsedQuestions.filter((_, idx) => idx !== qIdx))}
                      className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Discard</span>
                    </button>
                  </div>

                  {/* Editable Question Content & KaTeX Math Preview */}
                  <textarea
                    rows="2"
                    value={pq.content || pq.questionText || ''}
                    onChange={e => {
                      const updated = [...parsedQuestions];
                      updated[qIdx].content = e.target.value;
                      updated[qIdx].questionText = e.target.value;
                      setParsedQuestions(updated);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-bold outline-none focus:border-teal-600"
                  />

                  {/* KaTeX Vector Math Preview */}
                  {(pq.content || pq.questionText) && (
                    <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs font-semibold text-slate-800 flex items-start gap-2">
                      <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded shrink-0">LaTeX Math Preview</span>
                      <KatexRenderer content={pq.content || pq.questionText} className="text-indigo-950 font-medium" />
                    </div>
                  )}

                  {/* Diagram Link & Live Preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-650" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Diagram Image URL:</span>
                    </div>
                    <input
                      type="text"
                      value={pq.diagram_url || pq.diagramUrl || ''}
                      onChange={e => {
                        const updated = [...parsedQuestions];
                        updated[qIdx].diagram_url = e.target.value;
                        updated[qIdx].diagramUrl = e.target.value;
                        setParsedQuestions(updated);
                      }}
                      placeholder="Paste image URL (e.g. https://...)"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-700 outline-none focus:border-teal-600"
                    />
                    {(pq.diagram_url || pq.diagramUrl) && (
                      <div className="p-2 bg-white border border-slate-200 rounded-xl max-w-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pq.diagram_url || pq.diagramUrl} alt="Question Diagram" className="h-20 object-contain rounded" />
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  {pq.options && pq.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pq.options.map((opt, oIdx) => (
                        <div key={oIdx} className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 flex items-center gap-2">
                          <span className="font-extrabold text-teal-700 shrink-0">{String.fromCharCode(65 + oIdx)}:</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={e => {
                              const updated = [...parsedQuestions];
                              const newOpts = [...updated[qIdx].options];
                              newOpts[oIdx] = e.target.value;
                              updated[qIdx].options = newOpts;
                              setParsedQuestions(updated);
                            }}
                            className="w-full bg-transparent outline-none text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Correct Answer & Solution Explanation */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase">Answer Key:</span>
                      <input
                        type="text"
                        value={pq.correct_answer || pq.correctAnswer || ''}
                        onChange={e => {
                          const updated = [...parsedQuestions];
                          updated[qIdx].correct_answer = e.target.value;
                          updated[qIdx].correctAnswer = e.target.value;
                          setParsedQuestions(updated);
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs text-emerald-700 font-black outline-none focus:border-teal-600"
                      />
                    </div>

                    {(pq.explanation || pq.solution_text) && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-amber-800 uppercase block">Solution & Derivation Step:</span>
                        <textarea
                          rows="2"
                          value={pq.explanation || pq.solution_text || ''}
                          onChange={e => {
                            const updated = [...parsedQuestions];
                            updated[qIdx].explanation = e.target.value;
                            setParsedQuestions(updated);
                          }}
                          className="w-full bg-transparent text-xs text-amber-950 font-mono outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAiStep('input')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                ← Back to Upload
              </button>

              <button
                type="button"
                onClick={handleFinalIngest}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Ingest Selected Questions ({parsedQuestions.filter(q => q.selected).length})</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

