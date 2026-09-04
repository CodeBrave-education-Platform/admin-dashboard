'use client'

import React, { useState } from 'react'
import { Printer, X } from 'lucide-react'
import KatexRenderer from '@/components/KatexRenderer'

export default function PrintableExamBookletModal({
  exam = {},
  questions = [],
  sectionsConfig = [],
  isOpen = false,
  onClose
}) {
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true)
  const [includeRoughWork, setIncludeRoughWork] = useState(true)

  if (!isOpen) return null

  // Ensure questions array is consolidated
  const questionsList = Array.isArray(questions) && questions.length > 0 
    ? questions 
    : (Array.isArray(exam.questions) ? exam.questions : [])

  const handlePrint = () => {
    window.print()
  }

  // Calculate unique subjects
  const subjectSet = new Set()
  questionsList.forEach(q => {
    if (q.subject) subjectSet.add(q.subject)
  })
  if (Array.isArray(sectionsConfig)) {
    sectionsConfig.forEach(s => {
      if (s.subject) subjectSet.add(s.subject)
    })
  }
  const subjectsText = subjectSet.size > 0 ? Array.from(subjectSet).join(', ') : 'Physics, Chemistry, Mathematics'

  // Total marks calculation
  const totalCalculatedMarks = questionsList.reduce((acc, q) => acc + (q.marks_positive ?? 4), 0)
  const maxMarks = exam.total_marks || totalCalculatedMarks || (questionsList.length * 4) || 300

  // Pattern label
  const blueprintLabel = (exam.blueprint_type || 'jee_main')
    .toUpperCase()
    .replace('_', ' ')

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* ================================================================= */}
        {/* TOP TOOLBAR (Hidden on Print)                                     */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-black text-slate-800">Printable Exam Booklet Exporter</h3>
              <p className="text-[11px] text-slate-500">
                2-Column Competitive NTA Booklet Layout • {questionsList.length} Questions
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Toggles */}
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAnswerKey}
                onChange={e => setIncludeAnswerKey(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include Answer Key</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeRoughWork}
                onChange={e => setIncludeRoughWork(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Rough Work Area</span>
            </label>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* PRINTABLE DOCUMENT BODY (Target of window.print())                */}
        {/* ================================================================= */}
        <div 
          id="printable-exam-booklet" 
          className="flex-1 overflow-y-auto p-6 sm:p-10 font-serif print:p-0 print:overflow-visible print:text-black bg-white"
        >
          {/* Print CSS Rules */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-exam-booklet, #printable-exam-booklet * {
                visibility: visible;
              }
              #printable-exam-booklet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 1.5cm !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              .no-print {
                display: none !important;
              }
              .page-break-before {
                page-break-before: always;
                break-before: page;
              }
              .break-inside-avoid {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .booklet-columns {
                column-count: 2;
                column-gap: 2.5rem;
                column-rule: 1px solid #cbd5e1;
              }
            }
          `}} />

          {/* 1. Official Exam Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center space-y-1.5">
            <p className="text-[10px] font-sans font-black tracking-widest text-slate-600 uppercase">
              ASENTRA NATIONAL ASSESSMENT PRACTICE PORTAL
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {exam.title || 'JEE Competitive Practice Examination'}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs font-sans font-semibold text-slate-700 pt-1">
              <span><strong>Duration:</strong> {exam.duration_minutes || 180} Minutes</span>
              <span><strong>Maximum Marks:</strong> {maxMarks}</span>
              <span><strong>Subjects:</strong> {subjectsText}</span>
              <span><strong>Pattern:</strong> {blueprintLabel}</span>
            </div>
          </div>

          {/* 2. Candidate Registration Grid */}
          <div className="border border-slate-400 rounded-lg p-3.5 mb-6 text-xs font-sans grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 print:bg-white">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Candidate Name</span>
              <div className="border-b border-dotted border-slate-500 mt-3 h-4"></div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Roll Number</span>
              <div className="border-b border-dotted border-slate-500 mt-3 h-4"></div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Exam Centre</span>
              <div className="border-b border-dotted border-slate-500 mt-3 h-4"></div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Candidate Signature</span>
              <div className="border-b border-dotted border-slate-500 mt-3 h-4"></div>
            </div>
          </div>

          {/* 3. General Candidate Instructions */}
          <div className="bg-slate-50 border-l-4 border-slate-800 p-3.5 mb-6 text-[11px] font-sans text-slate-700 leading-relaxed print:bg-white print:border-l-2 print:border-black">
            <strong>IMPORTANT INSTRUCTIONS TO CANDIDATES:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>This examination booklet contains <strong>{questionsList.length}</strong> questions divided across sections.</li>
              <li>For Section A (MCQs): <strong>+4 marks</strong> for each correct answer and <strong>-1 penalty</strong> for each incorrect answer.</li>
              <li>For Section B (Numerical): <strong>+4 marks</strong> for each correct answer with <strong>no negative marking (0 penalty)</strong>. In standard JEE Main pattern, candidates may attempt any 5 questions out of 10.</li>
              <li>Calculators, mathematical tables, and electronic devices are strictly prohibited.</li>
              <li>Use the designated blank spaces at the end of this paper for rough calculations.</li>
            </ul>
          </div>

          {/* 4. Two-Column Question Paper Booklet */}
          {questionsList.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-sans italic">
              No questions found in this exam blueprint yet. Author or add questions in the Visual Compiler.
            </div>
          ) : (
            <div className="columns-1 md:columns-2 gap-8 text-sm leading-relaxed booklet-columns">
              {questionsList.map((q, idx) => (
                <div 
                  key={q.id || idx} 
                  className="break-inside-avoid border-b border-slate-300 pb-5 mb-5 space-y-2 text-slate-900"
                >
                  {/* Question Header & Meta */}
                  <div className="flex items-start justify-between gap-2 font-sans font-bold text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded font-mono text-[11px]">
                        Q.{idx + 1}
                      </span>
                      <span className="text-slate-600 font-medium text-[11px]">
                        [{q.subject || 'General'} • {q.section || 'Section A'}]
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-700 border border-slate-300 px-1 py-0.2 rounded">
                      +{q.marks_positive ?? 4}/-{Math.abs(q.marks_negative ?? 1)}
                    </span>
                  </div>

                  {/* Question Stem with KaTeX */}
                  <div className="text-xs font-serif leading-relaxed text-slate-900 pt-0.5">
                    <KatexRenderer content={q.content} />
                  </div>

                  {/* Attached Diagram */}
                  {Boolean(q.diagram_url) && (
                    <div className="my-2 p-1 border border-slate-200 rounded max-w-xs mx-auto text-center">
                      <img
                        src={q.diagram_url}
                        alt={`Diagram for Q.${idx + 1}`}
                        className="max-h-44 object-contain mx-auto"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}

                  {/* Format 1: Single or Multiple Choice Options */}
                  {(q.format_type === 'single_mcq' || q.format_type === 'multi_mcq' || (Array.isArray(q.options) && q.options.length > 0)) && (
                    <div className="space-y-1 pt-1 text-xs font-sans pl-1">
                      {q.options?.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx)
                        return (
                          <div key={optIdx} className="flex items-start gap-1.5">
                            <span className="font-bold text-slate-700 shrink-0">({letter})</span>
                            <div className="font-medium text-slate-800 flex-1">
                              <KatexRenderer content={opt} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Format 2: Numerical Value */}
                  {q.format_type === 'numerical' && (
                    <div className="pt-2 text-[11px] font-sans text-slate-600 italic">
                      <div className="border border-dashed border-slate-400 p-2 rounded bg-slate-50/50 print:bg-white flex items-center justify-between">
                        <span>Numerical Answer:</span>
                        <span className="font-mono font-bold tracking-widest text-slate-400">[ .................... ]</span>
                      </div>
                    </div>
                  )}

                  {/* Format 3: Matrix Match */}
                  {q.format_type === 'matrix_match' && q.matrix_match && (
                    <div className="pt-2 text-[11px] font-sans">
                      <div className="grid grid-cols-2 gap-2 p-2 border border-slate-300 rounded bg-slate-50/50 print:bg-white mb-2">
                        <div>
                          <p className="font-black text-slate-700 mb-1 border-b border-slate-200">Column I</p>
                          {(q.matrix_match.left || []).map((lItem, lIdx) => (
                            <p key={lIdx}>
                              <strong>({String.fromCharCode(65 + lIdx)})</strong> {lItem}
                            </p>
                          ))}
                        </div>
                        <div>
                          <p className="font-black text-slate-700 mb-1 border-b border-slate-200">Column II</p>
                          {(q.matrix_match.right || []).map((rItem, rIdx) => (
                            <p key={rIdx}>
                              <strong>({['P', 'Q', 'R', 'S', 'T'][rIdx] || rIdx})</strong> {rItem}
                            </p>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        Match each item in Column I with the appropriate item(s) in Column II.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 5. Rough Work Box */}
          {includeRoughWork && (
            <div className="mt-8 border-2 border-dashed border-slate-400 p-4 rounded-xl min-h-36 break-inside-avoid font-sans">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-center">
                SPACE FOR ROUGH WORK / CALCULATIONS
              </span>
            </div>
          )}

          {/* 6. Detachable End-of-Paper Answer Key Sheet */}
          {includeAnswerKey && questionsList.length > 0 && (
            <div className="page-break-before mt-12 pt-6 border-t-2 border-slate-900 break-inside-avoid font-sans">
              <div className="text-center mb-4 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  CONFIDENTIAL • FACULTY / INVIGILATOR KEY
                </span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Official Answer Key & Scoring Matrix
                </h3>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center text-xs">
                {questionsList.map((q, idx) => {
                  let ansDisplay = '--'
                  if (typeof q.correct_option_index === 'number' && q.options && q.options[q.correct_option_index]) {
                    ansDisplay = String.fromCharCode(65 + q.correct_option_index)
                  } else if (Array.isArray(q.correct_options) && q.correct_options.length > 0) {
                    ansDisplay = q.correct_options.map(i => String.fromCharCode(65 + i)).join(',')
                  } else if (q.correct_answer) {
                    ansDisplay = String(q.correct_answer)
                  }

                  return (
                    <div key={idx} className="border border-slate-300 p-1.5 rounded bg-slate-50 print:bg-white">
                      <div className="text-[9px] text-slate-400 font-mono">Q{idx + 1}</div>
                      <div className="font-black text-slate-900 text-[11px] truncate" title={ansDisplay}>
                        {ansDisplay}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
