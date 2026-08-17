'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { invalidateCache } from '@/utils/invalidateCache';
import KatexRenderer from '@/components/KatexRenderer';
import UniversalPdfImporterModal from '@/components/UniversalPdfImporterModal';
import { 
  Plus, Search, ClipboardList, Trash2, CheckCircle2, 
  Layers, Clock, Award, Loader2, Sparkles, AlertCircle,
  HelpCircle, Check, ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function ExamCompilerTab({
  packageData,
  editingExam = null,
  onExamCompiled,
  onCancelEdit
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  // Authoring Form State
  const [subject, setSubject] = useState('Physics');
  const [subTopic, setSubTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [section, setSection] = useState('Section A');
  const [questionType, setQuestionType] = useState('single');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOptionIdx, setCorrectOptionIdx] = useState(0);
  const [correctOptionsMultiple, setCorrectOptionsMultiple] = useState([]);
  const [integerAnswer, setIntegerAnswer] = useState('');
  const [blankAnswer, setBlankAnswer] = useState('');
  const [matrixMatch, setMatrixMatch] = useState([
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' }
  ]);
  const [qMarksPos, setQMarksPos] = useState('4');
  const [qMarksNeg, setQMarksNeg] = useState('-1');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Question Pool State
  const [poolSubject, setPoolSubject] = useState('All');
  const [poolDifficulty, setPoolDifficulty] = useState('All');
  const [poolSearch, setPoolSearch] = useState('');
  const [poolQuestions, setPoolQuestions] = useState([]);
  const [isLoadingPool, setIsLoadingPool] = useState(false);

  // Exam Blueprint State
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [examTitle, setExamTitle] = useState('');
  const [examDuration, setExamDuration] = useState('180');
  const [positiveMarks, setPositiveMarks] = useState('4');
  const [negativeMarks, setNegativeMarks] = useState('1');
  const [isLiveRanking, setIsLiveRanking] = useState(true);
  const [activationTimestamp, setActivationTimestamp] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);

  // AI PDF Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Sync editingExam if provided
  useEffect(() => {
    if (editingExam) {
      setExamTitle(editingExam.title || '');
      setExamDuration(editingExam.duration_minutes ? String(editingExam.duration_minutes) : '180');
      setPositiveMarks(editingExam.marks_scheme?.positive_marks ? String(editingExam.marks_scheme.positive_marks) : '4');
      setNegativeMarks(editingExam.marks_scheme?.negative_marks ? String(Math.abs(editingExam.marks_scheme.negative_marks)) : '1');
      setIsLiveRanking(editingExam.is_live_ranking ?? true);
      setActivationTimestamp(
        editingExam.activation_timestamp ? new Date(editingExam.activation_timestamp).toISOString().slice(0, 16) : ''
      );
      if (Array.isArray(editingExam.questions)) {
        setSelectedQuestions(editingExam.questions);
      }
    } else {
      setExamTitle('');
      setExamDuration('180');
      setPositiveMarks('4');
      setNegativeMarks('1');
      setIsLiveRanking(true);
      setActivationTimestamp('');
      setSelectedQuestions([]);
    }
  }, [editingExam]);

  // Fetch question pool
  const fetchQuestionPool = async () => {
    setIsLoadingPool(true);
    try {
      let query = supabase.from('test_questions').select('*');
      if (poolSubject !== 'All') {
        query = query.eq('subject', poolSubject);
      }
      if (poolDifficulty !== 'All') {
        query = query.eq('difficulty', poolDifficulty);
      }
      if (poolSearch) {
        query = query.ilike('content', `%${poolSearch}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        // Fallback default sample questions
        setPoolQuestions([
          {
            id: 'sample-q-101',
            subject: 'Physics',
            sub_topic: 'Rotational Dynamics',
            difficulty: 'hard',
            content: 'A solid sphere of mass M and radius R rolls down an inclined plane of angle $\\theta$ without slipping. Find center of mass acceleration.',
            options: ['(5/7) g sin θ', '(2/5) g sin θ', '(3/5) g sin θ', '(1/2) g sin θ'],
            correct_option_index: 0
          },
          {
            id: 'sample-q-102',
            subject: 'Chemistry',
            sub_topic: 'Thermodynamics',
            difficulty: 'medium',
            content: 'For the reaction $N_2 + 3H_2 \\rightleftharpoons 2NH_3$, calculate Gibbs Free Energy $\\Delta G^{\\circ}$.',
            options: ['-33.2 kJ/mol', '+16.5 kJ/mol', '0 kJ/mol', '-50.1 kJ/mol'],
            correct_option_index: 0
          }
        ]);
      } else {
        setPoolQuestions(data || []);
      }
    } catch (err) {
      console.warn('[Compiler Tab] Pool fetch fallback');
    } finally {
      setIsLoadingPool(false);
    }
  };

  useEffect(() => {
    fetchQuestionPool();
  }, [poolSubject, poolDifficulty]);

  // Save single question to bank
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!subTopic.trim()) {
      showToast('Sub-topic is required', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('Question content is required', 'error');
      return;
    }

    let finalOptions = null;
    let finalCorrect = null;

    if (questionType === 'single') {
      if (options.some(opt => !opt.trim())) {
        showToast('All 4 option choices are required', 'error');
        return;
      }
      finalOptions = options;
      finalCorrect = correctOptionIdx;
    } else if (questionType === 'multiple') {
      if (options.some(opt => !opt.trim())) {
        showToast('All 4 option choices are required', 'error');
        return;
      }
      if (correctOptionsMultiple.length === 0) {
        showToast('Select at least one correct option', 'error');
        return;
      }
      finalOptions = options;
      finalCorrect = correctOptionsMultiple;
    } else if (questionType === 'integer') {
      if (!integerAnswer.trim()) {
        showToast('Integer numerical answer is required', 'error');
        return;
      }
      finalCorrect = integerAnswer.trim();
    } else if (questionType === 'blanks') {
      if (!blankAnswer.trim()) {
        showToast('Blank answer phrase is required', 'error');
        return;
      }
      finalCorrect = blankAnswer.trim();
    } else if (questionType === 'match') {
      if (matrixMatch.some(m => !m.left.trim() || !m.right.trim())) {
        showToast('All matrix pairs must be filled', 'error');
        return;
      }
      finalOptions = matrixMatch.map(m => m.left);
      finalCorrect = matrixMatch.map(m => m.right);
    }

    setIsSavingQuestion(true);
    try {
      const payload = {
        subject,
        sub_topic: subTopic.trim(),
        difficulty,
        section: section.trim(),
        question_type: questionType,
        content: content.trim(),
        options: finalOptions,
        correct_option_index: finalCorrect,
        marks_positive: parseInt(qMarksPos) || 4,
        marks_negative: Math.abs(parseInt(qMarksNeg)) * -1 || -1
      };

      const { data, error } = await supabase
        .from('test_questions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      showToast('Question saved to global bank & added to paper!', 'success');
      
      const createdQ = data || { id: `q-${Date.now()}`, ...payload };
      setPoolQuestions(prev => [createdQ, ...prev]);
      setSelectedQuestions(prev => [...prev, createdQ]);

      // Reset form
      setContent('');
      setOptions(['', '', '', '']);
      setCorrectOptionIdx(0);
      setCorrectOptionsMultiple([]);
      setIntegerAnswer('');
      setBlankAnswer('');
      setMatrixMatch([
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' }
      ]);
    } catch (err) {
      console.error('[Save Question Error]:', err.message);
      showToast('Failed to save question: ' + err.message, 'error');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleToggleSelectQuestion = (q) => {
    setSelectedQuestions(prev => {
      const exists = prev.some(item => item.id === q.id);
      if (exists) {
        return prev.filter(item => item.id !== q.id);
      } else {
        return [...prev, q];
      }
    });
  };

  // AI Ingestion Callback
  const handleAiQuestionsIngested = (extractedQuestions) => {
    if (!Array.isArray(extractedQuestions) || extractedQuestions.length === 0) return;
    
    setPoolQuestions(prev => [...extractedQuestions, ...prev]);
    setSelectedQuestions(prev => [...prev, ...extractedQuestions]);
    showToast(`Ingested ${extractedQuestions.length} questions into exam blueprint!`, 'success');
  };

  // Compile Exam Handler
  const handleCompileExam = async (e) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      showToast('Exam Title is required', 'error');
      return;
    }
    if (!packageData?.id) {
      showToast('Parent test package is missing', 'error');
      return;
    }
    if (selectedQuestions.length === 0) {
      showToast('Exam paper must contain at least 1 question', 'error');
      return;
    }
    if (!activationTimestamp) {
      showToast('Scheduled activation timestamp is required', 'error');
      return;
    }

    setIsCompiling(true);
    try {
      const examPayload = {
        package_id: packageData.id,
        title: examTitle.trim(),
        duration_minutes: parseInt(examDuration) || 180,
        total_questions: selectedQuestions.length,
        marks_scheme: {
          positive_marks: parseInt(positiveMarks) || 4,
          negative_marks: Math.abs(parseInt(negativeMarks)) * -1 || -1
        },
        is_live_ranking: isLiveRanking,
        activation_timestamp: new Date(activationTimestamp).toISOString(),
        questions: selectedQuestions
      };

      if (editingExam?.id) {
        // Update existing exam
        const { data: updatedExam, error: updateErr } = await supabase
          .from('test_exams')
          .update(examPayload)
          .eq('id', editingExam.id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        showToast('Exam blueprint successfully updated!', 'success');
        if (onExamCompiled) onExamCompiled(updatedExam || { id: editingExam.id, ...examPayload });
      } else {
        // Insert new exam
        const { data: newExam, error: insertErr } = await supabase
          .from('test_exams')
          .insert([examPayload])
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Increment package total tests count
        const newCount = (packageData.total_tests_count || 0) + 1;
        await supabase
          .from('test_packages')
          .update({ total_tests_count: newCount })
          .eq('id', packageData.id);

        await invalidateCache('catalog', packageData.id);

        showToast('Exam blueprint compiled and scheduled!', 'success');

        // Reset state
        setExamTitle('');
        setSelectedQuestions([]);
        setActivationTimestamp('');
        if (onExamCompiled) onExamCompiled(newExam || { id: `exam-${Date.now()}`, ...examPayload });
      }
    } catch (err) {
      console.error('[Compile Exam Error]:', err.message);
      showToast('Failed to compile exam: ' + err.message, 'error');
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {editingExam ? `Edit Exam: ${editingExam.title}` : 'CBT Exam Paper Compiler Studio'}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Package: <span className="font-bold text-slate-700">{packageData?.title}</span> • {selectedQuestions.length} Questions in Blueprint
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editingExam && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel Edit
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI PDF Question Ingestion</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Authoring & Question Pool */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: MCQ Authoring Form */}
          <div className="bg-slate-50/70 border border-slate-200 p-5 sm:p-6 rounded-3xl space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Author Single Question (LaTeX / Markdown)</span>
            </h4>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Subject</label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Topic / Chapter</label>
                  <input
                    type="text"
                    required
                    value={subTopic}
                    onChange={e => setSubTopic(e.target.value)}
                    placeholder="e.g. Kinematics"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Section</label>
                  <input
                    type="text"
                    value={section}
                    onChange={e => setSection(e.target.value)}
                    placeholder="Section A"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Question Type & Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Format Type</label>
                  <select
                    value={questionType}
                    onChange={e => setQuestionType(e.target.value)}
                    className="w-full bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  >
                    <option value="single">Single Choice (SCQ)</option>
                    <option value="multiple">Multiple Choice (MCQ)</option>
                    <option value="integer">Integer / Numerical</option>
                    <option value="match">Matrix Match</option>
                    <option value="blanks">Fill in Blanks</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-emerald-700 uppercase block">Positive Marks (+)</label>
                  <input
                    type="number"
                    value={qMarksPos}
                    onChange={e => setQMarksPos(e.target.value)}
                    className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-rose-700 uppercase block">Negative Penalty (-)</label>
                  <input
                    type="number"
                    value={qMarksNeg}
                    onChange={e => setQMarksNeg(e.target.value)}
                    className="w-full bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* Question Content */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase block">
                  Question Content (Use $...$ for inline math, $$...$$ for block math)
                </label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="e.g. Calculate the gravitational force $F = \\frac{G m_1 m_2}{r^2}$..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>

              {/* KaTeX Math Live Preview */}
              {content.trim() && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1">
                  <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider block">
                    KaTeX Math Live Preview
                  </span>
                  <KatexRenderer content={content} className="text-xs text-slate-800 font-medium" />
                </div>
              )}

              {/* Dynamic Type Inputs */}
              {(questionType === 'single' || questionType === 'multiple') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">
                        Option {String.fromCharCode(65 + idx)}
                      </label>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const copy = [...options];
                          copy[idx] = e.target.value;
                          setOptions(copy);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {questionType === 'integer' && (
                <div className="space-y-1 pt-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Correct Numerical Answer</label>
                  <input
                    type="text"
                    value={integerAnswer}
                    onChange={e => setIntegerAnswer(e.target.value.replace(/[^0-9.-]/g, ''))}
                    placeholder="e.g. 42 or -3.14"
                    className="w-full sm:w-1/3 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>
              )}

              {questionType === 'blanks' && (
                <div className="space-y-1 pt-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Correct Blank Phrase</label>
                  <input
                    type="text"
                    value={blankAnswer}
                    onChange={e => setBlankAnswer(e.target.value)}
                    placeholder="e.g. Mitochondria"
                    className="w-full sm:w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>
              )}

              {questionType === 'match' && (
                <div className="space-y-2 pt-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Matrix Left / Right Mapping</label>
                  {matrixMatch.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-400 w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={m.left}
                        onChange={e => {
                          const copy = [...matrixMatch];
                          copy[idx].left = e.target.value;
                          setMatrixMatch(copy);
                        }}
                        placeholder={`Left item ${idx + 1}`}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold"
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
                        placeholder="Right item"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Answer Key Selector & Submit */}
              <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200">
                {questionType === 'single' && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Correct Answer</span>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2, 3].map(idx => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCorrectOptionIdx(idx)}
                          className={`w-8 h-8 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            correctOptionIdx === idx
                              ? 'bg-indigo-600 border-indigo-600 text-white font-black'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Correct Choices</span>
                    <div className="flex items-center gap-1.5">
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
                            className={`w-8 h-8 rounded-xl border text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white font-black shadow-xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
                  <div></div>
                )}

                <button
                  type="submit"
                  disabled={isSavingQuestion}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-60"
                >
                  {isSavingQuestion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Question</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section B: Global Question Bank Pool Browser */}
          <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Select from Question Bank Pool ({poolQuestions.length})
                </h4>
              </div>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                {selectedQuestions.length} Selected
              </span>
            </div>

            {/* Filter Deck */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={poolSubject}
                onChange={e => setPoolSubject(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 rounded-xl outline-none"
              >
                <option value="All">All Subjects</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
              </select>

              <select
                value={poolDifficulty}
                onChange={e => setPoolDifficulty(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 rounded-xl outline-none"
              >
                <option value="All">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={poolSearch}
                  onChange={e => setPoolSearch(e.target.value)}
                  placeholder="Filter question content..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={fetchQuestionPool}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {/* Question Pool List */}
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {isLoadingPool ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : poolQuestions.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-10 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                  No questions match query filters.
                </div>
              ) : (
                poolQuestions.map(q => {
                  const isSelected = selectedQuestions.some(item => item.id === q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => handleToggleSelectQuestion(q)}
                      className={`p-3.5 border rounded-2xl flex items-start gap-3 transition select-none cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/40 border-indigo-300 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="mt-0.5 accent-indigo-600 cursor-pointer h-4 w-4 shrink-0 rounded"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                          <span className="text-indigo-700 font-extrabold">{q.subject}</span>
                          <span>•</span>
                          <span>{q.sub_topic}</span>
                          <span>•</span>
                          <span className={
                            (q.difficulty || '').toLowerCase() === 'easy' ? 'text-emerald-600' :
                            (q.difficulty || '').toLowerCase() === 'medium' ? 'text-amber-600' : 'text-rose-600'
                          }>
                            {q.difficulty || 'medium'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-bold truncate leading-snug">
                          {q.content || q.questionText}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Col 3: Exam Blueprint Configuration & Save */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-5 shadow-sm sticky top-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <h4 className="font-black text-xs uppercase text-slate-800 tracking-wider">
                Exam Blueprint Config
              </h4>
            </div>

            <form onSubmit={handleCompileExam} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">
                  Exam Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  placeholder="e.g. JEE Main Full Mock Test #01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Duration (Mins)</label>
                  <input
                    type="number"
                    min="5"
                    value={examDuration}
                    onChange={e => setExamDuration(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Live Ranking</label>
                  <div className="flex items-center h-9">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isLiveRanking}
                        onChange={e => setIsLiveRanking(e.target.checked)}
                        className="accent-indigo-600 h-4 w-4 cursor-pointer rounded"
                      />
                      <span className="text-xs font-bold text-slate-700">Leaderboard</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase block">Correct (+) Marks</label>
                  <input
                    type="number"
                    value={positiveMarks}
                    onChange={e => setPositiveMarks(e.target.value)}
                    className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-700 uppercase block">Negative (-) Marks</label>
                  <input
                    type="number"
                    value={negativeMarks}
                    onChange={e => setNegativeMarks(e.target.value)}
                    className="w-full bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">
                  Scheduled Opening Timestamp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={activationTimestamp}
                  onChange={e => setActivationTimestamp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>

              {/* Summary Card */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-indigo-950">
                  <span>Selected Questions:</span>
                  <span className="font-mono text-sm font-black text-indigo-700">{selectedQuestions.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-indigo-950">
                  <span>Total Max Marks:</span>
                  <span className="font-mono text-sm font-black text-indigo-700">
                    {selectedQuestions.length * (parseInt(positiveMarks) || 4)} pts
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCompiling}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
              >
                {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{editingExam ? 'Save Blueprint Updates' : 'Compile & Publish Exam'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Universal AI PDF Importer Modal */}
      <UniversalPdfImporterModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onConfirmIngest={handleAiQuestionsIngested}
        targetModuleName="Test Series CBT Compiler"
      />
    </div>
  );
}
