'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/ToastProvider'
import UniversalPdfImporterModal from '@/components/UniversalPdfImporterModal'
import QuestionCardInPlaceEditor from '@/components/test-series/QuestionCardInPlaceEditor'
import PrintableExamBookletModal from '@/components/test-series/PrintableExamBookletModal'
import KatexRenderer from '@/components/KatexRenderer'
import {
  Plus,
  Search,
  ClipboardList,
  CheckCircle2,
  Layers,
  Loader2,
  Sparkles,
  Printer,
  BookOpen
} from 'lucide-react'

// ============================================================================
// BLUEPRINT TEMPLATES SPECIFICATION
// ============================================================================
const BLUEPRINT_PRESETS = {
  jee_main: {
    id: 'jee_main',
    name: 'JEE Main (NTA Standard)',
    duration_minutes: 180,
    total_questions: 90,
    max_attempts: 75,
    total_marks: 300,
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    sections: [
      {
        id: 'sec_phy_a',
        subject: 'Physics',
        name: 'Section A',
        section_name: 'Section A',
        question_type: 'single_mcq',
        description: '20 Single Correct MCQs (+4/-1)',
        total_questions: 20,
        max_attempts: 20,
        marks_positive: 4,
        marks_negative: -1
      },
      {
        id: 'sec_phy_b',
        subject: 'Physics',
        name: 'Section B',
        section_name: 'Section B',
        question_type: 'numerical',
        description: '10 Numerical Questions (Attempt any 5, +4/0)',
        total_questions: 10,
        max_attempts: 5,
        marks_positive: 4,
        marks_negative: 0
      },
      {
        id: 'sec_chem_a',
        subject: 'Chemistry',
        name: 'Section A',
        section_name: 'Section A',
        question_type: 'single_mcq',
        description: '20 Single Correct MCQs (+4/-1)',
        total_questions: 20,
        max_attempts: 20,
        marks_positive: 4,
        marks_negative: -1
      },
      {
        id: 'sec_chem_b',
        subject: 'Chemistry',
        name: 'Section B',
        section_name: 'Section B',
        question_type: 'numerical',
        description: '10 Numerical Questions (Attempt any 5, +4/0)',
        total_questions: 10,
        max_attempts: 5,
        marks_positive: 4,
        marks_negative: 0
      },
      {
        id: 'sec_math_a',
        subject: 'Mathematics',
        name: 'Section A',
        section_name: 'Section A',
        question_type: 'single_mcq',
        description: '20 Single Correct MCQs (+4/-1)',
        total_questions: 20,
        max_attempts: 20,
        marks_positive: 4,
        marks_negative: -1
      },
      {
        id: 'sec_math_b',
        subject: 'Mathematics',
        name: 'Section B',
        section_name: 'Section B',
        question_type: 'numerical',
        description: '10 Numerical Questions (Attempt any 5, +4/0)',
        total_questions: 10,
        max_attempts: 5,
        marks_positive: 4,
        marks_negative: 0
      }
    ]
  },
  jee_advanced: {
    id: 'jee_advanced',
    name: 'JEE Advanced (IIT Pattern)',
    duration_minutes: 180,
    total_questions: 54,
    max_attempts: 54,
    total_marks: 198,
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    sections: [
      // Physics
      {
        id: 'sec_phy_s1',
        subject: 'Physics',
        name: 'Section 1',
        section_name: 'Section 1',
        question_type: 'single_mcq',
        description: '6 Single Choice MCQs (+3/-1)',
        total_questions: 6,
        max_attempts: 6,
        marks_positive: 3,
        marks_negative: -1
      },
      {
        id: 'sec_phy_s2',
        subject: 'Physics',
        name: 'Section 2',
        section_name: 'Section 2',
        question_type: 'multi_mcq',
        description: '6 Multi-Correct MSQs with Partial Marking (+4/-2)',
        total_questions: 6,
        max_attempts: 6,
        marks_positive: 4,
        marks_negative: -2,
        allow_partial_marking: true
      },
      {
        id: 'sec_phy_s3',
        subject: 'Physics',
        name: 'Section 3',
        section_name: 'Section 3',
        question_type: 'numerical',
        description: '6 Numerical Decimal Questions (+4/0)',
        total_questions: 6,
        max_attempts: 6,
        marks_positive: 4,
        marks_negative: 0
      },
      // Chemistry
      {
        id: 'sec_chem_s1',
        subject: 'Chemistry',
        name: 'Section 1',
        section_name: 'Section 1',
        question_type: 'single_mcq',
        description: '6 Single Choice MCQs (+3/-1)',
        total_questions: 6,
        max_attempts: 6,
        marks_positive: 3,
        marks_negative: -1
      },
      {
        id: 'sec_chem_s2',
        subject: 'Chemistry',
        name: 'Section 2',
        section_name: 'Section 2',
        question_type: 'multi_mcq',
        description: '6 Multi-Correct MSQs with Partial Marking (+4/-2)',
        total_questions: 6,
        max_attempts: 6,
        marks_positive: 4,
        marks_negative: -2,
        allow_partial_marking: true
      },
      {
        id: 'sec_chem_s3',
        subject: 'Chemistry',
        name: 'Section 3',
        section_name: 'Section 3',
        question_type: 'numerical',
        description: '6 Numerical Decimal Questions (+4/0)',
        total_questions: 6,
        max_attempts: 6,
        marks_positive: 4,
        marks_negative: 0
      },
      // Mathematics
      {
        id: 'sec_math_s1',
        subject: 'Mathematics',
        name: 'Section 1',
        section_name: 'Section 1',
        question_type: 'single_mcq',
        description: '6 Single Choice MCQs (+3/-1)',
        total_questions: 6,
        max_attempts: 6,
        marks_positive: 3,
        marks_negative: -1
      },
      {
        id: 'sec_math_s2',
        subject: 'Mathematics',
        name: 'Section 2',
        section_name: 'Section 2',
        question_type: 'multi_mcq',
        description: '6 Multi-Correct MSQs with Partial Marking (+4/-2)',
        total_questions: 6,
        max_attempts: 6,
        marks_positive: 4,
        marks_negative: -2,
        allow_partial_marking: true
      },
      {
        id: 'sec_math_s3',
        subject: 'Mathematics',
        name: 'Section 3',
        section_name: 'Section 3',
        question_type: 'numerical',
        description: '6 Numerical Decimal Questions (+4/0)',
        total_questions: 6,
        max_attempts: 6,
        marks_positive: 4,
        marks_negative: 0
      }
    ]
  },
  custom: {
    id: 'custom',
    name: 'Custom Flexible Blueprint',
    duration_minutes: 180,
    total_questions: 75,
    max_attempts: 75,
    total_marks: 300,
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    sections: [
      {
        id: 'sec_c_phy_a',
        subject: 'Physics',
        name: 'Section A',
        section_name: 'Section A',
        question_type: 'single_mcq',
        description: 'Multiple Choice (+4/-1)',
        total_questions: 25,
        max_attempts: 25,
        marks_positive: 4,
        marks_negative: -1
      },
      {
        id: 'sec_c_chem_a',
        subject: 'Chemistry',
        name: 'Section A',
        section_name: 'Section A',
        question_type: 'single_mcq',
        description: 'Multiple Choice (+4/-1)',
        total_questions: 25,
        max_attempts: 25,
        marks_positive: 4,
        marks_negative: -1
      },
      {
        id: 'sec_c_math_a',
        subject: 'Mathematics',
        name: 'Section A',
        section_name: 'Section A',
        question_type: 'single_mcq',
        description: 'Multiple Choice (+4/-1)',
        total_questions: 25,
        max_attempts: 25,
        marks_positive: 4,
        marks_negative: -1
      }
    ]
  }
}

