'use client'

import React, { useState, useEffect } from 'react'
import KatexRenderer from '@/components/KatexRenderer'
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Image as ImageIcon, 
  Check, 
  CheckSquare, 
  Square 
} from 'lucide-react'

// Truncate helper for collapsed card preview
function truncateMath(text = '', maxLength = 120) {
  if (!text) return 'Empty question statement...'
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export default function QuestionCardInPlaceEditor({
  question,
  displayNumber = 1,
  isExpanded = false,
  onToggleExpand,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  availableSections = [],
  onMoveToSection
}) {
  // Local working copy of the question state while editing
  const [formData, setFormData] = useState({
    ...question,
    format_type: question.format_type || 'single_mcq',
    content: question.content || '',
    diagram_url: question.diagram_url || '',
    options: Array.isArray(question.options) && question.options.length >= 4 
      ? question.options 
      : (question.options?.length ? [...question.options, ...Array(4 - question.options.length).fill('')] : ['', '', '', '']),
    correct_option_index: typeof question.correct_option_index === 'number' ? question.correct_option_index : 0,
    correct_options: Array.isArray(question.correct_options) 
      ? question.correct_options 
      : (typeof question.correct_option_index === 'number' ? [question.correct_option_index] : [0]),
    correct_answer: question.correct_answer || '',
    explanation: question.explanation || '',
    difficulty: question.difficulty || 'MEDIUM',
    topic: question.topic || question.sub_topic || '',
    marks_positive: question.marks_positive ?? 4,
    marks_negative: question.marks_negative ?? -1,
    section: question.section || 'Section A',
    matrix_match: question.matrix_match || {
      left: ['Item A', 'Item B', 'Item C', 'Item D'],
      right: ['Property P', 'Property Q', 'Property R', 'Property S'],
      matches: { '0': ['0'], '1': ['1'], '2': ['2'], '3': ['3'] }
    }
  })

  // Synchronize when question prop changes externally
  useEffect(() => {
    setFormData({
      ...question,
      format_type: question.format_type || 'single_mcq',
      content: question.content || '',
      diagram_url: question.diagram_url || '',
      options: Array.isArray(question.options) && question.options.length >= 4 
        ? question.options 
        : (question.options?.length ? [...question.options, ...Array(4 - question.options.length).fill('')] : ['', '', '', '']),
      correct_option_index: typeof question.correct_option_index === 'number' ? question.correct_option_index : 0,
      correct_options: Array.isArray(question.correct_options) 
        ? question.correct_options 
        : (typeof question.correct_option_index === 'number' ? [question.correct_option_index] : [0]),
      correct_answer: question.correct_answer || '',
      explanation: question.explanation || '',
      difficulty: question.difficulty || 'MEDIUM',
      topic: question.topic || question.sub_topic || '',
      marks_positive: question.marks_positive ?? 4,
      marks_negative: question.marks_negative ?? -1,
      section: question.section || 'Section A',
      matrix_match: question.matrix_match || {
        left: ['Item A', 'Item B', 'Item C', 'Item D'],
        right: ['Property P', 'Property Q', 'Property R', 'Property S'],
        matches: { '0': ['0'], '1': ['1'], '2': ['2'], '3': ['3'] }
      }
    })
  }, [question])

  // Save changes back to parent
  const handleCommitChanges = () => {
    let finalAnswer = formData.correct_answer

    if (formData.format_type === 'single_mcq') {
      const idx = formData.correct_option_index
      finalAnswer = formData.options[idx] || String.fromCharCode(65 + idx)
    } else if (formData.format_type === 'multi_mcq') {
      finalAnswer = formData.correct_options.map(i => String.fromCharCode(65 + i)).join(', ')
    } else if (formData.format_type === 'matrix_match') {
      const parts = []
      Object.entries(formData.matrix_match.matches || {}).forEach(([lIdx, rList]) => {
        const leftLetter = String.fromCharCode(65 + parseInt(lIdx))
        const rightLetters = rList.map(rIdx => ['P', 'Q', 'R', 'S', 'T'][parseInt(rIdx)] || rIdx).join(',')
        if (rightLetters) parts.push(`${leftLetter}→${rightLetters}`)
      })
      finalAnswer = parts.join('; ')
    }

    const updated = {
      ...formData,
      correct_answer: finalAnswer,
      type: formData.format_type === 'numerical' ? 'numerical' : 'mcq'
    }

    onUpdate(updated)
    if (onToggleExpand) onToggleExpand()
  }

  // Format type switcher
  const handleFormatTypeChange = (newType) => {
    let pos = formData.marks_positive
    let neg = formData.marks_negative

    if (newType === 'single_mcq') {
      pos = 4
      neg = -1
    } else if (newType === 'multi_mcq') {
      pos = 4
      neg = -2
    } else if (newType === 'numerical') {
      pos = 4
      neg = 0
    } else if (newType === 'matrix_match') {
      pos = 3
      neg = -1
    }

    setFormData(prev => ({
      ...prev,
      format_type: newType,
      marks_positive: pos,
      marks_negative: neg
    }))
  }

  // Option text changes
  const handleOptionChange = (idx, value) => {
    const nextOptions = [...formData.options]
    nextOptions[idx] = value
    setFormData(prev => ({ ...prev, options: nextOptions }))
  }

  // Multi MSQ checkbox toggle
  const handleToggleMultiCorrect = (idx) => {
    setFormData(prev => {
      const exists = prev.correct_options.includes(idx)
      let next
      if (exists) {
        next = prev.correct_options.filter(i => i !== idx)
        if (next.length === 0) next = [idx] // keep at least 1
      } else {
        next = [...prev.correct_options, idx].sort((a, b) => a - b)
      }
      return { ...prev, correct_options: next }
    })
  }

  // Matrix match cell toggle
  const handleToggleMatrixCell = (leftIndex, rightIndex) => {
    setFormData(prev => {
      const currentMatches = { ...(prev.matrix_match?.matches || {}) }
      const key = String(leftIndex)
      const list = currentMatches[key] ? [...currentMatches[key]] : []
      const rKey = String(rightIndex)

      if (list.includes(rKey)) {
        currentMatches[key] = list.filter(item => item !== rKey)
      } else {
        currentMatches[key] = [...list, rKey].sort()
      }

      return {
        ...prev,
        matrix_match: {
          ...prev.matrix_match,
          matches: currentMatches
        }
      }
    })
  }

  // Badge styles by format type
  const getFormatBadge = (type) => {
    switch (type) {
      case 'single_mcq':
        return { label: 'SCQ', full: 'Single Choice', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      case 'multi_mcq':
        return { label: 'MSQ', full: 'Multi-Correct', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      case 'numerical':
        return { label: 'NAT', full: 'Numerical', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      case 'matrix_match':
        return { label: 'Matrix', full: 'Matrix Match', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      default:
        return { label: 'MCQ', full: 'Multiple Choice', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
  }

  const badgeInfo = getFormatBadge(formData.format_type)

  return (
    <div className={`transition-all duration-200 rounded-2xl border ${
      isExpanded 
        ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10' 
        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
    }`}>
      {/* ========================================================================= */}
      {/* 1. COLLAPSED VIEW HEADER / PREVIEW                                       */}
      {/* ========================================================================= */}
      <div 
        onClick={onToggleExpand}
        className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
      >
        {/* Left Side: Index, Badges & Question Excerpt */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          {/* Question Number Badge */}
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
            Q{displayNumber}
          </div>

          {/* Type Badge */}
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shrink-0 ${badgeInfo.color}`}>
            {badgeInfo.label}
          </span>

          {/* Marks Pill */}
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            +{formData.marks_positive}/-{Math.abs(formData.marks_negative)}
          </span>

          {/* Diagram Icon Indicator */}
          {Boolean(formData.diagram_url) && (
            <span className="p-1 text-teal-600 bg-teal-50 border border-teal-200 rounded-md shrink-0" title="Diagram attached">
              <ImageIcon className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Truncated Question Text with KaTeX Preview */}
          <div className="text-xs text-slate-800 font-medium truncate min-w-0 flex-1">
            <KatexRenderer content={truncateMath(formData.content, 90)} />
          </div>
        </div>

        {/* Right Side: Quick Action Controls */}
        <div 
          onClick={e => e.stopPropagation()} 
          className="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
        >
          {/* Reorder Up */}
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Move Question Up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          {/* Reorder Down */}
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Move Question Down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Move to Section Dropdown */}
          {availableSections.length > 1 && (
            <select
              value={formData.section}
              onChange={(e) => {
                const targetSec = e.target.value
                setFormData(prev => ({ ...prev, section: targetSec }))
                if (onMoveToSection) onMoveToSection(targetSec)
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold outline-none cursor-pointer"
              title="Change Section"
            >
              {availableSections.map((sec, idx) => {
                const secName = typeof sec === 'string' ? sec : (sec.name || sec.section_name || `Section ${idx + 1}`)
                return (
                  <option key={secName} value={secName}>
                    {secName}
                  </option>
                )
              })}
            </select>
          )}

          {/* Delete Button */}
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
            title="Delete Question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Chevron Expand/Collapse */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition cursor-pointer ml-1"
            title={isExpanded ? "Collapse Card" : "Expand in-place editor"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-indigo-600" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXPANDED IN-PLACE VISUAL EDITOR                                        */}
      {/* ========================================================================= */}
      {isExpanded && (
        <div className="p-4 sm:p-6 border-t border-slate-200/80 bg-slate-50/50 space-y-5 rounded-b-2xl animate-fade-in font-sans">
          
          {/* Format Type Pill Tabs & Metadata Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
            {/* Format Type Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
              {[
                { id: 'single_mcq', label: 'Single Choice (SCQ)' },
                { id: 'multi_mcq', label: 'Multi-Correct (MSQ)' },
                { id: 'numerical', label: 'Numerical / Integer' },
                { id: 'matrix_match', label: 'Matrix Match (4x4)' }
              ].map(ft => (
                <button
                  key={ft.id}
                  type="button"
                  onClick={() => handleFormatTypeChange(ft.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    formData.format_type === ft.id
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>

            {/* Marking & Difficulty Settings */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-black uppercase text-emerald-700">Marks (+)</label>
                <input
                  type="number"
                  value={formData.marks_positive}
                  onChange={e => setFormData(prev => ({ ...prev, marks_positive: parseFloat(e.target.value) || 0 }))}
                  className="w-14 bg-white border border-emerald-300 text-emerald-800 rounded-lg px-2 py-1 text-xs font-black text-center outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-black uppercase text-rose-700">Penalty (-)</label>
                <input
                  type="number"
                  value={Math.abs(formData.marks_negative)}
                  onChange={e => setFormData(prev => ({ ...prev, marks_negative: (Math.abs(parseFloat(e.target.value) || 0)) * -1 }))}
                  className="w-14 bg-white border border-rose-300 text-rose-800 rounded-lg px-2 py-1 text-xs font-black text-center outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Diff</label>
                <select
                  value={formData.difficulty}
                  onChange={e => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Topic / Chapter Input */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500">Topic / Sub-Topic</label>
              <input
                type="text"
                value={formData.topic}
                onChange={e => setFormData(prev => ({ ...prev, topic: e.target.value, sub_topic: e.target.value }))}
                placeholder="e.g. Rotational Dynamics, Organic Reactions..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500">Assigned Section</label>
              <input
                type="text"
                value={formData.section}
                onChange={e => setFormData(prev => ({ ...prev, section: e.target.value }))}
                placeholder="Section A"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Question Statement Textarea & Live KaTeX Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1.5">
                <span>Question Statement</span>
                <span className="text-slate-400 font-normal lowercase">(supports $inline$ and $$block$$ LaTeX)</span>
              </label>
              <span className="text-[10px] font-mono text-indigo-600 font-bold">KaTeX Enabled</span>
            </div>

            <textarea
              rows={3}
              value={formData.content}
              onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Type question statement here with math formulas... e.g. An electron moves in a magnetic field with velocity $\vec{v} = 2\hat{i} + 3\hat{j}$..."
              className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl p-3 text-xs font-mono text-slate-900 outline-none leading-relaxed"
            />

            {/* Real-Time Live Math Preview Box */}
            {formData.content.trim() && (
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1">
                <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider block">
                  Live KaTeX Formula Preview:
                </span>
                <div className="text-xs text-slate-800 leading-relaxed font-sans">
                  <KatexRenderer content={formData.content} />
                </div>
              </div>
            )}
          </div>

          {/* Diagram Attachment Asset Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Diagram Attachment (URL or Storage Image)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.diagram_url || ''}
                onChange={e => setFormData(prev => ({ ...prev, diagram_url: e.target.value }))}
                placeholder="https://.../circuit-diagram.png or Supabase storage URL"
                className="flex-1 bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-medium outline-none"
              />
              {formData.diagram_url && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, diagram_url: '' }))}
                  className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Diagram Image Thumbnail Preview */}
            {Boolean(formData.diagram_url) && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl max-w-md">
                <p className="text-[10px] font-bold text-slate-400 mb-1">Attached Diagram Preview:</p>
                <img
                  src={formData.diagram_url}
                  alt="Question Diagram"
                  className="max-h-44 object-contain rounded-lg border border-slate-100 mx-auto"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* ===================================================================== */}
          {/* FORMAT-SPECIFIC INPUT INTERFACES                                      */}
          {/* ===================================================================== */}

          {/* 1. Single Choice (SCQ) */}
          {formData.format_type === 'single_mcq' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-600">
                  Four Options (Select the correct radio choice)
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Single correct option</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map(idx => {
                  const letter = String.fromCharCode(65 + idx)
                  const isCorrect = formData.correct_option_index === idx
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border transition-all ${
                        isCorrect ? 'bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-400/20' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="text-[10px] font-black text-slate-700 flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                            isCorrect ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {letter}
                          </span>
                          <span>Option {letter}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, correct_option_index: idx }))}
                          className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                            isCorrect 
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isCorrect ? '✓ Correct Answer' : 'Mark Correct'}
                        </button>
                      </div>

                      <input
                        type="text"
                        value={formData.options[idx] || ''}
                        onChange={e => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${letter} text / LaTeX...`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-indigo-500"
                      />

                      {/* Option Math Preview */}
                      {Boolean(formData.options[idx]?.trim()) && (
                        <div className="mt-1.5 pt-1 text-[11px] text-slate-800 border-t border-slate-100">
                          <KatexRenderer content={formData.options[idx]} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 2. Multiple Choice (MSQ with partial marking) */}
          {formData.format_type === 'multi_mcq' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-purple-700 flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Multiple Choice MSQ (Select all correct options)</span>
                </span>
                <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-bold">
                  Partial Marking Enabled
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map(idx => {
                  const letter = String.fromCharCode(65 + idx)
                  const isChecked = formData.correct_options.includes(idx)
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border transition-all ${
                        isChecked ? 'bg-purple-50/70 border-purple-400 ring-1 ring-purple-400/20' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="text-[10px] font-black text-slate-700 flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                            isChecked ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {letter}
                          </span>
                          <span>Option {letter}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleToggleMultiCorrect(idx)}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-black flex items-center gap-1 transition cursor-pointer ${
                            isChecked 
                              ? 'bg-purple-600 text-white shadow-xs' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isChecked ? (
                            <>
                              <CheckSquare className="w-3 h-3" />
                              <span>Correct</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3 h-3" />
                              <span>Mark Correct</span>
                            </>
                          )}
                        </button>
                      </div>

                      <input
                        type="text"
                        value={formData.options[idx] || ''}
                        onChange={e => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${letter} statement...`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-purple-500"
                      />

                      {/* Option Math Preview */}
                      {Boolean(formData.options[idx]?.trim()) && (
                        <div className="mt-1.5 pt-1 text-[11px] text-slate-800 border-t border-slate-100">
                          <KatexRenderer content={formData.options[idx]} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. Numerical / Integer Input */}
          {formData.format_type === 'numerical' && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-800">
                  Numerical / Integer Answer Value
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  No Negative Marking in JEE Section B (+4 / 0)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Correct Numerical Value</label>
                  <input
                    type="text"
                    value={formData.correct_answer}
                    onChange={e => setFormData(prev => ({ ...prev, correct_answer: e.target.value.replace(/[^0-9.-]/g, '') }))}
                    placeholder="e.g. 42 or 3.14"
                    className="w-full bg-white border border-emerald-300 focus:border-emerald-600 rounded-xl px-3 py-2 text-sm font-black font-mono text-emerald-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Acceptable Decimal Range (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ± 0.05"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium outline-none text-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Matrix Match 4x4 Grid */}
          {formData.format_type === 'matrix_match' && (
            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-900">
                  Matrix Matching Grid Editor (Column I ↔ Column II)
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  4x4 Match Pattern (+3 / -1)
                </span>
              </div>

              {/* Items Definition (Left Column I vs Right Column II) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Column I */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Column I</span>
                  {[0, 1, 2, 3].map(idx => {
                    const letter = String.fromCharCode(65 + idx)
                    const leftArr = formData.matrix_match?.left || ['Item A', 'Item B', 'Item C', 'Item D']
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center shrink-0">
                          {letter}
                        </span>
                        <input
                          type="text"
                          value={leftArr[idx] || ''}
                          onChange={e => {
                            const copy = [...leftArr]
                            copy[idx] = e.target.value
                            setFormData(prev => ({
                              ...prev,
                              matrix_match: { ...prev.matrix_match, left: copy }
                            }))
                          }}
                          placeholder={`Item (${letter})`}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold outline-none"
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Column II */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Column II</span>
                  {['P', 'Q', 'R', 'S'].map((letter, idx) => {
                    const rightArr = formData.matrix_match?.right || ['Property P', 'Property Q', 'Property R', 'Property S']
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center shrink-0">
                          {letter}
                        </span>
                        <input
                          type="text"
                          value={rightArr[idx] || ''}
                          onChange={e => {
                            const copy = [...rightArr]
                            copy[idx] = e.target.value
                            setFormData(prev => ({
                              ...prev,
                              matrix_match: { ...prev.matrix_match, right: copy }
                            }))
                          }}
                          placeholder={`Property (${letter})`}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold outline-none"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 4x4 Interactive Checkbox Grid */}
              <div className="pt-2 border-t border-amber-200/80">
                <span className="text-[10px] font-black uppercase text-slate-600 block mb-2">
                  Check Mappings: (Row in Column I → Target in Column II)
                </span>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full text-center border-collapse bg-white rounded-xl overflow-hidden border border-amber-200 text-xs">
                    <thead>
                      <tr className="bg-amber-100/60 font-black text-amber-900 border-b border-amber-200">
                        <th className="p-2 border-r border-amber-200 text-left">Column I</th>
                        {['P', 'Q', 'R', 'S'].map(col => (
                          <th key={col} className="p-2 border-r border-amber-200 w-16">
                            ({col})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3].map(rowIdx => {
                        const rowLetter = String.fromCharCode(65 + rowIdx)
                        const matches = formData.matrix_match?.matches?.[String(rowIdx)] || []
                        return (
                          <tr key={rowIdx} className="border-b border-slate-100 hover:bg-amber-50/30">
                            <td className="p-2 font-black text-slate-800 border-r border-slate-200 text-left">
                              ({rowLetter}) {formData.matrix_match?.left?.[rowIdx] || `Row ${rowLetter}`}
                            </td>
                            {[0, 1, 2, 3].map(colIdx => {
                              const isChecked = matches.includes(String(colIdx))
                              return (
                                <td key={colIdx} className="p-2 border-r border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMatrixCell(rowIdx, colIdx)}
                                    className={`w-7 h-7 rounded-lg transition flex items-center justify-center mx-auto cursor-pointer ${
                                      isChecked 
                                        ? 'bg-amber-600 text-white font-bold shadow-xs' 
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                                    }`}
                                  >
                                    {isChecked ? '✓' : ''}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Solution & Explanation Textarea */}
          <div className="space-y-1 pt-1">
            <label className="text-[10px] font-black uppercase text-slate-500">
              Solution & Step-by-Step Derivation (Optional, KaTeX supported)
            </label>
            <textarea
              rows={2}
              value={formData.explanation}
              onChange={e => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
              placeholder="e.g. Using the formula $v^2 = u^2 + 2as$, substituting $u=0$ yields..."
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
            />
            {formData.explanation?.trim() && (
              <div className="p-2.5 bg-slate-100 rounded-xl text-xs text-slate-700">
                <KatexRenderer content={formData.explanation} />
              </div>
            )}
          </div>

          {/* Expanded Card Action Dock */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Question</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleExpand}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCommitChanges}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save & Collapse</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
