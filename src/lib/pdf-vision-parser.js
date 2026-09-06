/**
 * Elite Exam Paper Digitizer & Vision Parser Engine
 * Multi-subject boundary auto-detection, end-of-PDF answer key matrix scanning,
 * multi-format question classification (MCQ, MSQ, Numerical, Matrix Match),
 * and deterministic fallback parsing.
 */

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

// ═══════════════════════════════════════════════════════════════
// GEMINI SYSTEM INSTRUCTION & MULTIMODAL PROMPT
// ═══════════════════════════════════════════════════════════════

export const GEMINI_SYSTEM_INSTRUCTION = `You are an elite exam paper digitizer and parser for STEM competitive exams (JEE Main, JEE Advanced, NEET, CBSE, and Olympiads).
Your task is to analyze the uploaded exam paper / page image and extract EVERY question with extreme precision into structured JSON.

### EXTRACTION GUIDELINES:
1. Question Types (formatType):
   - "single_mcq": Standard single-choice MCQ with exactly 4 options.
   - "multi_mcq": Multi-choice question with one or more than one correct option.
   - "numerical": Integer or decimal answer question without multiple-choice options (options must be an empty array []).
   - "matrix_match": Column matching questions (Column I A-D matching Column II P-S).
   - "assertion_reason": Assertion-Reason questions with Assertion (A) and Reason (R) statements.

2. Diagrams & Visual Elements (CRITICAL):
   - For ANY question containing a diagram, circuit, graph, geometric figure, chemical reaction or organic structure:
     - Set "has_diagram": true
     - Provide "diagram_box_2d": [ymin, xmin, ymax, xmax] as normalized integers from 0 to 1000 representing the exact bounding box of the diagram on the page.
     - Provide "diagram_caption": brief description (e.g. "LCR circuit with AC source", "Benzene ring reaction").
   - If no diagram is present: "has_diagram": false, "diagram_box_2d": null, "diagram_caption": "".

3. Multi-Subject & Section Boundaries:
   - Identify the subject: "Physics", "Chemistry", or "Mathematics" (or "Biology" for NEET).
   - Identify the section: "Section A" (standard MCQs) or "Section B" (numerical/integer questions).
   - Note section or subject headers (e.g. "SECTION 1 - PHYSICS", "PART II - CHEMISTRY", "MATHEMATICS").

4. Answer Key Matrix Detection:
   - If this page is an Answer Key Sheet or contains an Answer Key Table (e.g. "ANSWER KEY", "KEY SHEET", "1. B, 2. D, 3. 45..."):
     - Set "is_answer_key_page": true
     - Provide "answer_key_map": { "1": "B", "2": "D", "3": "45", "4": "A,C", ... }
   - Otherwise: "is_answer_key_page": false, "answer_key_map": null.

5. STEM Content & LaTeX Formulas:
   - Preserve all formulas, symbols, indices, and chemical equations using valid LaTeX notation.
   - CRITICAL: You MUST double-escape all LaTeX backslashes (\\\\frac, \\\\mu, \\\\sin) so JSON remains valid.
   - Use '$...$' for inline math and '$$...$$' for block math.

6. Options Array:
   - For 'single_mcq', 'multi_mcq', 'matrix_match', 'assertion_reason': exactly 4 clean strings without prefixes like '(A)', 'B.', etc.
   - For 'numerical': empty array [].

7. Return Schema:
{
  "success": true,
  "parserType": "gemini_ai_multimodal",
  "is_answer_key_page": false,
  "answer_key_map": null,
  "questions_count": <number>,
  "questions": [
    {
      "id": "pdf-q-1-...",
      "question_number": 1,
      "subject": "Physics",
      "section": "Section A",
      "sub_topic": "Rotational Dynamics",
      "difficulty": "HARD",
      "formatType": "single_mcq",
      "content": "...",
      "has_diagram": true,
      "diagram_box_2d": [150, 200, 450, 800],
      "diagram_caption": "Rolling cylinder on inclined plane",
      "diagram_url": "",
      "options": ["...", "...", "...", "..."],
      "correct_option_index": 0,
      "correct_answer": "...",
      "explanation": "...",
      "marks": { "positive": 4, "negative": -1 }
    }
  ]
}`;

// ═══════════════════════════════════════════════════════════════
// END-OF-PDF ANSWER KEY MATRIX SCANNER & PARSER
// ═══════════════════════════════════════════════════════════════

/**
 * Checks if a string or page contains an Answer Key Matrix header
 */
export function isAnswerKeySection(text) {
  if (!text || typeof text !== 'string') return false;
  return /(?:OFFICIAL\s+|FINAL\s+|MOCK\s+)?(?:ANSWER\s*KEY|KEY\s*SHEET|ANSWERS\s*(?:KEY|TABLE|MATRIX)?|CORRECT\s*(?:OPTIONS|ANSWERS)|ANSWER\s*MATRIX|HINTS\s*&\s*SOLUTIONS|KEY\s*&\s*(?:SOLUTIONS|EXPLANATIONS))\b/i.test(text);
}

/**
 * Splits document text into Questions Body and Answer Key Section if present at the end
 */
export function splitAnswerKeySection(fullText) {
  if (!fullText || typeof fullText !== 'string') {
    return { questionsText: '', answerKeyText: '' };
  }

  // Look for end-of-document answer key headers
  const markerRegex = /(?:^|\n)\s*(?:[-=_*~]{3,}\s*)?(?:(?:OFFICIAL\s+|FINAL\s+|MOCK\s+)?(?:ANSWER\s*KEY|KEY\s*SHEET|ANSWERS\s*(?:KEY|TABLE|MATRIX)?|CORRECT\s*(?:OPTIONS|ANSWERS)|ANSWER\s*MATRIX|HINTS\s*&\s*SOLUTIONS|KEY\s*&\s*(?:SOLUTIONS|EXPLANATIONS)))[^\n]*(?:\n|$)/i;
  
  const match = markerRegex.exec(fullText);
  if (!match) {
    return { questionsText: fullText, answerKeyText: '' };
  }

  const splitIndex = match.index;
  // Ensure the answer key marker isn't just an inline question explanation in the first 20% of text
  if (splitIndex < fullText.length * 0.2 && fullText.length > 500) {
    // Check if there's a subsequent Answer Key section near the end
    const lastMarkerRegex = /(?:^|\n)\s*(?:[-=_*~]{3,}\s*)?(?:(?:OFFICIAL\s+|FINAL\s+|MOCK\s+)?(?:ANSWER\s*KEY|KEY\s*SHEET|ANSWERS\s*(?:KEY|TABLE|MATRIX)?|CORRECT\s*(?:OPTIONS|ANSWERS)|ANSWER\s*MATRIX))[^\n]*(?:\n|$)/gi;
    let lastMatch = null;
    let m;
    while ((m = lastMarkerRegex.exec(fullText)) !== null) {
      lastMatch = m;
    }
    if (lastMatch && lastMatch.index > fullText.length * 0.4) {
      return {
        questionsText: fullText.substring(0, lastMatch.index).trim(),
        answerKeyText: fullText.substring(lastMatch.index).trim()
      };
    }
  }

  return {
    questionsText: fullText.substring(0, splitIndex).trim(),
    answerKeyText: fullText.substring(splitIndex).trim()
  };
}

