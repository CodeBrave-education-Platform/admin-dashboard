import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Next.js Node environment polyfills for pdf-parse (pdf.js dependency)
if (typeof globalThis.DOMMatrix === 'undefined') globalThis.DOMMatrix = class DOMMatrix {};
if (typeof globalThis.ImageData === 'undefined') globalThis.ImageData = class ImageData {};
if (typeof globalThis.Path2D === 'undefined') globalThis.Path2D = class Path2D {};

export const maxDuration = 60; // Allow 60 seconds for Vercel execution

const GEMINI_SYSTEM_INSTRUCTION = `You are an elite exam paper digitizer and parser for STEM competitive exams (JEE Main, JEE Advanced, NEET, CBSE, and Olympiads).
Your task is to analyze the uploaded image of a single PDF page and extract EVERY single question with extreme precision into a structured JSON array.

### EXTRACTION GUIDELINES:
1. Question Types (formatType):
   - "single_mcq": Standard single-choice MCQ with exactly 4 options.
   - "multi_mcq": Multi-choice question with one or more correct options.
   - "numerical": Integer or decimal answer question without multiple-choice options (options must be an empty array []).
   - "assertion_reason": Assertion-Reason questions with Assertion (A) and Reason (R) statements.
   - "matrix_match": Column matching questions (Column I A-D matching Column II P-S).

2. STEM Content & LaTeX Formulas:
   - Preserve all mathematical formulas, symbols, indices, and chemical equations using valid LaTeX notation.
   - CRITICAL: You MUST double-escape all LaTeX backslashes (e.g. \\\\frac, \\\\mu, \\\\sin) so the output remains valid JSON.
   - Use '$...$' for inline math/chemistry (e.g. '$v_0$', '$[Ni(CN)_4]^{2-}$', '$\\\\theta$') and '$$...$$' for standalone block equations.
   - Maintain chemical bracket notations (e.g. '[Ni(CN)4]2-') and signed numbers (e.g. '-5', '-1').

3. Options Array:
   - For 'single_mcq', 'multi_mcq', 'assertion_reason', 'matrix_match': MUST contain exactly 4 clean option strings without leading prefixes like '(A)', '(B)', 'A.', '1.', etc.
   - For 'numerical': MUST be an empty array [].

4. Answer Key & Indices:
   - "correct_option_index": 0-based integer (0 for A/1, 1 for B/2, 2 for C/3, 3 for D/4). For multi_mcq, provide the primary 0-based index.
   - "correct_answer": The exact text/value of the correct answer (e.g. "-5", "\\frac{2}{3} g \\sin \\theta", "A->R, B->Q, C->S, D->P").
   - "explanation": Step-by-step derivation, scientific reasoning, or solution steps.

5. Classification & Metadata:
   - "subject": Categorize into "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", or "General".
   - "sub_topic": Chapter or concept name (e.g. "Rotational Dynamics", "Coordination Compounds", "Calculus", "General").
   - "difficulty": "EASY", "MEDIUM", or "HARD".
   - "diagram_url": "" (empty string if no diagram).
   - "marks": { "positive": 4, "negative": -1 } for MCQs, or { "positive": 4, "negative": 0 } for numerical.

Return a valid JSON object matching the requested schema:
{
  "success": true,
  "parserType": "gemini_ai_multimodal",
  "questions_count": <number>,
  "questions": [
    {
      "id": "pdf-q-1-...",
      "subject": "Physics",
      "sub_topic": "Rotational Dynamics",
      "difficulty": "HARD",
      "formatType": "single_mcq",
      "content": "...",
      "diagram_url": "",
      "options": ["...", "...", "...", "..."],
      "correct_option_index": 0,
      "correct_answer": "...",
      "explanation": "...",
      "marks": { "positive": 4, "negative": -1 }
    }
  ]
}`;

function detectSubject(content, explanation = '', optionsText = '') {
  const combined = `${content || ''} ${explanation || ''} ${optionsText || ''}`.toLowerCase();
  const subjects = {
    Physics: ['cylinder', 'inclined plane', 'moment of inertia', 'rolling', 'slipping', 'acceleration', 'velocity', 'force', 'momentum', 'torque', 'gravity', 'electric', 'magnetic', 'optic', 'wave', 'newton', 'joule', 'watt'],
    Chemistry: ['coordination', 'diamagnetic', 'paramagnetic', 'oxidation state', 'ligand', 'molecule', 'atom', 'ion', 'reaction', 'acid', 'base', 'ph', 'organic', 'inorganic', 'alkane', 'alkene', 'polymer', 'equilibrium', 'mole'],
    Biology: ['cellular', 'respiration', 'mitochondria', 'cell', 'organism', 'dna', 'rna', 'gene', 'chromosome', 'protein', 'enzyme', 'photosynthesis', 'evolution', 'ecology', 'blood', 'heart', 'bacteria', 'virus'],
    Mathematics: ['minimum value', 'maximum value', 'critical points', 'calculus', 'derivative', 'integral', 'matrix', 'determinant', 'polynomial', 'algebra', 'probability', 'trigonometry', 'limit', 'function', 'equation'],
    ComputerScience: ['algorithm', 'binary tree', 'data structure', 'stack', 'queue', 'graph', 'sorting', 'recursion', 'database', 'sql']
  };

  const scores = { Physics: 0, Chemistry: 0, Biology: 0, Mathematics: 0, ComputerScience: 0 };
  for (const [subj, keywords] of Object.entries(subjects)) {
    for (const kw of keywords) {
      if (combined.includes(kw)) scores[subj] += 2;
    }
  }

  let bestSubject = 'General';
  let maxScore = 0;
  for (const [subj, score] of Object.entries(scores)) {
    if (score > maxScore) { maxScore = score; bestSubject = subj === 'ComputerScience' ? 'Computer Science' : subj; }
  }
  return maxScore === 0 ? 'Mathematics' : bestSubject;
}

