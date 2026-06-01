'use client'

import React, { useState, useTransition, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { 
  Settings, Play, FileText, ClipboardList, Plus, 
  Trash2, BookOpen, Clock, FileUp, Sparkles, CheckCircle2,
  MessageSquare, Send, Check, ListFilter, User, ExternalLink, RefreshCw, HelpCircle,
  Radio, PlayCircle, StopCircle, BarChart3, Timer, RefreshCcw,
  Users, Trophy, Target, ChevronRight, AlertCircle
} from 'lucide-react';
import { invalidateCache } from '@/utils/invalidateCache';

// Zero-weight LaTeX and Markdown parser for administrative formatting
const compileMarkdownToHtml = (markdown) => {
  if (!markdown) return '';
  
  // Escape HTML to prevent XSS but keep math blocks intact
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Process Block LaTeX: $$ ... $$
  html = html.replace(/\$\$(.*?)\$\$/gs, (match, formula) => {
    return `<div class="katex-block my-4 text-center overflow-x-auto text-indigo-400 font-serif font-bold text-base bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">${formula.trim()}</div>`;
  });

  // 2. Process Inline LaTeX: $ ... $
  html = html.replace(/\$(.*?)\$/g, (match, formula) => {
    return `<span class="katex-inline font-serif font-semibold text-indigo-400 bg-zinc-950/40 px-1.5 py-0.5 rounded border border-zinc-800/40">${formula.trim()}</span>`;
  });

  // 3. Headers: #, ##, ###, ####
  html = html.replace(/^#### (.*?)$/gm, '<h5 class="text-sm font-black text-white mt-4 mb-2">$1</h5>');
  html = html.replace(/^### (.*?)$/gm, '<h4 class="text-base font-black text-white mt-5 mb-2.5">$1</h4>');
  html = html.replace(/^## (.*?)$/gm, '<h3 class="text-lg font-black text-white mt-6 mb-3">$1</h3>');
  html = html.replace(/^# (.*?)$/gm, '<h2 class="text-xl font-black text-white mt-7 mb-4 border-b border-zinc-800 pb-2">$1</h2>');

  // 4. Bold and Italics
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-white">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-300">$1</em>');

  // 5. Unordered lists
  html = html.replace(/^\s*[\-\*]\s+(.*?)$/gm, '<li class="list-disc ml-5 mb-1.5 text-zinc-300">$1</li>');

  // 6. Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li class="list-decimal ml-5 mb-1.5 text-zinc-300">$1</li>');

  // 7. Paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<div') || trimmed.startsWith('<li') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
      return trimmed;
    }
    return `<p class="mb-4 text-zinc-300 leading-relaxed text-xs sm:text-sm">${trimmed.replace(/\n/g, '<br />')}</p>`;
  }).join('\n');

  return html;
};

// HTML back to raw Markdown converter for course authoring pipeline
const convertHtmlToMarkdown = (html) => {
  if (!html) return '';
  let md = html;
  
  // Replace Katex block divs back to $$ formula $$
  md = md.replace(/<div class="katex-block[^"]*">(.*?)<\/div>/gs, (match, formula) => {
    return `\n\n$$${formula.trim()}$$\n\n`;
  });

  // Replace Katex inline spans back to $ formula $
  md = md.replace(/<span class="katex-inline[^"]*">(.*?)<\/span>/g, (match, formula) => {
    return `$${formula.trim()}$`;
  });

  // Replace headers
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/g, '\n\n# $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/g, '\n\n## $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/g, '\n\n### $1\n\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/g, '\n\n#### $1\n\n');

  // Replace bold and italics
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*');

  // Replace lists
  md = md.replace(/<li class="list-disc[^"]*">(.*?)<\/li>/g, '\n- $1');
  md = md.replace(/<li class="list-decimal[^"]*">(.*?)<\/li>/g, '\n1. $1');
  md = md.replace(/<li>(.*?)<\/li>/g, '\n- $1');

  // Remove wrapper list tags
  md = md.replace(/<\/?ul[^>]*>/g, '');
  md = md.replace(/<\/?ol[^>]*>/g, '');

  // Replace paragraphs and line breaks
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gs, '\n\n$1\n\n');
  md = md.replace(/<br\s*\/?>/g, '\n');

  // Replace escaped entities
  md = md.replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&amp;/g, '&');

  // Clean up excessive newlines
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  
  return md;
};

// Physics and math quick equation helper toolbox
const FORMULA_SNIPPETS = [
  { label: 'Kinematics 1st', value: '$$v = u + at$$', desc: 'Velocity equation' },
  { label: 'Kinematics 2nd', value: '$$s = ut + \\frac{1}{2}at^2$$', desc: 'Displacement' },
  { label: 'Newton 2nd', value: '$$F = ma$$', desc: 'Force relation' },
  { label: 'Torque', value: '$$\\tau = I\\alpha$$', desc: 'Rotational torque' },
  { label: 'Angular Mom.', value: '$$L = I\\omega$$', desc: 'Angular momentum' },
  { label: 'De Broglie', value: '$$\\lambda = \\frac{h}{p}$$', desc: 'Wave particle duality' },
  { label: 'pH Definition', value: '$$\\text{pH} = -\\log[\\text{H}^+]$$', desc: 'Acid pH definition' },
  { label: 'Gibbs Energy', value: '$$\\Delta G = \\Delta H - T\\Delta S$$', desc: 'Gibbs free energy' },
  { label: 'Einstein Mass', value: '$$E = mc^2$$', desc: 'Mass energy' }
];