/**
 * Parses an Answer Key Matrix text block into a normalized map:
 * { "1": "B", "2": "D", "3": "45", "4": "A, C", "5": "A->P,R; B->Q" }
 */
export function parseAnswerKeyMatrix(text) {
  if (!text || typeof text !== 'string') return {};

  const answerMap = {};
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = clean.split('\n');

  // Helper to store an answer if valid
  const storeAnswer = (qNumStr, ansVal) => {
    if (!qNumStr || !ansVal) return;
    const qNum = parseInt(qNumStr, 10);
    if (isNaN(qNum) || qNum <= 0 || qNum > 500) return;
    let cleanAns = String(ansVal).trim();
    // Strip trailing punctuation like comma or period if it's not a decimal
    if (cleanAns.endsWith(',') || cleanAns.endsWith(';')) {
      cleanAns = cleanAns.slice(0, -1).trim();
    }
    // Don't store if it looks like header words
    if (/^(?:Ans|Answer|Key|Option|Question|Q\.?No|Marks?|Sol|Subject|Section)$/i.test(cleanAns)) return;
    if (cleanAns.length > 0 && cleanAns.length < 100) {
      answerMap[String(qNum)] = cleanAns;
    }
  };

  // Strategy 1: Explicit key-value pairs with delimiters (e.g. "1: B", "1. (B)", "1 - B", "Q1: 45", "1=A,C", "1 -> B")
  const pairRegex = /(?:^|[\s|,;|\t\|])(?:Q(?:ues(?:tion)?)?\.?\s*)?(\d+)\s*[\.\:\-\=\)\>\]\|]\s*[\(\[]?\s*([A-Da-d1-4](?:\s*,\s*[A-Da-d1-4])*|[A-Da-d]{2,4}|-?\d+(?:\.\d+)?|[A-Da-d1-4]\s*(?:->|-|:)\s*[\w,; \-\(\)]+)\s*[\)\]]?(?=[\s|,;|\t\|]|$)/gi;
  let match;
  while ((match = pairRegex.exec(clean)) !== null) {
    storeAnswer(match[1], match[2]);
  }

  // Strategy 2: Multi-column Tabular Grid line-by-line (e.g. "1  B    11  A    21  45" or pipe tables "| 1 | B | 11 | A |")
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip pure header lines
    if (/^(?:Q\.?No|Question|Sr\.?\s*No|Ans|Answer|Key|Subject|Section)\b/i.test(trimmed)) continue;
    if (/^[-=_~*|─━┄┅┈┉\+\s]+$/.test(trimmed)) continue;

    // Pattern A: Pipe delimited markdown row: | 1 | B | 11 | A | 21 | 45 |
    if (trimmed.includes('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
      for (let i = 0; i < cells.length - 1; i++) {
        const c1 = cells[i];
        const c2 = cells[i + 1];
        if (/^\d+$/.test(c1) && !/^\d+$/.test(c2)) {
          storeAnswer(c1, c2);
          i++; // skip next since it was consumed as answer
        } else if (/^\d+$/.test(c1) && /^-?\d+(?:\.\d+)?$/.test(c2) && parseInt(c1, 10) !== parseInt(c2, 10)) {
          storeAnswer(c1, c2);
          i++;
        }
      }
    }

    // Pattern B: Multi-token row: "1  B   11  A   21  45" or "1 (B) 2 (D) 3 45"
    const tokenRegex = /(?:^|\s+)(?:Q(?:ues)?\.?\s*)?(\d+)\s*[\.\:\-\)]?\s+[\(\[]?\s*([A-Da-d1-4](?:\s*,\s*[A-Da-d1-4])*|[A-Da-d]{2,4}|-?\d+(?:\.\d+)?|[A-Da-d1-4]\s*(?:->|-|:)\s*[\w,; \-\(\)]+)\s*[\)\]]?(?=\s+|$)/g;
    let tm;
    while ((tm = tokenRegex.exec(trimmed)) !== null) {
      storeAnswer(tm[1], tm[2]);
    }
  }

  // Strategy 3: Dedicated line per question (e.g. "1. B" or "1 (B)")
  if (Object.keys(answerMap).length === 0) {
    const singleLineRegex = /^\s*(?:Q(?:ues)?\.?\s*)?(\d+)\s*[\.\:\-\=\)]?\s*[\(\[]?\s*(.+?)\s*[\)\]]?$/;
    for (const line of lines) {
      const lm = singleLineRegex.exec(line.trim());
      if (lm) {
        storeAnswer(lm[1], lm[2]);
      }
    }
  }

  // Strategy 4: Fallback horizontal token pairs
  if (Object.keys(answerMap).length === 0) {
    const columnTokenRegex = /(\d+)\s+([A-Da-d]|-?\d+(?:\.\d+)?)/g;
    while ((match = columnTokenRegex.exec(clean)) !== null) {
      storeAnswer(match[1], match[2]);
    }
  }

  return answerMap;
}

/**
 * Binds parsed answer keys to questions array, updating formatType and answer fields
 * @param {Array} questions - Array of question objects
 * @param {Object} answerKeyMap - Map of question number to answer string
 * @returns {{ questions: Array, boundCount: number }}
 */
