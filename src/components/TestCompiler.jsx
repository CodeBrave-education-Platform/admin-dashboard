'use client'

import * as React from 'react'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import UniversalPdfImporterModal from '@/components/UniversalPdfImporterModal'
import { useToast } from '@/components/ToastProvider'
import { 
  Plus, Search, ClipboardList, Trash2, CheckCircle2, 
  HelpCircle, Settings, Layers, Calendar, Loader2, Sparkles
} from 'lucide-react'

export default function CompilerClient({ packages = [], initialPackages = [], exam = null }) {
  const pkgs = packages.length > 0 ? packages : initialPackages
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-20 bg-white border border-slate-200 rounded-3xl">
        <Loader2 className="w-8 h-8 text-indigo-650 animate-spin" />
      </div>
    }>
      <CompilerClientContent packages={pkgs || []} exam={exam} />
    </Suspense>
  )
}

function CompilerClientContent({ packages = [], exam = null }) {
  const supabase = createClient()
  const { showToast } = useToast()
  const searchParams = useSearchParams()
  const packageIdParam = searchParams?.get('packageId') || searchParams?.get('id')

  // Form States: New Question Authoring
  const [subject, setSubject] = useState('Physics')
  const [subTopic, setSubTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [section, setSection] = useState('Section A')
  const [questionType, setQuestionType] = useState('single') // single, multiple, integer, match, blanks
  const [content, setContent] = useState('')
  const [options, setOptions] = useState(['', '', '', '']) // Used for single/multiple
  const [correctOptionIdx, setCorrectOptionIdx] = useState(0) // Used for single
  const [correctOptionsMultiple, setCorrectOptionsMultiple] = useState([]) // Used for multiple
  const [integerAnswer, setIntegerAnswer] = useState('') // Used for integer
  const [blankAnswer, setBlankAnswer] = useState('') // Used for blanks
  const [matrixMatch, setMatrixMatch] = useState([{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }])
  
  // Per-question marking
  const [qMarksPos, setQMarksPos] = useState('4')
  const [qMarksNeg, setQMarksNeg] = useState('-1')
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)

  // Query Pool States
  const [poolSubject, setPoolSubject] = useState('All')
  const [poolDifficulty, setPoolDifficulty] = useState('All')
  const [poolSearch, setPoolSearch] = useState('')
  const [poolQuestions, setPoolQuestions] = useState([])
  const [isLoadingPool, setIsLoadingPool] = useState(false)

  // Selection States
  const [selectedQuestions, setSelectedQuestions] = useState([])

  // Form States: Exam Compilation Blueprint
  const [examTitle, setExamTitle] = useState(exam?.title || '')
  const [targetPackageId, setTargetPackageId] = useState(exam?.package_id || '')
  const [examDuration, setExamDuration] = useState(exam?.duration_minutes ? String(exam.duration_minutes) : '180')
  const [positiveMarks, setPositiveMarks] = useState(exam?.marks_scheme?.positive_marks ? String(exam.marks_scheme.positive_marks) : '4')
  const [negativeMarks, setNegativeMarks] = useState(exam?.marks_scheme?.negative_marks ? String(Math.abs(exam.marks_scheme.negative_marks)) : '1')
  const [isLiveRanking, setIsLiveRanking] = useState(exam?.is_live_ranking ?? true)
  const [activationTimestamp, setActivationTimestamp] = useState(exam?.activation_timestamp ? new Date(exam.activation_timestamp).toISOString().slice(0, 16) : '')
  const [isCompiling, setIsCompiling] = useState(false)

  // Initialize selected questions if exam is provided
  useEffect(() => {
    if (exam && exam.questions) {
      setSelectedQuestions(exam.questions);
    }
  }, [exam]);

  // AI PDF Question Importer & Review State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiRawText, setAiRawText] = useState('')
  const [aiParsing, setAiParsing] = useState(false)
  const [aiStep, setAiStep] = useState('input')
  const [parsedQuestions, setParsedQuestions] = useState([])

  const handleRunAiParser = async () => {
    if (!aiRawText.trim()) return showToast('Please paste PDF question text or test paper content!', 'error')
    setAiParsing(true)
    try {
      const res = await fetch('/api/admin/ai/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: aiRawText.trim() })
      })
      const data = await res.json()
      if (!res.ok || !data.success || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data.error || 'Failed to extract structured questions from text.')
      }

      setParsedQuestions(data.questions.map(q => ({ ...q, selected: true })))
      setAiStep('review')
      showToast(`AI extracted ${data.questions.length} questions successfully!`, 'success')
    } catch (err) {
      console.warn('[AI Parser Error]:', err.message)
      showToast(`AI parsing error: ${err.message}`, 'error')
    } finally {
      setAiParsing(false)
    }
  }

  const handleConfirmIngestion = () => {
    const toIngest = parsedQuestions.filter(q => q.selected)
    if (toIngest.length === 0) return showToast('Please select at least 1 question to ingest!', 'error')

    setPoolQuestions(prev => [...toIngest, ...prev])
    setSelectedQuestions(prev => [...prev, ...toIngest])
    setIsAiModalOpen(false)
    setAiStep('input')
    setAiRawText('')
    setParsedQuestions([])
    showToast(`Checked and ingested ${toIngest.length} questions into your CBT exam blueprint!`, 'success')
  }

  // Fetch pool questions dynamically from question_bank without dummy fallbacks
  const fetchQuestionPool = async () => {
    setIsLoadingPool(true)
    try {
      let query = supabase.from('question_bank').select('*')
      
      if (poolSubject !== 'All') {
        query = query.eq('subject', poolSubject)
      }
      if (poolDifficulty !== 'All') {
        query = query.ilike('difficulty', poolDifficulty)
      }
      if (poolSearch && poolSearch.trim()) {
        const term = poolSearch.trim()
        query = query.or(`content.ilike.%${term}%,topic.ilike.%${term}%,sub_topic.ilike.%${term}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) {
        // Fallback check to test_questions table if question_bank query encountered error
        const { data: fallbackData } = await supabase.from('test_questions').select('*').order('created_at', { ascending: false })
        setPoolQuestions(fallbackData || [])
      } else {
        setPoolQuestions(data || [])
      }
    } catch (err) {
      console.warn('[Compiler] Question Bank pool fetch error:', err.message)
      setPoolQuestions([])
    } finally {
      setIsLoadingPool(false)
    }
  }

  useEffect(() => {
    fetchQuestionPool()
  }, [poolSubject, poolDifficulty])

  useEffect(() => {
    if (packageIdParam && packages.some(p => p.id === packageIdParam)) {
      setTargetPackageId(packageIdParam)
    }
  }, [packageIdParam, packages])

  // Save new question to pool
  const handleSaveQuestion = async (e) => {
    e.preventDefault()
    if (!subTopic.trim()) return showToast('Sub-topic is required.', 'error')
    if (!content.trim()) return showToast('Question content is required.', 'error')
    
    // Type specific validations
    let finalOptions = []
    let finalCorrect = null
    
    if (questionType === 'single') {
      if (options.some(opt => !opt.trim())) return showToast('All 4 option text blocks are required.', 'error')
      finalOptions = options
      finalCorrect = correctOptionIdx
    } else if (questionType === 'multiple') {
      if (options.some(opt => !opt.trim())) return showToast('All 4 option text blocks are required.', 'error')
      if (correctOptionsMultiple.length === 0) return showToast('Select at least one correct option.', 'error')
      finalOptions = options
      finalCorrect = correctOptionsMultiple
    } else if (questionType === 'integer') {
      if (!integerAnswer.trim()) return showToast('Integer answer is required.', 'error')
      finalCorrect = integerAnswer.trim()
    } else if (questionType === 'blanks') {
      if (!blankAnswer.trim()) return showToast('Fill in the blanks answer is required.', 'error')
      finalCorrect = blankAnswer.trim()
    } else if (questionType === 'match') {
      if (matrixMatch.some(m => !m.left.trim() || !m.right.trim())) return showToast('All matrix rows must be filled.', 'error')
      finalOptions = matrixMatch.map(m => m.left)
      finalCorrect = matrixMatch.map(m => m.right) // Or handle strictly as pairs
    }

    setIsSavingQuestion(true)
    try {
      const payload = {
        subject,
        topic: subTopic.trim(),
        sub_topic: subTopic.trim(),
        difficulty: difficulty.toUpperCase(),
        section: section.trim(),
        format_type: questionType === 'single' ? 'single_mcq' : (questionType === 'multiple' ? 'multi_mcq' : (questionType === 'integer' ? 'numerical' : (questionType === 'match' ? 'matrix_match' : 'single_mcq'))),
        content: content.trim(),
        options: finalOptions.length > 0 ? finalOptions : null,
        correct_option_index: typeof finalCorrect === 'number' ? finalCorrect : 0,
        correct_answer: typeof finalCorrect === 'string' ? finalCorrect : (Array.isArray(finalCorrect) ? JSON.stringify(finalCorrect) : String(finalCorrect ?? '')),
        marks_positive: parseInt(qMarksPos) || 4,
        marks_negative: Math.abs(parseInt(qMarksNeg)) || 1
      }

      const { data, error } = await supabase
        .from('question_bank')
        .insert([payload])
        .select()
        .single()

      if (error) {
        // Fallback insert to test_questions if question_bank has schema conflict
        const { error: fbErr } = await supabase
          .from('test_questions')
          .insert([{
            subject,
            sub_topic: subTopic.trim(),
            difficulty,
            section: section.trim(),
            question_type: questionType,
            content: content.trim(),
            options: finalOptions.length > 0 ? finalOptions : null,
            correct_option_index: finalCorrect,
            marks_positive: parseInt(qMarksPos) || 4,
            marks_negative: Math.abs(parseInt(qMarksNeg)) * -1 || -1
          }])
        if (fbErr) throw error || fbErr
      }

      showToast('Question established in global bank!', 'success')
      // Reset form (keep context like subject/topic)
      setContent('')
      setOptions(['', '', '', ''])
      setCorrectOptionIdx(0)
      setCorrectOptionsMultiple([])
      setIntegerAnswer('')
      setBlankAnswer('')
      setMatrixMatch([{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }])
      
      // Refresh pool list
      fetchQuestionPool()
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error')
    } finally {
      setIsSavingQuestion(false)
    }
  }

  // Toggle selection checklist
  const handleToggleSelectQuestion = (q) => {
    setSelectedQuestions(prev => {
      const exists = prev.some(item => item.id === q.id)
      if (exists) {
        return prev.filter(item => item.id !== q.id)
      } else {
        return [...prev, q]
      }
    })
  }

  // Compile Exam Blueprint OR Update Existing Exam
  const handleCompileExam = async (e) => {
    e.preventDefault()
    if (!examTitle.trim()) return showToast('Exam Title is required.', 'error')
    if (!exam && !targetPackageId) return showToast('Target package selection is required.', 'error')
    if (selectedQuestions.length === 0) return showToast('Compilation bundle must contain at least 1 question.', 'error')
    if (!activationTimestamp) return showToast('Activation timestamp is required.', 'error')

    setIsCompiling(true)
    try {
      if (exam) {
        // Update existing exam
        const { error: updateErr } = await supabase
          .from('test_exams')
          .update({
            title: examTitle.trim(),
            duration_minutes: parseInt(examDuration) || 180,
            total_questions: selectedQuestions.length,
            marks_scheme: {
              positive_marks: parseInt(positiveMarks) || 4,
              negative_marks: parseInt(negativeMarks) * -1 || -1
            },
            is_live_ranking: isLiveRanking,
            activation_timestamp: new Date(activationTimestamp).toISOString(),
            questions: selectedQuestions
          })
          .eq('id', exam.id);

        if (updateErr) throw updateErr;
        showToast('Exam questions successfully updated!', 'success');
      } else {
        // 1. Insert new exam blueprint
        const { data: newExam, error: examErr } = await supabase
          .from('test_exams')
          .insert([{
            package_id: targetPackageId,
            title: examTitle.trim(),
            duration_minutes: parseInt(examDuration) || 180,
            total_questions: selectedQuestions.length,
            marks_scheme: {
              positive_marks: parseInt(positiveMarks) || 4,
              negative_marks: parseInt(negativeMarks) * -1 || -1
            },
            is_live_ranking: isLiveRanking,
            activation_timestamp: new Date(activationTimestamp).toISOString(),
            questions: selectedQuestions // Serialize compiled questions in jsonb array
          }])
          .select()
          .single()

        if (examErr) throw examErr

        // 2. Increment package's total count
        const targetPkg = packages.find(p => p.id === targetPackageId)
        if (targetPkg) {
          const { error: countErr } = await supabase
            .from('test_packages')
            .update({ total_tests_count: (targetPkg.total_tests_count || 0) + 1 })
            .eq('id', targetPackageId)
          
          if (countErr) console.warn('[Compiler] Failed to update package count:', countErr.message)
        }

        showToast('CBT Exam blueprint successfully compiled and published!', 'success')
        
        // Reset compilation state
        setExamTitle('')
        setSelectedQuestions([])
        setExamDuration('180')
        setActivationTimestamp('')
      }
    } catch (err) {
      showToast('Compilation failed: ' + err.message, 'error')
    } finally {
      setIsCompiling(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in font-sans text-slate-800">
      
      {/* Column 1 & 2: Authoring Form & Pool Browser */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* MCQ Authoring Console & AI Importer */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-650" />
              <h3 className="font-extrabold text-sm uppercase text-slate-800 tracking-wider">Author New MCQ</h3>
            </div>

            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI PDF Importer</span>
            </button>
          </div>

          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Subject</label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500 transition font-bold"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Topic / Chapter</label>
                <input
                  type="text"
                  value={subTopic}
                  onChange={e => setSubTopic(e.target.value)}
                  placeholder="Kinematics..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500 transition font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Section (e.g. PYQ)</label>
                <input
                  type="text"
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  placeholder="Section A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500 transition font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500 transition font-bold"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Question Type</label>
                <select
                  value={questionType}
                  onChange={e => setQuestionType(e.target.value)}
                  className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500 transition font-black"
                >
                  <option value="single">Single Choice (SCQ)</option>
                  <option value="multiple">Multiple Choice (MCQ)</option>
                  <option value="integer">Integer / Numerical</option>
                  <option value="match">Matrix Match</option>
                  <option value="blanks">Fill in Blanks</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-600 uppercase block">Correct Marks (+)</label>
                <input
                  type="number"
                  value={qMarksPos}
                  onChange={e => setQMarksPos(e.target.value)}
                  className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2 text-xs outline-none focus:border-emerald-500 transition font-black"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-rose-600 uppercase block">Negative Marks (-)</label>
                <input
                  type="number"
                  value={qMarksNeg}
                  onChange={e => setQMarksNeg(e.target.value)}
                  className="w-full bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-2 text-xs outline-none focus:border-rose-500 transition font-black"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Question Content (Markdown + LaTeX)</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write question here. Use $...$ for inline math and $$...$$ for block equations."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition h-24 resize-none font-bold placeholder-slate-400"
              />
            </div>

            {/* Dynamic Type Rendering */}
            {(questionType === 'single' || questionType === 'multiple') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                {options.map((opt, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Option {String.fromCharCode(65 + idx)}</label>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const copy = [...options]
                        copy[idx] = e.target.value
                        setOptions(copy)
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold placeholder-slate-400"
                    />
                  </div>
                ))}
              </div>
            )}

            {questionType === 'integer' && (
              <div className="space-y-1 border-t border-slate-100 pt-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Correct Numerical Answer</label>
                <input
                  type="text"
                  value={integerAnswer}
                  onChange={e => setIntegerAnswer(e.target.value.replace(/[^0-9.-]/g, ''))}
                  placeholder="e.g. 42 or -3.14"
                  className="w-full sm:w-1/3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold placeholder-slate-400"
                />
              </div>
            )}

            {questionType === 'blanks' && (
              <div className="space-y-1 border-t border-slate-100 pt-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Correct Blank Phrase</label>
                <input
                  type="text"
                  value={blankAnswer}
                  onChange={e => setBlankAnswer(e.target.value)}
                  placeholder="e.g. Mitochondria"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold placeholder-slate-400"
                />
              </div>
            )}

            {questionType === 'match' && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Matrix Row/Column Mapping</label>
                {matrixMatch.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-400 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      value={m.left}
                      onChange={e => {
                        const copy = [...matrixMatch];
                        copy[idx].left = e.target.value;
                        setMatrixMatch(copy);
                      }}
                      placeholder={`Left List ${idx + 1}`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 transition font-bold"
                    />
                    <span className="text-slate-300">→</span>
                    <input
                      type="text"
                      value={m.right}
                      onChange={e => {
                        const copy = [...matrixMatch];
                        copy[idx].right = e.target.value;
                        setMatrixMatch(copy);
                      }}
                      placeholder={`Right List Mapping`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
              
              {questionType === 'single' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Correct Option</label>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3].map(idx => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCorrectOptionIdx(idx)}
                        className={`w-9 h-9 rounded-xl border text-xs font-bold transition select-none cursor-pointer ${
                          correctOptionIdx === idx
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {questionType === 'multiple' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Correct Options</label>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3].map(idx => {
                      const isSelected = correctOptionsMultiple.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (isSelected) setCorrectOptionsMultiple(correctOptionsMultiple.filter(i => i !== idx));
                            else setCorrectOptionsMultiple([...correctOptionsMultiple, idx]);
                          }}
                          className={`w-9 h-9 rounded-xl border text-xs font-bold transition select-none cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(questionType === 'integer' || questionType === 'blanks' || questionType === 'match') && (
                <div className="flex-1"></div>
              )}

              <button
                type="submit"
                disabled={isSavingQuestion}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-805 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer select-none flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] border border-slate-950"
              >
                {isSavingQuestion ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>Establish in Bank</span>
              </button>
            </div>
          </form>
        </div>

        {/* Pool browser query list */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-650" />
              <h3 className="font-extrabold text-sm uppercase text-slate-800 tracking-wider">Question Bank Pool</h3>
            </div>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">
              {poolQuestions.length} Questions
            </span>
          </div>

          {/* Filters query panel */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={poolSubject}
              onChange={e => setPoolSubject(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 rounded-xl outline-none focus:border-indigo-500 transition cursor-pointer font-bold"
            >
              <option value="All">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
            </select>

            <select
              value={poolDifficulty}
              onChange={e => setPoolDifficulty(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 rounded-xl outline-none focus:border-indigo-500 transition cursor-pointer font-bold"
            >
              <option value="All">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={poolSearch}
                onChange={e => setPoolSearch(e.target.value)}
                placeholder="Filter pool content..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>

            <button
              onClick={fetchQuestionPool}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Query
            </button>
          </div>

          {/* List display */}
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {isLoadingPool ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : poolQuestions.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-12 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                No bank questions found matching query parameters.
              </div>
            ) : (
              poolQuestions.map(q => {
                const isSelected = selectedQuestions.some(item => item.id === q.id)
                return (
                  <div
                    key={q.id}
                    onClick={() => handleToggleSelectQuestion(q)}
                    className={`p-4 border rounded-2xl flex items-start gap-4 transition select-none cursor-pointer hover:border-slate-350 ${
                      isSelected
                        ? 'bg-indigo-50/20 border-indigo-200 shadow-inner'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="mt-1 accent-indigo-650 cursor-pointer h-4 w-4 shrink-0"
                    />
                    
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                        <span>{q.subject}</span>
                        <span>•</span>
                        <span>{q.sub_topic}</span>
                        <span>•</span>
                        <span className={
                          q.difficulty === 'easy' ? 'text-emerald-600' :
                          q.difficulty === 'medium' ? 'text-amber-600' :
                          'text-rose-600'
                        }>{q.difficulty}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-bold leading-relaxed truncate">
                        {q.content}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Column 3: Blueprint compiler form */}
      <div className="space-y-6">
        
        {/* Compilation Summary & Config */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ClipboardList className="w-5 h-5 text-indigo-650" />
            <h3 className="font-extrabold text-sm uppercase text-slate-800 tracking-wider">Exam Blueprint</h3>
          </div>

          <form onSubmit={handleCompileExam} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Exam Title</label>
              <input
                type="text"
                value={examTitle}
                onChange={e => setExamTitle(e.target.value)}
                placeholder="JEE Main Mock Test - 01"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold placeholder-slate-400"
              />
            </div>

            {/* Target Package Dropdown (Hide if editing an existing exam) */}
            {!exam && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Target Test Package</label>
                <select
                  value={targetPackageId}
                  onChange={e => setTargetPackageId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition cursor-pointer font-bold"
                >
                  <option value="">-- Select Test Package --</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.target_exam_tag})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Duration (Mins)</label>
                <input
                  type="number"
                  value={examDuration}
                  onChange={e => setExamDuration(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Live Ranking</label>
                <div className="flex items-center h-10">
                  <input
                    type="checkbox"
                    checked={isLiveRanking}
                    onChange={e => setIsLiveRanking(e.target.checked)}
                    className="accent-indigo-650 h-5 w-5 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-650 ml-2">Enable Board</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Correct Mark (+)</label>
                <input
                  type="number"
                  value={positiveMarks}
                  onChange={e => setPositiveMarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Incorrect Penalty (-)</label>
                <input
                  type="number"
                  value={negativeMarks}
                  onChange={e => setNegativeMarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Activation Timestamp</label>
              <input
                type="datetime-local"
                value={activationTimestamp}
                onChange={e => setActivationTimestamp(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>

            {/* List of compiled selection items */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                <span>Selected Questions</span>
                <span>{selectedQuestions.length} Items</span>
              </div>

              {selectedQuestions.length === 0 ? (
                <p className="text-center text-[10px] text-slate-400 py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  Select questions from the left query browser.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedQuestions.map((q, idx) => (
                    <div 
                      key={q.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-extrabold text-slate-400 shrink-0">#{idx + 1}</span>
                      <p className="font-bold text-slate-700 truncate flex-1">{q.content}</p>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectQuestion(q)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title="Remove question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isCompiling}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer select-none flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] border border-indigo-700 disabled:opacity-60"
            >
              {isCompiling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-100 shrink-0" />
              )}
              <span>{exam ? 'Update Exam Questions' : 'Compile & Establish Blueprint'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Universal AI PDF & Document Importer Modal */}
      <UniversalPdfImporterModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        targetModuleName="CBT Test Series Compiler"
        onConfirmIngest={(newQuestions) => {
          const formatted = newQuestions.map(q => ({
            id: q.id || `q-ai-${Date.now()}`,
            subject: q.subject || 'Physics',
            sub_topic: q.sub_topic || 'General',
            difficulty: q.difficulty || 'MEDIUM',
            content: q.content || q.questionText || '',
            diagram_url: q.diagram_url || q.diagramUrl || '',
            options: q.options || [],
            correct_option_index: q.correct_option_index || 0
          }));
          setPoolQuestions(prev => [...formatted, ...prev]);
          setSelectedQuestions(prev => [...prev, ...formatted]);
        }}
      />
    </div>
  )
}
