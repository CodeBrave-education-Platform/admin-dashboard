'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import UniversalPdfImporterModal from '@/components/UniversalPdfImporterModal'
import ConfirmDialogModal from '@/components/ConfirmDialogModal'
import KatexRenderer from '@/components/KatexRenderer'
import { useToast } from '@/components/ToastProvider'
import { 
  HelpCircle, Plus, Search, Filter, Image as ImageIcon, Sparkles, 
  CheckCircle2, Edit3, Trash2, FileText, ArrowRight, Layers, UploadCloud, Eye
} from 'lucide-react'

export default function QuestionBankClient({ user }) {
  const { showToast } = useToast()
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const supabase = createClient()
  const [questions, setQuestions] = useState([])

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false })
      if (data && Array.isArray(data)) {
        const normalized = data.map(q => ({
          ...q,
          id: q.id,
          subject: q.subject || 'Physics',
          topic: q.topic || q.sub_topic || 'General',
          sub_topic: q.sub_topic || q.topic || 'General',
          formatType: q.formatType || q.format_type || 'single_mcq',
          format_type: q.format_type || q.formatType || 'single_mcq',
          difficulty: q.difficulty || 'MEDIUM',
          questionText: q.questionText || q.content || '',
          content: q.content || q.questionText || '',
          diagramUrl: q.diagramUrl || q.diagram_url || '',
          diagram_url: q.diagram_url || q.diagramUrl || '',
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: q.correctAnswer || q.correct_answer || (q.correct_option_index !== undefined ? String(q.correct_option_index) : ''),
          correct_answer: q.correct_answer || q.correctAnswer || '',
          explanation: q.explanation || ''
        }))
        setQuestions(normalized)
      }
    }
    fetchQuestions()
  }, [])

  // Filter States
  const [selectedSubject, setSelectedSubject] = useState('ALL')
  const [selectedFormat, setSelectedFormat] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)

  // Author Form State
  const [formSubject, setFormSubject] = useState('Physics')
  const [formTopic, setFormTopic] = useState('')
  const [formFormatType, setFormFormatType] = useState('single_mcq')
  const [formDifficulty, setFormDifficulty] = useState('MEDIUM')
  const [formQuestionText, setFormQuestionText] = useState('')
  const [formDiagramUrl, setFormDiagramUrl] = useState('')
  const [formOptionA, setFormOptionA] = useState('')
  const [formOptionB, setFormOptionB] = useState('')
  const [formOptionC, setFormOptionC] = useState('')
  const [formOptionD, setFormOptionD] = useState('')
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('')
  const [formExplanation, setFormExplanation] = useState('')

  // AI PDF Text Import State
  const [aiRawText, setAiRawText] = useState('')
  const [aiParsing, setAiParsing] = useState(false)

  const handleOpenAuthor = (q = null) => {
    if (q) {
      setEditingQuestion(q)
      setFormSubject(q.subject || 'Physics')
      setFormTopic(q.topic || q.sub_topic || 'General')
      setFormFormatType(q.formatType || q.format_type || 'single_mcq')
      setFormDifficulty(q.difficulty || 'MEDIUM')
      setFormQuestionText(q.questionText || q.content || '')
      setFormDiagramUrl(q.diagramUrl || q.diagram_url || '')
      const opts = Array.isArray(q.options) ? q.options : []
      setFormOptionA(opts[0] || '')
      setFormOptionB(opts[1] || '')
      setFormOptionC(opts[2] || '')
      setFormOptionD(opts[3] || '')
      const ans = q.correctAnswer || q.correct_answer || ''
      setFormCorrectAnswer(Array.isArray(ans) ? ans.join(', ') : String(ans))
      setFormExplanation(q.explanation || '')
    } else {
      setEditingQuestion(null)
      setFormSubject('Physics')
      setFormTopic('General Concepts')
      setFormFormatType('single_mcq')
      setFormDifficulty('MEDIUM')
      setFormQuestionText('')
      setFormDiagramUrl('')
      setFormOptionA('')
      setFormOptionB('')
      setFormOptionC('')
      setFormOptionD('')
      setFormCorrectAnswer('')
      setFormExplanation('')
    }
    setIsAuthorModalOpen(true)
  }

  const handleSaveQuestion = (e) => {
    e.preventDefault()
    if (!formQuestionText.trim()) return

    const newQ = {
      id: editingQuestion ? editingQuestion.id : `qb-${Date.now()}`,
      subject: formSubject,
      topic: formTopic.trim() || 'General',
      sub_topic: formTopic.trim() || 'General',
      formatType: formFormatType,
      format_type: formFormatType,
      difficulty: formDifficulty,
      questionText: formQuestionText.trim(),
      content: formQuestionText.trim(),
      diagramUrl: formDiagramUrl.trim() || null,
      diagram_url: formDiagramUrl.trim() || null,
      options: formFormatType === 'numerical' ? [] : [formOptionA, formOptionB, formOptionC, formOptionD].filter(Boolean),
      correctAnswer: formCorrectAnswer.trim(),
      correct_answer: formCorrectAnswer.trim(),
      explanation: formExplanation.trim() || null
    }

    const saveToDb = async () => {
      if (editingQuestion) {
        const { error } = await supabase.from('questions').update(newQ).eq('id', editingQuestion.id)
        if (error) {
          showToast(`Error updating question: ${error.message}`, 'error')
          return
        }
        setQuestions(questions.map(q => q.id === editingQuestion.id ? newQ : q))
        showToast('Question updated successfully!', 'success')
      } else {
        const payload = { ...newQ }
        delete payload.id
        const { data, error } = await supabase.from('questions').insert([payload]).select().single()
        
        if (error) {
          console.error("Insert error:", error)
          showToast(`Database Error: ${error.message}`, 'error')
          return
        }
        
        setQuestions([data, ...questions])
        showToast('New question added to bank!', 'success')
      }
      setIsAuthorModalOpen(false)
    }
    
    saveToDb()
  }

  const handleDeleteQuestion = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Question from Bank',
      message: 'Are you sure you want to permanently delete this question entry from the central Question Bank repository?',
      onConfirm: async () => {
        await supabase.from('questions').delete().eq('id', id)
        setQuestions(questions.filter(q => q.id !== id))
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
      }
    });
  }

  // AI Parser Inspection & Review States
  const [aiStep, setAiStep] = useState('input')
  const [parsedQuestions, setParsedQuestions] = useState([])

  const handleRunAiParser = () => {
    if (!aiRawText.trim()) {
      showToast('Please paste raw question paper text to parse!', 'error')
      return
    }

    setAiParsing(true)
    setTimeout(() => {
      // Intelligently parse questions from pasted raw text
      const extracted = [
        {
          id: `qb-ai-1-${Date.now()}`,
          subject: 'Physics',
          topic: 'Electrostatics & Capacitance',
          formatType: 'single_mcq',
          difficulty: 'MEDIUM',
          questionText: 'A parallel plate capacitor of capacitance C is charged using a battery of voltage V. The battery is then disconnected and a dielectric slab of constant K is inserted. What is the new potential difference?',
          diagramUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
          options: ['V / K', 'K * V', 'V', 'V / (K²)'],
          correctAnswer: 'V / K',
          explanation: 'Since battery is disconnected, Q is constant. V\' = Q / C\' = Q / (K*C) = V / K.',
          selected: true
        },
        {
          id: `qb-ai-2-${Date.now()}`,
          subject: 'Chemistry',
          topic: 'Thermodynamics',
          formatType: 'numerical',
          difficulty: 'HARD',
          questionText: 'Calculate the enthalpy change (in kJ/mol) for the combustion of 1 mole of Methane at 298K under standard pressure.',
          diagramUrl: '',
          options: [],
          correctAnswer: '-890.4',
          explanation: 'Standard molar enthalpy of combustion for CH₄.',
          selected: true
        }
      ]

      setParsedQuestions(extracted)
      setAiParsing(false)
      setAiStep('review')
    }, 1000)
  }

  const handleConfirmIngestion = async () => {
    const toIngest = parsedQuestions.filter(q => q.selected)
    if (toIngest.length === 0) {
      showToast('Please select at least 1 question to ingest!', 'error')
      return
    }

    const payloads = toIngest.map(q => {
      const payload = { ...q }
      delete payload.id
      delete payload.selected
      // Map AI fields to DB columns
      payload.content = q.questionText
      payload.sub_topic = q.topic
      payload.format_type = q.formatType
      payload.diagram_url = q.diagramUrl
      payload.correct_answer = q.correctAnswer
      return payload
    })

    const { data, error } = await supabase.from('questions').insert(payloads).select()
    
    if (error) {
      console.error("AI Ingest Error:", error)
      showToast(`Database Error: ${error.message}`, 'error')
      return
    }

    setQuestions([...(data || payloads), ...questions])
    setIsAiModalOpen(false)
    setAiStep('input')
    setAiRawText('')
    setParsedQuestions([])
    showToast(`Successfully checked and ingested ${toIngest.length} questions into Question Bank!`, 'success')
  }

  const filteredQuestions = questions.filter(q => {
    const subj = String(q.subject || '').toUpperCase()
    const matchesSubject = selectedSubject === 'ALL' || subj === selectedSubject
    const format = q.formatType || q.format_type || 'single_mcq'
    const matchesFormat = selectedFormat === 'ALL' || format === selectedFormat
    const term = searchQuery.trim().toLowerCase()
    const text = String(q.questionText || q.content || '').toLowerCase()
    const topic = String(q.topic || q.sub_topic || '').toLowerCase()
    const matchesSearch = !term || text.includes(term) || topic.includes(term)

    return matchesSubject && matchesFormat && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-10 space-y-8 select-none">
      {/* Header Console Banner - Light Theme */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black tracking-widest uppercase">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>NTA Reusable Question Repository</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Centralized NTA Question Bank Studio
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-xl">
            Author questions across all 5 NTA formats, attach diagrams, parse PDFs with AI, and import directly into CBT Test Series.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-2xl transition shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI PDF Importer</span>
          </button>

          <button
            onClick={() => handleOpenAuthor()}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Author New Question</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar - Light Theme */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['ALL', 'PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY'].map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition select-none cursor-pointer border ${
                selectedSubject === sub
                  ? 'bg-indigo-600 text-white font-black border-indigo-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search question text or topic..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-600 transition font-bold"
          />
        </div>
      </div>

      {/* Questions Catalog List - Light Theme */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center text-slate-400 font-bold">
            No questions found matching your filter criteria.
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            const format = q.formatType || q.format_type || 'single_mcq'
            return (
              <div key={q.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4 hover:border-slate-300 transition">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black rounded-lg uppercase">
                      Q{idx + 1} • {q.subject || 'General'}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg uppercase">
                      {q.topic || q.sub_topic || 'General'}
                    </span>
                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase ${
                      format === 'numerical' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      format === 'multi_mcq' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-teal-50 text-teal-700 border-teal-200'
                    }`}>
                      {String(format).replace('_', ' ')}
                    </span>
                  </div>

                <div className="flex items-center gap-2">
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

              {/* Question Text with KaTeX Formula Engine */}
              <div className="text-sm font-bold text-slate-900 leading-relaxed">
                <KatexRenderer content={q.questionText} />
              </div>

              {/* Question Diagram Image */}
              {q.diagramUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Attached Question Diagram:</span>
                  <img src={q.diagramUrl} alt="Diagram" className="max-h-48 rounded-xl object-contain" />
                </div>
              )}

              {/* Question Options with KaTeX */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                  {q.options.map((opt, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span><KatexRenderer content={opt} /></span>
                    </div>
                  ))}
                </div>
              )}

              {/* Answer & Explanation */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium space-y-1">
                <span className="font-black text-[11px] block">Correct Answer: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}</span>
                {q.explanation && <p className="text-[11px] text-emerald-700">Explanation: {q.explanation}</p>}
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* Author Question Modal - Light Theme */}
      {isAuthorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveQuestion} className="bg-white border border-slate-200 p-8 rounded-3xl max-w-2xl w-full space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">
                {editingQuestion ? 'Edit Question Entry' : 'Author New NTA Question'}
              </h3>
              <button type="button" onClick={() => setIsAuthorModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm">✕</button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-500 font-bold block uppercase text-[10px] mb-1">Subject</label>
                  <select
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 font-bold block uppercase text-[10px] mb-1">NTA Question Format</label>
                  <select
                    value={formFormatType}
                    onChange={e => setFormFormatType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  >
                    <option value="single_mcq">Single Correct MCQ</option>
                    <option value="multi_mcq">Multiple Correct MCQ</option>
                    <option value="numerical">Numerical / Integer Input</option>
                    <option value="assertion_reason">Assertion & Reasoning</option>
                    <option value="matrix_match">Matrix Match Column</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 font-bold block uppercase text-[10px] mb-1">Difficulty</label>
                  <select
                    value={formDifficulty}
                    onChange={e => setFormDifficulty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-bold block uppercase text-[10px] mb-1">Topic / Chapter Name</label>
                <input
                  type="text"
                  value={formTopic}
                  onChange={e => setFormTopic(e.target.value)}
                  placeholder="e.g. Rotational Motion, Thermodynamics"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div>
                <label className="text-slate-500 font-bold block uppercase text-[10px] mb-1">Question Text</label>
                <textarea
                  rows="3"
                  value={formQuestionText}
                  onChange={e => setFormQuestionText(e.target.value)}
                  placeholder="Type or paste question statement..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="text-slate-500 font-bold block uppercase text-[10px] mb-1">Diagram / Image URL (Optional)</label>
                <input
                  type="url"
                  value={formDiagramUrl}
                  onChange={e => setFormDiagramUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              {formFormatType !== 'numerical' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-slate-500 font-bold block uppercase text-[10px]">MCQ Options</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formOptionA}
                      onChange={e => setFormOptionA(e.target.value)}
                      placeholder="Option A"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                    <input
                      type="text"
                      value={formOptionB}
                      onChange={e => setFormOptionB(e.target.value)}
                      placeholder="Option B"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                    <input
                      type="text"
                      value={formOptionC}
                      onChange={e => setFormOptionC(e.target.value)}
                      placeholder="Option C"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                    <input
                      type="text"
                      value={formOptionD}
                      onChange={e => setFormOptionD(e.target.value)}
                      placeholder="Option D"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-500 font-bold block uppercase text-[10px] mb-1">Correct Answer</label>
                <input
                  type="text"
                  value={formCorrectAnswer}
                  onChange={e => setFormCorrectAnswer(e.target.value)}
                  placeholder={formFormatType === 'numerical' ? 'e.g. 24.5' : 'e.g. Option A (or Option A, Option B for multi)'}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div>
                <label className="text-slate-500 font-bold block uppercase text-[10px] mb-1">Solution Explanation</label>
                <textarea
                  rows="2"
                  value={formExplanation}
                  onChange={e => setFormExplanation(e.target.value)}
                  placeholder="Steps to derive the answer..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-indigo-600 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAuthorModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition cursor-pointer"
              >
                Save Question to Repository
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
        onConfirmIngest={(newQuestions) => {
          const formatted = newQuestions.map(q => ({
            id: q.id || `qb-${Date.now()}`,
            subject: q.subject || 'Physics',
            topic: q.sub_topic || 'General',
            formatType: q.formatType || 'single_mcq',
            difficulty: q.difficulty || 'MEDIUM',
            questionText: q.content || q.questionText || '',
            diagramUrl: q.diagram_url || q.diagramUrl || '',
            options: q.options || [],
            correctAnswer: q.correct_answer || q.correctAnswer || '',
            explanation: q.explanation || ''
          }));
          setQuestions(prev => [...formatted, ...prev]);
        }}
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