export function bindAnswerKeysToQuestions(questions = [], answerKeyMap = {}) {
  const inputList = Array.isArray(questions) ? questions : (questions?.questions || []);
  if (inputList.length === 0 || !answerKeyMap || Object.keys(answerKeyMap).length === 0) {
    const res = { questions: inputList, boundCount: 0 };
    Object.defineProperty(res, 'length', { get() { return this.questions.length; }, configurable: true });
    res[Symbol.iterator] = function* () { yield* this.questions; };
    return res;
  }

  let boundCount = 0;

  const updatedQuestions = inputList.map((q, idx) => {
    const qNumStr = q.question_number != null ? String(q.question_number) : String(idx + 1);
    const keyVal = answerKeyMap[qNumStr] || answerKeyMap[String(idx + 1)];

    if (!keyVal) return q;

    let trimmedKey = String(keyVal).trim();
    // Strip outer parentheses, brackets, or braces e.g. "(B)" -> "B", "[45]" -> "45"
    let cleanVal = trimmedKey.replace(/^[\(\[\{]\s*|\s*[\)\]\}]$/g, '').trim();
    const upperKey = cleanVal.toUpperCase();
    boundCount++;

    // Format 1: Matrix Match (e.g. "A->P,R; B->Q" or "A-P, B-Q" or "(A)->(P), (B)->(Q)")
    if (/->|;|\|/.test(cleanVal) || /^[A-D]\s*[-:]\s*[P-Sp-s]/i.test(cleanVal) || q.formatType === 'matrix_match') {
      return {
        ...q,
        formatType: 'matrix_match',
        questionType: 'match',
        matrixMatchAnswer: cleanVal,
        matrix_match_answer: cleanVal,
        correct_answer: cleanVal,
        correctAnswer: cleanVal
      };
    }

    // Format 2: Multi MSQ (e.g. "A, C" or "A,B,D" or "ACD" or "1, 3")
    if (cleanVal.includes(',') || (upperKey.length > 1 && /^[A-D]+$/.test(upperKey)) || (cleanVal.includes(' ') && /^[A-D\s]+$/i.test(cleanVal))) {
      let indices = [];
      if (cleanVal.includes(',') || cleanVal.includes(' ')) {
        const parts = cleanVal.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
        indices = parts.map(s => {
          if (s >= 'A' && s <= 'D') return s.charCodeAt(0) - 65;
          if (s >= '1' && s <= '4') return parseInt(s, 10) - 1;
          return -1;
        }).filter(i => i >= 0 && i <= 3);
      } else {
        // String like "ACD"
        indices = upperKey
          .split('')
          .map(c => c.charCodeAt(0) - 65)
          .filter(i => i >= 0 && i <= 3);
      }

      // Unique sorted indices
      indices = Array.from(new Set(indices)).sort((a, b) => a - b);

      if (indices.length > 0) {
        return {
          ...q,
          formatType: 'multi_mcq',
          questionType: 'multiple',
          correct_options: indices,
          correctOptions: indices,
          correctOptionsMultiple: indices,
          correct_option_index: indices[0] ?? 0,
          correctOptionIdx: indices[0] ?? 0,
          correct_answer: cleanVal,
          correctAnswer: cleanVal
        };
      }
    }

    // Format 3: Numerical / Integer (e.g. "45", "-12", "3.14", "0")
    // When is a numeric value an integer question?
    // A: If it's outside 1-4 (e.g. 45, 0, -3, 12.5) OR
    // B: If the question has dummy/no options OR is already numerical / Section B
    const isNumericLiteral = /^-?\d+(?:\.\d+)?$/.test(cleanVal);
    const hasOnlyDummyOptions = !q.options || q.options.length === 0 || (Array.isArray(q.options) && q.options.every((opt, i) => opt === `Option ${String.fromCharCode(65 + i)}`));
    const isExplicitNumerical = isNumericLiteral && (
      q.formatType === 'numerical' ||
      q.questionType === 'integer' ||
      q.section === 'Section B' ||
      hasOnlyDummyOptions ||
      Number(cleanVal) > 4 ||
      Number(cleanVal) <= 0 ||
      cleanVal.includes('.')
    );

    if (isExplicitNumerical) {
      return {
        ...q,
        formatType: 'numerical',
        questionType: 'integer',
        section: 'Section B',
        options: [],
        integerAnswer: cleanVal,
        integer_answer: cleanVal,
        correct_answer: cleanVal,
        correctAnswer: cleanVal,
        correct_option_index: -1,
        correctOptionIdx: -1
      };
    }

    // Format 4: Single MCQ ('A'-'D' or '1'-'4')
    let optIdx = -1;
    if (/^[A-D]$/i.test(upperKey)) {
      optIdx = upperKey.charCodeAt(0) - 65;
    } else if (/^[1-4]$/.test(cleanVal)) {
      optIdx = parseInt(cleanVal, 10) - 1;
    }

    if (optIdx >= 0 && optIdx <= 3) {
      const resolvedAnswer = (q.options && q.options[optIdx]) ? q.options[optIdx] : upperKey;
      return {
        ...q,
        formatType: 'single_mcq',
        questionType: 'single',
        correct_option_index: optIdx,
        correctOptionIdx: optIdx,
        correct_answer: resolvedAnswer,
        correctAnswer: resolvedAnswer
      };
    }

    // Fallback assignment
    return {
      ...q,
      correct_answer: cleanVal,
      correctAnswer: cleanVal
    };
  });

  const bindResult = { questions: updatedQuestions, boundCount };
  Object.defineProperty(bindResult, 'length', { get() { return this.questions.length; }, configurable: true });
  bindResult[Symbol.iterator] = function* () { yield* this.questions; };
  return bindResult;
}

// ═══════════════════════════════════════════════════════════════
// MULTI-SUBJECT BOUNDARY AUTO-DETECTION & SECTION ASSIGNMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Detects whether a text line is a Subject or Section Header
 */
