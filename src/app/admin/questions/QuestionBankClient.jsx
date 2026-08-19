'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import UniversalPdfImporterModal from '@/components/UniversalPdfImporterModal'
import ConfirmDialogModal from '@/components/ConfirmDialogModal'
import KatexRenderer from '@/components/KatexRenderer'
import { useToast } from '@/components/ToastProvider'
import { 
  HelpCircle, Plus, Search, Filter, Image as ImageIcon, Sparkles, 
  CheckCircle2, Edit3, Trash2, FileText, ArrowRight, Layers, UploadCloud, 
  Eye, Tag, X, Check, Award, AlertCircle, RefreshCw
} from 'lucide-react'

const SUBJECT_LIST = ['ALL', 'PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY', 'COMPUTER SCIENCE', 'GENERAL']
const SUBJECT_OPTIONS = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'General']

const FORMAT_OPTIONS = [
  { value: 'ALL', label: 'All Formats' },
  { value: 'single_mcq', label: 'Single Choice (SCQ)' },
  { value: 'multi_mcq', label: 'Multi-Select (MSQ)' },
  { value: 'numerical', label: 'Numerical / Integer' },
  { value: 'assertion_reason', label: 'Assertion & Reason' },
  { value: 'matrix_match', label: 'Matrix Match' }
]

const DIFFICULTY_OPTIONS = ['ALL', 'EASY', 'MEDIUM', 'HARD']

