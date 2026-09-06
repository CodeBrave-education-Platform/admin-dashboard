import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  GEMINI_SYSTEM_INSTRUCTION,
  cleanExtractedText,
  detectSubjectOrSectionHeader,
  scoreStemSubject,
  parseQuestionBlock,
  parseExtractedText,
  parseTextToQuestions,
  parseExamPdfText,
  splitAnswerKeySection,
  parseAnswerKeyMatrix,
  bindAnswerKeysToQuestions,
  segmentQuestionsBySubject,
  groupQuestionsBySubject,
  compileTestStructure,
  extractTextFromPdfBuffer
} from '@/lib/pdf-vision-parser';

// Re-export parser functions for test suites and dependent modules
export {
  GEMINI_SYSTEM_INSTRUCTION,
  cleanExtractedText,
  detectSubjectOrSectionHeader,
  scoreStemSubject,
  parseQuestionBlock,
  parseExtractedText,
  parseTextToQuestions,
  parseExamPdfText,
  splitAnswerKeySection,
  parseAnswerKeyMatrix,
  bindAnswerKeysToQuestions,
  segmentQuestionsBySubject,
  groupQuestionsBySubject,
  compileTestStructure
};

// Next.js Node environment polyfills for pdf-parse (pdf.js dependency)
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

export const maxDuration = 60; // Allow 60 seconds for execution

/**
 * Legacy compatibility alias for detectSubject
 */
export function detectSubject(content, explanation = '', optionsText = '') {
  const scores = scoreStemSubject(content, explanation, optionsText);
  let best = 'General';
  let max = 0;
  for (const [subj, score] of Object.entries(scores)) {
    if (score > max) {
      max = score;
      best = subj;
    }
  }
  return max === 0 ? 'Mathematics' : best;
}

/**
 * Sanitize and validate raw question objects returned by Gemini AI or OCR engines
 */
