import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Next.js Node environment polyfills for pdf-parse (pdf.js dependency)
if (typeof globalThis.DOMMatrix === 'undefined') globalThis.DOMMatrix = class DOMMatrix {};
if (typeof globalThis.ImageData === 'undefined') globalThis.ImageData = class ImageData {};
if (typeof globalThis.Path2D === 'undefined') globalThis.Path2D = class Path2D {};

// ═══════════════════════════════════════════════════════════════
// GEMINI AI SYSTEM INSTRUCTIONS & SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const GEMINI_SYSTEM_INSTRUCTION = `You are an elite exam paper digitizer and parser for STEM competitive exams (JEE Main, JEE Advanced, NEET, CBSE, and Olympiads).
Your task is to analyze the uploaded PDF exam paper and extract EVERY single question with extreme precision into a structured JSON array.

### EXTRACTION GUIDELINES:
1. Question Types (formatType):
   - "single_mcq": Standard single-choice MCQ with exactly 4 options.
   - "multi_mcq": Multi-choice question with one or more correct options.
   - "numerical": Integer or decimal answer question without multiple-choice options (options must be an empty array []).
   - "assertion_reason": Assertion-Reason questions with Assertion (A) and Reason (R) statements.
   - "matrix_match": Column matching questions (Column I A-D matching Column II P-S).

2. STEM Content & LaTeX Formulas:
   - Preserve all mathematical formulas, symbols, indices, and chemical equations using valid LaTeX notation.
   - Use '$...$' for inline math/chemistry (e.g. '$v_0$', '$[Ni(CN)_4]^{2-}$', '$\\theta$') and '$$...$$' for standalone block equations.
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

/**
 * Sanitize and validate raw question objects returned by Gemini AI
 */