export default function QuestionBankClient({ user }) {
  const { showToast } = useToast()
  const supabase = createClient()

  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  // Filter States
  const [selectedSubject, setSelectedSubject] = useState('ALL')
  const [selectedFormat, setSelectedFormat] = useState('ALL')
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  // Modals
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Author Form State
  const [formSubject, setFormSubject] = useState('Physics')
  const [formTopic, setFormTopic] = useState('')
  const [formSubTopic, setFormSubTopic] = useState('')
  const [formFormatType, setFormFormatType] = useState('single_mcq')
  const [formDifficulty, setFormDifficulty] = useState('MEDIUM')
  const [formContent, setFormContent] = useState('')
  const [formDiagramUrl, setFormDiagramUrl] = useState('')
  const [formOptionA, setFormOptionA] = useState('')
  const [formOptionB, setFormOptionB] = useState('')
  const [formOptionC, setFormOptionC] = useState('')
  const [formOptionD, setFormOptionD] = useState('')
  const [formCorrectOptionIdx, setFormCorrectOptionIdx] = useState(0)
  const [formMultiCorrectIndices, setFormMultiCorrectIndices] = useState([0])
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('')
  const [formExplanation, setFormExplanation] = useState('')
  const [formMarksPositive, setFormMarksPositive] = useState('4')
  const [formMarksNegative, setFormMarksNegative] = useState('-1')
  const [formTags, setFormTags] = useState([])
  const [tagInput, setTagInput] = useState('')

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && Array.isArray(data)) {
        const normalized = data.map(q => {
          const opts = Array.isArray(q.options) ? q.options : []
          const corrIdx = typeof q.correct_option_index === 'number' ? q.correct_option_index : 0
          const corrAns = q.correct_answer || (opts.length > corrIdx ? opts[corrIdx] : '')

          return {
            ...q,
            id: q.id,
            subject: q.subject || 'General',
            topic: q.topic || q.sub_topic || 'General',
            sub_topic: q.sub_topic || q.topic || 'General',
            format_type: q.format_type || q.type || 'single_mcq',
            type: q.type || 'mcq',
            difficulty: (q.difficulty || 'MEDIUM').toUpperCase(),
            content: q.content || q.questionText || '',
            diagram_url: q.diagram_url || '',
            options: opts,
            correct_option_index: corrIdx,
            correct_answer: corrAns,
            explanation: q.explanation || '',
            marks_positive: q.marks_positive ?? 4,
            marks_negative: q.marks_negative ?? -1,
            tags: Array.isArray(q.tags) ? q.tags : []
          }
        })
        setQuestions(normalized)
      }
    } catch (err) {
      console.error('[Fetch Question Bank Error]:', err.message)
      showToast('Failed to load question bank: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  const handleOpenAuthor = (q = null) => {
    if (q) {
      setEditingQuestion(q)
      setFormSubject(q.subject || 'Physics')
      setFormTopic(q.topic || 'General')
      setFormSubTopic(q.sub_topic || 'General')
      setFormFormatType(q.format_type || 'single_mcq')
      setFormDifficulty((q.difficulty || 'MEDIUM').toUpperCase())
      setFormContent(q.content || '')
      setFormDiagramUrl(q.diagram_url || '')
      
      const opts = Array.isArray(q.options) ? q.options : []
      setFormOptionA(opts[0] || '')
      setFormOptionB(opts[1] || '')
      setFormOptionC(opts[2] || '')
      setFormOptionD(opts[3] || '')
      
      setFormCorrectOptionIdx(typeof q.correct_option_index === 'number' ? q.correct_option_index : 0)
      
      if (q.format_type === 'multi_mcq') {
        const parts = String(q.correct_answer || '').split(',').map(s => s.trim())
        const multiIdxs = []
        parts.forEach(p => {
          const matchIdx = opts.findIndex(o => o === p)
          if (matchIdx !== -1) multiIdxs.push(matchIdx)
          const charIdx = p.charCodeAt(0) - 65
          if (charIdx >= 0 && charIdx <= 3 && !multiIdxs.includes(charIdx)) multiIdxs.push(charIdx)
        })
        setFormMultiCorrectIndices(multiIdxs.length > 0 ? multiIdxs : [0])
      } else {
        setFormMultiCorrectIndices([0])
      }

      setFormCorrectAnswer(String(q.correct_answer || ''))
      setFormExplanation(q.explanation || '')
      setFormMarksPositive(String(q.marks_positive ?? 4))
      setFormMarksNegative(String(q.marks_negative ?? -1))
      setFormTags(Array.isArray(q.tags) ? [...q.tags] : [])
      setTagInput('')
    } else {
      setEditingQuestion(null)
      setFormSubject('Physics')
      setFormTopic('Mechanics')
      setFormSubTopic('General')
      setFormFormatType('single_mcq')
      setFormDifficulty('MEDIUM')
      setFormContent('')
      setFormDiagramUrl('')
      setFormOptionA('')
      setFormOptionB('')
      setFormOptionC('')
      setFormOptionD('')
      setFormCorrectOptionIdx(0)
      setFormMultiCorrectIndices([0])
      setFormCorrectAnswer('')
      setFormExplanation('')
      setFormMarksPositive('4')
      setFormMarksNegative('-1')
      setFormTags([])
      setTagInput('')
    }
    setIsAuthorModalOpen(true)
  }

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim().replace(/^,+|,+$/g, '')
      if (val && !formTags.includes(val)) {
        setFormTags([...formTags, val])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormTags(formTags.filter(t => t !== tagToRemove))
  }

  const handleSaveQuestion = async (e) => {
    e.preventDefault()
    if (!formContent.trim()) {
      showToast('Question statement content is required.', 'error')
      return
    }

    let finalOptions = []
    let finalCorrectOptionIdx = 0
    let finalCorrectAnswer = ''

    if (formFormatType === 'single_mcq' || formFormatType === 'assertion_reason') {
      finalOptions = [formOptionA.trim(), formOptionB.trim(), formOptionC.trim(), formOptionD.trim()]
      if (finalOptions.some(opt => !opt)) {
        showToast('All 4 options (A, B, C, D) are required for single choice questions.', 'error')
        return
      }
      finalCorrectOptionIdx = formCorrectOptionIdx
      finalCorrectAnswer = finalOptions[formCorrectOptionIdx] || `Option ${String.fromCharCode(65 + formCorrectOptionIdx)}`
    } else if (formFormatType === 'multi_mcq') {
      finalOptions = [formOptionA.trim(), formOptionB.trim(), formOptionC.trim(), formOptionD.trim()]
      if (finalOptions.some(opt => !opt)) {
        showToast('All 4 options (A, B, C, D) are required for multiple choice questions.', 'error')
        return
      }
      if (formMultiCorrectIndices.length === 0) {
        showToast('Select at least one correct choice for multi-select question.', 'error')
        return
      }
      finalCorrectOptionIdx = formMultiCorrectIndices[0]
      finalCorrectAnswer = formMultiCorrectIndices.map(idx => finalOptions[idx]).join(', ')
    } else if (formFormatType === 'numerical') {
      if (!formCorrectAnswer.trim()) {
        showToast('Numerical correct answer is required.', 'error')
        return
      }
      finalOptions = []
      finalCorrectOptionIdx = 0
      finalCorrectAnswer = formCorrectAnswer.trim()
    } else {
      // matrix match or other
      finalOptions = [formOptionA, formOptionB, formOptionC, formOptionD].filter(Boolean)
      finalCorrectOptionIdx = 0
      finalCorrectAnswer = formCorrectAnswer.trim() || 'Matrix Match Solution'
    }

    const payload = {
      content: formContent.trim(),
      format_type: formFormatType,
      type: formFormatType === 'numerical' ? 'numerical' : 'mcq',
      subject: formSubject,
      topic: formTopic.trim() || 'General',
      sub_topic: formSubTopic.trim() || formTopic.trim() || 'General',
      difficulty: formDifficulty,
      options: finalOptions,
      correct_option_index: finalCorrectOptionIdx,
      correct_answer: finalCorrectAnswer,
      explanation: formExplanation.trim() || null,
      diagram_url: formDiagramUrl.trim() || null,
      marks_positive: parseFloat(formMarksPositive) || 4,
      marks_negative: Math.abs(parseFloat(formMarksNegative)) * -1 || -1,
      tags: formTags
    }

    setIsSaving(true)
    try {
      if (editingQuestion) {
        const { data, error } = await supabase
          .from('question_bank')
          .update(payload)
          .eq('id', editingQuestion.id)
          .select()
          .single()

        if (error) throw error

        const updated = data || { ...editingQuestion, ...payload }
        setQuestions(questions.map(q => q.id === editingQuestion.id ? updated : q))
        showToast('Question successfully updated in central Question Bank!', 'success')
      } else {
        const { data, error } = await supabase
          .from('question_bank')
          .insert([payload])
          .select()
          .single()

        if (error) throw error

        const created = data || { id: `qb-${Date.now()}`, ...payload }
        setQuestions([created, ...questions])
        showToast('New question created in central Question Bank!', 'success')
      }
      setIsAuthorModalOpen(false)
    } catch (err) {
      console.error('[Save Question Bank Error]:', err.message)
      showToast(`Database Error: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQuestion = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Question from Repository',
      message: 'Are you sure you want to permanently delete this question from the central Question Bank? Linked exams using this question will update automatically.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('question_bank').delete().eq('id', id)
          if (error) throw error
          setQuestions(questions.filter(q => q.id !== id))
          showToast('Question deleted from Question Bank.', 'success')
        } catch (err) {
          showToast('Failed to delete question: ' + err.message, 'error')
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        }
      }
    })
  }

  const handleAiQuestionsIngested = async (extractedQuestions) => {
    if (!Array.isArray(extractedQuestions) || extractedQuestions.length === 0) return

    try {
      const payloads = extractedQuestions.map(q => ({
        content: q.content || q.questionText || 'Untitled Question',
        format_type: q.formatType || q.format_type || 'single_mcq',
        type: 'mcq',
        subject: SUBJECT_OPTIONS.includes(q.subject) ? q.subject : 'General',
        topic: q.sub_topic || q.topic || 'General',
        sub_topic: q.sub_topic || q.topic || 'General',
        difficulty: (q.difficulty || 'MEDIUM').toUpperCase(),
        options: Array.isArray(q.options) ? q.options : [],
        correct_option_index: typeof q.correct_option_index === 'number' ? q.correct_option_index : 0,
        correct_answer: q.correct_answer || q.correctAnswer || '',
        explanation: q.explanation || '',
        diagram_url: q.diagram_url || q.diagramUrl || null,
        marks_positive: q.marks?.positive || 4,
        marks_negative: q.marks?.negative || -1,
        tags: ['AI Imported']
      }))

      const { data, error } = await supabase.from('question_bank').insert(payloads).select()
      if (error) throw error

      setQuestions(prev => [...(data || payloads), ...prev])
      showToast(`🎉 Ingested ${payloads.length} questions into Question Bank repository!`, 'success')
      setIsAiModalOpen(false)
    } catch (err) {
      console.error('[AI Ingest Error]:', err.message)
      showToast('Database Error during AI Ingest: ' + err.message, 'error')
    }
  }

  // Filter Catalog Logic
  const filteredQuestions = questions.filter(q => {
    const subj = String(q.subject || '').toUpperCase()
    const matchesSubject = selectedSubject === 'ALL' || subj === selectedSubject.toUpperCase()

    const format = q.format_type || q.type || 'single_mcq'
    const matchesFormat = selectedFormat === 'ALL' || format === selectedFormat

    const diff = String(q.difficulty || 'MEDIUM').toUpperCase()
    const matchesDifficulty = selectedDifficulty === 'ALL' || diff === selectedDifficulty.toUpperCase()

    const matchesTag = !selectedTag || (Array.isArray(q.tags) && q.tags.includes(selectedTag))

    const term = searchQuery.trim().toLowerCase()
    const text = String(q.content || '').toLowerCase()
    const topic = String(q.topic || '').toLowerCase()
    const subTopic = String(q.sub_topic || '').toLowerCase()
    const tagsStr = Array.isArray(q.tags) ? q.tags.join(' ').toLowerCase() : ''
    const matchesSearch = !term || text.includes(term) || topic.includes(term) || subTopic.includes(term) || tagsStr.includes(term)

    return matchesSubject && matchesFormat && matchesDifficulty && matchesTag && matchesSearch
  })

  // Collect all unique tags for filter chip list
  const allAvailableTags = Array.from(new Set(questions.flatMap(q => Array.isArray(q.tags) ? q.tags : []))).filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8 select-none max-w-7xl mx-auto">
      {/* Header Console Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black tracking-widest uppercase">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Central Question Bank Repository</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Centralized Question Bank Studio
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-xl">
            Create and maintain canonical questions across Physics, Chemistry, Math, Biology, and Computer Science with LaTeX math formulas, diagrams, and auto-sync to all linked CBT Test Series.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 w-full sm:w-auto">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-2xl transition shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI PDF Importer</span>
          </button>

          <button
            onClick={() => handleOpenAuthor()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Author New Question</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 md:p-5 rounded-3xl shadow-sm space-y-4">
        {/* Subject Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {SUBJECT_LIST.map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition select-none cursor-pointer whitespace-nowrap border shrink-0 ${
                selectedSubject === sub
                  ? 'bg-indigo-600 text-white font-black border-indigo-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Second Row: Format, Difficulty, Tags, and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Format Selector */}
            <select
              value={selectedFormat}
              onChange={e => setSelectedFormat(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600"
            >
              {FORMAT_OPTIONS.map(fmt => (
                <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
              ))}
            </select>

            {/* Difficulty Selector */}
            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600"
            >
              {DIFFICULTY_OPTIONS.map(diff => (
                <option key={diff} value={diff}>
                  {diff === 'ALL' ? 'All Difficulties' : `${diff} Difficulty`}
                </option>
              ))}
            </select>

            {/* Tag Filter */}
            {allAvailableTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600"
              >
                <option value="">All Tags ({allAvailableTags.length})</option>
                {allAvailableTags.map(tag => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            )}

            {(selectedSubject !== 'ALL' || selectedFormat !== 'ALL' || selectedDifficulty !== 'ALL' || selectedTag || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedSubject('ALL')
                  setSelectedFormat('ALL')
                  setSelectedDifficulty('ALL')
                  setSelectedTag('')
                  setSearchQuery('')
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Omnibar Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search content, topic, tag..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 transition font-bold"
            />
          </div>
        </div>
      </div>

      {/* Questions Catalog List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading canonical Question Bank repository...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-2">
            <p className="text-sm font-black text-slate-700">No questions found matching your filter criteria.</p>
            <p className="text-xs text-slate-400">Try adjusting your subject, format, or search query.</p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            const format = q.format_type || 'single_mcq'
            const diff = (q.difficulty || 'MEDIUM').toUpperCase()

            return (
              <div
                key={q.id}
                className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-sm space-y-4 hover:border-slate-300 transition"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black rounded-lg uppercase">
                      Q{idx + 1} • {q.subject || 'General'}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg uppercase">
                      {q.topic || 'General'}
                    </span>
                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase ${
                      format === 'numerical' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      format === 'multi_mcq' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      format === 'assertion_reason' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-teal-50 text-teal-700 border-teal-200'
                    }`}>
                      {String(format).replace('_', ' ')}
                    </span>
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase ${
                      diff === 'EASY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      diff === 'HARD' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {diff}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleOpenAuthor(q)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-indigo-700 border border-slate-200 rounded-xl transition cursor-pointer"
                      title="Edit Question"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Question Statement with KaTeX */}
                <div className="text-sm font-bold text-slate-900 leading-relaxed break-words">
                  <KatexRenderer content={q.content} />
                </div>

                {/* Question Diagram Image Preview */}
                {q.diagram_url && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block max-w-full">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Attached Diagram:</span>
                    <img src={q.diagram_url} alt="Question Diagram" className="max-h-48 max-w-full rounded-xl object-contain" />
                  </div>
                )}

                {/* MCQ Options with KaTeX */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <div className="flex-1 break-words">
                          <KatexRenderer content={opt} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Answer & Explanation Box */}
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-medium space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-black text-[11px]">
                    <span>Correct Answer: {q.correct_answer || (q.options && q.options[q.correct_option_index]) || 'N/A'}</span>
                    <span className="text-emerald-700 font-mono text-[10px]">
                      Marks: +{q.marks_positive} / {q.marks_negative}
                    </span>
                  </div>
                  {q.explanation && (
                    <div className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60 leading-relaxed">
                      <span className="font-bold">Explanation:</span> <KatexRenderer content={q.explanation} />
                    </div>
                  )}
                </div>

                {/* Tag Chips */}
                {Array.isArray(q.tags) && q.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {q.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold rounded-lg">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Author / Edit Question Modal Dialog */}
      {isAuthorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleSaveQuestion}
            className="bg-white border border-slate-200 p-5 sm:p-8 rounded-3xl max-w-3xl w-full space-y-5 shadow-2xl my-auto max-h-[92vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingQuestion ? 'Edit Question Entry' : 'Author New Canonical Question'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    Synced automatically with central Question Bank and all linked test exams
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthorModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              {/* Row 1: Subject, Format, Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Subject</label>
                  <select
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  >
                    {SUBJECT_OPTIONS.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Question Format</label>
                  <select
                    value={formFormatType}
                    onChange={e => setFormFormatType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  >
                    <option value="single_mcq">Single Correct MCQ</option>
                    <option value="multi_mcq">Multiple Correct MCQ</option>
                    <option value="numerical">Numerical / Integer Input</option>
                    <option value="assertion_reason">Assertion & Reasoning</option>
                    <option value="matrix_match">Matrix Match Column</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Difficulty</label>
                  <select
                    value={formDifficulty}
                    onChange={e => setFormDifficulty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Topic & Sub-topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Topic / Chapter Name</label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={e => setFormTopic(e.target.value)}
                    placeholder="e.g. Rotational Dynamics"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Sub-Topic</label>
                  <input
                    type="text"
                    value={formSubTopic}
                    onChange={e => setFormSubTopic(e.target.value)}
                    placeholder="e.g. Moment of Inertia"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  />
                </div>
              </div>

              {/* Row 3: Question Content (with KaTeX Formula Live Preview) */}
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">
                  Question Statement (Markdown & LaTeX: use $...$ for inline math, $$...$$ for block math)
                </label>
                <textarea
                  rows="3"
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="Type or paste question statement..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 outline-none focus:border-indigo-600 font-medium font-mono text-xs"
                />
              </div>

              {/* Live KaTeX Preview Box */}
              {formContent.trim() && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1">
                  <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider block">
                    KaTeX Math Live Preview
                  </span>
                  <div className="text-xs text-slate-800 font-medium leading-relaxed break-words">
                    <KatexRenderer content={formContent} />
                  </div>
                </div>
              )}

              {/* Row 4: Diagram / Image URL & Live Preview */}
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Diagram / Image URL (Optional)</label>
                <input
                  type="url"
                  value={formDiagramUrl}
                  onChange={e => setFormDiagramUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              {formDiagramUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block max-w-full">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Diagram Preview:</span>
                  <img src={formDiagramUrl} alt="Preview" className="max-h-36 max-w-full rounded-xl object-contain" />
                </div>
              )}

              {/* MCQ Options Editor */}
              {formFormatType !== 'numerical' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-500 font-bold block uppercase text-[10px]">
                      MCQ Options (Enter text & select correct option)
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600">
                      {formFormatType === 'multi_mcq' ? 'Select all that apply' : 'Select 1 correct option'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { val: formOptionA, setVal: setFormOptionA, label: 'A', idx: 0 },
                      { val: formOptionB, setVal: setFormOptionB, label: 'B', idx: 1 },
                      { val: formOptionC, setVal: setFormOptionC, label: 'C', idx: 2 },
                      { val: formOptionD, setVal: setFormOptionD, label: 'D', idx: 3 }
                    ].map(opt => {
                      const isSelected = formFormatType === 'multi_mcq'
                        ? formMultiCorrectIndices.includes(opt.idx)
                        : formCorrectOptionIdx === opt.idx

                      return (
                        <div
                          key={opt.label}
                          className={`p-3 rounded-2xl border transition space-y-2 ${
                            isSelected ? 'bg-indigo-50/50 border-indigo-300' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-slate-700">Option {opt.label}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (formFormatType === 'multi_mcq') {
                                  if (formMultiCorrectIndices.includes(opt.idx)) {
                                    setFormMultiCorrectIndices(formMultiCorrectIndices.filter(i => i !== opt.idx))
                                  } else {
                                    setFormMultiCorrectIndices([...formMultiCorrectIndices, opt.idx])
                                  }
                                } else {
                                  setFormCorrectOptionIdx(opt.idx)
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{isSelected ? 'Correct Answer' : 'Mark Correct'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={opt.val}
                            onChange={e => opt.setVal(e.target.value)}
                            placeholder={`Option ${opt.label} text or formula`}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium outline-none focus:border-indigo-600"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Numerical Answer Input */}
              {formFormatType === 'numerical' && (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">
                    Correct Numerical / Decimal Answer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCorrectAnswer}
                    onChange={e => setFormCorrectAnswer(e.target.value)}
                    placeholder="e.g. 24.5 or -10"
                    required
                    className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  />
                </div>
              )}

              {/* Marks Scheme & Tag Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Marks (+ / -)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={formMarksPositive}
                      onChange={e => setFormMarksPositive(e.target.value)}
                      placeholder="+4"
                      className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                    <input
                      type="number"
                      value={formMarksNegative}
                      onChange={e => setFormMarksNegative(e.target.value)}
                      placeholder="-1"
                      className="w-full bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">Tags (Press Enter to add)</label>
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[38px]">
                    {formTags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        #{tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="text-indigo-400 hover:text-indigo-700">×</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder={formTags.length === 0 ? "e.g. JEE 2024, PYQ..." : ""}
                      className="flex-1 bg-transparent border-none outline-none text-xs font-medium min-w-[80px]"
                    />
                  </div>
                </div>
              </div>

              {/* Solution Explanation */}
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[10px]">Solution Explanation & Derivation Steps</label>
                <textarea
                  rows="2"
                  value={formExplanation}
                  onChange={e => setFormExplanation(e.target.value)}
                  placeholder="Detailed derivation or reasoning for the answer key..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-indigo-600 font-medium text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white z-10">
              <button
                type="button"
                onClick={() => setIsAuthorModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-60"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{editingQuestion ? 'Update Question' : 'Save Question to Repository'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Universal AI PDF & Document Importer Modal */}
      <UniversalPdfImporterModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        targetModuleName="Central Question Bank"
        onConfirmIngest={handleAiQuestionsIngested}
      />

      {/* In-Website Confirmation Modal */}
      <ConfirmDialogModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