export function detectSubjectOrSectionHeader(line) {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 1. Subject Header regex (e.g. "SECTION 1 - PHYSICS", "PART I: CHEMISTRY", "MATHEMATICS", "SUBJECT: PHYSICS", "[PHYSICS]")
  const subjectRegex = /^(?:(?:SECTION|PART|SUBJECT)\s*(?:[\dIVX]+|[A-C])?\s*[:\-\—\(\[\{]?\s*)?(?:[\*\=\-\_\~]{2,}\s*)?(PHYSICS|CHEMISTRY|MATHEMATICS|MATHS|BIOLOGY)\b(?:\s*[\*\=\-\_\~]{2,})?(?:\s*[\)\/\]\}])?(?:\s*[:\-\—]?\s*(?:SECTION|PART)?\s*[A-Z0-9]*)?$/i;
  const subjMatch = subjectRegex.exec(trimmed);
  if (subjMatch) {
    let subj = subjMatch[1].toUpperCase();
    if (subj === 'MATHS') subj = 'MATHEMATICS';
    const formattedSubj = subj.charAt(0) + subj.slice(1).toLowerCase(); // 'Physics', 'Chemistry', 'Mathematics', 'Biology'
    return { type: 'subject', value: formattedSubj };
  }

  // 2. Section Header regex (e.g. "SECTION A: MCQs", "SECTION B: NUMERICAL", "PART A")
  const sectionRegex = /^(?:SECTION|PART)\s*[-:]?\s*([A-D])\b/i;
  const secMatch = sectionRegex.exec(trimmed);
  if (secMatch) {
    return { type: 'section', value: `Section ${secMatch[1].toUpperCase()}` };
  }

  return null;
}

/**
 * Keyword-based scoring for a single question stem
 */
export function scoreStemSubject(content = '', explanation = '', optionsText = '') {
  const combined = `${content} ${explanation} ${optionsText}`.toLowerCase();

  const subjects = {
    Physics: [
      'cylinder', 'inclined plane', 'moment of inertia', 'rolling', 'slipping',
      'acceleration', 'velocity', 'force', 'momentum', 'torque', 'gravity',
      'lcr circuit', 'ac source', 'impedance', 'reactance', 'resonance',
      'power factor', 'current', 'voltage', 'capacitor', 'resistor', 'inductance',
      'thermodynamic', 'entropy', 'kinetic energy', 'potential energy', 'power',
      'friction', 'pendulum', 'projectile', 'rotational', 'angular', 'displacement',
      'kinematic', 'electric field', 'magnetic field', 'optics', 'wavelength', 'frequency',
      'refraction', 'interference', 'diffraction', 'lens', 'prism', 'newton',
      'joule', 'watt', 'coulomb', 'ampere', 'volt', 'ohm', 'farad', 'henry'
    ],
    Chemistry: [
      'coordination complex', 'coordination', 'complexes', 'diamagnetic', 'paramagnetic',
      'square planar', 'tetrahedral', 'octahedral', 'valence bond theory',
      'hybridization', 'oxidation state', 'ligand', 'molecule', 'atom', 'ion',
      'reaction', 'acid', 'base', 'ph', 'electrode', 'electrolysis', 'bond',
      'covalent', 'ionic', 'organic', 'inorganic', 'alkane', 'alkene', 'alkyne',
      'polymer', 'catalyst', 'equilibrium', 'mole', 'molarity', 'solvent',
      'titration', 'periodic table', 'element', 'metal', 'stoichiometry',
      'electron configuration', 'dsp2', 'sp3', 'd2sp3', 'carbocation', 'nucleophile',
      'electrophile', 'enthalpy', 'gibbs free energy', 'isomers', 'resonance energy'
    ],
    Mathematics: [
      'minimum value', 'maximum value', 'critical points', 'interval', 'calculus',
      'derivative', 'integral', 'matrix', 'determinant', 'polynomial', 'algebra',
      'probability', 'trigonometry', 'limit', 'function', 'equation', 'roots',
      'quadratic', 'differential equation', 'vector', 'geometry', 'f(x)', "f'(x)",
      'logarithm', 'permutation', 'combination', 'parabola', 'ellipse', 'hyperbola',
      'circle', 'tangent', 'normal', 'binomial theorem', 'sequence', 'series'
    ]
  };

  const scores = { Physics: 0, Chemistry: 0, Mathematics: 0 };
  for (const [subj, keywords] of Object.entries(subjects)) {
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        scores[subj] += 2;
      }
    }
  }

  return scores;
}

/**
 * Auto-segments questions into contiguous Physics, Chemistry, and Mathematics ranges.
 * Uses explicit headers first, standard NTA question boundaries second, or contiguous clustering.
 * @param {Array} questions - Questions list
 * @param {string} blueprintType - 'jee_main', 'jee_advanced', 'neet', 'custom'
 * @returns {Array} Updated questions with valid subject and section
 */