export function sanitizeGeminiQuestions(rawQuestions = []) {
  if (!Array.isArray(rawQuestions)) return [];

  const sanitized = rawQuestions.map((q, idx) => {
    const qNum = q.question_number != null ? Number(q.question_number) : (idx + 1);
    const id = q.id || `pdf-q-${qNum}-${Date.now()}`;
    const content = q.content || q.questionText || q.question || '';

    let formatType = q.formatType || 'single_mcq';
    if (formatType === 'single') formatType = 'single_mcq';
    else if (formatType === 'multiple' || formatType === 'multi') formatType = 'multi_mcq';
    else if (formatType === 'integer') formatType = 'numerical';
    else if (formatType === 'match' || formatType === 'matrix') formatType = 'matrix_match';
    else if (formatType === 'assertion') formatType = 'assertion_reason';
    if (!['single_mcq', 'multi_mcq', 'numerical', 'assertion_reason', 'matrix_match'].includes(formatType)) {
      formatType = 'single_mcq';
    }

    let options = Array.isArray(q.options) ? q.options.map(o => String(o != null ? o : '').trim()) : [];
    if (formatType === 'numerical') {
      options = [];
    } else {
      options = options.map(opt => opt.replace(/^[\(\[]?\s*[A-Da-d1-4]\s*[\)\]\.\-\:]\s+/, '').trim());
      while (options.length < 4) {
        options.push(`Option ${String.fromCharCode(65 + options.length)}`);
      }
      if (options.length > 4 && formatType !== 'multi_mcq') {
        options = options.slice(0, 4);
      }
    }

    let correctOptionIndex = 0;
    if (typeof q.correct_option_index === 'number' && q.correct_option_index >= 0) {
      correctOptionIndex = q.correct_option_index;
    } else if (typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0) {
      correctOptionIndex = q.correctOptionIndex;
    } else if (typeof q.correct_answer === 'string' && options.length > 0) {
      const foundIdx = options.findIndex(o => o.toLowerCase() === q.correct_answer.toLowerCase());
      if (foundIdx !== -1) correctOptionIndex = foundIdx;
    }

    let correctAnswer = q.correct_answer || q.correctAnswer || '';
    if (!correctAnswer && options.length > 0 && options[correctOptionIndex] !== undefined) {
      correctAnswer = options[correctOptionIndex];
    }

    // MSQ correct options array
    let correctOptions = Array.isArray(q.correct_options) ? q.correct_options : (Array.isArray(q.correctOptionsMultiple) ? q.correctOptionsMultiple : []);
    if (formatType === 'multi_mcq' && correctOptions.length === 0) {
      correctOptions = [correctOptionIndex];
    }

    const explanation = q.explanation || q.solution || q.solution_explanation || '';
    const subject = q.subject || detectSubject(content, explanation, options.join(' ')) || 'General';
    const section = q.section || (formatType === 'numerical' ? 'Section B' : 'Section A');
    const subTopic = q.sub_topic || q.subTopic || q.topic || 'General';

    let difficulty = String(q.difficulty || 'MEDIUM').toUpperCase();
    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      difficulty = 'MEDIUM';
    }

    const hasDiagram = Boolean(q.has_diagram || q.diagram_box_2d || q.diagram_url);
    const diagramBox2d = Array.isArray(q.diagram_box_2d) && q.diagram_box_2d.length >= 4 ? q.diagram_box_2d : null;
    const diagramUrl = q.diagram_url || q.diagramUrl || '';
    const diagramCaption = q.diagram_caption || '';

    const defaultMarks = formatType === 'numerical'
      ? { positive: 4, negative: 0 }
      : (formatType === 'multi_mcq' ? { positive: 4, negative: -2 } : { positive: 4, negative: -1 });

    const marks = q.marks && typeof q.marks === 'object' ? {
      positive: typeof q.marks.positive === 'number' ? q.marks.positive : defaultMarks.positive,
      negative: typeof q.marks.negative === 'number' ? q.marks.negative : defaultMarks.negative
    } : defaultMarks;

    return {
      id,
      question_number: qNum,
      subject,
      section,
      sub_topic: subTopic,
      difficulty,
      formatType,
      questionType: formatType === 'numerical' ? 'integer' : (formatType === 'multi_mcq' ? 'multiple' : (formatType === 'matrix_match' ? 'match' : 'single')),
      content,
      has_diagram: hasDiagram,
      diagram_box_2d: diagramBox2d,
      diagram_caption: diagramCaption,
      diagram_url: diagramUrl,
      image_url: diagramUrl,
      diagramUrl,
      imageUrl: diagramUrl,
      options,
      correct_option_index: correctOptionIndex,
      correctOptionIdx: correctOptionIndex,
      correct_options: correctOptions,
      correctOptions: correctOptions,
      correctOptionsMultiple: correctOptions,
      correct_answer: correctAnswer,
      correctAnswer,
      integerAnswer: formatType === 'numerical' ? correctAnswer : '',
      integer_answer: formatType === 'numerical' ? correctAnswer : '',
      matrixMatchAnswer: formatType === 'matrix_match' ? correctAnswer : '',
      matrix_match_answer: formatType === 'matrix_match' ? correctAnswer : '',
      explanation,
      marks
    };
  });

  return segmentQuestionsBySubject(sanitized);
}

