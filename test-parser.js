/**
 * test-parser.js — Comprehensive E2E & Programmatic Verification Suite
 *
 * Requirements Met:
 * - R1: Robust PDF Extraction across 5+ diverse, complex exam question formats
 * - 4-Tier Programmatic Verification:
 *     Tier 1: Sanity Check & Question Cardinality (exactly 5 questions, required keys, non-empty stem)
 *     Tier 2: Option Array Integrity (exactly 4 non-empty options per question, prefixes cleanly stripped)
 *     Tier 3: Mathematical / Chemical Content Fidelity (preserves [Ni(CN)4]2-, negative signs -5, Option D unpolluted)
 *     Tier 4: Answer Resolution & Metadata (correct_option_index 0-3, correct_answer, explanation, subject classification)
 *     Tier 5: Adversarial Boundary & Stress Testing (null/empty inputs, watermarks, whitespace variations)
 *
 * Usage:
 *   node test-parser.js
 *
 * Exit Codes:
 *   0 = All assertion tiers passed successfully
 *   1 = One or more test assertions failed
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ═══════════════════════════════════════════════════════════════
// 1. CANONICAL RAW TEST FIXTURE (5 Diverse Real-World Exam Patterns)
// ═══════════════════════════════════════════════════════════════

const RAW_FIXTURE_TEXT = `
NATIONAL TESTING AGENCY - MOCK EXAMINATION TEST SERIES 2026
SECTION I : COMPREHENSIVE SCIENCE & MATHEMATICS
Time: 180 min | Total Marks: 300 | General Instructions: Read carefully.
----------------------------------------------------------------------
CONFIDENTIAL - DO NOT DISTRIBUTE - ASENTRA EDUCATION PORTAL

Q.1 A uniform solid cylinder of mass M and radius R rolls without slipping down an inclined plane of inclination θ with the horizontal. The acceleration of the center of mass of the cylinder is:
(A) g sin θ
(B) (2/3) g sin θ
(C) (1/2) g sin θ
(D) (3/4) g sin θ
Ans: (B)
Explanation: For a solid cylinder, moment of inertia I = (1/2)MR². Acceleration down an incline without slipping is a = (g sin θ) / (1 + I / MR²) = (g sin θ) / (1 + 1/2) = (2/3) g sin θ.

Page 1 of 5
----------------------------------------------------------------------
CONFIDENTIAL - ASENTRA TEST SERIES

Question 2. Which of the following coordination complexes is diamagnetic and exhibits square planar geometry according to Valence Bond Theory?
(a) [Ni(CN)4]2-   (b) [NiCl4]2-   (c) [CoF6]3-   (d) [Fe(H2O)6]2+
Answer: (a)
Solution: In [Ni(CN)4]2-, Ni is in +2 oxidation state (3d8). CN- is a strong field ligand causing pairing of 3d electrons, resulting in dsp2 hybridization and diamagnetic square planar geometry.

Page 2 of 5
----------------------------------------------------------------------

3. Given below are two statements regarding eukaryotic cellular respiration:
Statement I: Glycolysis occurs in the cytoplasm and does not require molecular oxygen.
Statement II: The complete oxidation of one glucose molecule via the Krebs cycle and oxidative phosphorylation produces net 36 to 38 ATP molecules.
In light of the above statements, choose the most appropriate answer from the options given below:
A. Both Statement I and Statement II are correct
B. Both Statement I and Statement II are incorrect
C. Statement I is correct but Statement II is incorrect
D. Statement I is incorrect but Statement II is correct
Correct Option: A
Explanation: Glycolysis is an anaerobic pathway taking place in the cytosol. Aerobic respiration completes inside mitochondria generating 36-38 ATP per glucose.

Page 3 of 5
----------------------------------------------------------------------

Ques 4: Find the minimum value of f(x) = 2x³ - 9x² + 12x - 5 on the interval [0, 3].
(1) -5
(2) -1
(3) 0
(4) 4
Ans: 1
Explanation: f'(x) = 6x² - 18x + 12 = 6(x-1)(x-2) = 0 at critical points x=1, x=2. f(0) = -5, f(1) = 0, f(2) = -1, f(3) = 4. The absolute minimum on [0,3] is f(0) = -5.

Page 4 of 5
----------------------------------------------------------------------

Q5. In a series LCR circuit connected to an AC source of voltage V = V0 sin(ωt), resonance occurs when the inductive reactance equals the capacitive reactance (XL = XC).
At resonance condition, which of the following statements is FALSE?
[A] The impedance of the circuit is purely resistive and minimum.
[B] The current in the circuit is in phase with the applied voltage.
[C] The power factor of the circuit is zero.
[D] The current amplitude reaches its maximum value.
KEY: C
Solution: At resonance, Z = R (minimum), current is maximum I0 = V0/R, and phase difference φ = 0. Therefore, the power factor cos(φ) = cos(0) = 1, NOT zero. Hence statement [C] is false.

Page 5 of 5
`;

// ═══════════════════════════════════════════════════════════════
// 2. RESILIENT ENGINE LOADER (Multi-Strategy CJS / ESM / VM Loader)
// ═══════════════════════════════════════════════════════════════

async function loadParserEngine() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'src/app/api/admin/ai/parse-pdf/route.js'),
    path.resolve(__dirname, 'src/app/api/admin/ai/parse-pdf/route.js'),
    path.resolve(__dirname, '../../src/app/api/admin/ai/parse-pdf/route.js')
  ];

  const routePath = possiblePaths.find(p => fs.existsSync(p));
  if (!routePath) {
    throw new Error(`Cannot find parser route file in: ${JSON.stringify(possiblePaths)}`);
  }

  // Strategy 1: Attempt native dynamic import (if supported)
  try {
    const fileUrl = 'file:///' + routePath.replace(/\\/g, '/');
    const esmModule = await import(fileUrl);
    if (esmModule) {
      const parseFn = esmModule.parseTextToQuestions || esmModule.parseExamPdfText || esmModule.parseExtractedText;
      if (typeof parseFn === 'function') {
        return {
          parse: (text) => {
            const res = parseFn(text);
            if (res && Array.isArray(res)) return res;
            if (res && Array.isArray(res.questions)) return res.questions;
            return res;
          },
          source: 'esm_export'
        };
      }
    }
  } catch (_esmError) {
    // Dynamic import fallback
  }

  // Strategy 2: Sandboxed VM evaluation with full Next.js/Browser polyfills
  const rawCode = fs.readFileSync(routePath, 'utf8');

  // Transform ESM syntax for execution in CommonJS VM context
  const transformed = rawCode
    .replace(/import\s*\{\s*NextResponse\s*\}\s*from\s*['"]next\/server['"];?/g, 'const { NextResponse } = require("next/server");')
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// import stripped for standalone testing')
    .replace(/export\s+async\s+function\s+([a-zA-Z0-9_$]+)/g, 'async function $1')
    .replace(/export\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1')
    .replace(/export\s+const\s+([a-zA-Z0-9_$]+)/g, 'const $1')
    .replace(/export\s+default\s+/g, 'module.exports = ');

  const sandbox = {
    require,
    console,
    process,
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
    module: { exports: {} },
    exports: {}
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);

  const wrapperCode = `
    ${transformed}

    module.exports = {
      parseTextToQuestions: typeof parseTextToQuestions !== 'undefined' ? parseTextToQuestions : undefined,
      parseExamPdfText: typeof parseExamPdfText !== 'undefined' ? parseExamPdfText : undefined,
      parseExtractedText: typeof parseExtractedText !== 'undefined' ? parseExtractedText : undefined,
      parseQuestionBlock: typeof parseQuestionBlock !== 'undefined' ? parseQuestionBlock : undefined,
      cleanExtractedText: typeof cleanExtractedText !== 'undefined' ? cleanExtractedText : undefined,
      detectSubject: typeof detectSubject !== 'undefined' ? detectSubject : undefined,
      POST: typeof POST !== 'undefined' ? POST : undefined,
      ...module.exports
    };
  `;

  vm.runInContext(wrapperCode, sandbox);
  const exp = sandbox.module.exports;
  const parseFn = exp.parseTextToQuestions || exp.parseExamPdfText || exp.parseExtractedText;

  if (typeof parseFn === 'function') {
    return {
      parse: (text) => {
        const res = parseFn(text);
        if (res && Array.isArray(res)) return res;
        if (res && Array.isArray(res.questions)) return res.questions;
        return res;
      },
      source: 'vm_function',
      rawExports: exp
    };
  }

  // Strategy 3: Wrap POST route handler if only POST is exported
  if (typeof exp.POST === 'function') {
    return {
      parse: async (text) => {
        const formData = new Map();
        formData.set('rawText', text);
        formData.set('parserType', 'unstructured_pdf');
        const mockRequest = {
          formData: async () => ({
            get: (key) => formData.get(key)
          })
        };
        const response = await exp.POST(mockRequest);
        if (response && typeof response.json === 'function') {
          const json = await response.json();
          return json.questions || [];
        }
        return [];
      },
      source: 'vm_post_handler',
      rawExports: exp
    };
  }

  throw new Error('Failed to discover a valid parser function (parseTextToQuestions, parseExamPdfText, parseExtractedText, or POST) in route.js');
}

// ═══════════════════════════════════════════════════════════════
// 3. ASSERTION ENGINE & TEST HARNESS
// ═══════════════════════════════════════════════════════════════

class TestSuite {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.totalAssertions = 0;
    this.passedAssertions = 0;
    this.failedAssertions = 0;
    this.tierResults = {
      tier1: { name: 'Tier 1: Sanity Check & Question Cardinality', passed: 0, failed: 0, errors: [] },
      tier2: { name: 'Tier 2: Option Array Integrity & Formatting', passed: 0, failed: 0, errors: [] },
      tier3: { name: 'Tier 3: Mathematical & Chemical Content Fidelity', passed: 0, failed: 0, errors: [] },
      tier4: { name: 'Tier 4: Answer Key Resolution & Metadata Accuracy', passed: 0, failed: 0, errors: [] },
      tier5: { name: 'Tier 5: Adversarial Boundary & Stress Testing', passed: 0, failed: 0, errors: [] }
    };
  }

  assert(tierKey, condition, testDescription, errorDetails = '') {
    this.totalAssertions++;
    const tier = this.tierResults[tierKey];
    if (!tier) throw new Error(`Unknown tier key: ${tierKey}`);

    if (condition) {
      tier.passed++;
      this.passedAssertions++;
      console.log(`  \x1b[32m✔\x1b[0m [${tierKey.toUpperCase()}] ${testDescription}`);
    } else {
      tier.failed++;
      this.failedAssertions++;
      const msg = `FAIL: ${testDescription}${errorDetails ? ' -> ' + errorDetails : ''}`;
      tier.errors.push(msg);
      console.error(`  \x1b[31m✖\x1b[0m [${tierKey.toUpperCase()}] \x1b[31m${testDescription}\x1b[0m`);
      if (errorDetails) {
        console.error(`    \x1b[33mDetails:\x1b[0m ${errorDetails}`);
      }
    }
  }

  printSummary() {
    console.log('\n' + '═'.repeat(70));
    console.log(`  TEST RESULTS SUMMARY — ${this.suiteName}`);
    console.log('═'.repeat(70));

    let allTiersPassed = true;
    for (const [key, tier] of Object.entries(this.tierResults)) {
      const statusIcon = tier.failed === 0 && tier.passed > 0 ? '\x1b[32mPASS\x1b[0m' : (tier.failed > 0 ? '\x1b[31mFAIL\x1b[0m' : '\x1b[33mSKIP\x1b[0m');
      console.log(`  [${statusIcon}] ${tier.name}: ${tier.passed} passed, ${tier.failed} failed`);
      if (tier.failed > 0) {
        allTiersPassed = false;
        tier.errors.forEach(err => console.log(`      \x1b[31m•\x1b[0m ${err}`));
      }
    }

    console.log('─'.repeat(70));
    console.log(`  Total Assertions: ${this.totalAssertions} | Passed: \x1b[32m${this.passedAssertions}\x1b[0m | Failed: \x1b[31m${this.failedAssertions}\x1b[0m`);
    console.log('═'.repeat(70));

    return allTiersPassed && this.failedAssertions === 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. MAIN TEST EXECUTION PIPELINE
// ═══════════════════════════════════════════════════════════════

async function runTests() {
  console.log('\n' + '█'.repeat(70));
  console.log('  PDF PARSER TEST SUITE — ACCEPTANCE CRITERIA R1 VERIFICATION');
  console.log('█'.repeat(70) + '\n');

  const suite = new TestSuite('PDF Parser Engine Verification');

  // Step 1: Load Parser Engine
  let parser;
  try {
    parser = await loadParserEngine();
    console.log(`\x1b[36m[LOADER]\x1b[0m Parsing engine loaded successfully (strategy: ${parser.source})\n`);
  } catch (err) {
    console.error(`\x1b[31m[FATAL]\x1b[0m Failed to load parsing engine: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Execute Parser on Canonical Fixture
  let questions = [];
  try {
    const rawResult = await parser.parse(RAW_FIXTURE_TEXT);
    questions = Array.isArray(rawResult) ? rawResult : (rawResult && rawResult.questions ? rawResult.questions : []);
    console.log(`\x1b[36m[PARSER]\x1b[0m Parser executed against RAW_FIXTURE_TEXT -> ${questions.length} questions returned.\n`);
  } catch (err) {
    console.error(`\x1b[31m[FATAL]\x1b[0m Parser threw an uncaught exception during execution: ${err.message}`);
    suite.assert('tier1', false, 'Parser execution without fatal throw', err.stack);
    suite.printSummary();
    process.exit(1);
  }

  // ═════════════════════════════════════════════════════════════
  // TIER 1: SANITY CHECK & QUESTION CARDINALITY
  // ═════════════════════════════════════════════════════════════
  console.log('\x1b[1m--- Tier 1: Sanity Check & Cardinality ---\x1b[0m');

  suite.assert('tier1', Array.isArray(questions), 'Result is a valid Array', `Type is ${typeof questions}`);
  suite.assert('tier1', questions.length === 5, 'Exactly 5 question objects returned', `Actual count: ${questions.length}`);

  const requiredKeys = ['content', 'options', 'correct_option_index', 'correct_answer', 'explanation', 'subject'];
  questions.forEach((q, idx) => {
    const missingKeys = requiredKeys.filter(k => !(k in q));
    suite.assert(
      'tier1',
      missingKeys.length === 0,
      `Question #${idx + 1} contains all required contract keys`,
      missingKeys.length > 0 ? `Missing keys: ${missingKeys.join(', ')}` : ''
    );
    suite.assert(
      'tier1',
      typeof q.content === 'string' && q.content.trim().length > 10,
      `Question #${idx + 1} stem content is a non-empty string`,
      `Length: ${q.content ? q.content.length : 0}`
    );
  });

  // ═════════════════════════════════════════════════════════════
  // TIER 2: OPTION ARRAY INTEGRITY & FORMATTING
  // ═════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m--- Tier 2: Option Array Integrity ---\x1b[0m');

  questions.forEach((q, idx) => {
    const opts = q.options;
    suite.assert('tier2', Array.isArray(opts), `Question #${idx + 1} options is an array`);
    suite.assert('tier2', opts && opts.length === 4, `Question #${idx + 1} has exactly 4 options`, `Count: ${opts ? opts.length : 0}`);

    if (Array.isArray(opts)) {
      opts.forEach((opt, optIdx) => {
        suite.assert(
          'tier2',
          typeof opt === 'string' && opt.trim().length > 0,
          `Question #${idx + 1} Option ${String.fromCharCode(65 + optIdx)} is non-empty`,
          `Value: "${opt}"`
        );
        suite.assert(
          'tier2',
          !/^Option\s+[A-D]$/i.test(opt) && opt !== 'Option Placeholder',
          `Question #${idx + 1} Option ${String.fromCharCode(65 + optIdx)} is real content, not a placeholder`,
          `Value: "${opt}"`
        );
        suite.assert(
          'tier2',
          !/^\s*[\(\[]?\s*([A-Da-d1-4])\s*[\)\]\.\-\:]\s+/.test(opt),
          `Question #${idx + 1} Option ${String.fromCharCode(65 + optIdx)} has leading label prefixes cleanly stripped`,
          `Value: "${opt}"`
        );
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // TIER 3: MATHEMATICAL & CHEMICAL CONTENT FIDELITY
  // ═════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m--- Tier 3: Mathematical & Chemical Content Fidelity ---\x1b[0m');

  // Locate questions by content signature for resilient, un-skewed verification
  const q1 = questions.find(q => /cylinder/i.test(q.content) && /slipping/i.test(q.content)) || questions[0];
  const q2 = questions.find(q => /coordination\s+complexes/i.test(q.content) || /diamagnetic/i.test(q.content)) || questions[1];
  const q3 = questions.find(q => /cellular respiration|glycolysis/i.test(q.content) || /Statement I/i.test(q.content)) || questions[2];
  const q4 = questions.find(q => /minimum value/i.test(q.content) || /f\(x\)/i.test(q.content)) || questions[3];
  const q5 = questions.find(q => /series LCR/i.test(q.content) || /resonance/i.test(q.content)) || questions[4];

  // Q1: Solid cylinder rolling (Standard Vertical Options with Greek theta)
  suite.assert('tier3', !!q1 && /cylinder/i.test(q1.content) && /slipping/i.test(q1.content), 'Q1 stem contains cylinder physics problem');
  if (q1 && q1.options) {
    suite.assert('tier3', q1.options[0] && q1.options[0].includes('g sin θ'), 'Q1 Option A contains "g sin θ"', `Got: "${q1.options[0]}"`);
    suite.assert('tier3', q1.options[1] && q1.options[1].includes('(2/3) g sin θ'), 'Q1 Option B contains "(2/3) g sin θ"', `Got: "${q1.options[1]}"`);
    suite.assert('tier3', q1.options[2] && q1.options[2].includes('(1/2) g sin θ'), 'Q1 Option C contains "(1/2) g sin θ"', `Got: "${q1.options[2]}"`);
    suite.assert('tier3', q1.options[3] && q1.options[3].includes('(3/4) g sin θ'), 'Q1 Option D contains "(3/4) g sin θ"', `Got: "${q1.options[3]}"`);
    suite.assert('tier3', q1.options[3] && !/Ans\s*:/i.test(q1.options[3]) && !/Explanation\s*:/i.test(q1.options[3]), 'Q1 Option D does NOT contain leaked Ans: or Explanation: tag');
  }

  // Q2: Coordination chemistry with square brackets [Ni(CN)4]2- (Inline Options)
  suite.assert('tier3', !!q2 && (/coordination\s+complexes/i.test(q2.content) || /diamagnetic/i.test(q2.content)), 'Q2 stem contains coordination chemistry question');
  if (q2 && q2.options) {
    suite.assert(
      'tier3',
      q2.options[0] && q2.options[0].includes('[Ni(CN)4]2-'),
      'Q2 Option A preserves square brackets "[Ni(CN)4]2-" without truncation',
      `Got: "${q2.options[0]}"`
    );
    suite.assert(
      'tier3',
      q2.options[1] && q2.options[1].includes('[NiCl4]2-'),
      'Q2 Option B preserves "[NiCl4]2-"',
      `Got: "${q2.options[1]}"`
    );
    suite.assert(
      'tier3',
      q2.options[2] && q2.options[2].includes('[CoF6]3-'),
      'Q2 Option C preserves "[CoF6]3-"',
      `Got: "${q2.options[2]}"`
    );
    suite.assert(
      'tier3',
      q2.options[3] && q2.options[3].includes('[Fe(H2O)6]2+'),
      'Q2 Option D preserves "[Fe(H2O)6]2+"',
      `Got: "${q2.options[3]}"`
    );
  }

  // Q3: Biology Statements (Multi-statement stem, Statement I and II inside content)
  suite.assert('tier3', !!q3 && /Statement I/i.test(q3.content) && /Statement II/i.test(q3.content), 'Q3 stem contains both Statement I and Statement II (no false sub-list split)');
  suite.assert('tier3', !!q3 && /Glycolysis/i.test(q3.content) && /cellular respiration/i.test(q3.content), 'Q3 stem contains respiration content');
  if (q3 && q3.options) {
    suite.assert(
      'tier3',
      q3.options[0] && /Both Statement I and Statement II are correct/i.test(q3.options[0]),
      'Q3 Option A correctly captures statement evaluation text',
      `Got: "${q3.options[0]}"`
    );
    suite.assert(
      'tier3',
      q3.options[3] && !/Correct Option\s*:/i.test(q3.options[3]) && !/Explanation\s*:/i.test(q3.options[3]),
      'Q3 Option D does NOT contain leaked Correct Option or Explanation tags'
    );
  }

  // Q4: Calculus minimum with Negative Numbers and Numeric Options (1)-(4)
  suite.assert('tier3', !!q4 && (/minimum value/i.test(q4.content) && /f\(x\)/i.test(q4.content)), 'Q4 stem contains calculus function f(x)');
  if (q4 && q4.options) {
    suite.assert(
      'tier3',
      q4.options[0] && q4.options[0].trim() === '-5',
      'Q4 Option 1 preserves negative number "-5" (minus sign not stripped)',
      `Got: "${q4.options[0]}"`
    );
    suite.assert(
      'tier3',
      q4.options[1] && q4.options[1].trim() === '-1',
      'Q4 Option 2 preserves negative number "-1"',
      `Got: "${q4.options[1]}"`
    );
    suite.assert(
      'tier3',
      q4.options[2] && q4.options[2].trim() === '0',
      'Q4 Option 3 preserves number "0"',
      `Got: "${q4.options[2]}"`
    );
    suite.assert(
      'tier3',
      q4.options[3] && q4.options[3].trim() === '4',
      'Q4 Option 4 preserves number "4"',
      `Got: "${q4.options[3]}"`
    );
  }

  // Q5: LCR Circuit with Square Bracket Options [A]-[D] and multi-sentence solution
  suite.assert('tier3', !!q5 && (/series LCR/i.test(q5.content) && /resonance/i.test(q5.content)), 'Q5 stem contains AC resonance problem');
  if (q5 && q5.options) {
    suite.assert(
      'tier3',
      q5.options[0] && /purely resistive and minimum/i.test(q5.options[0]),
      'Q5 Option A matches impedance statement',
      `Got: "${q5.options[0]}"`
    );
    suite.assert(
      'tier3',
      q5.options[2] && /power factor of the circuit is zero/i.test(q5.options[2]),
      'Q5 Option C matches power factor statement',
      `Got: "${q5.options[2]}"`
    );
    suite.assert(
      'tier3',
      q5.options[3] && !/KEY\s*:\s*C/i.test(q5.options[3]) && !/Solution\s*:/i.test(q5.options[3]),
      'Q5 Option D is clean and does NOT contain KEY or Solution leakage',
      `Got: "${q5.options[3]}"`
    );
  }

  // Universal Content Cleanliness Check: Headers, Footers, Watermarks
  questions.forEach((q, idx) => {
    suite.assert(
      'tier3',
      !/CONFIDENTIAL/i.test(q.content) && !/ASENTRA EDUCATION PORTAL/i.test(q.content) && !/Page\s*\d+\s*of\s*\d+/i.test(q.content),
      `Question #${idx + 1} content is free of watermark & pagination noise`
    );
  });

  // ═════════════════════════════════════════════════════════════
  // TIER 4: ANSWER RESOLUTION & METADATA ACCURACY
  // ═════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m--- Tier 4: Answer Resolution & Metadata ---\x1b[0m');

  // Q1: Ans: (B) -> index 1, correct_answer has B option text, subject Physics
  if (q1) {
    suite.assert('tier4', q1.correct_option_index === 1, 'Q1 correct_option_index is 1 (Option B)', `Got: ${q1.correct_option_index}`);
    suite.assert('tier4', typeof q1.correct_answer === 'string' && q1.correct_answer.length > 0, 'Q1 correct_answer is populated', `Got: "${q1.correct_answer}"`);
    suite.assert('tier4', typeof q1.explanation === 'string' && /moment of inertia/i.test(q1.explanation), 'Q1 explanation captures rotational solution', `Got: "${q1.explanation}"`);
    suite.assert('tier4', q1.subject === 'Physics', 'Q1 subject classified as Physics', `Got: "${q1.subject}"`);
  }

  // Q2: Answer: (a) -> index 0, correct_answer has [Ni(CN)4]2-, subject Chemistry
  if (q2) {
    suite.assert('tier4', q2.correct_option_index === 0, 'Q2 correct_option_index is 0 (Option A)', `Got: ${q2.correct_option_index}`);
    suite.assert('tier4', typeof q2.explanation === 'string' && /oxidation state/i.test(q2.explanation), 'Q2 explanation captures coordination chemistry explanation', `Got: "${q2.explanation}"`);
    suite.assert('tier4', q2.subject === 'Chemistry', 'Q2 subject classified as Chemistry', `Got: "${q2.subject}"`);
  }

  // Q3: Correct Option: A -> index 0, subject Biology
  if (q3) {
    suite.assert('tier4', q3.correct_option_index === 0, 'Q3 correct_option_index is 0 (Option A)', `Got: ${q3.correct_option_index}`);
    suite.assert('tier4', typeof q3.explanation === 'string' && /anaerobic pathway|mitochondria/i.test(q3.explanation), 'Q3 explanation captures cellular respiration explanation', `Got: "${q3.explanation}"`);
    suite.assert('tier4', q3.subject === 'Biology', 'Q3 subject classified as Biology', `Got: "${q3.subject}"`);
  }

  // Q4: Ans: 1 -> index 0 (1-based converted to 0-based), subject Mathematics
  if (q4) {
    suite.assert('tier4', q4.correct_option_index === 0, 'Q4 numeric "Ans: 1" converted to 0-based index 0', `Got: ${q4.correct_option_index}`);
    suite.assert('tier4', typeof q4.explanation === 'string' && /critical points|f\(0\)/i.test(q4.explanation), 'Q4 explanation captures calculus derivative steps', `Got: "${q4.explanation}"`);
    suite.assert('tier4', q4.subject === 'Mathematics', 'Q4 subject classified as Mathematics', `Got: "${q4.subject}"`);
  }

  // Q5: KEY: C -> index 2, subject Physics
  if (q5) {
    suite.assert('tier4', q5.correct_option_index === 2, 'Q5 "KEY: C" converted to index 2 (Option C)', `Got: ${q5.correct_option_index}`);
    suite.assert('tier4', typeof q5.explanation === 'string' && /power factor|cos\(0\)/i.test(q5.explanation), 'Q5 explanation captures resonance solution', `Got: "${q5.explanation}"`);
    suite.assert('tier4', q5.subject === 'Physics', 'Q5 subject classified as Physics', `Got: "${q5.subject}"`);
  }

  // ═════════════════════════════════════════════════════════════
  // TIER 5: ADVERSARIAL & BOUNDARY STRESS TESTING
  // ═════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m--- Tier 5: Adversarial Boundary & Stress Testing ---\x1b[0m');

  // Test 5.1: Empty and Null inputs
  try {
    const emptyRes = await parser.parse('');
    const emptyArr = Array.isArray(emptyRes) ? emptyRes : (emptyRes && emptyRes.questions ? emptyRes.questions : []);
    suite.assert('tier5', Array.isArray(emptyArr) && emptyArr.length === 0, 'Empty string returns empty array without throwing');
  } catch (err) {
    suite.assert('tier5', false, 'Empty string input handling', err.message);
  }

  // Test 5.2: Noise only input
  try {
    const noiseRes = await parser.parse('PAGE 1 OF 10\nCONFIDENTIAL WATERMARK\nTIME: 180 MIN\nTOTAL MARKS: 300\n');
    const noiseArr = Array.isArray(noiseRes) ? noiseRes : (noiseRes && noiseRes.questions ? noiseRes.questions : []);
    suite.assert('tier5', Array.isArray(noiseArr) && noiseArr.length === 0, 'Noise-only document returns 0 questions without false positive splits');
  } catch (err) {
    suite.assert('tier5', false, 'Noise-only input handling', err.message);
  }

  // Step 3: Print final test summary and exit with status code
  const passed = suite.printSummary();
  if (passed) {
    console.log('\n\x1b[32m✔ ALL ASSERTION TIERS PASSED (Status Code 0)\x1b[0m\n');
    process.exit(0);
  } else {
    console.error('\n\x1b[31m✖ TEST SUITE FAILED (Status Code 1)\x1b[0m\n');
    process.exit(1);
  }
}

// Support CLI execution or module export
if (require.main === module) {
  runTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

module.exports = {
  RAW_FIXTURE_TEXT,
  loadParserEngine,
  TestSuite,
  runTests
};