export function segmentQuestionsBySubject(questions = [], blueprintType = 'jee_main') {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  const total = questions.length;

  // 1. Check if questions already contain explicitly tagged distinct subjects
  const explicitSubjs = new Set(questions.map(q => q.subject).filter(s => ['Physics', 'Chemistry', 'Mathematics', 'Biology'].includes(s)));
  const hasMultipleExplicitSubjects = explicitSubjs.size >= 2;

  // If questions already have explicit distinct subjects from headers or vision AI, preserve and smooth contiguous blocks!
  if (hasMultipleExplicitSubjects) {
    return questions.map((q, idx) => {
      const qNum = q.question_number != null ? q.question_number : (idx + 1);
      let assignedSubject = q.subject;
      if (!assignedSubject || assignedSubject === 'General') {
        const prevSubj = questions[idx - 1]?.subject;
        const nextSubj = questions[idx + 1]?.subject;
        assignedSubject = (prevSubj && prevSubj !== 'General') ? prevSubj : (nextSubj && nextSubj !== 'General' ? nextSubj : 'Physics');
      }

      let assignedSection = q.section || 'Section A';
      if (q.formatType === 'numerical' || q.questionType === 'integer') {
        assignedSection = 'Section B';
      }

      const formatType = q.formatType || (q.questionType === 'integer' ? 'numerical' : 'single_mcq');
      const questionType = q.questionType || (formatType === 'numerical' ? 'integer' : (formatType === 'multi_mcq' ? 'multiple' : (formatType === 'matrix_match' ? 'match' : 'single')));

      return {
        ...q,
        question_number: qNum,
        subject: assignedSubject,
        section: assignedSection,
        formatType,
        questionType
      };
    });
  }

  // 2. Otherwise, apply standard exam range templates (JEE Main 90, JEE Main 75, or thirds)
  return questions.map((q, idx) => {
    const qNum = q.question_number != null ? q.question_number : (idx + 1);
    let assignedSubject = q.subject || 'General';
    let assignedSection = q.section || 'Section A';

    // ── Case A: Standard JEE Main Pattern (90 Questions total: 30 Qs per subject) ──
    if (total >= 70 && total <= 95) {
      if (qNum <= 30) {
        assignedSubject = 'Physics';
        assignedSection = qNum <= 20 ? 'Section A' : 'Section B';
      } else if (qNum <= 60) {
        assignedSubject = 'Chemistry';
        assignedSection = qNum <= 50 ? 'Section A' : 'Section B';
      } else {
        assignedSubject = 'Mathematics';
        assignedSection = qNum <= 80 ? 'Section A' : 'Section B';
      }
    }
    // ── Case B: Standard 75-Question JEE Main 2024/2025 Pattern (25 Qs per subject) ──
    else if (total >= 60 && total <= 75) {
      if (qNum <= 25) {
        assignedSubject = 'Physics';
        assignedSection = qNum <= 20 ? 'Section A' : 'Section B';
      } else if (qNum <= 50) {
        assignedSubject = 'Chemistry';
        assignedSection = qNum <= 45 ? 'Section A' : 'Section B';
      } else {
        assignedSubject = 'Mathematics';
        assignedSection = qNum <= 70 ? 'Section A' : 'Section B';
      }
    }
    // ── Case C: Contiguous Thirds Segmentation (e.g. 15, 30, 45, 60 questions) ──
    else if (total >= 15 && total % 3 === 0) {
      const perSubject = Math.floor(total / 3);
      const secSplit = Math.floor(perSubject * 0.7); // 70% Sec A, 30% Sec B

      if (idx < perSubject) {
        assignedSubject = 'Physics';
        assignedSection = (idx < secSplit) ? 'Section A' : 'Section B';
      } else if (idx < perSubject * 2) {
        assignedSubject = 'Chemistry';
        assignedSection = (idx - perSubject < secSplit) ? 'Section A' : 'Section B';
      } else {
        assignedSubject = 'Mathematics';
        assignedSection = (idx - perSubject * 2 < secSplit) ? 'Section A' : 'Section B';
      }
    }
    // ── Case D: Rely on question keyword analysis + local clustering ──
    else {
      const scores = scoreStemSubject(q.content, q.explanation, (q.options || []).join(' '));
      let bestSubj = 'Mathematics';
      let maxScore = 0;
      for (const [s, score] of Object.entries(scores)) {
        if (score > maxScore) {
          maxScore = score;
          bestSubj = s;
        }
      }
      assignedSubject = bestSubj;
    }

    // Assign format-based section rule: Numerical questions are Section B in standard JEE
    if (q.formatType === 'numerical' || q.questionType === 'integer') {
      assignedSection = 'Section B';
    }

    // Normalize formatType & questionType
    const formatType = q.formatType || (q.questionType === 'integer' ? 'numerical' : 'single_mcq');
    const questionType = q.questionType || (formatType === 'numerical' ? 'integer' : (formatType === 'multi_mcq' ? 'multiple' : (formatType === 'matrix_match' ? 'match' : 'single')));

    return {
      ...q,
      question_number: qNum,
      subject: assignedSubject,
      section: assignedSection,
      formatType,
      questionType
    };
  });
}

/**
 * Groups a flat question list into subjects dictionary conforming to TestCompiler schema
 */
export function groupQuestionsBySubject(questions = []) {
  const subjects = {
    Physics: [],
    Chemistry: [],
    Mathematics: []
  };

  for (const q of questions) {
    const subj = q.subject || 'General';
    if (subjects[subj]) {
      subjects[subj].push(q);
    } else {
      if (!subjects[subj]) subjects[subj] = [];
      subjects[subj].push(q);
    }
  }

  return subjects;
}

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC 5-STAGE REGEX PARSING ENGINE (ZERO AI DEPENDENCY)
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitizes noise from raw text (page numbers, headers, divider bars)
 */
export function cleanExtractedText(text) {
  if (!text || typeof text !== 'string') return '';

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

    // Dividers
    if (/^[-=_~*─━┄┅┈┉]{3,}$/.test(trimmed)) continue;
    // Page numbers
    if (/^page\s*\d+(\s*of\s*\d+)?$/i.test(trimmed)) continue;
    if (/^\d+\s*of\s*\d+$/i.test(trimmed)) continue;
    if (/^-\s*\d+\s*-$/.test(trimmed)) continue;
    // Standard test header artifacts
    if (/^(?:NATIONAL\s+TESTING\s+AGENCY|NTA\b|JEE\s*(?:Main|Advanced)?\s*(?:Mock|Practice)?\s*Test|MOCK\s+EXAMINATION|TEST\s+SERIES)/i.test(trimmed)) continue;
    if (/^CONFIDENTIAL\b/i.test(trimmed)) continue;
    if (/^(?:Time|Duration|Total|Maximum|Max)\s*[:=]\s*\d+/i.test(trimmed)) continue;
    if (/^(?:General\s*Instructions|Instructions|Read\s*the\s*following)/i.test(trimmed)) continue;

    cleanedLines.push(line);
  }

  return cleanedLines.join('\n').trim();
}

/**
 * Parses an individual question text block into structured question object
 */