// ═══════════════════════════════════════════════════════════════
// NEXT.JS API ROUTE HANDLER (POST)
// ═══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    // Prevent OOM crashes by rejecting oversized payloads (> 5MB)
    const contentLength = request.headers ? parseInt(request.headers.get('content-length') || '0', 10) : 0;
    if (contentLength > 5 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: 'Payload Too Large: File exceeds the 5MB strict backend limit. Please compress the PDF and try again.'
      }, { status: 413 });
    }

    let rawText = '';
    let pdfBase64 = '';
    let fileName = '';
    let parserType = 'unstructured_pdf';
    let title = 'JEE Main Assessment';
    let blueprintType = 'jee_main';

    const contentType = request.headers ? (request.headers.get('content-type') || '') : '';
    if (contentType.includes('application/json')) {
      const jsonBody = await request.json();
      rawText = jsonBody.rawText || jsonBody.text || '';
      pdfBase64 = jsonBody.pdfBase64 || jsonBody.base64Pdf || jsonBody.fileBase64 || jsonBody.pdf_base64 || jsonBody.base64 || '';
      fileName = jsonBody.fileName || '';
      parserType = jsonBody.parserType || 'unstructured_pdf';
      title = jsonBody.title || fileName.replace(/\.pdf$/i, '') || title;
      blueprintType = jsonBody.blueprint_type || blueprintType;
    } else if (typeof request.formData === 'function') {
      try {
        const formData = await request.formData();
        rawText = formData.get('rawText') || formData.get('text') || '';
        pdfBase64 = formData.get('pdfBase64') || formData.get('base64Pdf') || formData.get('fileBase64') || formData.get('pdf_base64') || formData.get('base64') || '';
        fileName = formData.get('fileName') || '';
        parserType = formData.get('parserType') || 'unstructured_pdf';
        title = formData.get('title') || fileName.replace(/\.pdf$/i, '') || title;
        blueprintType = formData.get('blueprint_type') || blueprintType;

        const fileField = formData.get('file') || formData.get('pdf');
        if (!pdfBase64 && fileField && typeof fileField.arrayBuffer === 'function') {
          const buffer = await fileField.arrayBuffer();
          pdfBase64 = Buffer.from(buffer).toString('base64');
          if (!fileName && fileField.name) fileName = fileField.name;
        }
      } catch (_formErr) {
        // FormData extraction fallback
      }
    }

    let cleanBase64 = typeof pdfBase64 === 'string' ? pdfBase64.trim() : '';
    if (cleanBase64.startsWith('data:')) {
      cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '').trim();
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;

    // ─────────────────────────────────────────────────────────────
    // PATH 1: Multimodal Gemini AI PDF Extraction (@google/genai)
    // ─────────────────────────────────────────────────────────────
    if (cleanBase64) {
      if (!apiKey) {
        // Fallback to pdf-parse + deterministic regex if API key is missing
        let textToUse = rawText && rawText.trim() ? rawText : '';
        if (!textToUse && cleanBase64) {
          try {
            const pdfBuffer = Buffer.from(cleanBase64, 'base64');
            textToUse = await extractTextFromPdfBuffer(pdfBuffer);
          } catch (pdfErr) {
            console.warn('[Parse-PDF] pdf extraction fallback warning:', pdfErr.message);
          }
        }

        if (textToUse && textToUse.trim()) {
          const fallbackQuestions = parseExtractedText(textToUse);
          const compilation = compileTestStructure(fallbackQuestions, {
            title,
            blueprint_type: blueprintType,
            answer_keys_bound: fallbackQuestions.filter(q => q.correct_answer || q.correct_option_index >= 0).length
          });

          return NextResponse.json({
            success: true,
            parserType: 'deterministic_engine',
            ...compilation,
            questions_count: fallbackQuestions.length,
            warning: 'GEMINI_API_KEY is not configured. Extracted document using deterministic regex parser.'
          });
        }

        return NextResponse.json({
          success: false,
          error: 'GEMINI_API_KEY is not configured on the server, and text could not be extracted from the PDF.'
        }, { status: 400 });
      }

      try {
        const GenAIClient = typeof GoogleGenAI !== 'undefined' ? GoogleGenAI : (require('@google/genai').GoogleGenAI);
        const ai = new GenAIClient({ apiKey });

        let response = null;
        let successfulModel = '';
        let lastError = null;
        const modelsToTry = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
        
        for (const modelName of modelsToTry) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: cleanBase64
                  }
                },
                {
                  text: 'Extract all questions, detect section/subject boundaries (Physics, Chemistry, Mathematics), extract diagram bounding boxes [ymin, xmin, ymax, xmax], and parse any end-of-PDF answer key matrix into structured JSON.'
                }
              ],
              config: {
                responseMimeType: 'application/json',
                systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
                temperature: 0.1
              }
            });
            successfulModel = modelName;
            break;
          } catch (err) {
            console.warn(`[Gemini Route] Model ${modelName} failed: ${err.message}. Trying next fallback...`);
            lastError = err;
          }
        }

        if (!response) {
          throw new Error(`All Gemini fallback models failed. Last error: ${lastError?.message || 'Unknown'}`);
        }

        let responseText = response.text || '';
        if (!responseText && response.candidates && response.candidates[0] && response.candidates[0].content) {
          const parts = response.candidates[0].content.parts || [];
          responseText = parts.map(p => p.text || '').join('');
        }

        let cleanedJson = responseText.trim();
        if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

        cleanedJson = cleanedJson.replace(/(?<!\\)\\(?!["\\nr]|u[0-9a-fA-F]{4})/g, '\\\\');

        let parsedData = {};
        try {
          parsedData = JSON.parse(cleanedJson);
        } catch (parseErr) {
          throw new Error(`Failed to parse Gemini JSON output: ${parseErr.message}`);
        }

        let extractedList = [];
        if (Array.isArray(parsedData)) {
          extractedList = parsedData;
        } else if (parsedData && Array.isArray(parsedData.questions)) {
          extractedList = parsedData.questions;
        } else if (parsedData && Array.isArray(parsedData.data)) {
          extractedList = parsedData.data;
        }

        let formattedQuestions = sanitizeGeminiQuestions(extractedList);

        // Bind answer key matrix if detected in Gemini output
        let keysBound = 0;
        if (parsedData.answer_key_map && Object.keys(parsedData.answer_key_map).length > 0) {
          const bindRes = bindAnswerKeysToQuestions(formattedQuestions, parsedData.answer_key_map);
          formattedQuestions = bindRes.questions;
          keysBound = bindRes.boundCount;
        }

        const compilation = compileTestStructure(formattedQuestions, {
          title,
          blueprint_type: blueprintType,
          diagrams_extracted: formattedQuestions.filter(q => q.has_diagram).length,
          answer_keys_bound: keysBound || formattedQuestions.filter(q => q.correct_answer).length
        });

        return NextResponse.json({
          success: true,
          parserType: 'gemini_ai_multimodal',
          model: successfulModel,
          ...compilation,
          questions_count: formattedQuestions.length
        });
      } catch (aiError) {
        console.error('[Gemini Route] AI generation error:', aiError);

        // Fallback to deterministic regex if Gemini fails
        let fallbackText = rawText && rawText.trim() ? rawText : '';
        if (!fallbackText && cleanBase64) {
          try {
            const pdfParse = (await import('pdf-parse')).default || (await import('pdf-parse'));
            const pdfBuffer = Buffer.from(cleanBase64, 'base64');
            const parsedPdf = await pdfParse(pdfBuffer);
            if (parsedPdf && parsedPdf.text) {
              fallbackText = parsedPdf.text;
            }
          } catch (pdfErr) {
            console.warn('[Parse-PDF] pdf-parse fallback in catch warning:', pdfErr.message);
          }
        }

        if (fallbackText && fallbackText.trim()) {
          const fallbackQuestions = parseExtractedText(fallbackText);
          const compilation = compileTestStructure(fallbackQuestions, {
            title,
            blueprint_type: blueprintType,
            answer_keys_bound: fallbackQuestions.filter(q => q.correct_answer || q.correct_option_index >= 0).length
          });

          return NextResponse.json({
            success: true,
            parserType: 'deterministic_engine',
            ...compilation,
            questions_count: fallbackQuestions.length,
            warning: `Gemini parsing failed (${aiError.message}). Fell back to deterministic regex parser.`
          });
        }

        return NextResponse.json({
          success: false,
          error: `Gemini AI PDF parsing failed: ${aiError.message || aiError}`
        }, { status: 500 });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // PATH 2: Deterministic Regex Parser Execution (Fallback / Direct Text)
    // ─────────────────────────────────────────────────────────────
    const textToParse = rawText || '';
    if (textToParse.trim()) {
      const realParsed = parseExtractedText(textToParse);
      const compilation = compileTestStructure(realParsed, {
        title,
        blueprint_type: blueprintType,
        answer_keys_bound: realParsed.filter(q => q.correct_answer || q.correct_option_index >= 0).length
      });

      return NextResponse.json({
        success: true,
        parserType: parserType === 'structured_table' ? 'structured_table' : 'deterministic_engine',
        ...compilation,
        questions_count: realParsed.length
      });
    }

    return NextResponse.json({
      success: true,
      parserType: 'deterministic_engine',
      title,
      blueprint_type: blueprintType,
      subjects: { Physics: [], Chemistry: [], Mathematics: [] },
      total_questions: 0,
      questions_count: 0,
      diagrams_extracted: 0,
      answer_keys_bound: 0,
      questions: [],
      warning: 'No questions could be extracted. Please paste question text or upload a PDF document.'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export default POST;