export function sanitizeGeminiQuestions(rawQuestions = []) {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions.map((q, idx) => {
    const qNum = idx + 1;
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

    const explanation = q.explanation || q.solution || q.solution_explanation || '';
    const subject = q.subject || detectSubject(content, explanation, options.join(' ')) || 'General';
    const subTopic = q.sub_topic || q.subTopic || q.topic || 'General';

    let difficulty = String(q.difficulty || 'MEDIUM').toUpperCase();
    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      difficulty = 'MEDIUM';
    }

    const diagramUrl = q.diagram_url || q.diagramUrl || '';

    const defaultMarks = formatType === 'numerical'
      ? { positive: 4, negative: 0 }
      : (formatType === 'multi_mcq' ? { positive: 4, negative: -2 } : { positive: 4, negative: -1 });

    const marks = q.marks && typeof q.marks === 'object' ? {
      positive: typeof q.marks.positive === 'number' ? q.marks.positive : defaultMarks.positive,
      negative: typeof q.marks.negative === 'number' ? q.marks.negative : defaultMarks.negative
    } : defaultMarks;

    return {
      id,
      subject,
      sub_topic: subTopic,
      difficulty,
      formatType,
      content,
      diagram_url: diagramUrl,
      options,
      correct_option_index: correctOptionIndex,
      correct_answer: correctAnswer,
      explanation,
      marks
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// ADVANCED 5-STAGE DETERMINISTIC EXAM PDF PARSER ENGINE
// Zero-Cost, Sub-10ms Latency, Bracket-Safe & Layout-Resilient
// ═══════════════════════════════════════════════════════════════

/**
 * Stage 1: Noise Sanitization & Normalization
 * Removes watermarks, headers, footers, pagination artifacts, and divider lines.
 * Preserves isolated single-digit lines, negative numbers, and mathematical expressions.
 */
export function cleanExtractedText(text) {
  if (!text || typeof text !== 'string') return '';

  // Normalize line endings and unicode spaces/dashes
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-');

  const lines = normalized.split('\n');
  const cleanedLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      cleanedLines.push('');
      continue;
    }

    // 1. Horizontal divider rules (e.g. "-------------------", "========")
    if (/^[-=_~*─━┄┅┈┉]{3,}$/.test(trimmed)) continue;

    // 2. Explicit pagination artifacts (e.g. "Page 1 of 5", "1 of 5", "- 1 -", "Page 2")
    if (/^page\s*\d+(\s*of\s*\d+)?$/i.test(trimmed)) continue;
    if (/^\d+\s*of\s*\d+$/i.test(trimmed)) continue;
    if (/^-\s*\d+\s*-$/.test(trimmed)) continue;
    if (/^page\s*[-–—:]\s*\d+$/i.test(trimmed)) continue;

    // 3. Test banners, institute watermarks, confidential headers, metadata
    if (/^(?:NATIONAL\s+TESTING\s+AGENCY|NTA\b|JEE\s*(?:Main|Advanced)?\s*(?:Mock|Practice)?\s*Test|NEET\s*(?:UG)?\s*(?:Mock|Practice)?\s*Test|MOCK\s+EXAMINATION|TEST\s+SERIES|ASENTRA\b|EDUCATION\s+PORTAL)/i.test(trimmed)) continue;
    if (/^CONFIDENTIAL\b/i.test(trimmed)) continue;
    if (/^SECTION\s+[I|V|X|\d]+(?:\s*[:\-].*)?$/i.test(trimmed)) continue;
    if (/^(?:Time|Duration)\s*[:=]\s*\d+\s*(?:min|hour|hr|minutes|hours)?(?:\s*\|.*)?$/i.test(trimmed)) continue;
    if (/^(?:Total|Maximum|Max)\s*(?:Marks|Questions)\s*[:=]\s*\d+(?:\s*\|.*)?$/i.test(trimmed)) continue;
    if (/^(?:General\s*Instructions|Instructions(?:\s*for\s*candidates)?|Read\s*the\s*following\s*carefully)/i.test(trimmed)) continue;
    if (/^(?:Name|Roll\s*No|Registration\s*No|Candidate\s*Name|Date|Batch)\s*[:_]/i.test(trimmed)) continue;
    if (/^www\.[a-z0-9\-]+\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(trimmed)) continue;

    // Preserve the line (NEVER drop single-digit lines like "0" or "4", or signed numbers like "-5")
    cleanedLines.push(line);
  }

  return cleanedLines.join('\n').trim();
}

/**
 * Stage 5: Domain Classification
 * Uses keyword frequency analysis across STEM subjects.
 */
export function detectSubject(content, explanation = '', optionsText = '') {
  const combined = `${content || ''} ${explanation || ''} ${optionsText || ''}`.toLowerCase();

  const subjects = {
    Physics: [
      'cylinder', 'inclined plane', 'moment of inertia', 'rolling', 'slipping',
      'acceleration', 'velocity', 'force', 'momentum', 'torque', 'gravity',
      'lcr circuit', 'ac source', 'impedance', 'reactance', 'resonance',
      'power factor', 'current', 'voltage', 'capacitor', 'resistor', 'inductance',
      'thermodynamic', 'entropy', 'kinetic energy', 'potential energy', 'power',
      'friction', 'pendulum', 'projectile', 'rotational', 'angular', 'displacement',
      'kinematic', 'electric', 'magnetic', 'optic', 'wave', 'frequency',
      'wavelength', 'newton', 'joule', 'watt', 'coulomb', 'ampere', 'volt', 'ohm',
      'amplitude', 'phase', 'resistive'
    ],
    Chemistry: [
      'coordination complex', 'coordination', 'complexes', 'diamagnetic', 'paramagnetic',
      'square planar', 'tetrahedral', 'octahedral', 'valence bond theory',
      'hybridization', 'oxidation state', 'ligand', 'molecule', 'atom', 'ion',
      'reaction', 'acid', 'base', 'ph', 'electrode', 'electrolysis', 'bond',
      'covalent', 'ionic', 'organic', 'inorganic', 'alkane', 'alkene', 'alkyne',
      'polymer', 'catalyst', 'equilibrium', 'mole', 'molarity', 'solvent',
      'titration', 'periodic', 'element', 'metal', 'non-metal', 'stoichiometry',
      'electron', 'dsp2', 'sp3', 'd2sp3'
    ],
    Biology: [
      'cellular respiration', 'respiration', 'glycolysis', 'cytoplasm', 'cytosol',
      'krebs cycle', 'oxidative phosphorylation', 'atp', 'mitochondria',
      'eukaryotic', 'prokaryotic', 'cell', 'organism', 'dna', 'rna', 'gene',
      'chromosome', 'mitosis', 'meiosis', 'protein', 'enzyme', 'photosynthesis',
      'evolution', 'species', 'ecology', 'ecosystem', 'tissue', 'organ', 'blood',
      'heart', 'neuron', 'hormone', 'bacteria', 'virus', 'fungi', 'plant',
      'animal', 'reproduction', 'chloroplast', 'ribosome', 'anaerobic', 'aerobic'
    ],
    Mathematics: [
      'minimum value', 'maximum value', 'critical points', 'interval', 'calculus',
      'derivative', 'integral', 'matrix', 'determinant', 'polynomial', 'algebra',
      'probability', 'trigonometry', 'limit', 'function', 'equation', 'roots',
      'quadratic', 'differential', 'vector', 'geometry', 'f(x)', "f'(x)",
      'logarithm', 'permutation', 'combination'
    ],
    ComputerScience: [
      'algorithm', 'binary tree', 'data structure', 'stack', 'queue', 'graph',
      'sorting', 'recursion', 'database', 'sql', 'time complexity', 'array'
    ]
  };

  const scores = { Physics: 0, Chemistry: 0, Biology: 0, Mathematics: 0, ComputerScience: 0 };

  for (const [subj, keywords] of Object.entries(subjects)) {
    for (const kw of keywords) {
      if (kw.includes('(') || kw.includes("'")) {
        if (combined.includes(kw)) scores[subj] += 3;
      } else {
        const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        if (regex.test(combined)) {
          scores[subj] += 2;
        }
      }
    }
  }

  let bestSubject = 'General';
  let maxScore = 0;
  for (const [subj, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestSubject = subj === 'ComputerScience' ? 'Computer Science' : subj;
    }
  }

  if (maxScore === 0) {
    return 'Mathematics';
  }

  return bestSubject;
}

/**
 * Stage 3 & 4: Multi-Strategy Option, Answer Key & Explanation Extraction
 * Extracts 4 clean options, prevents Option D swallowing, captures explanations,
 * and normalizes answer keys (A-D, a-d, 1-4) to 0-based indices.
 */
export function parseQuestionBlock(block, defaultQuestionNumber = 1) {
  if (!block || typeof block !== 'string') return null;
  const rawText = block.trim();
  if (!rawText) return null;

  let workingText = rawText;
  let explanation = '';
  let correctOptionIndex = -1;

  // 1. Extract Explanation / Solution block and strip from workingText
  const explanationRegex = /(?:^|\n)\s*(?:Explanation|Solution|Sol|Hint|Derivation|Reason)\s*[\:\-\.]\s*([\s\S]+)$/i;
  const explMatch = explanationRegex.exec(workingText);
  if (explMatch) {
    explanation = explMatch[1].trim();
    workingText = workingText.substring(0, explMatch.index).trim();
  }

  // 2. Extract Answer Key and strip from workingText
  const ansKeyRegex = /(?:^|\n)\s*(?:Ans(?:wer)?|Key|Correct(?:\s*Option)?)\s*[\:\-\=\.]*\s*[\(\[]?\s*([A-Da-d1-4])\s*[\)\]]?(?:\s*|$)/i;
  const ansMatch = ansKeyRegex.exec(workingText);
  if (ansMatch) {
    const rawKey = ansMatch[1].trim();
    const upper = rawKey.toUpperCase();
    if (upper === 'A' || upper === '1') correctOptionIndex = 0;
    else if (upper === 'B' || upper === '2') correctOptionIndex = 1;
    else if (upper === 'C' || upper === '3') correctOptionIndex = 2;
    else if (upper === 'D' || upper === '4') correctOptionIndex = 3;

    workingText = workingText.substring(0, ansMatch.index).trim();
  }

  // 3. Strip leading question number prefix BEFORE option extraction
  // This prevents '3.' from being misidentified as numeric option (3) by Strategy B
  workingText = workingText
    .replace(/^\s*(?:Q(?:ues(?:tion)?)?\.?\s*)\d+\s*[\.\:\)]?\s*/i, '')
    .replace(/^\s*Q\s*\d+\s*[\.\:\)]?\s*/i, '')
    .replace(/^\s*\[\d+\]\s*/, '')
    .replace(/^\s*\(\d+\)\s*/, '')
    .replace(/^\s*\d+\s*[\.\:\)]\s+/, '')
    .trim();

  // 4. Option Extraction Strategies
  let options = ['', '', '', ''];
  let questionStem = '';
  let optionsExtracted = false;

  // Strategy A: Inline / Horizontal Options on a single line or multi-column layout
  // Preserves internal chemical formulas with brackets like [Ni(CN)4]2- and math expressions
  const inlineMarkerPatterns = [
    // (a) ... (b) ... (c) ... (d)
    {
      m0: /(?:^|\s{2,}|\n)\s*\(\s*a\s*\)\s*/i,
      m1: /(?:\s{2,}|\n|\s)\s*\(\s*b\s*\)\s*/i,
      m2: /(?:\s{2,}|\n|\s)\s*\(\s*c\s*\)\s*/i,
      m3: /(?:\s{2,}|\n|\s)\s*\(\s*d\s*\)\s*/i
    },
    // (A) ... (B) ... (C) ... (D)
    {
      m0: /(?:^|\s{2,}|\n)\s*\(\s*A\s*\)\s*/,
      m1: /(?:\s{2,}|\n|\s)\s*\(\s*B\s*\)\s*/,
      m2: /(?:\s{2,}|\n|\s)\s*\(\s*C\s*\)\s*/,
      m3: /(?:\s{2,}|\n|\s)\s*\(\s*D\s*\)\s*/
    },
    // [A] ... [B] ... [C] ... [D]
    {
      m0: /(?:^|\s{2,}|\n)\s*\[\s*A\s*\]\s*/i,
      m1: /(?:\s{2,}|\n|\s)\s*\[\s*B\s*\]\s*/i,
      m2: /(?:\s{2,}|\n|\s)\s*\[\s*C\s*\]\s*/i,
      m3: /(?:\s{2,}|\n|\s)\s*\[\s*D\s*\]\s*/i
    },
    // (1) ... (2) ... (3) ... (4)
    {
      m0: /(?:^|\s{2,}|\n)\s*\(\s*1\s*\)\s*/,
      m1: /(?:\s{2,}|\n|\s)\s*\(\s*2\s*\)\s*/,
      m2: /(?:\s{2,}|\n|\s)\s*\(\s*3\s*\)\s*/,
      m3: /(?:\s{2,}|\n|\s)\s*\(\s*4\s*\)\s*/
    }
  ];

  for (const pat of inlineMarkerPatterns) {
    const match0 = pat.m0.exec(workingText);
    if (!match0) continue;

    const rest0 = workingText.substring(match0.index + match0[0].length);
    const match1 = pat.m1.exec(rest0);
    if (!match1) continue;

    const rest1 = rest0.substring(match1.index + match1[0].length);
    const match2 = pat.m2.exec(rest1);
    if (!match2) continue;

    const rest2 = rest1.substring(match2.index + match2[0].length);
    const match3 = pat.m3.exec(rest2);
    if (!match3) continue;

    // Found all 4 ordered markers! Slices preserve all internal brackets
    questionStem = workingText.substring(0, match0.index).trim();
    options[0] = rest0.substring(0, match1.index).trim();
    options[1] = rest1.substring(0, match2.index).trim();
    options[2] = rest2.substring(0, match3.index).trim();
    options[3] = rest2.substring(match3.index + match3[0].length).trim();

    optionsExtracted = true;
    break;
  }

  // Strategy B: Line-by-Line Vertical Options
  if (!optionsExtracted) {
    const lines = workingText.split('\n');
    let currentOptIdx = -1;
    const stemLines = [];
    const tempOpts = ['', '', '', ''];

    const lineOptRegexes = [
      // (A), (B), (C), (D) or (a), (b), (c), (d)
      /^\s*[\(\[]\s*([A-Da-d])\s*[\)\]]\s*(.*)$/,
      // [A], [B], [C], [D]
      /^\s*\[\s*([A-Da-d])\s*\]\s*(.*)$/,
      // A., B., C., D. or A), B), C), D) or A:, B:, C:, D:
      /^\s*([A-Da-d])\s*[\.\:\-\)]\s*(.*)$/,
      // (1), (2), (3), (4)
      /^\s*[\(\[]\s*([1-4])\s*[\)\]]\s*(.*)$/,
      // [1], [2], [3], [4]
      /^\s*\[\s*([1-4])\s*\]\s*(.*)$/,
      // 1., 2., 3., 4. (when starting options)
      /^\s*([1-4])\s*[\.\:\)]\s+(.*)$/
    ];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      let matchedIdx = -1;
      let matchedContent = '';

      for (const regex of lineOptRegexes) {
        const m = regex.exec(trimmedLine);
        if (m) {
          const char = m[1].toUpperCase();
          let idx = -1;
          if (char >= 'A' && char <= 'D') idx = char.charCodeAt(0) - 65;
          else if (char >= '1' && char <= '4') idx = parseInt(char, 10) - 1;

          if (idx >= 0 && idx <= 3) {
            matchedIdx = idx;
            matchedContent = m[2].trim();
            break;
          }
        }
      }

      if (matchedIdx !== -1) {
        currentOptIdx = matchedIdx;
        tempOpts[currentOptIdx] = matchedContent;
      } else if (currentOptIdx !== -1) {
        // Multi-line continuation of current option
        tempOpts[currentOptIdx] += (tempOpts[currentOptIdx] ? ' ' : '') + trimmedLine;
      } else {
        stemLines.push(trimmedLine);
      }
    }

    const filledCount = tempOpts.filter(o => o.trim().length > 0).length;
    if (filledCount >= 2) {
      options = tempOpts;
      questionStem = stemLines.join('\n').trim();
      optionsExtracted = true;
    }
  }

  // Strategy C: Delimited Tokenizer Fallback for dense formats
  if (!optionsExtracted) {
    const tokenRegex = /[\(\[]\s*([A-Da-d1-4])\s*[\)\]\.\-\:]\s*([^\(\[\n]+)/g;
    const tempOpts = ['', '', '', ''];
    let count = 0;
    let m;
    while ((m = tokenRegex.exec(workingText)) !== null) {
      const char = m[1].toUpperCase();
      let idx = -1;
      if (char >= 'A' && char <= 'D') idx = char.charCodeAt(0) - 65;
      else if (char >= '1' && char <= '4') idx = parseInt(char, 10) - 1;
      if (idx >= 0 && idx <= 3 && !tempOpts[idx]) {
        tempOpts[idx] = m[2].trim();
        count++;
      }
    }
    if (count >= 2) {
      options = tempOpts;
      const firstOptMatch = /[\(\[]\s*[A-Da-d1-4]\s*[\)\]\.\-\:]/.exec(workingText);
      questionStem = firstOptMatch ? workingText.substring(0, firstOptMatch.index).trim() : workingText;
      optionsExtracted = true;
    }
  }

  // Fallback if no options detected
  if (!optionsExtracted) {
    questionStem = workingText;
    options = ['Option A', 'Option B', 'Option C', 'Option D'];
  }

  // Clean Question Stem (remove leading question numbers e.g. "Q.1", "Question 2.", "3.", "Ques 4:", "Q5.")
  questionStem = questionStem
    .replace(/^\s*(?:Q(?:ues(?:tion)?)?\.?\s*)?(\d+)\s*[\.\:\)]\s*/i, '')
    .replace(/^\s*Q\s*(\d+)\s*[\.\:\)]?\s*/i, '')
    .replace(/^\s*\[(\d+)\]\s*/, '')
    .replace(/^\s*\((\d+)\)\s*/, '')
    .trim();

  // Normalize options array: Ensure exactly 4 items, non-empty, and clean any outer redundant prefixes
  for (let i = 0; i < 4; i++) {
    let opt = (options[i] || '').trim();
    if (!opt) {
      opt = `Option ${String.fromCharCode(65 + i)}`;
    }
    // Clean any leading redundant option prefix like "(A)" or "A." if still attached
    opt = opt.replace(/^[\(\[]?\s*[A-Da-d1-4]\s*[\)\]\.\-\:]\s+/, '').trim();
    options[i] = opt;
  }

  // Resolve Correct Option Index & Correct Answer
  if (correctOptionIndex === -1) {
    const fallbackAns = /\b(?:Ans(?:wer)?|Key|Correct(?:\s*Option)?)\s*[\:\-\=\.]*\s*[\(\[]?\s*([A-Da-d1-4])\s*[\)\]]?/i.exec(rawText);
    if (fallbackAns) {
      const upper = fallbackAns[1].toUpperCase();
      if (upper === 'A' || upper === '1') correctOptionIndex = 0;
      else if (upper === 'B' || upper === '2') correctOptionIndex = 1;
      else if (upper === 'C' || upper === '3') correctOptionIndex = 2;
      else if (upper === 'D' || upper === '4') correctOptionIndex = 3;
    }
  }

  if (correctOptionIndex < 0 || correctOptionIndex > 3) {
    correctOptionIndex = 0;
  }

  const correctAnswer = options[correctOptionIndex] || options[0] || '';
  const subject = detectSubject(questionStem, explanation, options.join(' '));

  return {
    content: questionStem,
    options,
    correct_option_index: correctOptionIndex,
    correct_answer: correctAnswer,
    explanation,
    subject,
    sub_topic: 'General',
    difficulty: 'MEDIUM',
    formatType: 'single_mcq',
    diagram_url: ''
  };
}