export function parseQuestionBlock(block, defaultQuestionNumber = 1) {
  if (!block || typeof block !== 'string') return null;
  let workingText = block.trim();
  if (!workingText) return null;

  let explanation = '';
  let correctOptionIndex = -1;
  let detectedFormatType = 'single_mcq';
  let integerAnswer = '';
  let matrixMatchAnswer = '';

  // 1. Solution / Explanation extraction
  const explanationRegex = /(?:^|\n)\s*(?:Explanation|Solution|Sol|Hint|Derivation|Reason)\s*[\:\-\.]\s*([\s\S]+)$/i;
  const explMatch = explanationRegex.exec(workingText);
  if (explMatch) {
    explanation = explMatch[1].trim();
    workingText = workingText.substring(0, explMatch.index).trim();
  }

  // 2. Inline Answer Key extraction
  let rawInlineAnswer = '';
  const ansKeyRegex = /(?:^|\n)\s*(?:Ans(?:wer)?|Key|Correct(?:\s*Option)?)\s*[\:\-\=\.]*\s*[\(\[]?\s*([A-Da-d1-4]|-?\d+(?:\.\d+)?|[A-Da-d]\s*(?:->|-)\s*[\w,; ]+)\s*[\)\]]?(?:\s*|$)/i;
  const ansMatch = ansKeyRegex.exec(workingText);
  if (ansMatch) {
    rawInlineAnswer = ansMatch[1].trim();
    const upper = rawInlineAnswer.toUpperCase();
    if (upper === 'A' || upper === '1') correctOptionIndex = 0;
    else if (upper === 'B' || upper === '2') correctOptionIndex = 1;
    else if (upper === 'C' || upper === '3') correctOptionIndex = 2;
    else if (upper === 'D' || upper === '4') correctOptionIndex = 3;
    else if (/^-?\d+(?:\.\d+)?$/.test(rawInlineAnswer)) {
      integerAnswer = rawInlineAnswer;
      detectedFormatType = 'numerical';
    } else if (/->|;/.test(rawInlineAnswer)) {
      matrixMatchAnswer = rawInlineAnswer;
      detectedFormatType = 'matrix_match';
    }
    workingText = workingText.substring(0, ansMatch.index).trim();
  }

  // 3. Strip question prefix e.g. "Q.1", "1.", "Question 1:"
  workingText = workingText
    .replace(/^\s*(?:Q(?:ues(?:tion)?)?\.?\s*)\d+\s*[\.\:\)]?\s*/i, '')
    .replace(/^\s*Q\s*\d+\s*[\.\:\)]?\s*/i, '')
    .replace(/^\s*\[\d+\]\s*/, '')
    .replace(/^\s*\(\d+\)\s*/, '')
    .replace(/^\s*\d+\s*[\.\:\)]\s+/, '')
    .trim();

  // 4. Matrix Match Detection in Question Stem
  if (/Column\s*I\b.*Column\s*II\b/i.test(workingText) || /Match\s*List\s*I\s*with\s*List\s*II/i.test(workingText)) {
    detectedFormatType = 'matrix_match';
  }

  // 5. Numerical Question Detection (Integer stem without options or explicit numerical indicator)
  const isNumericalStem = /(?:numerical\s*value|nearest\s*integer|in\s*integer|decimal\s*place|value\s*is\s*_{2,})/i.test(workingText);

  // 6. Option Extraction
  let options = ['', '', '', ''];
  let questionStem = workingText;
  let optionsExtracted = false;

  // Strategy A: Inline horizontal markers: (A) ... (B) ... (C) ... (D)
  const inlineMarkerPatterns = [
    { m0: /(?:^|\s{2,}|\n)\s*\(\s*a\s*\)\s*/i, m1: /(?:\s{2,}|\n|\s)\s*\(\s*b\s*\)\s*/i, m2: /(?:\s{2,}|\n|\s)\s*\(\s*c\s*\)\s*/i, m3: /(?:\s{2,}|\n|\s)\s*\(\s*d\s*\)\s*/i },
    { m0: /(?:^|\s{2,}|\n)\s*\(\s*A\s*\)\s*/, m1: /(?:\s{2,}|\n|\s)\s*\(\s*B\s*\)\s*/, m2: /(?:\s{2,}|\n|\s)\s*\(\s*C\s*\)\s*/, m3: /(?:\s{2,}|\n|\s)\s*\(\s*D\s*\)\s*/ },
    { m0: /(?:^|\s{2,}|\n)\s*\[\s*A\s*\]\s*/i, m1: /(?:\s{2,}|\n|\s)\s*\[\s*B\s*\]\s*/i, m2: /(?:\s{2,}|\n|\s)\s*\[\s*C\s*\]\s*/i, m3: /(?:\s{2,}|\n|\s)\s*\[\s*D\s*\]\s*/i },
    { m0: /(?:^|\s{2,}|\n)\s*\(\s*1\s*\)\s*/, m1: /(?:\s{2,}|\n|\s)\s*\(\s*2\s*\)\s*/, m2: /(?:\s{2,}|\n|\s)\s*\(\s*3\s*\)\s*/, m3: /(?:\s{2,}|\n|\s)\s*\(\s*4\s*\)\s*/ }
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

    questionStem = workingText.substring(0, match0.index).trim();
    options[0] = rest0.substring(0, match1.index).trim();
    options[1] = rest1.substring(0, match2.index).trim();
    options[2] = rest2.substring(0, match3.index).trim();
    options[3] = rest2.substring(match3.index + match3[0].length).trim();
    optionsExtracted = true;
    break;
  }

  // Strategy B: Vertical Line-by-Line Options
  if (!optionsExtracted) {
    const lines = workingText.split('\n');
    let currentOptIdx = -1;
    const stemLines = [];
    const tempOpts = ['', '', '', ''];

    const lineOptRegexes = [
      /^\s*[\(\[]\s*([A-Da-d])\s*[\)\]]\s*(.*)$/,
      /^\s*([A-Da-d])\s*[\.\:\-\)]\s*(.*)$/,
      /^\s*[\(\[]\s*([1-4])\s*[\)\]]\s*(.*)$/,
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

  // Determine if question is numerical when no options were found
  const hasNumericAns = /^-?\d+(?:\.\d+)?$/.test(rawInlineAnswer.replace(/[\(\)\[\]]/g, '').trim());
  if (!optionsExtracted && (isNumericalStem || hasNumericAns)) {
    detectedFormatType = 'numerical';
    options = [];
    if (hasNumericAns) {
      integerAnswer = rawInlineAnswer.replace(/[\(\)\[\]]/g, '').trim();
    }
  } else if (!optionsExtracted && detectedFormatType !== 'numerical') {
    // Default fallback options for standard MCQs
    options = ['Option A', 'Option B', 'Option C', 'Option D'];
  }

  if (detectedFormatType === 'numerical') {
    options = [];
  } else {
    for (let i = 0; i < 4; i++) {
      let opt = (options[i] || '').trim();
      if (!opt) opt = `Option ${String.fromCharCode(65 + i)}`;
      opt = opt.replace(/^[\(\[]?\s*[A-Da-d1-4]\s*[\)\]\.\-\:]\s+/, '').trim();
      options[i] = opt;
    }
  }

  // Answer resolution
  if (correctOptionIndex === -1 && detectedFormatType === 'single_mcq') {
    correctOptionIndex = 0;
  }

  const correctAnswer = detectedFormatType === 'numerical'
    ? (integerAnswer || '0')
    : (detectedFormatType === 'matrix_match' ? (matrixMatchAnswer || 'A->P; B->Q; C->R; D->S') : (options[correctOptionIndex] || options[0] || ''));

  const subjectScores = scoreStemSubject(questionStem, explanation, options.join(' '));
  let bestSubj = 'General';
  let maxScore = 0;
  for (const [subj, score] of Object.entries(subjectScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestSubj = subj;
    }
  }

  return {
    question_number: defaultQuestionNumber,
    content: questionStem,
    options,
    correct_option_index: correctOptionIndex,
    correctOptionIdx: correctOptionIndex,
    correct_answer: correctAnswer,
    correctAnswer,
    integerAnswer: detectedFormatType === 'numerical' ? correctAnswer : '',
    matrixMatchAnswer: detectedFormatType === 'matrix_match' ? correctAnswer : '',
    explanation,
    subject: bestSubj,
    section: detectedFormatType === 'numerical' ? 'Section B' : 'Section A',
    sub_topic: 'General',
    difficulty: 'MEDIUM',
    formatType: detectedFormatType,
    questionType: detectedFormatType === 'numerical' ? 'integer' : (detectedFormatType === 'matrix_match' ? 'match' : 'single'),
    diagram_url: ''
  };
}

