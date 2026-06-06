'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import AdminLayoutShell from '@/components/AdminLayoutShell';
import { 
  Layers, Users, Calendar, AlertCircle, RefreshCw, Phone, Mail, GraduationCap,
  PlusCircle, X, Plus, Loader2, FileText, Video, Trash2, ExternalLink, Settings, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invalidateCache } from '@/utils/invalidateCache';

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
    script.onerror = (err) => reject(new Error('Failed to load PDF.js compiler from CDN'));
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
    if (/^\s*JEE\s*(?:Main|Advanced)?\s*(?:Mock|Practice)?\s*Test/i.test(trimmed)) return false;
    
    return true;
  });
  return cleanedLines.join('\n');
};

const parseQuestionBlock = (block) => {
  if (!block) return null;
  const lines = block.split('\n');
  let questionLines = [];
  let options = ['', '', '', ''];
  let correctOptionIndex = -1;
  let currentOptionIdx = -1;
  
  const ansRegex = /\b(?:ans(?:wer)?|key|correct|option)\b\s*[\:\-\=]?\s*([A-D])/i;
  
  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    const ansMatch = ansRegex.exec(trimmedLine);
    if (ansMatch) {
      const char = ansMatch[1].toUpperCase();
      correctOptionIndex = char.charCodeAt(0) - 65;
      continue;
    }
    
    const optMatch = /^\s*[\*\_\(\[]*\s*(A|B|C|D)\s*[\*\_\)\]\.\-]+\s*(.*?)$/.exec(trimmedLine);
    if (optMatch) {
      const char = optMatch[1];
      const text = optMatch[2].trim();
      currentOptionIdx = char.charCodeAt(0) - 65;
      options[currentOptionIdx] = text;
    } else {
      if (currentOptionIdx !== -1) {
        options[currentOptionIdx] += ' ' + trimmedLine;
      } else {
        questionLines.push(trimmedLine);
      }
    }
  }
  
  const hasLineOptions = options.some(o => o !== '');
  if (!hasLineOptions) {
    const inlineOptRegex = /[\(\[]?(A|B|C|D)[\)\]\.\-]\s+/g;
    let firstOptionIndex = -1;
    let match = inlineOptRegex.exec(block);
    if (match) {
      firstOptionIndex = match.index;
    }
    
    const inlineExtractRegex = /[\*\_\(\[]*\s*(A|B|C|D)\s*[\*\_\)\]\.\-]+\s*([^\(\[\n]+)/g;
    const tempOptions = ['', '', '', ''];
    let foundCount = 0;
    while ((match = inlineExtractRegex.exec(block)) !== null) {
      const char = match[1];
      const text = match[2].trim();
      const idx = char.charCodeAt(0) - 65;
      tempOptions[idx] = text;
      foundCount++;
    }
    
    if (foundCount >= 2) {
      options = tempOptions;
      if (firstOptionIndex !== -1) {
        questionLines = [block.substring(0, firstOptionIndex).trim()];
      }
    }
  }
  
  if (correctOptionIndex === -1) {
    const ansMatch = ansRegex.exec(block);
    if (ansMatch) {
      const char = ansMatch[1].toUpperCase();
      correctOptionIndex = char.charCodeAt(0) - 65;
    }
  }
  
  const filledOptionsCount = options.filter(o => o.trim() !== '').length;
  
  if (filledOptionsCount < 2) {
    const fullBlockText = lines.filter(line => !ansRegex.test(line)).join('\n').trim();
    return {
      content: fullBlockText,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_option_index: correctOptionIndex !== -1 ? correctOptionIndex : 0
    };
  }
  
  const content = questionLines.join('\n').trim();
  if (content) {
    return {
      content,
      options: options.map(o => o || 'Option Placeholder'),
      correct_option_index: correctOptionIndex !== -1 ? correctOptionIndex : 0
    };
  }
  return null;
};

const parseExtractedText = (text) => {
  if (!text) return [];
  const cleaned = cleanExtractedText(text);
  const questionRegex = /(?:^|\n)\s*(?:Q(?:uestion)?)?\s*(\d+)\s*[\.\:\)]/gi;
  
  const matches = [];
  let match;
  while ((match = questionRegex.exec(cleaned)) !== null) {
    matches.push({
      index: match.index,
      number: match[1],
      length: match[0].length
    });
  }
  
  if (matches.length === 0) return [];
  
  const parsedQuestions = [];
  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].index + matches[i].length;
    const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : cleaned.length;
    const block = cleaned.substring(startIdx, endIdx).trim();
    
    const questionObj = parseQuestionBlock(block);
    if (questionObj) {
      parsedQuestions.push({
        id: `draft-${i}-${Date.now()}`,
        content: questionObj.content,
        options: questionObj.options,
        correct_option_index: questionObj.correct_option_index,
        marks_positive: 4,
        marks_negative: 1
      });
    }
  }
  return parsedQuestions;
};

function BatchesContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const batchIdParam = searchParams.get('id') || searchParams.get('batchId');

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchDetails, setBatchDetails] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Batch addition states
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [newBatchTitle, setNewBatchTitle] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [newBatchStartDate, setNewBatchStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newBatchPrice, setNewBatchPrice] = useState('0');
  const [newBatchStatus, setNewBatchStatus] = useState('published');
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // Expanded Batch Tab states
  const [activeTab, setActiveTab] = useState('students');
  const [batchMaterials, setBatchMaterials] = useState([]);
  const [batchLiveSessions, setBatchLiveSessions] = useState([]);
  const [batchExams, setBatchExams] = useState([]);
  const [allAssessments, setAllAssessments] = useState([]);

  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingLiveSessions, setLoadingLiveSessions] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);

  // Material Vault states
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialPath, setNewMaterialPath] = useState('');
  const [newMaterialIsPremium, setNewMaterialIsPremium] = useState(false);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  // Live session states
  const [newLiveTitle, setNewLiveTitle] = useState('');
  const [newLiveDate, setNewLiveDate] = useState('');
  const [newLiveStartTime, setNewLiveStartTime] = useState('');
  const [newLiveEndTime, setNewLiveEndTime] = useState('');
  const [newLiveRoomUrl, setNewLiveRoomUrl] = useState('');
  const [isAddingLive, setIsAddingLive] = useState(false);

  // Exam scheduler states
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [startWindow, setStartWindow] = useState('');
  const [endWindow, setEndWindow] = useState('');
  const [isSchedulingExam, setIsSchedulingExam] = useState(false);

  // Batch details configuration edit states
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState('0');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStatus, setEditStatus] = useState('published');

  // Batch Assessment PDF Importer States
  const [examBuildMode, setExamBuildMode] = useState('link'); // 'link' | 'pdf'
  const [pdfLoading, setPdfLoading] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [newPdfExamTitle, setNewPdfExamTitle] = useState('');
  const [newPdfExamDuration, setNewPdfExamDuration] = useState('180');
  const [newPdfExamType, setNewPdfExamType] = useState('jee_mock');
  const [newPdfExamStart, setNewPdfExamStart] = useState('');
  const [newPdfExamEnd, setNewPdfExamEnd] = useState('');
  const [isCreatingPdfExam, setIsCreatingPdfExam] = useState(false);

  // Fetch all batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const { data, error } = await supabase
          .from('batches')
          .select('*')
          .order('title', { ascending: true });

        if (error) throw error;
        setBatches(data || []);
      } catch (err) {
        console.error('[Batches Page Fetch Error]:', err.message);
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, [supabase]);

  // Sync selectedBatchId with batchIdParam URL query parameter
  useEffect(() => {
    if (batches.length > 0) {
      if (batchIdParam) {
        setSelectedBatchId(batchIdParam);
      } else {
        setSelectedBatchId(batches[0].id);
      }
    }
  }, [batchIdParam, batches]);

  // Sync configuration editing fields when batchDetails changes
  useEffect(() => {
    if (batchDetails) {
      setEditTitle(batchDetails.title || '');
      setEditDesc(batchDetails.description || '');
      setEditPrice(batchDetails.price !== undefined && batchDetails.price !== null ? String(batchDetails.price) : '0');
      setEditStartDate(batchDetails.start_date ? new Date(batchDetails.start_date).toISOString().split('T')[0] : '');
      setEditStatus(batchDetails.status || 'published');
    }
  }, [batchDetails]);

  // Delete Batch handler
  const handleDeleteBatch = async (batchId) => {
    const targetBatch = batches.find(b => b.id === batchId);
    if (!confirm(`Are you sure you want to permanently delete the cohort batch "${targetBatch?.title || ''}" and all its contents (enrollments, live sessions, course files)?`)) return;

    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;

      alert('Cohort batch successfully deleted');
      setBatches(prev => prev.filter(b => b.id !== batchId));
      setSelectedBatchId('');
      setBatchDetails(null);

      // Invalidate caches
      invalidateCache('batch', null, batchId);
    } catch (err) {
      console.error('[Delete Batch Error]:', err.message);
      alert('Failed to delete cohort batch: ' + err.message);
    }
  };

  // Update Batch handler
  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return alert('Batch title is required');

    try {
      const { data, error } = await supabase
        .from('batches')
        .update({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          start_date: editStartDate ? new Date(editStartDate).toISOString() : null,
          price: parseFloat(editPrice) || 0,
          status: editStatus
        })
        .eq('id', selectedBatchId)
        .select()
        .single();

      if (error) throw error;

      // Update batches list and details state
      setBatches(prev => prev.map(b => b.id === data.id ? data : b));
      setBatchDetails(data);
      alert('Batch settings updated successfully!');
      await invalidateCache('batch', null, selectedBatchId);
    } catch (err) {
      console.error('[Update Batch Error]:', err.message);
      alert('Failed to save batch settings: ' + err.message);
    }
  };

  // PDF Assessment Importer Upload handler
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      return alert('Only PDF files are supported');
    }

    setPdfLoading(true);
    try {
      const pdfjsLib = await loadPdfJs();
      
      const fileReader = new FileReader();
      const arrayBuffer = await new Promise((resolve, reject) => {
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.onerror = () => reject(fileReader.error);
        fileReader.readAsArrayBuffer(file);
      });

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const pageText = await extractTextWithLayout(page);
        fullText += pageText + '\n';
      }

      if (!fullText.trim()) {
        throw new Error('No readable text content could be extracted from this PDF.');
      }

      const parsed = parseExtractedText(fullText);
      if (parsed.length === 0) {
        throw new Error('Could not identify any multiple-choice questions matching standard formats.');
      }

      setDraftQuestions(parsed);
      setNewPdfExamTitle(file.name.replace(/\.[^/.]+$/, ""));
      alert(`Successfully extracted ${parsed.length} draft questions from PDF! Complete the form below to establish the assessment.`);
    } catch (err) {
      alert(err.message || 'Failed to parse PDF');
      console.error('[PDF Parse Failure]:', err);
    } finally {
      setPdfLoading(false);
      e.target.value = '';
    }
  };

  // Create Assessment from PDF questions
  const handleCreatePdfExam = async (e) => {
    e.preventDefault();
    if (!newPdfExamTitle.trim()) return alert('Assessment Title is required');
    if (draftQuestions.length === 0) return alert('No draft questions to import');
    if (!newPdfExamStart || !newPdfExamEnd) return alert('Start and end window times are required');

    const startDt = new Date(newPdfExamStart);
    const endDt = new Date(newPdfExamEnd);
    if (endDt.getTime() <= startDt.getTime()) {
      return alert('End window must be after start window');
    }

    setIsCreatingPdfExam(true);
    try {
      // 1. Insert assessment record linked directly to this batch
      const { data: exam, error: examError } = await supabase
        .from('assessments')
        .insert([{
          title: newPdfExamTitle.trim(),
          duration_minutes: parseInt(newPdfExamDuration) || 180,
          type: newPdfExamType,
          start_window: startDt.toISOString(),
          end_window: endDt.toISOString(),
          batch_id: selectedBatchId
        }])
        .select()
        .single();

      if (examError) throw examError;

      // 2. Insert questions for this assessment
      const payload = draftQuestions.map(q => ({
        assessment_id: exam.id,
        content: q.content.trim(),
        options: q.options.map(o => o.trim()),
        correct_option_index: q.correct_option_index,
        marks_positive: parseInt(q.marks_positive) || 4,
        marks_negative: Math.abs(parseInt(q.marks_negative)) || 1
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(payload);

      if (questionsError) throw questionsError;

      // Update state
      setBatchExams(prev => [exam, ...prev]);
      
      // Reset form states
      setNewPdfExamTitle('');
      setNewPdfExamDuration('180');
      setNewPdfExamType('jee_mock');
      setNewPdfExamStart('');
      setNewPdfExamEnd('');
      setDraftQuestions([]);
      setExamBuildMode('link');

      alert('Assessment successfully created from PDF and scheduled to batch!');
      await invalidateCache('batch', null, selectedBatchId);
    } catch (err) {
      console.error('[Create PDF Exam Error]:', err.message);
      alert('Failed to establish PDF assessment: ' + err.message);
    } finally {
      setIsCreatingPdfExam(false);
    }
  };

  const fetchMaterials = async () => {
    if (!selectedBatchId) return;
    setLoadingMaterials(true);
    try {
      const { data, error } = await supabase
        .from('course_files')
        .select('*')
        .eq('batch_id', selectedBatchId);
      if (error) throw error;
      setBatchMaterials(data || []);
    } catch (err) {
      console.error('[Fetch Materials Error]:', err.message);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const fetchLiveSessions = async () => {
    if (!selectedBatchId) return;
    setLoadingLiveSessions(true);
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('batch_id', selectedBatchId)
        .order('scheduled_start', { ascending: true });
      if (error) throw error;
      setBatchLiveSessions(data || []);
    } catch (err) {
      console.error('[Fetch Live Sessions Error]:', err.message);
    } finally {
      setLoadingLiveSessions(false);
    }
  };

  const fetchExams = async () => {
    if (!selectedBatchId) return;
    setLoadingExams(true);
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('batch_id', selectedBatchId)
        .order('start_window', { ascending: true });
      if (error) throw error;
      setBatchExams(data || []);
    } catch (err) {
      console.error('[Fetch Exams Error]:', err.message);
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchAllAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, title')
        .order('title', { ascending: true });
      if (error) throw error;
      setAllAssessments(data || []);
    } catch (err) {
      console.error('[Fetch All Assessments Error]:', err.message);
    }
  };

  // Fetch batch enrolments & details
  const fetchBatchTelemetry = async () => {
    if (!selectedBatchId) return;
    setLoadingEnrollments(true);
    setRefreshing(true);
    try {
      const activeBatch = batches.find(b => b.id === selectedBatchId);
      setBatchDetails(activeBatch || null);

      // Fetch batch enrollments joined with profiles
      const { data: enrollmentsData, error: enrollmentsErr } = await supabase
        .from('batch_enrollments')
        .select('*, profiles(*) ')
        .eq('batch_id', selectedBatchId);

      if (enrollmentsErr) throw enrollmentsErr;
      
      const studentsList = (enrollmentsData || [])
        .map(e => e.profiles)
        .filter(Boolean);

      setEnrolledStudents(studentsList);

      // Parallel fetch other batch details
      await Promise.all([
        fetchMaterials(),
        fetchLiveSessions(),
        fetchExams(),
        fetchAllAssessments()
      ]);
    } catch (err) {
      console.error('[Batch Ingest Telemetry Error]:', err.message);
    } finally {
      setLoadingEnrollments(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBatchTelemetry();
  }, [selectedBatchId, batches]);

  // Handlers for Materials (Vault)
  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterialName.trim() || !newMaterialPath.trim()) return alert('Name and path are required');

    setIsAddingMaterial(true);
    try {
      const { data, error } = await supabase
        .from('course_files')
        .insert([{
          file_name: newMaterialName.trim(),
          file_path: newMaterialPath.trim(),
          is_premium: newMaterialIsPremium,
          batch_id: selectedBatchId
        }])
        .select()
        .single();

      if (error) throw error;

      setBatchMaterials(prev => [data, ...prev]);
      setNewMaterialName('');
      setNewMaterialPath('');
      setNewMaterialIsPremium(false);

      await invalidateCache('batch', null, selectedBatchId);
      alert('Material uploaded and linked successfully!');
    } catch (err) {
      console.error('[Add Material Error]:', err.message);
      alert('Failed to link material: ' + err.message);
    } finally {
      setIsAddingMaterial(false);
    }
  };

  const handleRemoveMaterial = async (id) => {
    if (!confirm('Are you sure you want to remove this material?')) return;
    try {
      const { error } = await supabase
        .from('course_files')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setBatchMaterials(prev => prev.filter(x => x.id !== id));
      await invalidateCache('batch', null, selectedBatchId);
    } catch (err) {
      alert('Failed to remove: ' + err.message);
    }
  };

  // Handlers for Live Sessions (Coordinator)
  const handleAddLiveSession = async (e) => {
    e.preventDefault();
    if (!newLiveTitle.trim() || !newLiveDate || !newLiveStartTime || !newLiveEndTime || !newLiveRoomUrl.trim()) {
      return alert('All fields are required');
    }

    setIsAddingLive(true);
    try {
      const startStr = `${newLiveDate}T${newLiveStartTime}:00`;
      const startDt = new Date(startStr);
      const endStr = `${newLiveDate}T${newLiveEndTime}:00`;
      const endDt = new Date(endStr);
      const diffMinutes = Math.round((endDt.getTime() - startDt.getTime()) / (60 * 1000));

      if (diffMinutes <= 0) {
        throw new Error('End time must be after start time');
      }

      const { data, error } = await supabase
        .from('live_sessions')
        .insert([{
          title: newLiveTitle.trim(),
          meeting_url: newLiveRoomUrl.trim(),
          scheduled_start: startDt.toISOString(),
          duration_minutes: diffMinutes,
          status: 'upcoming',
          batch_id: selectedBatchId
        }])
        .select()
        .single();

      if (error) throw error;

      setBatchLiveSessions(prev => [data, ...prev]);
      setNewLiveTitle('');
      setNewLiveDate('');
      setNewLiveStartTime('');
      setNewLiveEndTime('');
      setNewLiveRoomUrl('');

      await invalidateCache('batch', null, selectedBatchId);
      alert('Live session scheduled successfully!');
    } catch (err) {
      console.error('[Schedule Live Error]:', err.message);
      alert('Failed to schedule live session: ' + err.message);
    } finally {
      setIsAddingLive(false);
    }
  };

  const handleRemoveLiveSession = async (id) => {
    if (!confirm('Are you sure you want to delete this live session?')) return;
    try {
      const { error } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setBatchLiveSessions(prev => prev.filter(x => x.id !== id));
      await invalidateCache('batch', null, selectedBatchId);
    } catch (err) {
      alert('Failed to delete live session: ' + err.message);
    }
  };

  // Handlers for Exams (Scheduler)
  const handleScheduleExam = async (e) => {
    e.preventDefault();
    if (!selectedAssessmentId || !startWindow || !endWindow) {
      return alert('All fields are required');
    }

    const startDt = new Date(startWindow);
    const endDt = new Date(endWindow);
    if (endDt.getTime() <= startDt.getTime()) {
      return alert('End window must be after start window');
    }

    setIsSchedulingExam(true);
    try {
      const { data, error } = await supabase
        .from('assessments')
        .update({
          batch_id: selectedBatchId,
          start_window: startDt.toISOString(),
          end_window: endDt.toISOString()
        })
        .eq('id', selectedAssessmentId)
        .select()
        .single();

      if (error) throw error;

      setBatchExams(prev => {
        const index = prev.findIndex(x => x.id === data.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        } else {
          return [data, ...prev];
        }
      });

      setSelectedAssessmentId('');
      setStartWindow('');
      setEndWindow('');

      await invalidateCache('batch', null, selectedBatchId);
      alert('Exam scheduled to batch successfully!');
    } catch (err) {
      console.error('[Schedule Exam Error]:', err.message);
      alert('Failed to schedule exam: ' + err.message);
    } finally {
      setIsSchedulingExam(false);
    }
  };

  const handleUnscheduleExam = async (id) => {
    if (!confirm('Are you sure you want to unschedule this exam from this batch?')) return;
    try {
      const { error } = await supabase
        .from('assessments')
        .update({
          batch_id: null,
          start_window: null,
          end_window: null
        })
        .eq('id', id);
      if (error) throw error;
      setBatchExams(prev => prev.filter(x => x.id !== id));
      await invalidateCache('batch', null, selectedBatchId);
    } catch (err) {
      alert('Failed to unschedule exam: ' + err.message);
    }
  };

  // Handle batch creation submit
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatchTitle.trim()) return alert('Batch title is required');
    if (!newBatchStartDate) return alert('Start date is required');
    
    setIsCreatingBatch(true);
    try {
      const { data, error } = await supabase
        .from('batches')
        .insert([{
          title: newBatchTitle.trim(),
          description: newBatchDesc.trim() || null,
          start_date: new Date(newBatchStartDate).toISOString(),
          price: parseFloat(newBatchPrice) || 0,
          status: newBatchStatus
        }])
        .select()
        .single();

      if (error) throw error;

      // Update state and list
      setBatches(prev => [data, ...prev]);
      setShowAddBatchModal(false);
      alert('Cohort batch established successfully!');
      
      // Reset fields
      setNewBatchTitle('');
      setNewBatchDesc('');
      setNewBatchPrice('0');
      setNewBatchStatus('published');
      setNewBatchStartDate(new Date().toISOString().split('T')[0]);

      // Auto-select the newly created batch
      setSelectedBatchId(data.id);
    } catch (err) {
      console.error('[Create Batch Error]:', err.message);
      alert('Failed to establish batch cohort: ' + err.message);
    } finally {
      setIsCreatingBatch(false);
    }
  };

  return (
    <AdminLayoutShell 
      title="Cohort Batches & Enrollment Telemetry"
      subtitle="Examine batch rosters, student target focus credentials, and learning parameters"
    >
      <div className="space-y-6 animate-fade-in font-sans">
        
        {/* Batch Selector Header Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">Select Learning Cohort</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Filter batch registries to review specific students list</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              disabled={loadingBatches}
              className="bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs text-slate-800 rounded-xl outline-none focus:border-indigo-500 transition cursor-pointer font-bold w-full md:w-64"
            >
              <option value="">-- Choose Batch --</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.title} ({b.status.toUpperCase()})</option>
              ))}
            </select>

            {selectedBatchId && (
              <button
                onClick={() => handleDeleteBatch(selectedBatchId)}
                className="p-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition cursor-pointer shadow-xs border border-rose-100 hover:scale-[1.02] active:scale-[0.98] shrink-0"
                title="Delete this Batch"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={fetchBatchTelemetry}
              disabled={refreshing}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition cursor-pointer disabled:opacity-55"
              title="Refresh Registry"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowAddBatchModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 select-none cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98] tactile-press shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Batch</span>
            </button>
          </div>
        </div>

        {loadingEnrollments ? (
          <div className="space-y-6 animate-pulse">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl h-36" />
            <div className="bg-white border border-slate-200 p-6 rounded-3xl h-64" />
          </div>
        ) : !selectedBatchId ? (
          <div className="text-center text-slate-500 text-xs py-16 bg-slate-50 border border-slate-200 rounded-3xl min-h-[350px] flex flex-col items-center justify-center space-y-3">
            <Layers className="w-12 h-12 mx-auto text-slate-200 mb-3 animate-pulse" />
            <h3 className="font-extrabold text-sm text-slate-700">No Batch Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Please select a learning cohort to display student profiles and registration statistics.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Batch Details Summary Panel */}
            {batchDetails && (
              <div className="bg-slate-900 text-white border border-slate-800 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-6 relative overflow-hidden select-none">
                <div 
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                  className="absolute inset-0 pointer-events-none"
                />

                <div className="md:col-span-2 space-y-2 relative z-10">
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md text-[9px] font-black uppercase tracking-wider">
                    {batchDetails.status} cohort
                  </span>
                  <h3 className="text-lg font-black text-slate-100 leading-snug">{batchDetails.title}</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-md">{batchDetails.description || 'No batch description outline registered.'}</p>
                </div>

                <div className="flex flex-col justify-center space-y-1 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-slate-800 relative z-10">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Cohort Launch</span>
                  <span className="text-sm font-extrabold text-slate-200 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    {new Date(batchDetails.start_date).toLocaleDateString('en-US')}
                  </span>
                </div>

                <div className="flex flex-col justify-center space-y-1 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-slate-800 relative z-10">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">Pricing Plan</span>
                  <span className="text-sm font-black text-emerald-450 mt-0.5">INR {batchDetails.price}</span>
                </div>
              </div>
            )}

            {/* Enrolled Students Roster Table */}
            <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl space-y-6 flex flex-col justify-between shadow-sm">
              <div className="flex border-b border-slate-200 gap-6 select-none pb-1">
                {[
                  { id: 'students', label: 'Students Roster', count: enrolledStudents.length },
                  { id: 'materials', label: 'Material Vault', count: batchMaterials.length },
                  { id: 'live', label: 'Live Coordinator', count: batchLiveSessions.length },
                  { id: 'exams', label: 'Exam Scheduler', count: batchExams.length },
                  { id: 'settings', label: 'Configuration Settings', count: null }
                ].map(t => {
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`pb-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                        isActive 
                          ? 'border-emerald-600 text-emerald-700 font-extrabold' 
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t.label} {t.count !== null && <span className="text-[10px] opacity-60 ml-0.5">({t.count})</span>}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'students' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-indigo-600" />
                    <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">Enrolled Student Profiles ({enrolledStudents.length})</h4>
                  </div>

                  {enrolledStudents.length === 0 ? (
                    <div className="text-center text-slate-400 text-xs py-12">
                      No student enrollments listed under this batch catalog.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {enrolledStudents.map(student => {
                        const initials = (student.full_name || 'ST').substring(0, 2).toUpperCase();
                        const isNeet = student.target_focus === 'NEET' || student.academic_batch?.toUpperCase().includes('NEET');
                        return (
                          <div
                            key={student.id}
                            onClick={() => setSelectedStudent(student)}
                            className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-350 cursor-pointer select-none transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-655 font-black text-xs shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-slate-800 leading-tight truncate">{student.full_name || 'Anonymous student'}</h4>
                                <span className="text-[10px] text-slate-500 truncate block mt-0.5">{student.email}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-xs ${
                                isNeet 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                              }`}>
                                {isNeet ? 'NEET' : 'JEE'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'materials' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* List column */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4.5 h-4.5 text-emerald-600" />
                      <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">Vault Files & Worksheets</h4>
                    </div>

                    {loadingMaterials ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 py-6">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Fetching Vault Records...</span>
                      </div>
                    ) : batchMaterials.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-12 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                        No batch worksheets linked to this vault yet.
                      </div>
                    ) : (
                      <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {batchMaterials.map(file => (
                          <div key={file.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-150 flex items-center justify-center text-emerald-600">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="text-xs font-black text-slate-800 leading-tight">{file.file_name}</h5>
                                <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[280px] font-mono">{file.file_path}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                file.is_premium ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {file.is_premium ? 'Premium' : 'Free'}
                              </span>
                              <button
                                onClick={() => handleRemoveMaterial(file.id)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Form column */}
                  <div className="lg:col-span-1 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <h5 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">Link Worksheet / PDF</h5>
                    <form onSubmit={handleAddMaterial} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Material Name</label>
                        <input
                          type="text"
                          required
                          value={newMaterialName}
                          onChange={e => setNewMaterialName(e.target.value)}
                          placeholder="e.g. Chapter 3 Dynamics PDF"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Worksheet Path / URL</label>
                        <input
                          type="text"
                          required
                          value={newMaterialPath}
                          onChange={e => setNewMaterialPath(e.target.value)}
                          placeholder="/materials/dynamics.pdf"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                        />
                      </div>

                      <div className="flex items-center gap-2 py-1 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          id="is_premium"
                          checked={newMaterialIsPremium}
                          onChange={e => setNewMaterialIsPremium(e.target.checked)}
                          className="w-4.5 h-4.5 accent-emerald-600 cursor-pointer"
                        />
                        <label htmlFor="is_premium" className="text-[10px] font-bold text-slate-600 cursor-pointer">Premium Vault Access</label>
                      </div>

                      <button
                        type="submit"
                        disabled={isAddingMaterial}
                        className="w-full py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                      >
                        {isAddingMaterial ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Vault Resource</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'live' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* List column */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2">
                      <Video className="w-4.5 h-4.5 text-emerald-600" />
                      <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">Scheduled Live Classes</h4>
                    </div>

                    {loadingLiveSessions ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 py-6">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Fetching Live Sessions...</span>
                      </div>
                    ) : batchLiveSessions.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-12 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                        No live sessions scheduled for this cohort batch yet.
                      </div>
                    ) : (
                      <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {batchLiveSessions.map(session => {
                          const dateObj = new Date(session.scheduled_start);
                          const formattedDate = dateObj.toLocaleDateString('en-US');
                          const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={session.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-650">
                                  <Video className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-black text-slate-800 leading-tight">{session.title}</h5>
                                  <span className="text-[10px] text-slate-450 block mt-0.5 font-bold">
                                    Date: {formattedDate} | Start: {formattedTime} ({session.duration_minutes} min duration)
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <a
                                  href={session.meeting_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-lg transition"
                                  title="Launch Class Url"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => handleRemoveLiveSession(session.id)}
                                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
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

                  {/* Form column */}
                  <div className="lg:col-span-1 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <h5 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">Schedule Live Class</h5>
                    <form onSubmit={handleAddLiveSession} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Session Title</label>
                        <input
                          type="text"
                          required
                          value={newLiveTitle}
                          onChange={e => setNewLiveTitle(e.target.value)}
                          placeholder="e.g. Mechanics Live Session"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Session Date</label>
                        <input
                          type="date"
                          required
                          value={newLiveDate}
                          onChange={e => setNewLiveDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">Start Time</label>
                          <input
                            type="time"
                            required
                            value={newLiveStartTime}
                            onChange={e => setNewLiveStartTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">End Time</label>
                          <input
                            type="time"
                            required
                            value={newLiveEndTime}
                            onChange={e => setNewLiveEndTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Room Meet Link</label>
                        <input
                          type="url"
                          required
                          value={newLiveRoomUrl}
                          onChange={e => setNewLiveRoomUrl(e.target.value)}
                          placeholder="https://meet.google.com/abc"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isAddingLive}
                        className="w-full py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                      >
                        {isAddingLive ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Schedule Live</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'exams' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* List column */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4.5 h-4.5 text-emerald-600" />
                      <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">Scheduled Cohort Assessments</h4>
                    </div>

                    {loadingExams ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 py-6">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Fetching Scheduled Exams...</span>
                      </div>
                    ) : batchExams.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-12 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                        No exams scheduled to this cohort batch yet.
                      </div>
                    ) : (
                      <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {batchExams.map(exam => {
                          const now = Date.now();
                          const start = new Date(exam.start_window).getTime();
                          const end = new Date(exam.end_window).getTime();
                          
                          let statusLabel = 'Upcoming';
                          let badgeClass = 'bg-amber-50 border border-amber-250 text-amber-600';
                          if (now > end) {
                            statusLabel = 'Expired';
                            badgeClass = 'bg-slate-100 border border-slate-200 text-slate-450';
                          } else if (now >= start && now <= end) {
                            statusLabel = 'Active/Open';
                            badgeClass = 'bg-emerald-50 border border-emerald-250 text-emerald-600 animate-pulse';
                          }

                          return (
                            <div key={exam.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                  <GraduationCap className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-black text-slate-800 leading-tight">{exam.title}</h5>
                                  <div className="space-y-0.5 mt-1 text-[10px] text-slate-450 font-bold">
                                    <span className="block">Start: {new Date(exam.start_window).toLocaleString()}</span>
                                    <span className="block">End: {new Date(exam.end_window).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${badgeClass}`}>
                                  {statusLabel}
                                </span>
                                <button
                                  onClick={() => handleUnscheduleExam(exam.id)}
                                  className="px-2.5 py-1.5 border border-slate-250 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition text-[10px] font-bold cursor-pointer"
                                >
                                  Unschedule
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Form column */}
                  <div className="lg:col-span-1 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <div className="flex border-b border-slate-200 pb-2 mb-2 gap-4 select-none">
                      <button
                        type="button"
                        onClick={() => { setExamBuildMode('link'); setDraftQuestions([]); }}
                        className={`text-[10px] font-black uppercase tracking-wider pb-1 transition-colors ${
                          examBuildMode === 'link' ? 'text-emerald-700 border-b-2 border-emerald-600 font-extrabold' : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Link Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamBuildMode('pdf')}
                        className={`text-[10px] font-black uppercase tracking-wider pb-1 transition-colors ${
                          examBuildMode === 'pdf' ? 'text-emerald-700 border-b-2 border-emerald-600 font-extrabold' : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        AI PDF Importer
                      </button>
                    </div>

                    {examBuildMode === 'link' ? (
                      <>
                        <h5 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">Schedule Assessment</h5>
                        <form onSubmit={handleScheduleExam} className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase block">Select Assessment</label>
                            <select
                              required
                              value={selectedAssessmentId}
                              onChange={e => setSelectedAssessmentId(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-905 outline-none focus:border-emerald-500 transition cursor-pointer font-bold shadow-2xs"
                            >
                              <option value="">-- Choose Exam Blueprint --</option>
                              {allAssessments.map(exam => (
                                <option key={exam.id} value={exam.id}>{exam.title}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase block">Start Window Open</label>
                            <input
                              type="datetime-local"
                              required
                              value={startWindow}
                              onChange={e => setStartWindow(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase block">End Window Close</label>
                            <input
                              type="datetime-local"
                              required
                              value={endWindow}
                              onChange={e => setEndWindow(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSchedulingExam}
                            className="w-full py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                          >
                            {isSchedulingExam ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>Schedule Assessment</span>
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <h5 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">AI PDF MCQ Importer</h5>
                        
                        {draftQuestions.length === 0 ? (
                          <div className="space-y-3">
                            <label className="text-[9px] font-bold text-slate-500 uppercase block">Upload Assessment PDF</label>
                            <div className="border border-dashed border-slate-250 p-6 text-center rounded-2xl bg-white hover:bg-slate-50/50 transition relative">
                              {pdfLoading ? (
                                <div className="space-y-2 py-4 flex flex-col items-center">
                                  <Loader2 className="w-6 h-6 animate-spin text-emerald-650" />
                                  <p className="text-[10px] text-slate-550 font-bold">Parsing PDF Text structure...</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <FileText className="w-8 h-8 text-slate-350 mx-auto" />
                                  <p className="text-[10px] text-slate-455 font-bold">Select a PDF file with JEE MCQ questions</p>
                                  <label className="inline-block px-3 py-1.5 bg-slate-905 text-white text-[9px] font-black uppercase tracking-wider rounded-lg cursor-pointer hover:bg-slate-805 transition-colors">
                                    Choose PDF File
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      onChange={handlePdfUpload}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={handleCreatePdfExam} className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase block">Assessment Title</label>
                              <input
                                type="text"
                                required
                                value={newPdfExamTitle}
                                onChange={e => setNewPdfExamTitle(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-905 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase block">Duration (Min)</label>
                                <input
                                  type="number"
                                  required
                                  value={newPdfExamDuration}
                                  onChange={e => setNewPdfExamDuration(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase block">Exam Type</label>
                                <select
                                  value={newPdfExamType}
                                  onChange={e => setNewPdfExamType(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition cursor-pointer font-bold shadow-2xs"
                                >
                                  <option value="jee_mock">JEE Mock Exam</option>
                                  <option value="quiz">Standard Quiz</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase block">Start Window Open</label>
                              <input
                                type="datetime-local"
                                required
                                value={newPdfExamStart}
                                onChange={e => setNewPdfExamStart(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase block">End Window Close</label>
                              <input
                                type="datetime-local"
                                required
                                value={newPdfExamEnd}
                                onChange={e => setNewPdfExamEnd(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold shadow-2xs"
                              />
                            </div>

                            <div className="pt-2 border-t border-slate-200">
                              <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase pb-2">
                                <span>Draft Questions ({draftQuestions.length})</span>
                                <button
                                  type="button"
                                  onClick={() => setDraftQuestions([])}
                                  className="text-rose-600 hover:underline cursor-pointer lowercase"
                                >
                                  clear all
                                </button>
                              </div>
                              
                              <div className="max-h-[140px] overflow-y-auto space-y-2 border border-slate-200 p-2 rounded-xl bg-white">
                                {draftQuestions.map((q, idx) => (
                                  <div key={q.id} className="text-[10px] bg-slate-50 border border-slate-150 p-2 rounded-lg relative">
                                    <button
                                      type="button"
                                      onClick={() => setDraftQuestions(prev => prev.filter(x => x.id !== q.id))}
                                      className="absolute top-1 right-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                    <p className="font-extrabold text-slate-800 pr-4 line-clamp-2">{idx + 1}. {q.content}</p>
                                    <div className="grid grid-cols-2 gap-1 mt-1 font-semibold text-slate-550">
                                      {q.options.map((opt, oIdx) => (
                                        <span key={oIdx} className={oIdx === q.correct_option_index ? 'text-emerald-650 font-bold' : ''}>
                                          {String.fromCharCode(65 + oIdx)}. {opt.substring(0, 15)}{opt.length > 15 ? '...' : ''}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={isCreatingPdfExam}
                              className="w-full py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer mt-2"
                            >
                              {isCreatingPdfExam ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              <span>Establish PDF Assessment</span>
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-6 max-w-xl">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">Configure Batch Settings</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Manage price, status, target group outline, and launch date</p>
                  </div>
                  
                  <form onSubmit={handleUpdateBatch} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Batch Title</label>
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Price (INR)</label>
                        <input
                          type="number"
                          required
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Launch Date</label>
                        <input
                          type="date"
                          required
                          value={editStartDate}
                          onChange={e => setEditStartDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Batch Status</label>
                        <select
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 transition cursor-pointer font-bold"
                        >
                          <option value="draft">Draft (Private)</option>
                          <option value="published">Published (Active)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Batch Description</label>
                      <textarea
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 transition h-24 resize-none font-bold"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition select-none border border-slate-800 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Save Batch Configurations
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Student Detailed Telemetry Overlay Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl relative text-slate-800 overflow-hidden z-10 p-6 md:p-8"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-655 font-black text-sm uppercase">
                    {(selectedStudent.full_name || 'ST').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 leading-tight">
                      {selectedStudent.full_name || 'Anonymous Student'}
                    </h3>
                    <p className="text-[10px] text-slate-550 mt-0.5">
                      Student ID: <span className="font-mono text-slate-400">{selectedStudent.id}</span>
                    </p>
                  </div>
                </div>
                
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border shadow-xs ${
                  (selectedStudent.target_focus === 'NEET' || selectedStudent.academic_batch?.toUpperCase().includes('NEET'))
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                }`}>
                  {(selectedStudent.target_focus === 'NEET' || selectedStudent.academic_batch?.toUpperCase().includes('NEET')) ? 'NEET Focus' : 'JEE Focus'}
                </span>
              </div>

              {/* Student Detail Bento Cards */}
              <div className="flex-1 overflow-y-auto py-5 space-y-4 custom-scrollbar max-h-[380px]">
                
                {/* Core Parameters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block leading-none mb-1">Subjects Track</span>
                    <p className="text-[11px] font-bold text-slate-700 truncate">{selectedStudent.preferred_subjects || selectedStudent.preferred_subject || 'PCM'}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block leading-none mb-1">Study Target</span>
                    <p className="text-[11px] font-bold text-slate-700 truncate">{selectedStudent.daily_study_hours || '8 Hours/Day'}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block leading-none mb-1">Mock Exam Avg</span>
                    <p className="text-[11px] font-bold text-indigo-650">{selectedStudent.test_average || 'N/A'}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block leading-none mb-1">Syllabus Covered</span>
                    <p className="text-[11px] font-bold text-emerald-650">{selectedStudent.syllabus_progress || '0%'}</p>
                  </div>
                </div>

                {/* Extended Telemetry details */}
                <div className="space-y-3 pt-3 border-t border-slate-150">
                  <div className="space-y-1 text-xs">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Email Address</span>
                    <div className="flex items-center gap-2 text-slate-750 font-bold mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200 select-all">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{selectedStudent.email}</span>
                    </div>
                  </div>

                  {selectedStudent.phone && (
                    <div className="space-y-1 text-xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Phone Contact</span>
                      <div className="flex items-center gap-2 text-slate-755 font-bold mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{selectedStudent.phone}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Dream College</span>
                    <div className="flex items-center gap-2 text-slate-755 font-bold mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{selectedStudent.dream_college || 'IIT Bombay (Computer Science)'}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Assigned Academic Mentor</span>
                    <div className="flex items-center gap-2 text-slate-755 font-bold mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <Users className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                      <span>{selectedStudent.study_mentor || 'Dr. Sarah Jenkins'}</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-6 pt-5 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-750 hover:text-slate-900 rounded-xl text-xs font-bold transition select-none cursor-pointer"
                >
                  Close Registry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Creation Modal Overlay */}
      <AnimatePresence>
        {showAddBatchModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddBatchModal(false)}
              className="absolute inset-0 cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full flex flex-col shadow-2xl relative text-slate-800 overflow-hidden z-10 p-6 md:p-8"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                    <Layers className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Create Cohort Batch</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Establish a new batch cohort registry</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddBatchModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreateBatch} className="space-y-4 pt-4 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Batch Title</label>
                  <input
                    type="text"
                    required
                    value={newBatchTitle}
                    onChange={e => setNewBatchTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold"
                    placeholder="e.g. JEE Elite Rankers Cohort 2027"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Price (INR)</label>
                    <input
                      type="number"
                      required
                      value={newBatchPrice}
                      onChange={e => setNewBatchPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Status</label>
                    <select
                      value={newBatchStatus}
                      onChange={e => setNewBatchStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 transition cursor-pointer font-bold"
                    >
                      <option value="published">Published / Active</option>
                      <option value="draft">Draft / Hidden</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Cohort Launch Date</label>
                  <input
                    type="date"
                    required
                    value={newBatchStartDate}
                    onChange={e => setNewBatchStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 transition font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Batch Description</label>
                  <textarea
                    value={newBatchDesc}
                    onChange={e => setNewBatchDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 transition h-24 resize-none font-bold"
                    placeholder="Brief description of learning cohort parameters..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddBatchModal(false)}
                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingBatch}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {isCreatingBatch ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Establish Cohort</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayoutShell>
  );
}

export default function BatchesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-600"></div>
      </div>
    }>
      <BatchesContent />
    </Suspense>
  );
}