export function sanitizeGeminiQuestions(rawQuestions = []) {
  if (!Array.isArray(rawQuestions)) return [];
  return rawQuestions.map((q, idx) => {
    const qNum = idx + 1;
    const id = q.id || `pdf-q-${qNum}-${Date.now()}`;
    const content = q.content || q.questionText || q.question || '';

    let formatType = q.formatType || 'single_mcq';
    if (!['single_mcq', 'multi_mcq', 'numerical', 'assertion_reason', 'matrix_match'].includes(formatType)) formatType = 'single_mcq';

    let options = Array.isArray(q.options) ? q.options.map(o => String(o != null ? o : '').trim()) : [];
    if (formatType === 'numerical') options = [];
    else {
      options = options.map(opt => opt.replace(/^[\(\[]?\s*[A-Da-d1-4]\s*[\)\]\.\-\:]\s+/, '').trim());
      while (options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);
      if (options.length > 4 && formatType !== 'multi_mcq') options = options.slice(0, 4);
    }

    let correctOptionIndex = 0;
    if (typeof q.correct_option_index === 'number' && q.correct_option_index >= 0) correctOptionIndex = q.correct_option_index;
    else if (typeof q.correct_answer === 'string' && options.length > 0) {
      const foundIdx = options.findIndex(o => o.toLowerCase() === q.correct_answer.toLowerCase());
      if (foundIdx !== -1) correctOptionIndex = foundIdx;
    }

    let correctAnswer = q.correct_answer || q.correctAnswer || '';
    if (!correctAnswer && options.length > 0 && options[correctOptionIndex] !== undefined) correctAnswer = options[correctOptionIndex];

    const explanation = q.explanation || q.solution || '';
    const subject = q.subject || detectSubject(content, explanation, options.join(' ')) || 'General';
    const subTopic = q.sub_topic || q.topic || 'General';

    let difficulty = String(q.difficulty || 'MEDIUM').toUpperCase();
    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) difficulty = 'MEDIUM';

    const defaultMarks = formatType === 'numerical' ? { positive: 4, negative: 0 } : { positive: 4, negative: -1 };
    const marks = q.marks && typeof q.marks === 'object' ? { positive: q.marks.positive || defaultMarks.positive, negative: q.marks.negative || defaultMarks.negative } : defaultMarks;

    return { id, subject, sub_topic: subTopic, difficulty, formatType, content, diagram_url: q.diagram_url || '', options, correct_option_index: correctOptionIndex, correct_answer: correctAnswer, explanation, marks };
  });
}

export async function POST(request) {
  try {
    const contentLength = request.headers ? parseInt(request.headers.get('content-length') || '0', 10) : 0;
    if (contentLength > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Payload Too Large' }, { status: 413 });
    }

    const jsonBody = await request.json();
    let imageBase64 = jsonBody.imageBase64 || '';
    const mimeType = jsonBody.mimeType || 'image/jpeg';

    if (imageBase64.startsWith('data:')) {
      imageBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 400 });
    }

    const GenAIClient = typeof GoogleGenAI !== 'undefined' ? GoogleGenAI : (require('@google/genai').GoogleGenAI);
    const ai = new GenAIClient({ apiKey });

    let response = null;
    let lastError = null;
    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
    
    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [{ inlineData: { mimeType, data: imageBase64 } }, { text: 'Extract all questions, options, correct answers, and explanations into structured JSON format.' }],
          config: { responseMimeType: 'application/json', systemInstruction: GEMINI_SYSTEM_INSTRUCTION, temperature: 0.1 }
        });
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!response) throw new Error(`Gemini failed: ${lastError?.message}`);

    let responseText = response.text || '';
    if (!responseText && response.candidates && response.candidates[0]?.content?.parts) {
      responseText = response.candidates[0].content.parts.map(p => p.text || '').join('');
    }

    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith('```')) cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    cleanedJson = cleanedJson.replace(/(?<!\\)\\(?!["\\nr]|u[0-9a-fA-F]{4})/g, '\\\\');

    const parsedData = JSON.parse(cleanedJson);
    let extractedList = Array.isArray(parsedData) ? parsedData : (parsedData.questions || parsedData.data || []);
    const formattedQuestions = sanitizeGeminiQuestions(extractedList);

    return NextResponse.json({ success: true, parserType: 'gemini_ai_multimodal_chunked', questions_count: formattedQuestions.length, questions: formattedQuestions });

  } catch (error) {
    console.error('[Parse-Image Route] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