/**
 * Full Deterministic Pipeline with Two-Pass Answer Key and Subject Segmentation
 * @param {string} text - Raw exam text
 * @returns {Object} Structured compilation object with subjects map & questions array
 */
export function parseExtractedText(text) {
  if (!text || typeof text !== 'string') return [];

  // 1. Clean noise
  const cleaned = cleanExtractedText(text);
  if (!cleaned) return [];

  // 2. Pass 1: Split Answer Key section from Question text body
  const { questionsText, answerKeyText } = splitAnswerKeySection(cleaned);

  // 3. Question Boundary Identification
  const qBoundaryRegex = /(?:^|\n)\s*(?:(?:Q(?:ues(?:tion)?)?\.?\s*)(\d+)\s*[\.\:\)]?|(?:Q(?:ues(?:tion)?)?\s*(\d+)\s*[\.\:\)]?)|(\d+)\s*[\.\:\)]|\[(\d+)\]|\((\d+)\))\s+/gi;

  const rawMatches = [];
  let m;
  while ((m = qBoundaryRegex.exec(questionsText)) !== null) {
    const qNumStr = m[1] || m[2] || m[3] || m[4] || m[5];
    const qNum = parseInt(qNumStr, 10);
    rawMatches.push({
      index: m.index,
      fullLength: m[0].length,
      matchText: m[0],
      number: qNum
    });
  }

  // Monotonic sequence validation with subject-boundary reset awareness
  const validBoundaries = [];
  let lastValidNumber = 0;
  let lastValidIndex = 0;

  for (let i = 0; i < rawMatches.length; i++) {
    const cur = rawMatches[i];
    const hasExplicitQPrefix = /Q(?:ues(?:tion)?)?/i.test(cur.matchText);

    // Check if there is an intervening Subject Header between lastValidIndex and cur.index
    const interText = questionsText.substring(lastValidIndex, cur.index);
    let hasInterSubjectHeader = false;
    for (const line of interText.split('\n')) {
      const header = detectSubjectOrSectionHeader(line);
      if (header && header.type === 'subject') {
        hasInterSubjectHeader = true;
        break;
      }
    }

    if (validBoundaries.length === 0) {
      validBoundaries.push(cur);
      lastValidNumber = cur.number || 1;
      lastValidIndex = cur.index + cur.fullLength;
    } else {
      if (hasInterSubjectHeader) {
        // A new subject section began, accept reset number
        validBoundaries.push(cur);
        lastValidNumber = cur.number || 1;
        lastValidIndex = cur.index + cur.fullLength;
      } else if (hasExplicitQPrefix) {
        validBoundaries.push(cur);
        lastValidNumber = cur.number || (lastValidNumber + 1);
        lastValidIndex = cur.index + cur.fullLength;
      } else {
        if (cur.number > lastValidNumber || cur.number === lastValidNumber + 1) {
          validBoundaries.push(cur);
          lastValidNumber = cur.number;
          lastValidIndex = cur.index + cur.fullLength;
        }
      }
    }
  }

  let parsedQuestions = [];
  let activeSubject = null;
  let activeSection = 'Section A';

  if (validBoundaries.length === 0) {
    // Secondary fallback: split by double newlines
    const blocks = questionsText.split(/\n\s*\n/).filter(b => b.trim().length > 20);
    blocks.forEach((block, idx) => {
      for (const line of block.split('\n')) {
        const header = detectSubjectOrSectionHeader(line);
        if (header) {
          if (header.type === 'subject') activeSubject = header.value;
          if (header.type === 'section') activeSection = header.value;
        }
      }

      const qObj = parseQuestionBlock(block, idx + 1);
      if (qObj && qObj.content) {
        if (activeSubject) qObj.subject = activeSubject;
        if (activeSection) qObj.section = activeSection;
        parsedQuestions.push({
          id: `pdf-q-${idx + 1}-${Date.now()}`,
          ...qObj
        });
      }
    });
  } else {
    for (let i = 0; i < validBoundaries.length; i++) {
      const startIdx = validBoundaries[i].index;
      const endIdx = (i + 1 < validBoundaries.length) ? validBoundaries[i + 1].index : questionsText.length;

      // Inspect pre-question text for subject/section headers
      const prevEnd = (i === 0) ? 0 : (validBoundaries[i - 1].index + validBoundaries[i - 1].fullLength);
      const preText = questionsText.substring(prevEnd, startIdx);
      for (const line of preText.split('\n')) {
        const header = detectSubjectOrSectionHeader(line);
        if (header) {
          if (header.type === 'subject') activeSubject = header.value;
          if (header.type === 'section') activeSection = header.value;
        }
      }

      const block = questionsText.substring(startIdx, endIdx).trim();
      const qNum = validBoundaries[i].number || (i + 1);
      const qObj = parseQuestionBlock(block, qNum);
      if (qObj && qObj.content) {
        if (activeSubject) qObj.subject = activeSubject;
        if (activeSection) qObj.section = activeSection;
        parsedQuestions.push({
          id: `pdf-q-${qNum}-${Date.now()}`,
          ...qObj
        });
      }
    }
  }

  // 4. Pass 2: Parse and Bind End-of-PDF Answer Key Matrix if present
  let keysBoundCount = 0;
  if (answerKeyText) {
    const answerMap = parseAnswerKeyMatrix(answerKeyText);
    if (Object.keys(answerMap).length > 0) {
      const boundResult = bindAnswerKeysToQuestions(parsedQuestions, answerMap);
      parsedQuestions = boundResult.questions;
      keysBoundCount = boundResult.boundCount;
    }
  }

  // 5. Multi-Subject Boundary Auto-Detection
  parsedQuestions = segmentQuestionsBySubject(parsedQuestions);

  return parsedQuestions;
}

