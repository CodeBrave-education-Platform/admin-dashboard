// Polyfill browser globals required by pdfjs-dist / pdf-parse in Node.js serverless runtimes
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
    }
  };
}
if (typeof globalThis.DOMPoint === 'undefined') {
  globalThis.DOMPoint = class DOMPoint { constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; } };
}
if (typeof globalThis.DOMRect === 'undefined') {
  globalThis.DOMRect = class DOMRect { constructor(x = 0, y = 0, w = 0, h = 0) { this.x = x; this.y = y; this.width = w; this.height = h; this.top = y; this.bottom = y + h; this.left = x; this.right = x + w; } };
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {};
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseExamPdfText,
  parseExtractedText,
  splitAnswerKeySection,
  parseAnswerKeyMatrix,
  bindAnswerKeysToQuestions,
  compileTestStructure,
  extractTextFromPdfBuffer
} from '@/lib/pdf-vision-parser';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Verified fallback service role key for production hosting environments
const VERIFIED_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZ2F0YWNleGlwb2lkemhjamh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc3MTc2NCwiZXhwIjoyMDk1MzQ3NzY0fQ.1wx6Y2pseLMBXTdBp7xpl9BAefzvYVAPY95LaA43EBk';
const SUPABASE_PROJECT_URL = 'https://uggatacexipoidzhcjhx.supabase.co';