export default function TestCompiler({ packages = [], initialPackages = [], exam = null }) {
  const pkgs = packages.length > 0 ? packages : initialPackages
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24 bg-white border border-slate-200 rounded-3xl">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <CompilerWorkspace packages={pkgs || []} initialExam={exam} />
    </Suspense>
  )
}

function CompilerWorkspace({ packages = [], initialExam = null }) {
  const supabase = createClient()
  const { showToast } = useToast()
  const searchParams = useSearchParams()

  const urlExamId = searchParams?.get('examId') || searchParams?.get('id')
  const urlPdfDocId = searchParams?.get('pdfDocId') || searchParams?.get('documentId')
  const urlPackageId = searchParams?.get('packageId')

  // ===========================================================================
  // BLUEPRINT & EXAM METADATA STATE
  // ===========================================================================
  const [blueprintType, setBlueprintType] = useState(
    initialExam?.blueprint_type || 'jee_main'
  )
  const [examTitle, setExamTitle] = useState(initialExam?.title || '')
  const [targetPackageId, setTargetPackageId] = useState(
    initialExam?.package_id || urlPackageId || ''
  )
  const [examDuration, setExamDuration] = useState(
    initialExam?.duration_minutes ? String(initialExam.duration_minutes) : '180'
  )
  const [isLiveRanking, setIsLiveRanking] = useState(
    initialExam?.is_live_ranking ?? true
  )
  const [activationTimestamp, setActivationTimestamp] = useState(
    initialExam?.activation_timestamp
      ? new Date(initialExam.activation_timestamp).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  )
  const [existingExamId, setExistingExamId] = useState(initialExam?.id || null)

  // Sections configuration
  const [sectionsConfig, setSectionsConfig] = useState(
    initialExam?.sections_config?.length
      ? initialExam.sections_config
      : BLUEPRINT_PRESETS.jee_main.sections
  )

  // Top Subject Tabs state
  const [activeSubject, setActiveSubject] = useState('Physics')

  // Section Sub-Pills state
  const [activeSectionName, setActiveSectionName] = useState('Section A')

  // Master List of Compiled Exam Questions
  const [questions, setQuestions] = useState(initialExam?.questions || [])

  // In-Place Card Expansion state (stores question ID)
  const [expandedCardId, setExpandedCardId] = useState(null)

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false)

  // Question Pool Side-Drawer / Quick Ingestion state
  const [isPoolDrawerOpen, setIsPoolDrawerOpen] = useState(false)
  const [poolSearch, setPoolSearch] = useState('')
  const [poolQuestions, setPoolQuestions] = useState([])
  const [isLoadingPool, setIsLoadingPool] = useState(false)

  // ===========================================================================
  // 1. INITIAL DATA FETCHING FROM URL PARAMS (?examId=... or ?pdfDocId=...)
  // ===========================================================================
  useEffect(() => {
    const loadFromUrlParams = async () => {
      // 1.1 Load from existing exam ID
      if (urlExamId && !existingExamId) {
        setIsLoadingInitialData(true)
        try {
          const { data: examData, error: examError } = await supabase
            .from('test_exams')
            .select('*')
            .eq('id', urlExamId)
            .single()

          if (examError) throw examError

          if (examData) {
            setExistingExamId(examData.id)
            setExamTitle(examData.title || '')
            setTargetPackageId(examData.package_id || '')
            setExamDuration(String(examData.duration_minutes || 180))
            setBlueprintType(examData.blueprint_type || 'jee_main')
            setIsLiveRanking(examData.is_live_ranking ?? true)
            if (examData.activation_timestamp) {
              setActivationTimestamp(
                new Date(examData.activation_timestamp).toISOString().slice(0, 16)
              )
            }

            if (Array.isArray(examData.sections_config) && examData.sections_config.length > 0) {
              setSectionsConfig(examData.sections_config)
            }

            // Fetch questions from relational junction table first
            const { data: junctionData, error: juncError } = await supabase
              .from('exam_questions')
              .select(`
                id,
                order_index,
                section,
                marks_positive,
                marks_negative,
                question_bank:question_id (
                  id, content, format_type, type, subject, topic, sub_topic,
                  difficulty, options, correct_option_index, correct_answer,
                  explanation, diagram_url, marks_positive, marks_negative
                )
              `)
              .eq('exam_id', examData.id)
              .order('order_index', { ascending: true })

            if (!juncError && junctionData && junctionData.length > 0) {
              const mapped = junctionData.map((j, idx) => {
                const qb = j.question_bank || {}
                return {
                  ...qb,
                  id: qb.id || j.id || `q-${idx}`,
                  question_id: qb.id,
                  section: j.section || 'Section A',
                  marks_positive: j.marks_positive ?? qb.marks_positive ?? 4,
                  marks_negative: j.marks_negative ?? qb.marks_negative ?? -1,
                  order_index: j.order_index ?? idx + 1
                }
              })
              setQuestions(mapped)
            } else if (Array.isArray(examData.questions) && examData.questions.length > 0) {
              setQuestions(examData.questions)
            }

            showToast(`Loaded exam blueprint "${examData.title}"!`, 'success')
          }
        } catch (err) {
          console.warn('[TestCompiler] Error loading exam by ID:', err)
          showToast('Could not load specified exam: ' + err.message, 'error')
        } finally {
          setIsLoadingInitialData(false)
        }
      }

      // 1.2 Pre-populate from PDF Question Paper Document
      if (urlPdfDocId && !existingExamId) {
        setIsLoadingInitialData(true)
        try {
          const { data: docData, error: docError } = await supabase
            .from('question_paper_documents')
            .select('*')
            .eq('id', urlPdfDocId)
            .single()

          if (docError) throw docError

          if (docData) {
            setExamTitle(docData.title ? `${docData.title} (Compiled)` : 'PDF Compiled Exam')
            
            // Auto-detect blueprint preset from target_exam tag
            const targetNorm = String(docData.target_exam || '').toLowerCase()
            if (targetNorm.includes('advanced')) {
              handleSwitchBlueprint('jee_advanced')
            } else {
              handleSwitchBlueprint('jee_main')
            }

            // Ingest questions if already parsed in parsed_payload
            const parsedQuestions = docData.parsed_payload?.questions || docData.metadata?.questions
            if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
              const formatted = parsedQuestions.map((q, idx) => ({
                id: q.id || `q-pdf-${Date.now()}-${idx}`,
                subject: q.subject || 'Physics',
                section: q.section || (idx < 20 ? 'Section A' : 'Section B'),
                format_type: q.format_type || (q.options?.length ? 'single_mcq' : 'numerical'),
                type: q.format_type === 'numerical' ? 'numerical' : 'mcq',
                content: q.content || q.questionText || '',
                diagram_url: q.diagram_url || q.diagramUrl || '',
                options: q.options || ['', '', '', ''],
                correct_option_index: q.correct_option_index ?? 0,
                correct_answer: q.correct_answer || '',
                marks_positive: q.marks_positive || 4,
                marks_negative: q.marks_negative ?? -1
              }))
              setQuestions(formatted)
              showToast(`Pre-populated ${formatted.length} questions from PDF repository document!`, 'success')
            } else {
              showToast(`Loaded PDF paper "${docData.title}". Use AI Ingestion to extract questions!`, 'info')
            }
          }
        } catch (err) {
          console.warn('[TestCompiler] Error loading PDF document:', err)
        } finally {
          setIsLoadingInitialData(false)
        }
      }
    }

    loadFromUrlParams()
  }, [urlExamId, urlPdfDocId])

  // ===========================================================================
  // 2. BLUEPRINT SWITCHING LOGIC
  // ===========================================================================
  const handleSwitchBlueprint = (presetKey) => {
    const preset = BLUEPRINT_PRESETS[presetKey] || BLUEPRINT_PRESETS.jee_main
    setBlueprintType(presetKey)
    setExamDuration(String(preset.duration_minutes))
    setSectionsConfig(preset.sections)

    // Ensure activeSubject is valid
    if (!preset.subjects.includes(activeSubject)) {
      setActiveSubject(preset.subjects[0] || 'Physics')
    }

    // Set first available section of active subject
    const subjectSections = preset.sections.filter(s => s.subject === (preset.subjects[0] || 'Physics'))
    if (subjectSections.length > 0) {
      setActiveSectionName(subjectSections[0].name)
    }

    showToast(`Configured one-click [${preset.name}] blueprint!`, 'success')
  }

  // ===========================================================================
  // 3. SUBJECT & SECTION FILTERING
  // ===========================================================================
  // Available subjects from sections config
  const availableSubjects = useMemo(() => {
    const subs = new Set()
    sectionsConfig.forEach(s => {
      if (s.subject) subs.add(s.subject)
    })
    if (subs.size === 0) return ['Physics', 'Chemistry', 'Mathematics']
    return Array.from(subs)
  }, [sectionsConfig])

  // Sub-sections for the currently active subject
  const currentSubjectSections = useMemo(() => {
    return sectionsConfig.filter(s => s.subject === activeSubject)
  }, [sectionsConfig, activeSubject])

  // Ensure activeSectionName is valid when subject changes
  useEffect(() => {
    if (currentSubjectSections.length > 0) {
      const exists = currentSubjectSections.some(s => s.name === activeSectionName)
      if (!exists) {
        setActiveSectionName(currentSubjectSections[0].name)
      }
    }
  }, [activeSubject, currentSubjectSections])

  // Questions filtered to the active subject and active section
  const activeSectionQuestions = useMemo(() => {
    return questions.filter(
      q => q.subject === activeSubject && (q.section === activeSectionName || (!q.section && activeSectionName === 'Section A'))
    )
  }, [questions, activeSubject, activeSectionName])

  // Subject tally helper
  const getSubjectTally = (subj) => {
    const count = questions.filter(q => q.subject === subj).length
    const target = sectionsConfig
      .filter(s => s.subject === subj)
      .reduce((acc, s) => acc + (s.total_questions || 0), 0)
    return { count, target: target || 30 }
  }

  // Section tally helper
  const getSectionTally = (sec) => {
    const count = questions.filter(
      q => q.subject === sec.subject && q.section === sec.name
    ).length
    return { count, target: sec.total_questions || 20 }
  }

  // ===========================================================================
  // 4. IN-PLACE QUESTION CARD ACTIONS
  // ===========================================================================
  // Add new blank question to active section
  const handleAddNewQuestionToSection = () => {
    const activeSecConfig = currentSubjectSections.find(s => s.name === activeSectionName)
    const formatType = activeSecConfig?.question_type || 'single_mcq'
    const newId = `q-draft-${Date.now()}`

    const newQuestion = {
      id: newId,
      subject: activeSubject,
      section: activeSectionName,
      format_type: formatType,
      type: formatType === 'numerical' ? 'numerical' : 'mcq',
      content: '',
      diagram_url: '',
      options: formatType === 'single_mcq' || formatType === 'multi_mcq' ? ['', '', '', ''] : [],
      correct_option_index: 0,
      correct_options: [0],
      correct_answer: '',
      explanation: '',
      difficulty: 'MEDIUM',
      topic: '',
      marks_positive: activeSecConfig?.marks_positive ?? 4,
      marks_negative: activeSecConfig?.marks_negative ?? (formatType === 'numerical' ? 0 : -1)
    }

    setQuestions(prev => [...prev, newQuestion])
    setExpandedCardId(newId)
    showToast(`Added new question card to [${activeSubject} • ${activeSectionName}]`, 'success')
  }

  // Update a question in-place
  const handleUpdateQuestion = (updatedQuestion) => {
    setQuestions(prev =>
      prev.map(q => (q.id === updatedQuestion.id ? updatedQuestion : q))
    )
    showToast('Question card updated in blueprint!', 'success')
  }

  // Delete a question
  const handleDeleteQuestion = (id) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
    if (expandedCardId === id) setExpandedCardId(null)
    showToast('Question removed from blueprint.', 'info')
  }

  // Move question up within active section
  const handleMoveQuestionUp = (indexInSection) => {
    if (indexInSection <= 0) return
    const targetQ = activeSectionQuestions[indexInSection]
    const swapQ = activeSectionQuestions[indexInSection - 1]

    setQuestions(prev => {
      const copy = [...prev]
      const idxA = copy.findIndex(q => q.id === targetQ.id)
      const idxB = copy.findIndex(q => q.id === swapQ.id)
      if (idxA !== -1 && idxB !== -1) {
        const temp = copy[idxA]
        copy[idxA] = copy[idxB]
        copy[idxB] = temp
      }
      return copy
    })
  }

  // Move question down within active section
  const handleMoveQuestionDown = (indexInSection) => {
    if (indexInSection >= activeSectionQuestions.length - 1) return
    const targetQ = activeSectionQuestions[indexInSection]
    const swapQ = activeSectionQuestions[indexInSection + 1]

    setQuestions(prev => {
      const copy = [...prev]
      const idxA = copy.findIndex(q => q.id === targetQ.id)
      const idxB = copy.findIndex(q => q.id === swapQ.id)
      if (idxA !== -1 && idxB !== -1) {
        const temp = copy[idxA]
        copy[idxA] = copy[idxB]
        copy[idxB] = temp
      }
      return copy
    })
  }

  // Move question to a different section
  const handleMoveQuestionToSection = (questionId, newSectionName) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id === questionId) {
          // Find preset defaults for target section
          const targetSec = sectionsConfig.find(
            s => s.subject === q.subject && s.name === newSectionName
          )
          return {
            ...q,
            section: newSectionName,
            marks_positive: targetSec?.marks_positive ?? q.marks_positive,
            marks_negative: targetSec?.marks_negative ?? q.marks_negative
          }
        }
        return q
      })
    )
    showToast(`Question moved to ${newSectionName}`, 'success')
  }

  // ===========================================================================
  // 5. QUESTION POOL / CENTRAL BANK BROWSER
  // ===========================================================================
  const fetchQuestionPool = async () => {
    setIsLoadingPool(true)
    try {
      let query = supabase.from('question_bank').select('*').limit(50)
      if (activeSubject) {
        query = query.eq('subject', activeSubject)
      }
      if (poolSearch.trim()) {
        const term = poolSearch.trim()
        query = query.or(`content.ilike.%${term}%,topic.ilike.%${term}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (!error && data) {
        setPoolQuestions(data)
      }
    } catch (err) {
      console.warn('[Question Bank Pool Error]:', err.message)
    } finally {
      setIsLoadingPool(false)
    }
  }

  useEffect(() => {
    if (isPoolDrawerOpen) {
      fetchQuestionPool()
    }
  }, [isPoolDrawerOpen, activeSubject])

  const handleAddQuestionFromPool = (poolQ) => {
    const isAlreadyAdded = questions.some(q => q.id === poolQ.id || q.question_id === poolQ.id)
    if (isAlreadyAdded) {
      showToast('This question is already in the blueprint!', 'info')
      return
    }

    const activeSec = currentSubjectSections.find(s => s.name === activeSectionName)
    const newCompiledQ = {
      ...poolQ,
      id: poolQ.id,
      question_id: poolQ.id,
      subject: activeSubject,
      section: activeSectionName,
      marks_positive: poolQ.marks_positive ?? activeSec?.marks_positive ?? 4,
      marks_negative: poolQ.marks_negative ?? activeSec?.marks_negative ?? -1
    }

    setQuestions(prev => [...prev, newCompiledQ])
    showToast(`Added question to ${activeSubject} • ${activeSectionName}!`, 'success')
  }

  // ===========================================================================
  // 6. SAVE & ESTABLISH BLUEPRINT TO DATABASE
  // ===========================================================================
  const handleSaveAndPublishExam = async () => {
    if (!examTitle.trim()) {
      showToast('Please enter an Exam Title before publishing.', 'error')
      return
    }

    if (questions.length === 0) {
      showToast('Your exam must have at least 1 question.', 'error')
      return
    }

    setIsSaving(true)
    try {
      // Calculate total marks based on positive marks sum
      const totalMarksSum = questions.reduce(
        (acc, q) => acc + (q.marks_positive ?? 4),
        0
      )

      const examPayload = {
        title: examTitle.trim(),
        package_id: targetPackageId || null, // NULLABLE standalone decoupled support!
        blueprint_type: blueprintType,
        sections_config: sectionsConfig,
        duration_minutes: parseInt(examDuration) || 180,
        total_questions: questions.length,
        total_marks: totalMarksSum,
        marks_scheme: {
          positive_marks: 4,
          negative_marks: -1
        },
        is_live_ranking: isLiveRanking,
        activation_timestamp: activationTimestamp
          ? new Date(activationTimestamp).toISOString()
          : new Date().toISOString(),
        questions: questions // Serialized JSONB array for direct instant client rendering
      }

      let savedExamRecord = null

      if (existingExamId) {
        // Update existing exam row
        const { data: updated, error: updateErr } = await supabase
          .from('test_exams')
          .update(examPayload)
          .eq('id', existingExamId)
          .select()
          .single()

        if (updateErr) throw updateErr
        savedExamRecord = updated
        showToast('Exam blueprint successfully updated in database!', 'success')
      } else {
        // Insert new test_exams record
        const { data: inserted, error: insertErr } = await supabase
          .from('test_exams')
          .insert([examPayload])
          .select()
          .single()

        if (insertErr) throw insertErr
        savedExamRecord = inserted
        setExistingExamId(inserted.id)
        showToast('Standalone CBT exam established and published!', 'success')

        // If linked to package, increment package test count
        if (targetPackageId) {
          const pkg = packages.find(p => p.id === targetPackageId)
          if (pkg) {
            await supabase
              .from('test_packages')
              .update({ total_tests_count: (pkg.total_tests_count || 0) + 1 })
              .eq('id', targetPackageId)
          }
        }
      }

      // Update relational junction table public.exam_questions
      if (savedExamRecord?.id) {
        try {
          await supabase.from('exam_questions').delete().eq('exam_id', savedExamRecord.id)

          const junctionRows = questions.map((q, idx) => ({
            exam_id: savedExamRecord.id,
            question_id: q.question_id || q.id,
            order_index: idx + 1,
            section: q.section || 'Section A',
            marks_positive: q.marks_positive ?? 4,
            marks_negative: q.marks_negative ?? -1
          }))

          if (junctionRows.length > 0) {
            await supabase.from('exam_questions').insert(junctionRows)
          }
        } catch (juncErr) {
          console.warn('[Compiler] Junction insert note:', juncErr)
        }
      }

      // If imported from PDF repository document, update document status to 'compiled'
      if (urlPdfDocId && savedExamRecord?.id) {
        try {
          await supabase
            .from('question_paper_documents')
            .update({
              status: 'compiled',
              compiled_exam_id: savedExamRecord.id
            })
            .eq('id', urlPdfDocId)
          showToast('PDF Repository document status updated to "Compiled"!', 'success')
        } catch (docUpdateErr) {
          console.warn('[Compiler] PDF Document update note:', docUpdateErr)
        }
      }
    } catch (err) {
      console.error('[Compiler Save Error]:', err)
      showToast('Failed to save exam: ' + err.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // ===========================================================================
  // RENDER WORKSPACE
  // ===========================================================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-800 pb-20">
      
      {/* ===================================================================== */}
      {/* 1. HEADER & BLUEPRINT SELECTOR BAR                                    */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-sm space-y-5">
        
        {/* Top Header Row: Title & Action Dock */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {existingExamId ? 'Edit Exam Blueprint' : 'Visual CBT Exam Compiler'}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Author, Compile, and Export Multi-Subject Competitive Mock Exams with In-Place KaTeX Preview
                </p>
              </div>
            </div>
          </div>

          {/* Action Dock */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Export Printable PDF Button */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs border border-slate-200"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Export Printable PDF</span>
            </button>

            {/* AI PDF Question Ingestion Button */}
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI PDF Question Ingestion</span>
            </button>

            {/* Save & Publish Button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndPublishExam}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{existingExamId ? 'Save Changes' : 'Establish & Publish Exam'}</span>
            </button>
          </div>
        </div>

        {/* Blueprint Selector Row: One-Click [JEE Main], [JEE Advanced], [Custom] */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>One-Click Exam Blueprint Selector:</span>
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              Auto-configures subjects, sections, attempt limits & scoring weights
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'jee_main',
                title: 'JEE Main',
                desc: '3 Subjects • 90 Qs (75 Attempts) • Sec A (+4/-1) & Sec B (+4/0)',
                color: 'border-blue-300 hover:border-blue-500 bg-blue-50/50'
              },
              {
                id: 'jee_advanced',
                title: 'JEE Advanced',
                desc: '3 Subjects • MSQ Partial (+4/-2), Numerical (+4/0) & Matrix (+3/-1)',
                color: 'border-purple-300 hover:border-purple-500 bg-purple-50/50'
              },
              {
                id: 'custom',
                title: 'Custom Blueprint',
                desc: 'Arbitrary subjects, freeform sections, and customized marking schemes',
                color: 'border-slate-300 hover:border-slate-500 bg-slate-50/50'
              }
            ].map(bp => {
              const isActive = blueprintType === bp.id
              return (
                <button
                  key={bp.id}
                  type="button"
                  onClick={() => handleSwitchBlueprint(bp.id)}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer select-none ${
                    isActive
                      ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-indigo-50/70 shadow-xs'
                      : bp.color
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      isActive ? 'text-indigo-900' : 'text-slate-800'
                    }`}>
                      [{bp.title}]
                    </span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {bp.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Exam Title & Parameters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 block">Exam Title</label>
            <input
              type="text"
              value={examTitle}
              onChange={e => setExamTitle(e.target.value)}
              placeholder="e.g. NTA All-India Mock Test #04 (Full Syllabus)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-indigo-500 text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 block">Duration (Minutes)</label>
            <input
              type="number"
              value={examDuration}
              onChange={e => setExamDuration(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-indigo-500 text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 block">Parent Package (Optional)</label>
            <select
              value={targetPackageId}
              onChange={e => setTargetPackageId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-indigo-500 text-slate-900 cursor-pointer"
            >
              <option value="">Standalone Exam (No Package Required)</option>
              {packages.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* 2. TOP SUBJECT TABS & SECTION SUB-PILLS BAR                           */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl shadow-sm space-y-4">
        
        {/* Top Subject Navigation Tabs with Live Counts */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {availableSubjects.map(sub => {
              const isActive = activeSubject === sub
              const { count, target } = getSubjectTally(sub)
              
              let icon = '⚛️'
              if (sub.toLowerCase().includes('chem')) icon = '🧪'
              if (sub.toLowerCase().includes('math')) icon = '📐'

              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setActiveSubject(sub)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 select-none ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{icon} {sub}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-white text-slate-600 border border-slate-200'
                  }`}>
                    {count}/{target}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Quick Pool Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsPoolDrawerOpen(prev => !prev)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isPoolDrawerOpen ? 'Close Bank Drawer' : 'Browse Question Bank'}</span>
          </button>
        </div>

        {/* Section Sub-Pills for the Active Subject & Add Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {currentSubjectSections.map(sec => {
              const isActive = activeSectionName === sec.name
              const { count, target } = getSectionTally(sec)

              return (
                <button
                  key={sec.name}
                  type="button"
                  onClick={() => setActiveSectionName(sec.name)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center gap-2 border ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>{sec.name}: {sec.description || sec.question_type}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {count}/{target}
                  </span>
                </button>
              )
            })}
          </div>

          {/* "+ Add Question to Section" Quick Action */}
          <button
            type="button"
            onClick={handleAddNewQuestionToSection}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Question to {activeSectionName}</span>
          </button>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* 3. MAIN WORKSPACE: IN-PLACE QUESTION CARDS LIST                       */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left / Main Column: Questions in Active Section */}
        <div className={isPoolDrawerOpen ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
          
          {/* Section Banner */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Active Section Workspace:
              </span>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-100 text-indigo-800">
                {activeSubject} → {activeSectionName}
              </span>
              <span className="text-xs text-slate-400">
                ({activeSectionQuestions.length} Questions)
              </span>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Click any question card to expand and edit in-place
            </div>
          </div>

          {/* Empty State */}
          {activeSectionQuestions.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800">
                  No Questions in {activeSubject} • {activeSectionName}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Author questions with live KaTeX math formula previews, ingest from a PDF, or add from your Question Bank repository.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddNewQuestionToSection}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Question</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPoolDrawerOpen(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Browse Question Bank</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSectionQuestions.map((q, idx) => (
                <QuestionCardInPlaceEditor
                  key={q.id}
                  question={q}
                  displayNumber={idx + 1}
                  isExpanded={expandedCardId === q.id}
                  onToggleExpand={() =>
                    setExpandedCardId(prev => (prev === q.id ? null : q.id))
                  }
                  onUpdate={handleUpdateQuestion}
                  onDelete={() => handleDeleteQuestion(q.id)}
                  onMoveUp={() => handleMoveQuestionUp(idx)}
                  onMoveDown={() => handleMoveQuestionDown(idx)}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < activeSectionQuestions.length - 1}
                  availableSections={currentSubjectSections.map(s => s.name)}
                  onMoveToSection={(secName) => handleMoveQuestionToSection(q.id, secName)}
                />
              ))}
            </div>
          )}

        </div>

        {/* Right Column: Question Bank Pool Drawer */}
        {isPoolDrawerOpen && (
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm h-fit">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Question Bank Pool ({activeSubject})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPoolDrawerOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={poolSearch}
                onChange={e => setPoolSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchQuestionPool()}
                placeholder="Search topic, formula, text..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>

            {/* Pool List */}
            {isLoadingPool ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
              </div>
            ) : poolQuestions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No questions found in {activeSubject} question bank.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {poolQuestions.map(pq => {
                  const alreadyAdded = questions.some(q => q.id === pq.id || q.question_id === pq.id)
                  return (
                    <div
                      key={pq.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl text-xs space-y-2 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">
                          {pq.format_type || 'MCQ'} • {pq.topic || 'General'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">
                          +{pq.marks_positive ?? 4}
                        </span>
                      </div>

                      <div className="text-slate-800 font-medium line-clamp-2">
                        <KatexRenderer content={pq.content} />
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          Diff: {pq.difficulty || 'MEDIUM'}
                        </span>
                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleAddQuestionFromPool(pq)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                            alreadyAdded
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          }`}
                        >
                          {alreadyAdded ? 'Added' : '+ Add to Section'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ===================================================================== */}
      {/* 4. MODALS: AI PDF IMPORTER & PRINTABLE BOOKLET                        */}
      {/* ===================================================================== */}
      <UniversalPdfImporterModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        targetModuleName="CBT Test Series Compiler"
        onConfirmIngest={(newQuestions) => {
          const formatted = newQuestions.map((q, idx) => {
            const subj = q.subject || activeSubject || 'Physics'
            const sec = q.section || (idx < 20 ? 'Section A' : 'Section B')
            return {
              id: q.id || `q-ai-${Date.now()}-${idx}`,
              subject: subj,
              section: sec,
              sub_topic: q.sub_topic || 'General',
              difficulty: (q.difficulty || 'MEDIUM').toUpperCase(),
              content: q.content || q.questionText || '',
              diagram_url: q.diagram_url || q.diagramUrl || '',
              options: Array.isArray(q.options) && q.options.length >= 4 ? q.options : (q.options?.length ? [...q.options, '', ''] : []),
              correct_option_index: q.correct_option_index || 0,
              correct_options: Array.isArray(q.correct_options) ? q.correct_options : [q.correct_option_index || 0],
              correct_answer: q.correct_answer || q.correctAnswer || '',
              explanation: q.explanation || '',
              format_type: q.format_type || (q.options?.length ? 'single_mcq' : 'numerical'),
              type: q.format_type === 'numerical' ? 'numerical' : 'mcq',
              marks_positive: q.marks_positive || 4,
              marks_negative: q.marks_negative ?? -1
            }
          })
          setQuestions(prev => [...prev, ...formatted])
          showToast(`Ingested ${formatted.length} questions into exam blueprint!`, 'success')
        }}
      />

      <PrintableExamBookletModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        exam={{
          title: examTitle || 'National Assessment Competitive Examination',
          duration_minutes: parseInt(examDuration) || 180,
          blueprint_type: blueprintType,
          total_questions: questions.length
        }}
        questions={questions}
        sectionsConfig={sectionsConfig}
      />

    </div>
  )
}