/**
 * Returns complete compiler payload structure
 */
export function compileTestStructure(questions = [], metadata = {}) {
  const qList = Array.isArray(questions) ? questions : (questions?.questions || []);
  const segmented = segmentQuestionsBySubject(qList);
  const subjectsMap = groupQuestionsBySubject(segmented);

  const diagramsCount = metadata.diagrams_extracted != null
    ? metadata.diagrams_extracted
    : segmented.filter(q => q.has_diagram || Boolean(q.diagram_url) || Boolean(q.image_url)).length;

  const boundCount = metadata.answer_keys_bound != null
    ? metadata.answer_keys_bound
    : segmented.filter(q => Boolean(q.correct_answer) || (typeof q.correct_option_index === 'number' && q.correct_option_index >= 0)).length;

  return {
    title: metadata.title || 'JEE Main Mock Assessment',
    blueprint_type: metadata.blueprint_type || 'jee_main',
    subjects: subjectsMap,
    total_questions: segmented.length,
    diagrams_extracted: diagramsCount,
    answer_keys_bound: boundCount,
    questions: segmented
  };
}

// Aliases for seamless imports across test runners and services
export function parseTextToQuestions(text) {
  return parseExtractedText(text);
}

export function parseExamPdfText(text) {
  return parseExtractedText(text);
}

/**
 * Pure Node.js fallback to extract text from PDF streams using built-in zlib.
 * Zero external library dependencies, zero DOMMatrix/worker issues.
 */
export function extractTextFromPdfStream(pdfBuffer) {
  if (!pdfBuffer || !pdfBuffer.length) return '';
  try {
    const zlib = require('zlib');
    const content = pdfBuffer.toString('binary');
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let text = '';
    let match;

    while ((match = streamRegex.exec(content)) !== null) {
      const rawStream = Buffer.from(match[1], 'binary');
      let decompressed = null;
      try {
        decompressed = zlib.inflateSync(rawStream);
      } catch (e) {
        try {
          decompressed = zlib.inflateRawSync(rawStream);
        } catch (e2) {}
      }

      if (decompressed) {
        const str = decompressed.toString('latin1');
        // Look for text blocks enclosed in BT ... ET
        const btRegex = /BT[\s\S]*?ET/g;
        let btMatch;
        while ((btMatch = btRegex.exec(str)) !== null) {
          const block = btMatch[0];
          let blockText = '';

          // Match (text) Tj
          const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
          let tjMatch;
          while ((tjMatch = tjRegex.exec(block)) !== null) {
            blockText += tjMatch[1].replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')') + ' ';
          }

          // Match [(text)] TJ
          const tJRegex = /\[([\s\S]*?)\]\s*TJ/g;
          let tJMatch;
          while ((tJMatch = tJRegex.exec(block)) !== null) {
            const inner = tJMatch[1];
            const innerTj = /\(([\s\S]*?)\)/g;
            let itm;
            while ((itm = innerTj.exec(inner)) !== null) {
              blockText += itm[1].replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
            }
            blockText += ' ';
          }

          if (blockText.trim()) {
            text += blockText.trim() + '\n';
          }
        }
      }
    }
    return text.trim();
  } catch (err) {
    console.warn('[PDF Vision Parser] Stream extraction error:', err?.message || err);
    return '';
  }
}

/**
 * Extracts raw text from a PDF Buffer with support for both pdf-parse v2/v1
 * and pure Node.js zlib stream extraction, guaranteed to run in any serverless environment.
 */
export async function extractTextFromPdfBuffer(pdfBuffer) {
  if (!pdfBuffer || !pdfBuffer.length) return '';

  // 1. Try pdf-parse v2 class API
  try {
    const pdfParsePkg = await import('pdf-parse');
    const PDFParseClass = pdfParsePkg.PDFParse || pdfParsePkg.default?.PDFParse;
    if (typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: pdfBuffer });
      const result = await parser.getText();
      if (result && typeof result.text === 'string' && result.text.trim()) {
        return result.text;
      }
    }
  } catch (err2) {
    console.warn('[PDF Vision Parser] v2 PDFParse getText warning:', err2?.message || err2);
  }

  // 2. Try pdf-parse v1 function API
  try {
    const pdfParsePkg = await import('pdf-parse');
    const pdfFn = typeof pdfParsePkg === 'function' ? pdfParsePkg : (pdfParsePkg.default || pdfParsePkg);
    if (typeof pdfFn === 'function') {
      const parsed = await pdfFn(pdfBuffer);
      if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) {
        return parsed.text;
      }
    }
  } catch (err1) {
    console.warn('[PDF Vision Parser] v1 pdfParse function warning:', err1?.message || err1);
  }

  // 3. Try pure Node.js zlib stream text extraction (zero dependencies, 100% serverless safe)
  try {
    const streamText = extractTextFromPdfStream(pdfBuffer);
    if (streamText && streamText.trim()) {
      return streamText;
    }
  } catch (streamErr) {
    console.warn('[PDF Vision Parser] Stream fallback warning:', streamErr?.message || streamErr);
  }

  return '';
}