function LiveClassesTab({ course, triggerToast }) {
  const [question, setQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [duration, setDuration] = useState(30);

  const [activePoll, setActivePoll] = useState(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  // Poll server for active poll status using safe self-scheduling recursive setTimeout
  useEffect(() => {
    let timeoutId = null;
    let isMounted = true;

    const fetchActivePoll = async () => {
      try {
        const res = await fetch('/api/live/poll');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.active) {
            setActivePoll(data.poll);
          } else {
            setActivePoll(null);
          }
        }
      } catch (err) {
        console.warn('Telemetry fetch error:', err.message);
      } finally {
        if (isMounted) {
          timeoutId = setTimeout(fetchActivePoll, 3000);
        }
      }
    };

    fetchActivePoll();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleLaunchPoll = async (e) => {
    e.preventDefault();
    if (!question.trim()) return triggerToast('Question cannot be empty', 'error');
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      return triggerToast('All 4 options must be completed', 'error');
    }

    setIsLaunching(true);
    try {
      const res = await fetch('/api/live/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          options: [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()],
          correctAnswerIndex,
          durationSeconds: duration,
          courseId: course.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActivePoll(data.poll);
        triggerToast('Live Quick-Poll broadcasted successfully!');
        
        // Reset form
        setQuestion('');
        setOptionA('');
        setOptionB('');
        setOptionC('');
        setOptionD('');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to launch');
      }
    } catch (err) {
      triggerToast(err.message, 'error');
    } finally {
      setIsLaunching(false);
    }
  };

  const handleTerminatePoll = async () => {
    if (!confirm('End the active classroom poll early?')) return;
    setIsTerminating(true);
    try {
      const res = await fetch('/api/live/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'terminate', courseId: course.id })
      });

      if (res.ok) {
        setActivePoll(null);
        triggerToast('Poll terminated cleanly');
      } else {
        throw new Error('Failed to terminate');
      }
    } catch (err) {
      triggerToast(err.message, 'error');
    } finally {
      setIsTerminating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">Synchronized Cohort Poll Command Center</h2>
        <p className="text-xs text-zinc-500 mt-1">Broadcast real-time dynamic conceptual quizzes and monitor student cohort response analytics instantly</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Creator Form */}
        <div className="bg-[#030303]/60 border border-zinc-800/80 p-6 rounded-3xl space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider">Configure Poll Blueprint</h3>
          </div>

          <form onSubmit={handleLaunchPoll} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Question Supplement</label>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="e.g. Find the angular momentum of a rolling disc with mass 2kg and radius 0.5m..."
                className="w-full h-20 bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition resize-none placeholder-zinc-750 font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Option A', val: optionA, set: setOptionA },
                { label: 'Option B', val: optionB, set: setOptionB },
                { label: 'Option C', val: optionC, set: setOptionC },
                { label: 'Option D', val: optionD, set: setOptionD }
              ].map((opt, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-550 uppercase block">{opt.label}</label>
                  <input
                    type="text"
                    value={opt.val}
                    onChange={e => opt.set(e.target.value)}
                    placeholder={`Choice ${String.fromCharCode(65 + idx)}`}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Authoritative Answer</label>
                <select
                  value={correctAnswerIndex}
                  onChange={e => setCorrectAnswerIndex(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition cursor-pointer font-bold"
                >
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  <option value={2}>Option C</option>
                  <option value={3}>Option D</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Timer Duration: {duration}s</label>
                <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-xl gap-1">
                  {[15, 30, 60, 90].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDuration(s)}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer select-none tactile-press hover:scale-105 active:scale-95 ${
                        duration === s
                          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLaunching || !!activePoll}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-900 disabled:text-zinc-650 disabled:border-zinc-800 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-bold shadow-md cursor-pointer transition select-none flex items-center justify-center gap-2 border border-indigo-500 hover:scale-[1.01] active:scale-[0.99] tactile-press"
              >
                {isLaunching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlayCircle className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                )}
                <span>{activePoll ? 'Poll Active (Wait to finish)' : 'Launch Live Poll broadcast'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Telemetry Results */}
        <div className="bg-[#030303]/60 border border-zinc-800 p-6 rounded-3xl space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider">Live Response Telemetry</h3>
            </div>
            
            {activePoll && (
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                <Timer className="w-3 h-3 text-emerald-400" /> {activePoll.timeLeftSeconds || 0}s Left
              </span>
            )}
          </div>

          {!activePoll ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#030303]/20 border border-zinc-800 rounded-2xl min-h-[300px]">
              <StopCircle className="w-10 h-10 text-zinc-700 mb-3 animate-pulse" />
              <h3 className="font-bold text-xs text-zinc-400">Classroom Broadcast Inactive</h3>
              <p className="text-[10px] text-zinc-550 mt-1.5 max-w-xs leading-relaxed">
                Configure a poll blueprint on the left pane and press launch. Active student percentages will automatically compile and display in real-time horizontal charts.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between space-y-5">
              {/* Question Summary */}
              <div className="bg-zinc-950/70 border border-zinc-800/60 p-4 rounded-2xl space-y-2">
                <h4 className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest leading-none">Active Poll Question</h4>
                <p className="text-xs font-extrabold text-white leading-relaxed">{activePoll.question}</p>
              </div>

              {/* Options & Progress Bar Charts */}
              <div className="space-y-4 flex-1">
                {activePoll.options.map((opt, idx) => {
                  const votes = activePoll.results?.[idx] || 0;
                  const total = activePoll.totalVotes || 0;
                  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
                  const isCorrect = idx === activePoll.correctAnswerIndex;

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                        <span className="truncate max-w-[200px] flex items-center gap-1.5">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border ${
                            isCorrect 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                          {isCorrect && (
                            <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1 border border-emerald-500/20">
                              Correct Key
                            </span>
                          )}
                        </span>
                        <span className="text-zinc-400">{pct}% ({votes} votes)</span>
                      </div>

                      <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden relative border border-zinc-800">
                        <motion.div
                          animate={{ width: `${pct}%` }}
                          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                          className={`h-full rounded-full ${
                            isCorrect 
                              ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]' 
                              : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.25)]'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total votes + Terminate button footer */}
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-zinc-800/60 shrink-0">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  Total Votes: <span className="text-white text-xs ml-1 font-extrabold">{activePoll.totalVotes || 0} Responses</span>
                </div>

                <button
                  type="button"
                  onClick={handleTerminatePoll}
                  disabled={isTerminating}
                  className="px-4 py-2 bg-rose-600/10 hover:bg-rose-650 border border-rose-500/20 hover:border-rose-500/60 text-rose-455 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer select-none tactile-press"
                >
                  {isTerminating ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <StopCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  <span>Terminate Poll</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CourseManageClient({ 
  initialCourse, 
  initialLessons, 
  initialFiles, 
  initialExams 
}) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  // Dynamic States
  const [course, setCourse] = useState(initialCourse);
  const [lessons, setLessons] = useState(initialLessons || []);
  const [files, setFiles] = useState(initialFiles || []);
  const [exams, setExams] = useState(initialExams || []);
  
  const [activeTab, setActiveTab] = useState('settings');
  const [toast, setToast] = useState(null);

  // Configuration forms state
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [price, setPrice] = useState(course?.price || '');
  const [level, setLevel] = useState(course?.level || 'foundation');
  const [thumbUrl, setThumbUrl] = useState(course?.thumbnail_url || '');

  // Syllabus forms state
  const [lesTitle, setLesTitle] = useState('');
  const [lesUrl, setLesUrl] = useState('');
  const [lesDuration, setLesDuration] = useState('45');
  const [lesSubject, setLesSubject] = useState('Physics');
  const [lesReading, setLesReading] = useState('');
  const [lesWorksheetTitle, setLesWorksheetTitle] = useState('');
  const [lesWorksheetUrl, setLesWorksheetUrl] = useState('');

  // PDF Notes form state
  const [targetLessonId, setTargetLessonId] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteUrl, setNoteUrl] = useState('');

  // Assessment form state
  const [examTitle, setExamTitle] = useState('');
  const [examDuration, setExamDuration] = useState('180');
  const [selectedLessonForExam, setSelectedLessonForExam] = useState('');

  // Module 1: Rich Readings and Debounced LaTeX state
  const [selectedLessonForReading, setSelectedLessonForReading] = useState('');
  const [readingMarkdown, setReadingMarkdown] = useState('');
  const [renderedHtml, setRenderedHtml] = useState('');
  const [isSavingReading, setIsSavingReading] = useState(false);

  // Debounced LaTeX compilation to prevent DOM CPU locking during fast typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderedHtml(compileMarkdownToHtml(readingMarkdown));
    }, 150);
    return () => clearTimeout(timer);
  }, [readingMarkdown]);

  // Module 2: Doubt Solver states
  const [doubts, setDoubts] = useState([]);
  const [activeDoubt, setActiveDoubt] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [doubtFilter, setDoubtFilter] = useState('unresolved'); // 'unresolved' | 'resolved' | 'all'
  const [isLoadingDoubts, setIsLoadingDoubts] = useState(false);
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // CBT Telemetry & Gradebook states
  const [attempts, setAttempts] = useState([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [gradebookSearch, setGradebookSearch] = useState('');
  const [gradebookExamFilter, setGradebookExamFilter] = useState('all');

  // Tab-isolated dynamic query to pull assessment attempts joined with profiles & assessments
  useEffect(() => {
    if (activeTab === 'exams' && exams.length > 0) {
      const fetchTelemetryAttempts = async () => {
        setIsLoadingAttempts(true);
        try {
          const examIds = exams.map(e => e.id);
          const { data, error } = await supabase
            .from('assessment_attempts')
            .select('*, assessments(*, questions(id, correct_option_index)), profiles(*)')
            .in('assessment_id', examIds)
            .not('submitted_at', 'is', null)
            .order('submitted_at', { ascending: false });

          if (error) throw error;
          setAttempts(data || []);
        } catch (err) {
          console.warn('[Telemetry Gradebook Fetch Error]:', err.message);
          triggerToast('Failed to load assessment telemetry', 'error');
        } finally {
          setIsLoadingAttempts(false);
        }
      };
      fetchTelemetryAttempts();
    }
  }, [activeTab, exams]);

  // Clean safety array checks
  const safeAttempts = React.useMemo(() => {
    return Array.isArray(attempts) ? attempts : [];
  }, [attempts]);

  // Filtered attempts specifically for telemetry statistics computations isolated by mock exam
  const statsAttempts = React.useMemo(() => {
    if (gradebookExamFilter === 'all') return safeAttempts;
    return safeAttempts.filter(a => a.assessment_id === gradebookExamFilter);
  }, [safeAttempts, gradebookExamFilter]);

  // Memoized stats calculation for Top Roster Telemetry
  const telemetryStats = React.useMemo(() => {
    if (statsAttempts.length === 0) return { avg: 0, highest: 0, avgTimeStr: '0s' };
    const totalScore = statsAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
    const avg = Math.round((totalScore / statsAttempts.length) * 10) / 10;
    const highest = Math.max(...statsAttempts.map(a => a.score || 0));
    
    const totalTimeMs = statsAttempts.reduce((sum, a) => {
      if (!a.started_at || !a.submitted_at) return sum;
      return sum + (new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime());
    }, 0);
    const avgTimeSeconds = Math.round((totalTimeMs / statsAttempts.length) / 1000);
    
    let avgTimeStr = '0s';
    if (avgTimeSeconds > 3600) {
      avgTimeStr = `${Math.floor(avgTimeSeconds / 3600)}h ${Math.floor((avgTimeSeconds % 3600) / 60)}m`;
    } else if (avgTimeSeconds > 60) {
      avgTimeStr = `${Math.floor(avgTimeSeconds / 60)}m ${avgTimeSeconds % 60}s`;
    } else {
      avgTimeStr = `${avgTimeSeconds}s`;
    }

    return { avg, highest: Math.max(0, highest), avgTimeStr };
  }, [statsAttempts]);

  // Memoized roster preprocessing for the NTA (+4/-1) Enterprise Gradebook
  const gradebookRoster = React.useMemo(() => {
    return safeAttempts.map(attempt => {
      if (!attempt) return null;
      const started = attempt.started_at ? new Date(attempt.started_at) : null;
      const submitted = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
      const elapsedMs = (started && submitted) ? (submitted.getTime() - started.getTime()) : 0;
      
      const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
      let timeStr = '0s';
      if (elapsedSeconds > 3600) {
        timeStr = `${Math.floor(elapsedSeconds / 3600)}h ${Math.floor((elapsedSeconds % 3600) / 60)}m`;
      } else if (elapsedSeconds > 60) {
        timeStr = `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
      } else {
        timeStr = `${elapsedSeconds}s`;
      }

      const questions = attempt.assessments?.questions || [];
      const answers = attempt.answers_payload || {};
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      questions.forEach(q => {
        if (!q) return;
        const ans = answers[q.id];
        if (ans === undefined || ans === null || ans === -1) {
          unanswered++;
        } else if (Number(ans) === q.correct_option_index) {
          correct++;
        } else {
          incorrect++;
        }
      });

      const accuracy = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

      return {
        ...attempt,
        timeStr,
        correct,
        incorrect,
        unanswered,
        accuracy,
        totalQuestions: questions.length
      };
    }).filter(Boolean);
  }, [safeAttempts]);

  // High-Throughput memoized Roster Filter
  const filteredGradebookRoster = React.useMemo(() => {
    return gradebookRoster.filter(roster => {
      const search = gradebookSearch.trim().toLowerCase();
      const studentName = (roster.profiles?.full_name || '').toLowerCase();
      const studentEmail = (roster.profiles?.email || '').toLowerCase();
      const matchesSearch = !search || studentName.includes(search) || studentEmail.includes(search);

      const matchesExam = gradebookExamFilter === 'all' || roster.assessment_id === gradebookExamFilter;

      return matchesSearch && matchesExam;
    });
  }, [gradebookRoster, gradebookSearch, gradebookExamFilter]);

  const triggerToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync Markdown with selected lesson
  useEffect(() => {
    if (selectedLessonForReading) {
      const activeLes = lessons.find(l => l.id === selectedLessonForReading);
      if (activeLes) {
        setReadingMarkdown(convertHtmlToMarkdown(activeLes.reading_material || ''));
      } else {
        setReadingMarkdown('');
      }
    } else {
      setReadingMarkdown('');
    }
  }, [selectedLessonForReading, lessons]);

  // Fetch logged in admin user session & fetch doubt board threads
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminUser(user);
    };
    fetchUser();
  }, []);

  // Fetch all doubts for this course
  const fetchCourseDoubts = async () => {
    if (!lessons || lessons.length === 0) return;
    setIsLoadingDoubts(true);
    try {
      const lessonIds = lessons.map(l => l.id);
      const { data, error } = await supabase
        .from('lesson_doubts')
        .select('*, profiles(full_name, email), lessons(title)')
        .in('lesson_id', lessonIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDoubts(data || []);
    } catch (err) {
      console.error('Error fetching doubts:', err);
      triggerToast('Failed to fetch doubts', 'error');
    } finally {
      setIsLoadingDoubts(false);
    }
  };

  useEffect(() => {
    fetchCourseDoubts();
  }, [lessons]);

  // Update configurations API call
  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!title.trim()) return triggerToast('Course title is required', 'error');

    try {
      const { data, error } = await supabase
        .from('courses')
        .update({
          title: title.trim(),
          description: description.trim(),
          price: parseFloat(price) || 0,
          level,
          thumbnail_url: thumbUrl.trim()
        })
        .eq('id', course.id)
        .select()
        .single();

      if (error) throw error;

      setCourse(data);
      triggerToast('Configurations saved successfully!');
      invalidateCache('catalog', course.id);
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  // Syllabus Video Insertion API call
  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!lesTitle.trim() || !lesUrl.trim()) {
      return triggerToast('Title and Video URL are required', 'error');
    }

    try {
      const nextOrder = lessons.filter(l => l.subject === lesSubject).length + 1;
      const { data: lesson, error } = await supabase
        .from('lessons')
        .insert([{
          course_id: course.id,
          title: lesTitle.trim(),
          video_url: lesUrl.trim(),
          duration_minutes: parseInt(lesDuration) || 45,
          subject: lesSubject,
          order_index: nextOrder,
          reading_material: lesReading.trim() || null,
          assignment_title: lesWorksheetTitle.trim() || null,
          assignment_url: lesWorksheetUrl.trim() || null
        }])
        .select()
        .single();

      if (error) throw error;

      setLessons(prev => [...prev, lesson]);
      
      setLesTitle('');
      setLesUrl('');
      setLesDuration('45');
      setLesReading('');
      setLesWorksheetTitle('');
      setLesWorksheetUrl('');

      triggerToast('Video Lesson added to curriculum!');
      invalidateCache('catalog', course.id);
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  // Delete video lesson API call
  const handleDeleteLesson = async (id) => {
    if (!confirm('Permanently remove this lesson?')) return;
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;

      setLessons(prev => prev.filter(l => l.id !== id));
      triggerToast('Lesson removed');
      invalidateCache('catalog', course.id);
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  // Attach Reference PDF material to a specific lesson
  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!targetLessonId) return triggerToast('Please select a lesson first', 'error');
    if (!noteTitle.trim() || !noteUrl.trim()) return triggerToast('Title and PDF URL are required', 'error');

    try {
      const secureUrl = noteUrl.includes('#') ? noteUrl : `${noteUrl.trim()}#toolbar=0`;
      const { data: file, error } = await supabase
        .from('course_files')
        .insert([{
          course_id: course.id,
          lesson_id: targetLessonId,
          file_name: noteTitle.trim(),
          file_path: secureUrl,
          is_premium: true
        }])
        .select()
        .single();

      if (error) throw error;

      setFiles(prev => [...prev, file]);
      setNoteTitle('');
      setNoteUrl('');
      triggerToast('Reference PDF attached successfully!');
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  // Remove attached PDF material
  const handleDeleteFile = async (id) => {
    if (!confirm('Remove this study material?')) return;
    try {
      const { error } = await supabase.from('course_files').delete().eq('id', id);
      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== id));
      triggerToast('Study material cleared');
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  // Link assessment quiz/exam directly to syllabus chapter
  const handleAddExam = async (e) => {
    e.preventDefault();
    if (!examTitle.trim()) return triggerToast('Exam Title is required', 'error');

    try {
      const { data: exam, error } = await supabase
        .from('assessments')
        .insert([{
          course_id: course.id,
          lesson_id: selectedLessonForExam || null,
          title: examTitle.trim(),
          duration_minutes: parseInt(examDuration) || 180,
          type: 'jee_mock'
        }])
        .select()
        .single();

      if (error) throw error;

      setExams(prev => [exam, ...prev]);
      setExamTitle('');
      setSelectedLessonForExam('');
      triggerToast('Mock Exam successfully linked!');
      invalidateCache('catalog', course.id);
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  // Remove linked assessment
  const handleDeleteExam = async (id) => {
    if (!confirm('Permanent deletion will clear all student scorecards. Continue?')) return;
    try {
      const { error } = await supabase.from('assessments').delete().eq('id', id);
      if (error) throw error;

      setExams(prev => prev.filter(e => e.id !== id));
      triggerToast('Assessment cleared');
      invalidateCache('catalog', course.id);
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  // Save compiled reading material
  const handleSaveReading = async () => {
    if (!selectedLessonForReading) return;
    setIsSavingReading(true);

    try {
      const compiledHtml = compileMarkdownToHtml(readingMarkdown);
      const { error } = await supabase
        .from('lessons')
        .update({ reading_material: compiledHtml })
        .eq('id', selectedLessonForReading);

      if (error) throw error;

      setLessons(prev => prev.map(l => l.id === selectedLessonForReading ? { ...l, reading_material: compiledHtml } : l));
      triggerToast('Reading material saved successfully!');
      invalidateCache('catalog', course.id);
    } catch (err) {
      triggerToast(err.message, 'error');
    } finally {
      setIsSavingReading(false);
    }
  };

  // Reply to Student Doubt
  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !activeDoubt || isPostingReply || !adminUser) return;
    setIsPostingReply(true);

    try {
      const { data, error } = await supabase
        .from('lesson_doubts')
        .insert([{
          lesson_id: activeDoubt.lesson_id,
          user_id: adminUser.id,
          content: replyContent.trim(),
          parent_id: activeDoubt.id,
          resolved: false
        }])
        .select()
        .single();

      if (error) throw error;

      const mockReply = {
        ...data,
        profiles: {
          full_name: adminUser.user_metadata?.full_name || adminUser.email.split('@')[0] || 'Instructor',
          email: adminUser.email
        }
      };

      setDoubts(prev => [...prev, mockReply]);
      setReplyContent('');
      triggerToast('Reply posted successfully!');
    } catch (err) {
      triggerToast(err.message, 'error');
    } finally {
      setIsPostingReply(false);
    }
  };

  // Mark Doubt as Resolved
  const handleMarkDoubtSolved = async (doubtId) => {
    try {
      const { error } = await supabase
        .from('lesson_doubts')
        .update({ resolved: true })
        .eq('id', doubtId);

      if (error) throw error;

      setDoubts(prev => prev.map(d => d.id === doubtId ? { ...d, resolved: true } : d));
      if (activeDoubt && activeDoubt.id === doubtId) {
        setActiveDoubt(prev => ({ ...prev, resolved: true }));
      }
      triggerToast('Doubt marked as resolved!');
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  // Delete Doubt Spam / Thread
  const handleDeleteDoubt = async (doubtId) => {
    if (!confirm('Are you sure you want to permanently delete this doubt thread?')) return;
    try {
      const { error } = await supabase
        .from('lesson_doubts')
        .delete()
        .eq('id', doubtId);

      if (error) throw error;

      setDoubts(prev => prev.filter(d => d.id !== doubtId && d.parent_id !== doubtId));
      if (activeDoubt && activeDoubt.id === doubtId) {
        setActiveDoubt(null);
      }
      triggerToast('Doubt thread permanently deleted!');
    } catch (err) {
      triggerToast(err.message, 'error');
    }
  };

  const handleInsertSnippet = (value) => {
    setReplyContent(prev => {
      const space = prev && !prev.endsWith(' ') ? ' ' : '';
      return prev + space + value;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Dynamic Bento Sidebar */}
      <aside className="lg:col-span-1 space-y-2.5">
        {[
          { id: 'settings', label: 'Configuration', icon: Settings, desc: 'Meta parameters & thumbnail' },
          { id: 'syllabus', label: 'Syllabus & Video', icon: Play, desc: 'HLS stream outlines & subjects mapping' },
          { id: 'materials', label: 'Reference Sheets', icon: FileText, desc: 'Attached study PDFs & homework files' },
          { id: 'readings', label: 'Rich Readings', icon: BookOpen, desc: 'Markdown + LaTeX equations engine' },
          { id: 'doubts', label: 'Doubt Board', icon: MessageSquare, desc: 'Resolve student doubts & nested threads' },
          { id: 'live', label: 'Live Classes', icon: Radio, desc: 'Broadcast classroom polls & cohort telemetry' },
          { id: 'exams', label: 'JEE Mock Linkages', icon: ClipboardList, desc: 'Assessments pipeline & CBT tests' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex flex-col items-start gap-1.5 p-4 rounded-3xl border transition-all duration-300 select-none cursor-pointer hover:scale-[1.02] active:scale-[0.98] tactile-press text-left ${
              activeTab === tab.id 
                ? 'bg-indigo-650/10 border-indigo-500/35 text-indigo-400 font-extrabold shadow-[0_0_20px_rgba(99,102,241,0.08)]' 
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-850/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <tab.icon className="w-4 h-4 shrink-0 text-indigo-500" />
              <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">{tab.desc}</span>
          </button>
        ))}

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-5 space-y-3 select-none">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Syllabus Status</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 font-semibold">Video classes</span>
              <span className="font-extrabold text-white">{lessons.length} Modules</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 font-semibold">Attached PDFs</span>
              <span className="font-extrabold text-white">{files.length} Sheets</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 font-semibold">CBT Exams</span>
              <span className="font-extrabold text-emerald-400">{exams.length} Active</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Tab Panel */}
      <div className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 lg:p-8 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
        
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Configuration Settings</h2>
              <p className="text-xs text-zinc-500 mt-1">Manage dynamic pricing, target groups, and Cloudinary thumbnail image blocks</p>
            </div>
            
            <form onSubmit={handleUpdateCourse} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block">Course Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-[#030303] border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block">Price (INR)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full bg-[#030303] border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block">Thumbnail Image URL</label>
                  <input
                    type="text"
                    value={thumbUrl}
                    onChange={e => setThumbUrl(e.target.value)}
                    className="w-full bg-[#030303] border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block">Audience Level</label>
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                    className="w-full bg-[#030303] border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="foundation">JEE Foundation</option>
                    <option value="mains">JEE Mains Capsule</option>
                    <option value="advanced">JEE Advanced Rigorous</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase block">Syllabus Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-[#030303] border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition h-28 resize-none"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-705 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer transition select-none border border-indigo-500 hover:scale-[1.02] active:scale-[0.98] tactile-press"
              >
                Save Configurations
              </button>
            </form>
          </div>
        )}

        {activeTab === 'syllabus' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Syllabus Video Outlines</h2>
              <p className="text-xs text-zinc-500 mt-1">Map HLS video streams or YouTube lecture embeds dynamically to course outlines</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <form onSubmit={handleAddLesson} className="md:col-span-1 bg-[#030303]/60 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
                <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider">Add video lecture</h3>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Lesson Title</label>
                  <input
                    type="text"
                    value={lesTitle}
                    onChange={e => setLesTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                    placeholder="Coordinate Geometry Intro"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Subject</label>
                  <select
                    value={lesSubject}
                    onChange={e => setLesSubject(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Video URL</label>
                  <input
                    type="text"
                    value={lesUrl}
                    onChange={e => setLesUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                    placeholder="https://...m3u8 or YouTube"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Duration (minutes)</label>
                  <input
                    type="number"
                    value={lesDuration}
                    onChange={e => setLesDuration(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Worksheet Title</label>
                  <input
                    type="text"
                    value={lesWorksheetTitle}
                    onChange={e => setLesWorksheetTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                    placeholder="Kinematics Sheet A"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Worksheet URL</label>
                  <input
                    type="text"
                    value={lesWorksheetUrl}
                    onChange={e => setLesWorksheetUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                    placeholder="https://...pdf"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition select-none flex items-center justify-center gap-1 border border-indigo-500 hover:scale-[1.02] active:scale-[0.98] tactile-press"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Publish Lesson</span>
                </button>
              </form>

              <div className="md:col-span-2 space-y-4 flex flex-col">
                <div className="flex gap-2 border-b border-zinc-800 pb-2">
                  {['Physics', 'Chemistry', 'Mathematics'].map(sub => (
                    <button
                      key={sub}
                      onClick={() => setLesSubject(sub)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition cursor-pointer select-none hover:scale-[1.03] active:scale-[0.97] tactile-press ${
                        lesSubject === sub 
                          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30' 
                          : 'text-zinc-500 border border-transparent hover:text-zinc-350'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {lessons.filter(l => l.subject === lesSubject).length === 0 ? (
                    <div className="text-center text-zinc-650 text-xs py-12 bg-[#030303]/30 border border-zinc-800/80 rounded-3xl">
                      No video lectures added yet under this subject division.
                    </div>
                  ) : (
                    lessons.filter(l => l.subject === lesSubject).map((les, idx) => (
                      <div key={les.id} className="bg-[#030303]/40 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center gap-4 hover:border-zinc-700 transition">
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-white truncate max-w-[280px]">Lecture {idx + 1}: {les.title}</h4>
                          <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-1.5">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {les.duration_minutes} Mins</span>
                            {les.assignment_title && <span className="text-emerald-450 font-bold">✓ Worksheet Linked</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteLesson(les.id)}
                          className="p-2 bg-rose-600/15 hover:bg-rose-600 text-rose-455 hover:text-white rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Reference Worksheets & PDF Guides</h2>
              <p className="text-xs text-zinc-500 mt-1">Attach worksheets or conceptual summary PDF sheets straight to outline chapters</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <form onSubmit={handleAddFile} className="md:col-span-1 bg-[#030303]/60 border border-zinc-800 p-5 rounded-2xl space-y-4">
                <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider">Attach study PDF</h3>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Select Target Chapter</label>
                  <select
                    value={targetLessonId}
                    onChange={e => setTargetLessonId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="">-- Choose video class --</option>
                    {lessons.map(l => (
                      <option key={l.id} value={l.id}>{l.subject.substring(0, 4).toUpperCase()} • {l.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Material Name</label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={e => setNoteTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                    placeholder="e.g., Summary Sheet Formulas"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Secure PDF Link</label>
                  <input
                    type="text"
                    value={noteUrl}
                    onChange={e => setNoteUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                    placeholder="https://drive.google.com/..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition select-none flex items-center justify-center gap-1 border border-indigo-500 hover:scale-[1.02] active:scale-[0.98] tactile-press"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach PDF Note</span>
                </button>
              </form>

              <div className="md:col-span-2 space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider border-b border-zinc-800 pb-2">Active attachments ({files.length})</h3>
                {files.length === 0 ? (
                  <div className="text-center text-zinc-650 text-xs py-12 bg-[#030303]/30 border border-zinc-800 rounded-3xl">
                    No reference PDFs attached to this syllabus yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {files.map(file => {
                      const associatedLes = lessons.find(l => l.id === file.lesson_id);
                      return (
                        <div key={file.id} className="bg-[#030303]/40 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center gap-4 hover:border-zinc-700 transition">
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-white truncate max-w-[280px]">{file.file_name}</h4>
                            <p className="text-[10px] text-zinc-500 mt-1">Chapter: {associatedLes ? associatedLes.title : 'General'}</p>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={file.file_path}
                              target="_blank"
                              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-indigo-400 hover:text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="p-2 bg-rose-600/15 hover:bg-rose-600 text-rose-405 hover:text-white rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">JEE Mock Exams & Assessments</h2>
              <p className="text-xs text-zinc-500 mt-1">Ingest dynamic question databases or configure CBT answer keys for dynamic results</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <form onSubmit={handleAddExam} className="md:col-span-1 bg-[#030303]/60 border border-zinc-800 p-5 rounded-2xl space-y-4">
                <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider">Configure Assessment</h3>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Exam Name</label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={e => setExamTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                    placeholder="e.g. JEE advanced Mock Mechanics"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Duration (minutes)</label>
                  <input
                    type="number"
                    value={examDuration}
                    onChange={e => setExamDuration(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block">Link to Chapter (Optional)</label>
                  <select
                    value={selectedLessonForExam}
                    onChange={e => setSelectedLessonForExam(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="">General Course Assessment</option>
                    {lessons.map(l => (
                      <option key={l.id} value={l.id}>{l.subject.substring(0,4).toUpperCase()} • {l.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition select-none flex items-center justify-center gap-1 border border-indigo-500 hover:scale-[1.02] active:scale-[0.98] tactile-press"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Link Assessment</span>
                </button>
              </form>

              <div className="md:col-span-2 space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider border-b border-zinc-800 pb-2">Active Assessments ({exams.length})</h3>
                {exams.length === 0 ? (
                  <div className="text-center text-zinc-650 text-xs py-12 bg-[#030303]/30 border border-zinc-800 rounded-3xl">
                    No CBT assessments registered yet under this course.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exams.map(exam => {
                      const associatedLes = lessons.find(l => l.id === exam.lesson_id);
                      return (
                        <div key={exam.id} className="bg-[#030303]/40 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center gap-4 hover:border-zinc-700 transition">
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-white truncate max-w-[280px]">{exam.title}</h4>
                            <p className="text-[10px] text-zinc-550 mt-1 font-semibold">Duration: {exam.duration_minutes} Mins • Linked: {associatedLes ? associatedLes.title : 'Course-Wide'}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-2 bg-rose-600/15 hover:bg-rose-600 text-rose-405 hover:text-white rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Cohort Telemetry & Gradebook Section */}
            <div className="pt-8 border-t border-zinc-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <span>Cohort Telemetry & Gradebook</span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">Analyze NTA-style student scoring sheets, question breakdowns, and dynamic time metrics</p>
                </div>

                {/* High-Performance Enterprise Filter Deck */}
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={gradebookSearch}
                    onChange={e => setGradebookSearch(e.target.value)}
                    placeholder="Search student or email..."
                    className="bg-zinc-950 border border-zinc-800 px-4 py-2 text-xs text-white rounded-xl outline-none focus:border-indigo-500 transition w-44 font-semibold"
                  />

                  <select
                    value={gradebookExamFilter}
                    onChange={e => setGradebookExamFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 px-4 py-2 text-xs text-white rounded-xl outline-none focus:border-indigo-500 transition cursor-pointer font-bold"
                  >
                    <option value="all">All Assessments</option>
                    {exams.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isLoadingAttempts ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3 h-24" />
                  ))}
                </div>
              ) : safeAttempts.length === 0 ? (
                <div className="text-center text-zinc-500 text-xs py-16 bg-[#030303]/30 border border-zinc-800 rounded-3xl space-y-3">
                  <AlertCircle className="w-10 h-10 mx-auto text-zinc-650 animate-pulse" />
                  <h3 className="font-extrabold text-sm text-zinc-400">No Telemetry Data Available</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                    Student mock test scorecards will compile here once participants begin submitting their exam sheets.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Telemetry Summary Bento Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none">
                    <div className="bg-[#030303]/50 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4 hover:border-zinc-700 transition">
                      <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Cohort Avg Score</span>
                        <h4 className="text-xl font-extrabold text-white mt-0.5">{telemetryStats.avg} <span className="text-xs text-zinc-550 font-medium">Points</span></h4>
                      </div>
                    </div>

                    <div className="bg-[#030303]/50 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4 hover:border-zinc-700 transition">
                      <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Highest JEE Score</span>
                        <h4 className="text-xl font-extrabold text-emerald-400 mt-0.5">+{telemetryStats.highest} <span className="text-xs text-zinc-550 font-medium">Points</span></h4>
                      </div>
                    </div>

                    <div className="bg-[#030303]/50 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4 hover:border-zinc-700 transition">
                      <div className="p-3.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Average Time Spent</span>
                        <h4 className="text-xl font-extrabold text-white mt-0.5">{telemetryStats.avgTimeStr}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Enterprise Datatable Roster */}
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-550 text-[10px] uppercase font-black tracking-widest">
                            <th className="py-3.5 px-5">Student Participant</th>
                            <th className="py-3.5 px-4">Exam Sheet</th>
                            <th className="py-3.5 px-4">Date Taken</th>
                            <th className="py-3.5 px-4">Duration</th>
                            <th className="py-3.5 px-4 text-center">Accuracy (%)</th>
                            <th className="py-3.5 px-5 text-right">JEE Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 text-xs">
                          {filteredGradebookRoster.map(roster => (
                            <tr
                              key={roster.id}
                              onClick={() => setSelectedAttempt(roster)}
                              className="hover:bg-zinc-900/40 cursor-pointer select-none transition duration-150 tactile-press border-b border-zinc-800"
                            >
                              <td className="py-3.5 px-5">
                                <div className="min-w-0">
                                  <h4 className="font-extrabold text-white leading-tight">
                                    {roster.profiles?.full_name || roster.profiles?.email?.split('@')[0] || 'Anonymous student'}
                                  </h4>
                                  <span className="text-[10px] text-zinc-500 font-medium truncate block max-w-[200px]">
                                    {roster.profiles?.email || 'No email registered'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-zinc-300">{roster.assessments?.title || 'Chapter Assessment'}</span>
                              </td>
                              <td className="py-3.5 px-4 text-zinc-400 font-bold">
                                {new Date(roster.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-zinc-450">
                                {roster.timeStr}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                                  roster.accuracy >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  roster.accuracy >= 40 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-rose-500/10 text-rose-455 border border-rose-500/20'
                                }`}>
                                  {roster.accuracy}%
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-right font-extrabold text-white font-mono">
                                <span className={roster.score >= 0 ? 'text-emerald-400' : 'text-rose-455'}>
                                  {roster.score >= 0 ? `+${roster.score}` : roster.score}
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
            </div>
          </div>
        )}

        {activeTab === 'readings' && (
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Rich Editorial Readings Engine</h2>
                <p className="text-xs text-zinc-500 mt-1">Author formatted readings and compile complex mathematical LaTeX equations</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedLessonForReading}
                  onChange={e => setSelectedLessonForReading(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition cursor-pointer font-bold"
                >
                  <option value="">-- Choose video lecture --</option>
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.subject.substring(0, 3).toUpperCase()} • {l.title}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleSaveReading}
                  disabled={!selectedLessonForReading || isSavingReading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer transition select-none flex items-center gap-2 border border-indigo-500 hover:scale-[1.02] active:scale-[0.98] tactile-press disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingReading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Reading Supplement</span>
                </button>
              </div>
            </div>

            {!selectedLessonForReading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#030303]/30 border border-zinc-800 rounded-3xl min-h-[350px]">
                <BookOpen className="w-12 h-12 text-zinc-650 mb-4 animate-pulse" />
                <h3 className="font-extrabold text-sm text-zinc-400">Select a Lecture to Begin</h3>
                <p className="text-xs text-zinc-550 mt-2 max-w-sm leading-relaxed">
                  Please choose a syllabus lecture chapter from the dropdown to start authoring rich supplement readings.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[420px] flex-1 animate-fade-in">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">
                    <span>Source Markdown & LaTeX</span>
                    <span className="text-indigo-400 font-extrabold font-mono">Math Supported</span>
                  </div>

                  <div className="bg-zinc-950/80 border border-zinc-800 px-3 py-2 rounded-xl flex flex-wrap gap-2">
                    {[
                      { label: 'H1', value: '# Title', desc: 'Main Header' },
                      { label: 'H2', value: '## Subtitle', desc: 'Sub Header' },
                      { label: 'Bold', value: '**text**', desc: 'Bold text' },
                      { label: 'Italics', value: '*text*', desc: 'Italic text' },
                      { label: 'List', value: '\n- Item', desc: 'Bullet list' },
                      { label: 'Inline Math', value: '$v=u+at$', desc: 'LaTeX inline math' },
                      { label: 'Block Math', value: '\n\n$$L=I\\omega$$\n\n', desc: 'LaTeX display equation' }
                    ].map(btn => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => handleInsertSnippet(btn.value)}
                        className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded text-[10px] font-extrabold transition cursor-pointer select-none hover:border-zinc-700"
                        title={btn.desc}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={readingMarkdown}
                    onChange={e => setReadingMarkdown(e.target.value)}
                    placeholder="Write detailed readings here. Supports standard Markdown highlights, bullets, ordered listings, and LaTeX equations."
                    className="w-full flex-1 min-h-[300px] md:min-h-[380px] bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 text-xs font-mono text-zinc-100 placeholder-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none custom-scrollbar"
                  />
                </div>

                <div className="flex flex-col space-y-2">
                  <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest px-1">
                    <span>Dynamic Rendered output</span>
                  </div>

                  <div className="w-full flex-1 min-h-[300px] md:min-h-[380px] overflow-y-auto bg-zinc-950/40 border border-zinc-800/80 p-5 rounded-2xl break-words text-zinc-300 space-y-4 custom-scrollbar">
                    {readingMarkdown.trim() ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: renderedHtml }}
                        className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed"
                      />
                    ) : (
                      <div className="text-zinc-650 text-xs italic py-12 text-center">
                        Styled preview will compile here in real-time as you write.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'doubts' && (
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Doubt Board Resolution Hub</h2>
                <p className="text-xs text-zinc-500 mt-1">Moderate, respond, and resolve student doubts dynamically in real-time</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchCourseDoubts}
                  disabled={isLoadingDoubts}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 hover:scale-[1.02] active:scale-[0.98] tactile-press"
                  title="Refresh Doubt Inbox"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDoubts ? 'animate-spin' : ''}`} />
                </button>

                <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
                  {[
                    { id: 'unresolved', label: 'Unresolved' },
                    { id: 'resolved', label: 'Resolved' },
                    { id: 'all', label: 'All Inbox' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => { setDoubtFilter(filter.id); setActiveDoubt(null); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer select-none ${
                        doubtFilter === filter.id
                          ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLoadingDoubts && doubts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-20 min-h-[350px]">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 h-[520px]">
                <div className="md:col-span-1 border-r border-zinc-800 pr-4 flex flex-col h-full overflow-hidden">
                  <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-3 shrink-0">
                    <span>Tickets ({
                      doubts.filter(d => !d.parent_id && (
                        doubtFilter === 'unresolved' ? !d.resolved :
                        doubtFilter === 'resolved' ? d.resolved : true
                      )).length
                    })</span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {doubts.filter(d => !d.parent_id && (
                      doubtFilter === 'unresolved' ? !d.resolved :
                      doubtFilter === 'resolved' ? d.resolved : true
                    )).length === 0 ? (
                      <div className="text-center text-zinc-650 text-xs py-16 bg-[#030303]/30 border border-zinc-800 rounded-2xl">
                        No doubt threads found in this folder.
                      </div>
                    ) : (
                      doubts.filter(d => !d.parent_id && (
                        doubtFilter === 'unresolved' ? !d.resolved :
                        doubtFilter === 'resolved' ? d.resolved : true
                      )).map(doubt => {
                        const count = doubts.filter(d => d.parent_id === doubt.id).length;
                        const isSelected = activeDoubt?.id === doubt.id;
                        return (
                          <div
                            key={doubt.id}
                            onClick={() => { setActiveDoubt(doubt); setReplyContent(''); }}
                            className={`p-4 rounded-2xl border transition-all duration-300 select-none cursor-pointer text-left ${
                              isSelected
                                ? 'bg-indigo-650/10 border-indigo-500/40 text-white shadow-md'
                                : 'bg-[#030303]/40 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-bold truncate max-w-[120px] text-zinc-300">
                                {doubt.profiles?.full_name || doubt.profiles?.email?.split('@')[0] || 'Student'}
                              </span>
                              <span className="text-[9px] text-zinc-550 font-medium">
                                {new Date(doubt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className={`text-xs font-bold line-clamp-2 leading-relaxed ${isSelected ? 'text-zinc-200' : 'text-zinc-400'}`}>
                              {doubt.content}
                            </p>

                            <div className="flex items-center justify-between mt-3 text-[9px] font-bold uppercase tracking-wider pt-2 border-t border-zinc-800/50">
                              <span className="text-indigo-400 truncate max-w-[125px]">
                                {doubt.lessons?.title || 'Chapter Lesson'}
                              </span>
                              <span className="flex items-center gap-1 text-zinc-500">
                                <MessageSquare className="w-3 h-3 text-zinc-500" /> {count} replies
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col h-full overflow-hidden pl-2">
                  {!activeDoubt ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#030303]/20 border border-zinc-800 rounded-3xl h-full">
                      <MessageSquare className="w-12 h-12 text-zinc-650 mb-4 animate-pulse" />
                      <h3 className="font-extrabold text-sm text-zinc-400">Moderate Doubt Thread</h3>
                      <p className="text-xs text-zinc-550 mt-2 max-w-sm leading-relaxed">
                        Select a doubt ticket from the inbox column to view student credentials, resolve threads, spam-delete, or post replies using scientific Snip formulae.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full justify-between">
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl space-y-3 relative group">
                          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                                <User className="w-4 h-4 text-indigo-400" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white leading-none">
                                  {activeDoubt.profiles?.full_name || 'Student'}
                                </h4>
                                <span className="text-[9px] text-zinc-555 font-medium">
                                  {activeDoubt.profiles?.email || 'N/A'} • {new Date(activeDoubt.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {activeDoubt.resolved ? (
                                <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Resolved
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleMarkDoubtSolved(activeDoubt.id)}
                                  className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer select-none hover:scale-[1.02] active:scale-[0.98] tactile-press"
                                >
                                  Mark Solved
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteDoubt(activeDoubt.id)}
                                className="p-1.5 bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-400 rounded-lg transition cursor-pointer"
                                title="Spam Delete Thread"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-sm font-bold text-zinc-200 leading-relaxed select-text">
                            {activeDoubt.content}
                          </p>

                          <div className="text-[9px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1 pt-1.5">
                            <span className="text-zinc-500">Target Lesson:</span>
                            <span>{activeDoubt.lessons?.title || 'Chapter Lesson'}</span>
                          </div>
                        </div>

                        <div className="space-y-3 pl-4 border-l border-zinc-800 mt-2">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">
                            Discussion Thread
                          </span>

                          {doubts.filter(d => d.parent_id === activeDoubt.id).length === 0 ? (
                            <div className="text-zinc-650 text-xs italic py-4 pl-2">
                              No replies posted yet. Respond to this doubt below.
                            </div>
                          ) : (
                            doubts.filter(d => d.parent_id === activeDoubt.id).map(reply => {
                              const isInstructor = reply.user_id === adminUser?.id;
                              return (
                                <div
                                  key={reply.id}
                                  className={`p-4 rounded-xl border text-xs leading-relaxed relative group ${
                                    isInstructor
                                      ? 'bg-zinc-950 border-indigo-950 text-zinc-300'
                                      : 'bg-[#030303]/40 border-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3 font-extrabold text-[10px] text-zinc-550 mb-1.5 uppercase tracking-wider">
                                    <span className={isInstructor ? 'text-indigo-400 font-black' : 'text-zinc-500'}>
                                      {reply.profiles?.full_name || 'Instructor'} {isInstructor && '(You)'}
                                    </span>
                                    <span className="flex items-center gap-2">
                                      {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      
                                      <button
                                        onClick={() => handleDeleteDoubt(reply.id)}
                                        className="text-zinc-600 hover:text-rose-500 transition opacity-0 group-hover:opacity-100 p-0.5"
                                        title="Delete spam reply"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </span>
                                  </div>

                                  <p className="text-zinc-200 font-bold leading-relaxed select-text">
                                    {reply.content}
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-800 shrink-0">
                        <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1.5 custom-scrollbar max-w-full">
                          <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest shrink-0 mr-1 flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3 text-indigo-400" /> Snippets:
                          </span>
                          {FORMULA_SNIPPETS.map(snippet => (
                            <button
                              key={snippet.label}
                              type="button"
                              onClick={() => handleInsertSnippet(snippet.value)}
                              className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-[9px] font-bold transition cursor-pointer select-none shrink-0"
                              title={snippet.desc}
                            >
                              {snippet.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2 items-end">
                          <input
                            type="text"
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            placeholder="Type a helpful explanation, math equation, or guidelines reply..."
                            disabled={isPostingReply}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-zinc-700 text-zinc-200 font-bold"
                          />
                          <button
                            type="button"
                            onClick={handlePostReply}
                            disabled={!replyContent.trim() || isPostingReply}
                            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition disabled:bg-zinc-955 disabled:text-zinc-650 cursor-pointer shadow-sm shrink-0 border border-indigo-500 hover:scale-[1.02] active:scale-[0.98] tactile-press flex items-center justify-center"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'live' && (
          <LiveClassesTab course={course} triggerToast={triggerToast} />
        )}

      </div>

      {/* Detailed Scorecard Overlay Modal */}
      <AnimatePresence>
        {selectedAttempt && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAttempt(null)}
              className="absolute inset-0 cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl relative text-white overflow-hidden z-10 p-6 md:p-8"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-650/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-sm uppercase">
                    {selectedAttempt.profiles?.full_name?.substring(0, 2) || selectedAttempt.profiles?.email?.substring(0, 2) || 'ST'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight">
                      {selectedAttempt.profiles?.full_name || 'Anonymous Student'}
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {selectedAttempt.profiles?.email || 'N/A'} • Submitted on {new Date(selectedAttempt.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block">JEE Scorecard</span>
                  <div className={`text-xl font-mono font-extrabold mt-0.5 ${selectedAttempt.score >= 0 ? 'text-emerald-400' : 'text-rose-455'}`}>
                    {selectedAttempt.score >= 0 ? `+${selectedAttempt.score}` : selectedAttempt.score}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-805 p-4 rounded-2xl mt-5 space-y-2">
                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block leading-none">Assessment Outline</h4>
                <p className="text-xs font-extrabold text-zinc-200">{selectedAttempt.assessments?.title || 'Chapter Assessment'}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-zinc-500 pt-1.5 border-t border-zinc-800/50 mt-1.5">
                  <span>Duration Spent: <strong className="text-zinc-300 font-mono font-bold">{selectedAttempt.timeStr}</strong></span>
                  <span>Accuracy: <strong className="text-indigo-400 font-bold">{selectedAttempt.accuracy}%</strong></span>
                  <span>Attempt ID: <span className="font-mono text-zinc-600 select-all">{selectedAttempt.id}</span></span>
                </div>
              </div>

              {/* Dynamic NTA counts Bento Grid */}
              <div className="grid grid-cols-3 gap-4 mt-5 select-none">
                <div className="bg-emerald-955/20 border border-emerald-900/30 p-4 rounded-xl flex flex-col justify-between hover:border-emerald-500/20 transition h-20">
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block leading-none">Correct</span>
                  <h4 className="text-lg font-black text-emerald-400 font-mono">+{selectedAttempt.correct} <span className="text-[9px] text-zinc-500 font-bold">Qns</span></h4>
                </div>

                <div className="bg-rose-955/20 border border-rose-900/30 p-4 rounded-xl flex flex-col justify-between hover:border-rose-500/20 transition h-20">
                  <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block leading-none">Incorrect</span>
                  <h4 className="text-lg font-black text-rose-455 font-mono">-{selectedAttempt.incorrect} <span className="text-[9px] text-zinc-550 font-bold">Qns</span></h4>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700/50 transition h-20">
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block leading-none">Unanswered</span>
                  <h4 className="text-lg font-black text-zinc-400 font-mono">{selectedAttempt.unanswered} <span className="text-[9px] text-zinc-550 font-bold">Qns</span></h4>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-zinc-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition select-none cursor-pointer tactile-press hover:scale-105 active:scale-95"
                >
                  Close Scorecard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Local Toast notifications */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 px-6 py-3.5 rounded-xl border font-bold text-sm shadow-2xl animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-600/10 border-rose-500/30 text-rose-455'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
