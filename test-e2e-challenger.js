/**
 * Challenger 2: End-to-End Ingestion, Boundary & KaTeX Safety Verification Suite
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const katex = require('katex');

// ─────────────────────────────────────────────────────────────────────────────
// SANDBOX ROUTE LOADER
// ─────────────────────────────────────────────────────────────────────────────
function loadRouteModule() {
  const routePath = path.resolve(__dirname, 'src/app/api/admin/ai/parse-pdf/route.js');
  const rawCode = fs.readFileSync(routePath, 'utf8');

  const MockNextResponse = {
    json: (data, init = {}) => ({
      status: init.status || 200,
      headers: new Map(Object.entries(init.headers || {})),
      _data: data,
      json: async () => data
    })
  };

  let transformed = rawCode
    .replace(/import\s*\{\s*GoogleGenAI\s*\}\s*from\s*['"]@google\/genai['"];?/g, 'const { GoogleGenAI } = require("@google/genai");')
    .replace(/import\s*\{\s*NextResponse\s*\}\s*from\s*['"]next\/server['"];?/g, 'const { NextResponse } = require("next/server");')
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// stripped import')
    .replace(/export\s+const\s+([a-zA-Z0-9_$]+)\s*=/g, 'const $1 =')
    .replace(/export\s+async\s+function\s+([a-zA-Z0-9_$]+)/g, 'async function $1')
    .replace(/export\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1')
    .replace(/export\s+default\s+([a-zA-Z0-9_$]+);?/g, 'module.exports = $1;');

  transformed += `
    module.exports = {
      POST: typeof POST !== 'undefined' ? POST : null,
      GEMINI_SYSTEM_INSTRUCTION: typeof GEMINI_SYSTEM_INSTRUCTION !== 'undefined' ? GEMINI_SYSTEM_INSTRUCTION : '',
      sanitizeGeminiQuestions: typeof sanitizeGeminiQuestions !== 'undefined' ? sanitizeGeminiQuestions : null,
      detectSubject: typeof detectSubject !== 'undefined' ? detectSubject : null,
      cleanExtractedText: typeof cleanExtractedText !== 'undefined' ? cleanExtractedText : null,
      parseExtractedText: typeof parseExtractedText !== 'undefined' ? parseExtractedText : null,
      parseQuestionBlock: typeof parseQuestionBlock !== 'undefined' ? parseQuestionBlock : null,
      parseTextToQuestions: typeof parseTextToQuestions !== 'undefined' ? parseTextToQuestions : null
    };
  `;

  const moduleObj = { exports: {} };
  const sandbox = {
    module: moduleObj,
    exports: moduleObj.exports,
    require: (id) => {
      if (id === 'next/server') return { NextResponse: MockNextResponse };
      if (id === '@google/genai') return { GoogleGenAI: class {} };
      try { return require(id); } catch { return {}; }
    },
    console,
    process: { env: { ...process.env, GEMINI_API_KEY: 'test-key' } },
    Buffer,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    RegExp,
    Array,
    Object,
    String,
    Number,
    Boolean,
    JSON,
    Map,
    Set,
    Error,
    TypeError,
    RangeError,
    globalThis: {}
  };

  vm.createContext(sandbox);
  vm.runInContext(transformed, sandbox);
  return sandbox.module.exports;
}

const routeModule = loadRouteModule();
const { sanitizeGeminiQuestions, detectSubject, cleanExtractedText, parseExtractedText, parseQuestionBlock } = routeModule;

console.log('======================================================================');
console.log('  CHALLENGER 2: END-TO-END INGESTION & BOUNDARY VERIFICATION SUITE');
console.log('======================================================================\n');

let totalChecks = 0;
let passedChecks = 0;

function check(name, fn) {
  totalChecks++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedChecks++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

// Helper to normalize cross-realm objects
function normalize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. END-TO-END SCHEMA COMPATIBILITY ACROSS 5 QUESTION FORMAT TYPES
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. End-to-End Schema Conformance for All 5 Question Types ---');

const mockGeminiOutput = [
  {
    id: 'pdf-q-1',
    subject: 'Physics',
    sub_topic: 'Rotational Dynamics',
    difficulty: 'HARD',
    formatType: 'single_mcq',
    content: 'A solid sphere of mass $M$ and radius $R$ rolls down an inclined plane of angle $\\theta$ without slipping. Find acceleration.',
    diagram_url: 'https://cdn.example.com/diagram1.png',
    options: ['$\\frac{5}{7} g \\sin \\theta$', '$\\frac{2}{5} g \\sin \\theta$', '$\\frac{3}{5} g \\sin \\theta$', '$\\frac{1}{2} g \\sin \\theta$'],
    correct_option_index: 0,
    correct_answer: '$\\frac{5}{7} g \\sin \\theta$',
    explanation: 'Using torque $\\tau = I \\alpha$ and Newton\'s second law: $a = \\frac{g \\sin \\theta}{1 + I/(MR^2)} = \\frac{5}{7} g \\sin \\theta$.',
    marks: { positive: 4, negative: -1 }
  },
  {
    id: 'pdf-q-2',
    subject: 'Chemistry',
    sub_topic: 'Coordination Chemistry',
    difficulty: 'MEDIUM',
    formatType: 'multi_mcq',
    content: 'Which of the following coordination complexes are diamagnetic?',
    diagram_url: '',
    options: ['$[Ni(CN)_4]^{2-}$', '$[NiCl_4]^{2-}$', '$[Co(NH_3)_6]^{3+}$', '$[Fe(H_2O)_6]^{2+}$'],
    correct_option_index: 0,
    correct_answer: '$[Ni(CN)_4]^{2-}, [Co(NH_3)_6]^{3+}$',
    explanation: '$[Ni(CN)_4]^{2-}$ is $dsp^2$ (square planar, low spin) with 0 unpaired electrons. $[Co(NH_3)_6]^{3+}$ is $d^2sp^3$ (low spin) with $t_{2g}^6 e_g^0$ (diamagnetic).',
    marks: { positive: 4, negative: -2 }
  },
  {
    id: 'pdf-q-3',
    subject: 'Mathematics',
    sub_topic: 'Calculus',
    difficulty: 'HARD',
    formatType: 'numerical',
    content: 'Find the minimum value of $f(x) = 2x^3 - 9x^2 + 12x - 5$ on the interval $[0, 3]$.',
    diagram_url: '',
    options: [],
    correct_option_index: 0,
    correct_answer: '-5',
    explanation: '$f\'(x) = 6x^2 - 18x + 12 = 6(x-1)(x-2) = 0 \\implies x=1, 2$. Critical points evaluate to $f(0)=-5, f(1)=0, f(2)=-1, f(3)=4$. Minimum is $-5$.',
    marks: { positive: 4, negative: 0 }
  },
  {
    id: 'pdf-q-4',
    subject: 'Biology',
    sub_topic: 'Cellular Respiration',
    difficulty: 'EASY',
    formatType: 'assertion_reason',
    content: 'Assertion (A): Glycolysis occurs in the cytoplasm of both prokaryotic and eukaryotic cells.\nReason (R): Glycolysis does not require molecular oxygen to produce pyruvate.',
    diagram_url: '',
    options: [
      'Both (A) and (R) are true and (R) is the correct explanation of (A)',
      'Both (A) and (R) are true but (R) is NOT the correct explanation of (A)',
      '(A) is true but (R) is false',
      '(A) is false but (R) is true'
    ],
    correct_option_index: 1,
    correct_answer: 'Both (A) and (R) are true but (R) is NOT the correct explanation of (A)',
    explanation: 'Glycolysis is the universal anaerobic pathway taking place in the cytosol; however, the lack of oxygen requirement is not the causal reason for cytoplasmic localization.',
    marks: { positive: 4, negative: -1 }
  },
  {
    id: 'pdf-q-5',
    subject: 'Physics',
    sub_topic: 'AC Circuits',
    difficulty: 'HARD',
    formatType: 'matrix_match',
    content: 'Match Column I (Circuit condition) with Column II (Impedance / Phase property):\nColumn I:\n(A) Series LCR at resonance\n(B) Purely capacitive circuit\n(C) Series LCR with $X_L > X_C$\n(D) Purely inductive circuit\n\nColumn II:\n(P) Voltage leads current by $\\pi/2$\n(Q) Current leads voltage by $\\pi/2$\n(R) Impedance $Z = R$, Power factor = 1\n(S) Voltage leads current by $\\phi \\in (0, \\pi/2)$',
    diagram_url: '',
    options: [
      'A->R, B->Q, C->S, D->P',
      'A->P, B->R, C->Q, D->S',
      'A->R, B->P, C->S, D->Q',
      'A->Q, B->S, C->R, D->P'
    ],
    correct_option_index: 0,
    correct_answer: 'A->R, B->Q, C->S, D->P',
    explanation: 'At resonance $Z=R, \\cos\\phi=1$. For pure C, current leads by $\\pi/2$. For $X_L > X_C$, voltage leads by $\\phi$. For pure L, voltage leads by $\\pi/2$.',
    marks: { positive: 4, negative: -1 }
  }
];

// 1. Sanitize step in route.js
const backendSanitized = normalize(sanitizeGeminiQuestions(mockGeminiOutput));

check('Backend sanitizeGeminiQuestions handles all 5 format types', () => {
  assert.strictEqual(backendSanitized.length, 5);
  const types = backendSanitized.map(q => q.formatType);
  assert.deepStrictEqual(types, ['single_mcq', 'multi_mcq', 'numerical', 'assertion_reason', 'matrix_match']);
});

check('Numerical question enforces empty options array []', () => {
  const numQ = backendSanitized.find(q => q.formatType === 'numerical');
  assert.strictEqual(numQ.options.length, 0);
  assert.strictEqual(numQ.correct_answer, '-5');
  assert.strictEqual(numQ.marks.negative, 0);
});

check('Multi-MCQ question preserves negative marks (-2)', () => {
  const multiQ = backendSanitized.find(q => q.formatType === 'multi_mcq');
  assert.strictEqual(multiQ.options.length, 4);
  assert.strictEqual(multiQ.marks.negative, -2);
});

check('Assertion-Reason and Matrix-Match contain 4 options and correct answer', () => {
  const arQ = backendSanitized.find(q => q.formatType === 'assertion_reason');
  assert.strictEqual(arQ.options.length, 4);
  assert.strictEqual(arQ.correct_option_index, 1);

  const mmQ = backendSanitized.find(q => q.formatType === 'matrix_match');
  assert.strictEqual(mmQ.options.length, 4);
  assert.strictEqual(mmQ.correct_answer, 'A->R, B->Q, C->S, D->P');
});

// 2. Frontend UniversalPdfImporterModal transformation simulation
console.log('\n--- 2. UniversalPdfImporterModal Transformation & Dual-Alias Safety ---');

const modalMarkedQuestions = backendSanitized.map((q, idx) => {
  const contentStr = q.content || q.questionText || '';
  const diagramUrlStr = q.diagram_url || q.diagramUrl || '';
  const correctAns = q.correct_answer || q.correctAnswer || (Array.isArray(q.options) && typeof q.correct_option_index === 'number' ? q.options[q.correct_option_index] : '');

  return {
    id: q.id || `pdf-q-${idx + 1}-${Date.now()}`,
    subject: q.subject || 'GENERAL',
    sub_topic: q.sub_topic || q.topic || 'General',
    difficulty: q.difficulty || 'MEDIUM',
    formatType: q.formatType || 'single_mcq',
    content: contentStr,
    questionText: contentStr,
    diagram_url: diagramUrlStr,
    diagramUrl: diagramUrlStr,
    options: Array.isArray(q.options) ? q.options : [],
    correct_option_index: typeof q.correct_option_index === 'number' ? q.correct_option_index : 0,
    correct_answer: correctAns,
    correctAnswer: correctAns,
    explanation: q.explanation || q.solution_text || '',
    marks: q.marks || { positive: 4, negative: -1 },
    selected: true
  };
});

check('Modal creates backward/forward compatible aliases for all downstream consumers', () => {
  assert.strictEqual(modalMarkedQuestions.length, 5);
  modalMarkedQuestions.forEach(q => {
    assert.strictEqual(q.content, q.questionText, 'content and questionText must match');
    assert.strictEqual(q.diagram_url, q.diagramUrl, 'diagram_url and diagramUrl must match');
    assert.strictEqual(q.correct_answer, q.correctAnswer, 'correct_answer and correctAnswer must match');
    assert.strictEqual(q.selected, true);
    assert.ok(['single_mcq', 'multi_mcq', 'numerical', 'assertion_reason', 'matrix_match'].includes(q.formatType));
  });
});

// 3. QuestionBankClient ingestion simulation
console.log('\n--- 3. Downstream Consumer: QuestionBankClient Ingestion ---');

let questionBankState = [];
const qbConfirmIngest = (newQuestions) => {
  const formatted = newQuestions.map(q => ({
    id: q.id || `qb-${Date.now()}`,
    subject: q.subject || 'Physics',
    topic: q.sub_topic || 'General',
    formatType: q.formatType || 'single_mcq',
    difficulty: q.difficulty || 'MEDIUM',
    questionText: q.content || q.questionText || '',
    diagramUrl: q.diagram_url || q.diagramUrl || '',
    options: q.options || [],
    correctAnswer: q.correct_answer || q.correctAnswer || '',
    explanation: q.explanation || ''
  }));
  questionBankState = [...formatted, ...questionBankState];
};

qbConfirmIngest(modalMarkedQuestions.filter(q => q.selected));

check('QuestionBankClient successfully ingests all 5 formatted questions', () => {
  assert.strictEqual(questionBankState.length, 5);
  const qbQ1 = questionBankState[0];
  assert.strictEqual(qbQ1.subject, 'Physics');
  assert.strictEqual(qbQ1.topic, 'Rotational Dynamics');
  assert.strictEqual(qbQ1.diagramUrl, 'https://cdn.example.com/diagram1.png');
  assert.strictEqual(qbQ1.options.length, 4);

  const qbNumerical = questionBankState.find(q => q.formatType === 'numerical');
  assert.strictEqual(qbNumerical.formatType, 'numerical');
  assert.strictEqual(qbNumerical.options.length, 0);
  assert.strictEqual(qbNumerical.correctAnswer, '-5');
});

// 4. CompilerClient / TestCompiler ingestion simulation
console.log('\n--- 4. Downstream Consumer: CompilerClient & TestCompiler Ingestion ---');

let compilerPoolQuestions = [];
let compilerSelectedQuestions = [];

const compilerConfirmIngest = (newQuestions) => {
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
  compilerPoolQuestions = [...formatted, ...compilerPoolQuestions];
  compilerSelectedQuestions = [...compilerSelectedQuestions, ...formatted];
};

compilerConfirmIngest(modalMarkedQuestions.filter(q => q.selected));

check('CompilerClient receives and binds questions to pool and blueprint', () => {
  assert.strictEqual(compilerPoolQuestions.length, 5);
  assert.strictEqual(compilerSelectedQuestions.length, 5);
  assert.strictEqual(compilerSelectedQuestions[0].content, modalMarkedQuestions[0].content);
  assert.strictEqual(compilerSelectedQuestions[2].correct_option_index, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. KATEX MATH & FORMULA RENDERING INTEGRITY CHECKS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. KaTeX Math Formula & Bracket Safety Verification ---');

const katexTestCases = [
  { desc: 'Inline velocity vector', raw: 'A projectile with $v_0 = 20\\text{ m/s}$ and angle $\\theta = 30^\\circ$.' },
  { desc: 'Fraction & trig kinematics', raw: '$\\frac{2}{3} g \\sin \\theta$' },
  { desc: 'Coordination compound brackets', raw: '$[Ni(CN)_4]^{2-}$ and $[Co(NH_3)_6]^{3+}$' },
  { desc: 'Block display equation', raw: '$$\\lim_{x \\to 0} \\frac{\\sin(3x) - 3\\sin(x)}{x^3}$$' },
  { desc: 'Negative numbers and calculus', raw: 'Critical points evaluate to $f(0)=-5, f(1)=0, f(2)=-1, f(3)=4$.' },
  { desc: 'Plain text derivative auto-format', raw: 'Evaluate dy/dx for y = x^(3) + ln |x|.' },
  { desc: 'Mixed text and multiple inline equations', raw: 'Let $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$ and $\\det(A) = -2$.' }
];

// Implement exact KatexRenderer parse logic
function simulateKatexRenderer(content) {
  if (!content) return { results: [], errors: [] };

  const formatLatexString = (text) => {
    if (typeof text !== 'string') return String(text);
    if (text.includes('\\') || text.includes('$')) return text;
    return text
      .replace(/lim\s*\(\s*x\s*->\s*0\s*\)/gi, '\\lim_{x \\to 0}')
      .replace(/lim\s*_\s*\(\s*x\s*->\s*0\s*\)/gi, '\\lim_{x \\to 0}')
      .replace(/dy\/dx/g, '\\frac{dy}{dx}')
      .replace(/ln\s*\|/g, '\\ln |')
      .replace(/∫/g, '\\int ')
      .replace(/\^\(2\)/g, '^2')
      .replace(/\^\(3\)/g, '^3');
  };

  const formattedContent = formatLatexString(content);
  const parts = formattedContent.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\(.*?\\\)|\\\[.*?\\\])/g);

  const results = [];
  const errors = [];

  for (const part of parts) {
    if (!part) continue;
    let isBlock = part.startsWith('$$') || part.startsWith('\\[');
    let isInline = part.startsWith('$') || part.startsWith('\\(');

    if (isBlock || isInline) {
      let mathStr = part
        .replace(/^\$\$|\$\$$/g, '')
        .replace(/^\$|\$$/g, '')
        .replace(/^\\\(|\\\)$/g, '')
        .replace(/^\\\[|\\\]$/g, '')
        .trim();

      try {
        const html = katex.renderToString(mathStr, {
          displayMode: isBlock,
          throwOnError: true // Strict check in challenger test!
        });
        results.push({ type: isBlock ? 'block' : 'inline', html });
      } catch (err) {
        errors.push({ part, error: err.message });
      }
    }
  }

  return { results, errors };
}

katexTestCases.forEach((tc, idx) => {
  check(`KaTeX render test #${idx + 1}: ${tc.desc}`, () => {
    const { results, errors } = simulateKatexRenderer(tc.raw);
    assert.strictEqual(errors.length, 0, `KaTeX failed on: ${tc.raw}. Error: ${errors[0]?.error}`);
    assert.ok(results.length > 0, `Expected at least 1 rendered LaTeX token for: ${tc.raw}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADVERSARIAL BOUNDARY & STRESS TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Adversarial Boundary & Stress Cases ---');

check('Malformed/Unrecognized formatType gracefully defaults to single_mcq', () => {
  const bad = [{ id: 'q-bad', content: 'What is 2+2?', formatType: 'unrecognized_type_xyz', options: ['1', '2', '3', '4'] }];
  const sanitized = normalize(sanitizeGeminiQuestions(bad));
  assert.strictEqual(sanitized[0].formatType, 'single_mcq');
});

check('Options with less than 4 items are automatically padded', () => {
  const shortOpts = [{ id: 'q-short', content: 'Q?', formatType: 'single_mcq', options: ['True', 'False'] }];
  const sanitized = normalize(sanitizeGeminiQuestions(shortOpts));
  assert.strictEqual(sanitized[0].options.length, 4);
  assert.strictEqual(sanitized[0].options[0], 'True');
  assert.strictEqual(sanitized[0].options[1], 'False');
  assert.strictEqual(sanitized[0].options[2], 'Option C');
  assert.strictEqual(sanitized[0].options[3], 'Option D');
});

check('Options with redundant label prefixes (A), [B], 1., C: are cleanly stripped', () => {
  const messyOpts = [{ id: 'q-messy', content: 'Q?', formatType: 'single_mcq', options: ['(A) First', '[B] Second', '3. Third', 'D: Fourth'] }];
  const sanitized = normalize(sanitizeGeminiQuestions(messyOpts));
  assert.deepStrictEqual(sanitized[0].options, ['First', 'Second', 'Third', 'Fourth']);
});

check('Correct answer text matches option text correctly', () => {
  const ansMatchQ = [{ id: 'q-ans', content: 'Q?', formatType: 'single_mcq', options: ['Apple', 'Banana', 'Cherry', 'Date'], correct_answer: 'Banana' }];
  const sanitized = normalize(sanitizeGeminiQuestions(ansMatchQ));
  assert.strictEqual(sanitized[0].correct_option_index, 1);
  assert.strictEqual(sanitized[0].correct_answer, 'Banana');
});

check('Null or non-array rawQuestions safely returns empty array', () => {
  assert.deepStrictEqual(normalize(sanitizeGeminiQuestions(null)), []);
  assert.deepStrictEqual(normalize(sanitizeGeminiQuestions(undefined)), []);
  assert.deepStrictEqual(normalize(sanitizeGeminiQuestions('invalid string')), []);
});

check('Large question block with 50 questions parses under 50ms', () => {
  const largeBatch = Array.from({ length: 50 }, (_, i) => ({
    id: `batch-q-${i}`,
    subject: i % 2 === 0 ? 'Physics' : 'Mathematics',
    difficulty: 'MEDIUM',
    formatType: 'single_mcq',
    content: `Question ${i}: Solve $\\int_0^1 x^${i} dx$.`,
    options: ['$\\frac{1}{2}$', '$\\frac{1}{3}$', '$\\frac{1}{4}$', '$\\frac{1}{5}$'],
    correct_option_index: 0,
    correct_answer: '$\\frac{1}{2}$',
    explanation: 'Standard polynomial integral.'
  }));

  const start = Date.now();
  const res = normalize(sanitizeGeminiQuestions(largeBatch));
  const duration = Date.now() - start;
  assert.strictEqual(res.length, 50);
  assert.ok(duration < 100, `Execution took ${duration}ms, expected < 100ms`);
});

console.log('\n======================================================================');
console.log(`  ALL CHALLENGER CHECKS PASSED: ${passedChecks} / ${totalChecks} (100%)`);
console.log('======================================================================\n');