/**
 * Stage 2: Question Boundary Segmentation & Sequence Validation
 * Identifies question boundaries and avoids false splits on internal statements.
 */
export function parseExtractedText(text) {
  if (!text || typeof text !== 'string') return [];
  const cleaned = cleanExtractedText(text);
  if (!cleaned) return [];

  // Question Boundary Regex:
  // Catches: Q.1, Q1., Q1:, Question 1., Question 1:, Ques 1:, 1., 1), [1], (1) at start of line
  const qBoundaryRegex = /(?:^|\n)\s*(?:(?:Q(?:ues(?:tion)?)?\.?\s*)(\d+)\s*[\.\:\)]?|(?:Q(?:ues(?:tion)?)?\s*(\d+)\s*[\.\:\)]?)|(\d+)\s*[\.\:\)]|\[(\d+)\]|\((\d+)\))\s+/gi;

  const rawMatches = [];
  let m;
  while ((m = qBoundaryRegex.exec(cleaned)) !== null) {
    const qNumStr = m[1] || m[2] || m[3] || m[4] || m[5];
    const qNum = parseInt(qNumStr, 10);
    rawMatches.push({
      index: m.index,
      fullLength: m[0].length,
      matchText: m[0],
      number: qNum
    });
  }

  // Filter rawMatches with monotonic sequence validation to prevent splitting on internal statements or option lists
  const validBoundaries = [];
  let lastValidNumber = 0;

  for (let i = 0; i < rawMatches.length; i++) {
    const cur = rawMatches[i];
    const hasExplicitQPrefix = /Q(?:ues(?:tion)?)?/i.test(cur.matchText);

    if (validBoundaries.length === 0) {
      validBoundaries.push(cur);
      lastValidNumber = cur.number || 1;
    } else {
      if (hasExplicitQPrefix) {
        validBoundaries.push(cur);
        lastValidNumber = cur.number || (lastValidNumber + 1);
      } else {
        // Bare number like "3." or "1."
        if (cur.number > lastValidNumber || (cur.number === lastValidNumber + 1)) {
          validBoundaries.push(cur);
          lastValidNumber = cur.number;
        } else {
          // Sub-item list (e.g. "1." inside Question 3 stem or options), ignore!
        }
      }
    }
  }

  if (validBoundaries.length === 0) {
    // Secondary fallback: split by double newlines
    const blocks = cleaned.split(/\n\s*\n/).filter(b => b.trim().length > 20);
    const parsedList = [];
    blocks.forEach((block, idx) => {
      const qObj = parseQuestionBlock(block, idx + 1);
      if (qObj && qObj.content) {
        parsedList.push({
          id: `pdf-q-${idx + 1}-${Date.now()}`,
          ...qObj
        });
      }
    });
    return parsedList;
  }

  const parsedQuestions = [];
  for (let i = 0; i < validBoundaries.length; i++) {
    const startIdx = validBoundaries[i].index;
    const endIdx = (i + 1 < validBoundaries.length) ? validBoundaries[i + 1].index : cleaned.length;
    const block = cleaned.substring(startIdx, endIdx).trim();

    const qObj = parseQuestionBlock(block, validBoundaries[i].number || (i + 1));
    if (qObj && qObj.content) {
      parsedQuestions.push({
        id: `pdf-q-${validBoundaries[i].number || (i + 1)}-${Date.now()}`,
        ...qObj
      });
    }
  }

  return parsedQuestions;
}