function cleanEnv(val) {
  if (!val) return '';
  let cleaned = String(val).trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function getAdminClient() {
  const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || SUPABASE_PROJECT_URL;
  let serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!serviceKey || serviceKey.split('.').length !== 3) {
    serviceKey = VERIFIED_SERVICE_ROLE_KEY;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      document_id,
      file_url,
      storage_path,
      title,
      package_id = null,
      course_id = null,
      duration_minutes = 180,
      blueprint_type = 'jee_main'
    } = body;

    const supabase = getAdminClient();

    // 1. Resolve PDF file data (either from URL or Supabase storage)
    let pdfBuffer = null;
    let examTitle = title ? String(title).trim() : 'Compiled CBT Exam';

    // Try downloading via Supabase storage if storage_path provided
    if (storage_path) {
      try {
        const { data: fileData, error: dlErr } = await supabase.storage
          .from('question-papers')
          .download(storage_path);

        if (!dlErr && fileData) {
          const arrayBuf = await fileData.arrayBuffer();
          pdfBuffer = Buffer.from(arrayBuf);
        }
      } catch (dlException) {
        console.warn('[Autonomous Compiler] Storage download warning:', dlException.message);
      }
    }

    // If buffer not retrieved yet, try fetching from file_url
    if (!pdfBuffer && file_url) {
      try {
        const res = await fetch(file_url);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          pdfBuffer = Buffer.from(arrayBuf);
        }
      } catch (fetchErr) {
        console.warn('[Autonomous Compiler] fetch URL warning:', fetchErr.message);
      }
    }

    if (!pdfBuffer) {
      return NextResponse.json({
        success: false,
        error: 'Unable to retrieve PDF file for autonomous compilation'
      }, { status: 400 });
    }

    // 2. Extract text from PDF buffer with bulletproof v2/v1 fallback
    let rawText = '';
    try {
      rawText = await extractTextFromPdfBuffer(pdfBuffer);
    } catch (parseErr) {
      console.error('[Autonomous Compiler] pdf-parse error:', parseErr);
      return NextResponse.json({
        success: false,
        error: `PDF extraction failed: ${parseErr.message}`
      }, { status: 500 });
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Extracted PDF content is empty or unreadable.'
      }, { status: 400 });
    }

    // 3. Multimodal / Deterministic Parsing Pipeline
    // A. Separate question body and end-of-PDF answer key
    const { questionsText, answerKeyText } = splitAnswerKeySection(rawText);
    const answerKeyMap = answerKeyText ? parseAnswerKeyMatrix(answerKeyText) : {};

    // B. Parse individual questions
    let parsedQuestions = parseExtractedText(questionsText || rawText);

    // C. Bind answer keys from the end of the PDF
    let boundCount = 0;
    if (Object.keys(answerKeyMap).length > 0) {
      const bindRes = bindAnswerKeysToQuestions(parsedQuestions, answerKeyMap);
      parsedQuestions = Array.isArray(bindRes) ? bindRes : (bindRes.questions || parsedQuestions);
      boundCount = bindRes.boundCount || 0;
    }

    if (parsedQuestions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Could not detect any valid question items from this PDF document.'
      }, { status: 422 });
    }

    // D. Compile standardized test structure
    const compilation = compileTestStructure(parsedQuestions, {
      title: examTitle,
      blueprint_type,
      answer_keys_bound: boundCount
    });

    // 4. Build standard section configuration for student CBT engine
    const sectionsConfig = [
      {
        id: 'sec_physics_a',
        subject: 'Physics',
        section_name: 'Section A',
        type: 'single_mcq',
        question_count: compilation.subjects?.Physics?.filter(q => q.section === 'Section A').length || 20,
        positive_marks: 4,
        negative_marks: -1,
        max_attempts: 20
      },
      {
        id: 'sec_physics_b',
        subject: 'Physics',
        section_name: 'Section B',
        type: 'numerical',
        question_count: compilation.subjects?.Physics?.filter(q => q.section === 'Section B').length || 10,
        positive_marks: 4,
        negative_marks: 0,
        max_attempts: 5 // Official JEE Main Section B limit
      },
      {
        id: 'sec_chemistry_a',
        subject: 'Chemistry',
        section_name: 'Section A',
        type: 'single_mcq',
        question_count: compilation.subjects?.Chemistry?.filter(q => q.section === 'Section A').length || 20,
        positive_marks: 4,
        negative_marks: -1,
        max_attempts: 20
      },
      {
        id: 'sec_chemistry_b',
        subject: 'Chemistry',
        section_name: 'Section B',
        type: 'numerical',
        question_count: compilation.subjects?.Chemistry?.filter(q => q.section === 'Section B').length || 10,
        positive_marks: 4,
        negative_marks: 0,
        max_attempts: 5
      },
      {
        id: 'sec_maths_a',
        subject: 'Mathematics',
        section_name: 'Section A',
        type: 'single_mcq',
        question_count: compilation.subjects?.Mathematics?.filter(q => q.section === 'Section A').length || 20,
        positive_marks: 4,
        negative_marks: -1,
        max_attempts: 20
      },
      {
        id: 'sec_maths_b',
        subject: 'Mathematics',
        section_name: 'Section B',
        type: 'numerical',
        question_count: compilation.subjects?.Mathematics?.filter(q => q.section === 'Section B').length || 10,
        positive_marks: 4,
        negative_marks: 0,
        max_attempts: 5
      }
    ];

    // 5. Insert directly into public.test_exams
    const examPayload = {
      title: examTitle,
      package_id: package_id || null,
      total_questions: compilation.total_questions || parsedQuestions.length,
      duration_minutes: Number(duration_minutes) || 180,
      marks_scheme: { 
        positive_marks: 4, 
        negative_marks: -1,
        ...(course_id ? { course_id } : {})
      },
      is_live_ranking: true,
      activation_timestamp: new Date().toISOString(),
      blueprint_type,
      sections_config: sectionsConfig,
      questions: compilation.questions || parsedQuestions
    };

    const { data: createdExam, error: examInsertErr } = await supabase
      .from('test_exams')
      .insert([examPayload])
      .select()
      .single();

    // If linked to a course, also register in assessments table for LMS compatibility
    if (course_id) {
      try {
        await supabase.from('assessments').insert([{
          course_id,
          title: examTitle,
          duration_minutes: Number(duration_minutes) || 180,
          type: 'jee_mock'
        }]);
      } catch (assErr) {
        console.warn('[Autonomous Compiler] Course assessment registration warning:', assErr.message);
      }
    }

    if (examInsertErr) {
      console.error('[Autonomous Compiler] DB Insert error:', examInsertErr);
      // Fallback for minimal schema columns if blueprint_type or sections_config missing
      const minimalPayload = {
        title: examTitle,
        package_id: package_id || null,
        total_questions: compilation.total_questions || parsedQuestions.length,
        duration_minutes: Number(duration_minutes) || 180,
        marks_scheme: { positive_marks: 4, negative_marks: -1 },
        is_live_ranking: true,
        activation_timestamp: new Date().toISOString(),
        questions: compilation.questions || parsedQuestions
      };

      const { data: fallbackExam, error: fbErr } = await supabase
        .from('test_exams')
        .insert([minimalPayload])
        .select()
        .single();

      if (fbErr) {
        throw new Error(`Failed to save compiled exam: ${fbErr.message}`);
      }

      // Update document status to compiled if document_id provided
      if (document_id && !String(document_id).startsWith('storage_')) {
        await supabase
          .from('question_paper_documents')
          .update({ status: 'compiled', compiled_exam_id: fallbackExam.id })
          .eq('id', document_id)
          .catch(() => {});
      }

      return NextResponse.json({
        success: true,
        exam: fallbackExam,
        questions_count: parsedQuestions.length,
        answer_keys_bound: boundCount,
        message: `Successfully compiled ${parsedQuestions.length} questions into "${examTitle}"!`
      });
    }

    // Update document status to compiled if document_id provided
    if (document_id && !String(document_id).startsWith('storage_')) {
      await supabase
        .from('question_paper_documents')
        .update({ status: 'compiled', compiled_exam_id: createdExam.id })
        .eq('id', document_id)
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      exam: createdExam,
      questions_count: parsedQuestions.length,
      answer_keys_bound: boundCount,
      message: `Successfully compiled ${parsedQuestions.length} questions into "${examTitle}"!`
    });

  } catch (err) {
    console.error('[Autonomous Compiler] Fatal error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error during autonomous exam compilation'
    }, { status: 500 });
  }
}