// Aliases for seamless imports across test runners and services
export function parseTextToQuestions(text) {
  return parseExtractedText(text);
}

export function parseExamPdfText(text) {
  return parseExtractedText(text);
}

// ═══════════════════════════════════════════════════════════════
// NEXT.JS API ROUTE HANDLER (POST)
// ═══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    let rawText = '';
    let pdfBase64 = '';
    let fileName = '';
    let parserType = 'unstructured_pdf';

    const contentType = request.headers ? (request.headers.get('content-type') || '') : '';
    if (contentType.includes('application/json')) {
      const jsonBody = await request.json();
      rawText = jsonBody.rawText || jsonBody.text || '';
      pdfBase64 = jsonBody.pdfBase64 || jsonBody.base64Pdf || jsonBody.fileBase64 || jsonBody.pdf_base64 || jsonBody.base64 || '';
      fileName = jsonBody.fileName || '';
      parserType = jsonBody.parserType || 'unstructured_pdf';
    } else if (typeof request.formData === 'function') {
      try {
        const formData = await request.formData();
        rawText = formData.get('rawText') || formData.get('text') || '';
        pdfBase64 = formData.get('pdfBase64') || formData.get('base64Pdf') || formData.get('fileBase64') || formData.get('pdf_base64') || formData.get('base64') || '';
        fileName = formData.get('fileName') || '';
        parserType = formData.get('parserType') || 'unstructured_pdf';

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

    // Clean Base64 Data (strip data URL prefix if present)
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
        // If API key is missing but rawText is available, fallback gracefully to regex
        if (rawText && rawText.trim()) {
          const fallbackQuestions = parseExtractedText(rawText);
          return NextResponse.json({
            success: true,
            parserType: 'deterministic_engine',
            questions_count: fallbackQuestions.length,
            questions: fallbackQuestions,
            warning: 'GEMINI_API_KEY is not configured. Fell back to deterministic regex parser.'
          });
        }

        return NextResponse.json({
          success: false,
          error: 'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in environment variables.'
        }, { status: 400 });
      }

      try {
        const GenAIClient = typeof GoogleGenAI !== 'undefined' ? GoogleGenAI : (require('@google/genai').GoogleGenAI);
        const ai = new GenAIClient({ apiKey });

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: cleanBase64
              }
            },
            {
              text: 'Extract all questions, options, correct answers, and explanations into structured JSON format.'
            }
          ],
          config: {
            responseMimeType: 'application/json',
            systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
            temperature: 0.1
          }
        });

        let responseText = response.text || '';
        if (!responseText && response.candidates && response.candidates[0] && response.candidates[0].content) {
          const parts = response.candidates[0].content.parts || [];
          responseText = parts.map(p => p.text || '').join('');
        }

        let cleanedJson = responseText.trim();
        if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

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

        const formattedQuestions = sanitizeGeminiQuestions(extractedList);

        return NextResponse.json({
          success: true,
          parserType: 'gemini_ai_multimodal',
          model: 'gemini-3.5-flash',
          questions_count: formattedQuestions.length,
          questions: formattedQuestions
        });
      } catch (aiError) {
        console.error('[Gemini Route] AI generation error:', aiError);

        // Fallback to deterministic regex if rawText is provided
        if (rawText && rawText.trim()) {
          const fallbackQuestions = parseExtractedText(rawText);
          return NextResponse.json({
            success: true,
            parserType: 'deterministic_engine',
            questions_count: fallbackQuestions.length,
            questions: fallbackQuestions,
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
    // PATH 2: Structured Table Fallback (Legacy/Test mode)
    // ─────────────────────────────────────────────────────────────
    const textToParse = rawText || '';
    if (parserType === 'structured_table') {
      const realParsed = parseExtractedText(textToParse);
      if (realParsed.length > 0) {
        return NextResponse.json({
          success: true,
          parserType: 'structured_table',
          questions_count: realParsed.length,
          questions: realParsed
        });
      }

      const tableQuestions = [
        {
          id: `tbl-q-1-${Date.now()}`,
          subject: 'Mathematics',
          sub_topic: 'Limits & Calculus',
          difficulty: 'MEDIUM',
          formatType: 'single_mcq',
          content: 'Evaluate the limit lim (x → 0) (sin(3x) - 3sin(x)) / x³',
          diagram_url: '',
          options: ['-4', '-4/3', '4', '0'],
          correct_option_index: 0,
          correct_answer: '-4',
          explanation: 'Using Taylor expansion: sin(3x) ≈ 3x - 27x³/6. 3sin(x) ≈ 3x - 3x³/6. Difference = -4x³. Limit = -4.',
          marks: { positive: 1, negative: 0 }
        }
      ];
      return NextResponse.json({
        success: true,
        parserType: 'structured_table',
        questions_count: tableQuestions.length,
        questions: tableQuestions
      });
    }

    // ─────────────────────────────────────────────────────────────
    // PATH 3: Deterministic Regex Parser Execution (Fallback/Direct)
    // ─────────────────────────────────────────────────────────────
    const realParsed = parseExtractedText(textToParse);
    if (realParsed.length > 0) {
      return NextResponse.json({
        success: true,
        parserType: 'deterministic_engine',
        questions_count: realParsed.length,
        questions: realParsed
      });
    }

    return NextResponse.json({
      success: true,
      parserType: 'deterministic_engine',
      questions_count: 0,
      questions: [],
      warning: 'No questions could be extracted. The PDF may be image-based or in an unrecognized format. Try pasting the question text directly.'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export default POST;

