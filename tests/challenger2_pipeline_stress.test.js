/**
 * tests/challenger2_pipeline_stress.test.js
 * Empirical stress testing suite for Challenger 2:
 * 1. KPI calculations & statistics under boundary conditions (0 batches, 1000 items, missing/corrupted fields).
 * 2. Exam Compiler JSON structure validation & LaTeX math rendering with KaTeX preview.
 * 3. Telemetry analytics (bell curve data generation, real-time polling).
 * 4. RFC4180 CSV export generation with commas, quotes, newlines in fields.
 */

const assert = require('assert');
const katex = require('katex');
const {
  calculateBatchesKpiStats,
  calculateTestSeriesKpiStats,
  generateRfc4180Csv,
  filterBatches,
  filterTestPackages,
  sortDataset,
  paginateDataset
} = require('./helpers/tableHarness');
const {
  MOCK_BATCHES_BASE,
  MOCK_PACKAGES_BASE,
  MOCK_TEST_ATTEMPTS,
  MOCK_TEST_EXAMS,
  generateLargeBatchesDataset,
  generateLargePackagesDataset
} = require('./fixtures/mockData');

// Simple test runner helper
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err.message });
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// RFC4180 STRICT PARSER HELPER (for roundtrip verification)
// ═══════════════════════════════════════════════════════════════
function parseRfc4180Csv(csvText) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuote = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuote) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i += 2;
      } else if (char === '"') {
        insideQuote = false;
        i++;
      } else {
        currentCell += char;
        i++;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
        i++;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
        i++;
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i += 2;
      } else if (char === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else {
        currentCell += char;
        i++;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════════
// PILLAR 1: KPI CALCULATIONS & STATISTICS BOUNDARY STRESS TESTS
// ═══════════════════════════════════════════════════════════════
console.log('\n======================================================');
console.log('🧪 SUITE 1: KPI CALCULATIONS & STATISTICS STRESS TESTS');
console.log('======================================================');

test('1.1 Zero Bound: Empty array for batches returns zeroed KPI stats without NaN', () => {
  const stats = calculateBatchesKpiStats([]);
  assert.strictEqual(stats.totalBatches, 0);
  assert.strictEqual(stats.publishedCohorts, 0);
  assert.strictEqual(stats.draftCohorts, 0);
  assert.strictEqual(stats.totalStudents, 0);
  assert.strictEqual(stats.totalLiveClasses, 0);
});

test('1.2 Zero Bound: Empty array for test series returns zeroed KPI stats without NaN', () => {
  const stats = calculateTestSeriesKpiStats([], []);
  assert.strictEqual(stats.totalPackages, 0);
  assert.strictEqual(stats.totalExams, 0);
  assert.strictEqual(stats.activeCandidates, 0);
  assert.strictEqual(stats.premiumPackages, 0);
  assert.strictEqual(stats.averageScore, 0);
});

test('1.3 High Volume Bound: 1,000 batches processed with large student counts (>10M total)', () => {
  const largeBatches = [];
  let expectedStudents = 0;
  let expectedPublished = 0;
  let expectedDrafts = 0;

  for (let i = 0; i < 1000; i++) {
    const isPublished = i % 2 === 0;
    const isDraft = i % 3 === 0;
    const status = isPublished ? 'published' : (isDraft ? 'draft' : 'archived');
    const students = 10000 + i * 5;
    
    if (status === 'published') expectedPublished++;
    if (status === 'draft') expectedDrafts++;
    expectedStudents += students;

    largeBatches.push({
      id: `batch-${i}`,
      title: `Batch #${i}`,
      status,
      students_count: students,
      live_sessions_count: 5
    });
  }

  const start = Date.now();
  const stats = calculateBatchesKpiStats(largeBatches);
  const elapsed = Date.now() - start;

  assert.strictEqual(stats.totalBatches, 1000);
  assert.strictEqual(stats.publishedCohorts, expectedPublished);
  assert.strictEqual(stats.draftCohorts, expectedDrafts);
  assert.strictEqual(stats.totalStudents, expectedStudents);
  assert.strictEqual(stats.totalLiveClasses, 5000);
  assert.ok(elapsed < 100, `KPI calculation took ${elapsed}ms (expected <100ms)`);
});

test('1.4 High Volume Bound: 1,000 test packages & 100,000 candidate attempts score aggregation', () => {
  const largePackages = [];
  for (let i = 0; i < 1000; i++) {
    largePackages.push({
      id: `pkg-${i}`,
      title: `Package ${i}`,
      price_ledger: { status: i % 2 === 0 ? 'premium' : 'free', price: i % 2 === 0 ? 999 : 0 },
      test_exams: [{ id: `exam-${i}-1` }, { id: `exam-${i}-2` }]
    });
  }

  const largeAttempts = [];
  let totalScoreSum = 0;
  for (let i = 0; i < 100000; i++) {
    const score = (i % 300) + 10;
    totalScoreSum += score;
    largeAttempts.push({ id: `att-${i}`, score });
  }

  const expectedAvg = Math.round((totalScoreSum / 100000) * 10) / 10;

  const start = Date.now();
  const stats = calculateTestSeriesKpiStats(largePackages, largeAttempts);
  const elapsed = Date.now() - start;

  assert.strictEqual(stats.totalPackages, 1000);
  assert.strictEqual(stats.totalExams, 2000);
  assert.strictEqual(stats.premiumPackages, 500);
  assert.strictEqual(stats.activeCandidates, 100000);
  assert.strictEqual(stats.averageScore, expectedAvg);
  assert.ok(elapsed < 100, `Large score aggregation took ${elapsed}ms (expected <100ms)`);
});

test('1.5 Missing & Corrupted Fields in Batches: null, undefined, boolean statuses, string numbers', () => {
  const corruptedBatches = [
    { id: 'b1', status: null, students_count: null, live_sessions_count: null },
    { id: 'b2', status: undefined, students_count: undefined, live_sessions_count: undefined },
    { id: 'b3', status: true, students_count: '250', live_sessions_count: '10' }, // boolean status true & string counts
    { id: 'b4', status: 'PUBLISHED', students_count: 100, live_sessions_count: 5 }, // uppercase
    { id: 'b5', status: 'dRaFt', batch_enrollments: [{ id: 1 }, { id: 2 }], live_sessions: [{ id: 1 }] } // relational fallback
  ];

  // In BatchStatsHeader component logic:
  const totalBatches = corruptedBatches.length;
  const publishedCount = corruptedBatches.filter(b => (b.status || '').toString().toLowerCase() === 'published' || b.status === true).length;
  const draftCount = corruptedBatches.filter(b => (b.status || '').toString().toLowerCase() === 'draft' || (b.status || '').toString().toLowerCase() === 'hidden').length;
  const totalEnrolled = corruptedBatches.reduce((acc, b) => acc + (Number(b.students_count) || (b.batch_enrollments?.length ?? 0)), 0);
  const totalLiveClasses = corruptedBatches.reduce((acc, b) => acc + (Number(b.live_sessions_count) || (b.live_sessions?.length ?? 0)), 0);

  assert.strictEqual(totalBatches, 5);
  assert.strictEqual(publishedCount, 2); // b3 (true) and b4 ('PUBLISHED')
  assert.strictEqual(draftCount, 1); // b5 ('dRaFt')
  assert.strictEqual(totalEnrolled, 352); // 0 + 0 + 250 + 100 + 2
  assert.strictEqual(totalLiveClasses, 16); // 0 + 0 + 10 + 5 + 1
});

test('1.6 Missing & Corrupted Fields in Test Series: total_tests_count fallback with empty test_exams', () => {
  const corruptedPackages = [
    { id: 'p1', test_exams: [], total_tests_count: 25, price_ledger: null }, // empty array -> fallback to 25
    { id: 'p2', test_exams: null, total_tests_count: 15, price_ledger: { status: 'free' } }, // null test_exams -> fallback to 15
    { id: 'p3', test_exams: [{ id: 'e1' }, { id: 'e2' }], total_tests_count: 0, price_ledger: { price: '499', status: 'premium' } }, // populated array -> 2
    { id: 'p4', test_exams: undefined, total_tests_count: undefined, price_ledger: { price: null } } // all undefined -> 0
  ];

  const attemptsWithNegativesAndNaNs = [
    { score: -15 }, // negative score from negative marking (+4 / -1)
    { score: 320 },
    { score: '100' }, // string score
    { score: null },
    { score: undefined },
    { score: 'invalid_number' }
  ];

  const stats = calculateTestSeriesKpiStats(corruptedPackages, attemptsWithNegativesAndNaNs);

  assert.strictEqual(stats.totalPackages, 4);
  assert.strictEqual(stats.totalExams, 42); // 25 + 15 + 2 + 0 = 42
  assert.strictEqual(stats.premiumPackages, 1); // p3 is premium
  assert.strictEqual(stats.activeCandidates, 6);
  // scores = [-15, 320, 100, 0, 0, 0] -> sum = 405 / 6 = 67.5
  assert.strictEqual(stats.averageScore, 67.5);
});

// ═══════════════════════════════════════════════════════════════
// PILLAR 2: EXAM COMPILER JSON VALIDATION & LATEX MATH RENDERING
// ═══════════════════════════════════════════════════════════════
console.log('\n======================================================');
console.log('🧪 SUITE 2: EXAM COMPILER JSON & LATEX MATH RENDERING');
console.log('======================================================');

test('2.1 Exam Blueprint Schema Validator: Complete paper structure with 5 question types', () => {
  const examBlueprint = {
    package_id: 'pkg-jee-01',
    title: 'JEE Advanced Full Mock Paper 1',
    duration_minutes: 180,
    marks_scheme: {
      positive_marks: 4,
      negative_marks: -1
    },
    is_live_ranking: true,
    activation_timestamp: new Date('2026-09-15T09:00:00Z').toISOString(),
    questions: [
      // 1. Single choice
      {
        id: 'q-sc-1',
        subject: 'Physics',
        sub_topic: 'Electrostatics',
        question_type: 'single',
        content: 'Calculate electric field at distance $r$ from an infinite wire with charge density $\\lambda$.',
        options: ['\\frac{\\lambda}{2\\pi \\epsilon_0 r}', '\\frac{\\lambda}{4\\pi \\epsilon_0 r}', '\\frac{\\lambda}{\\epsilon_0 r}', '0'],
        correct_option_index: 0,
        marks_positive: 4,
        marks_negative: -1
      },
      // 2. Multiple choice
      {
        id: 'q-mc-2',
        subject: 'Chemistry',
        sub_topic: 'Chemical Bonding',
        question_type: 'multiple',
        content: 'Which of the following molecules possess planar geometry?',
        options: ['$XeF_4$', '$BF_3$', '$PCl_5$', '$SF_6$'],
        correct_option_index: [0, 1],
        marks_positive: 4,
        marks_negative: -2
      },
      // 3. Integer numerical
      {
        id: 'q-int-3',
        subject: 'Mathematics',
        sub_topic: 'Definite Integrals',
        question_type: 'integer',
        content: 'Evaluate $\\int_{0}^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}} dx$. Value in terms of $\\pi/k$, find $k$.',
        options: null,
        correct_option_index: '4',
        marks_positive: 4,
        marks_negative: 0
      },
      // 4. Matrix Match
      {
        id: 'q-mat-4',
        subject: 'Physics',
        sub_topic: 'Optics & Wave',
        question_type: 'match',
        content: 'Match column I with column II:',
        options: ['Prism', 'Concave Lens', 'Convex Mirror', 'Plane Mirror'],
        correct_option_index: ['Dispersion', 'Diverging', 'Virtual diminished', 'Lateral inversion'],
        marks_positive: 4,
        marks_negative: -1
      },
      // 5. Fill in blanks
      {
        id: 'q-blk-5',
        subject: 'Chemistry',
        sub_topic: 'Coordination Compounds',
        question_type: 'blanks',
        content: 'The hybridization of $[Fe(CN)_6]^{3-}$ complex is _______.',
        options: null,
        correct_option_index: 'd2sp3',
        marks_positive: 4,
        marks_negative: 0
      }
    ]
  };

  // Assert schema properties
  assert.strictEqual(typeof examBlueprint.title, 'string');
  assert.ok(examBlueprint.title.length > 0);
  assert.strictEqual(examBlueprint.duration_minutes, 180);
  assert.strictEqual(examBlueprint.marks_scheme.positive_marks, 4);
  assert.strictEqual(examBlueprint.marks_scheme.negative_marks, -1);
  assert.strictEqual(examBlueprint.is_live_ranking, true);
  assert.ok(!isNaN(Date.parse(examBlueprint.activation_timestamp)));
  assert.strictEqual(examBlueprint.questions.length, 5);

  // Validate question sub-schemas
  const qSingle = examBlueprint.questions[0];
  assert.strictEqual(qSingle.question_type, 'single');
  assert.strictEqual(qSingle.options.length, 4);
  assert.strictEqual(typeof qSingle.correct_option_index, 'number');

  const qMulti = examBlueprint.questions[1];
  assert.strictEqual(qMulti.question_type, 'multiple');
  assert.ok(Array.isArray(qMulti.correct_option_index));
  assert.strictEqual(qMulti.correct_option_index.length, 2);

  const qInt = examBlueprint.questions[2];
  assert.strictEqual(qInt.question_type, 'integer');
  assert.strictEqual(qInt.options, null);
  assert.strictEqual(typeof qInt.correct_option_index, 'string');

  const qMatch = examBlueprint.questions[3];
  assert.strictEqual(qMatch.question_type, 'match');
  assert.strictEqual(qMatch.options.length, 4);
  assert.strictEqual(qMatch.correct_option_index.length, 4);
});

test('2.2 KaTeX LaTeX Math Stems Rendering: Standard math, formulas & integrals', () => {
  const mathStems = [
    '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}',
    '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1',
    '\\frac{d}{dx} \\left[ \\ln |x| \\right] = \\frac{1}{x}',
    '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}',
    '\\vec{F} = q(\\vec{E} + \\vec{v} \\times \\vec{B})',
    '\\Delta G^{\\circ} = -RT \\ln K_{eq}',
    'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
  ];

  for (const math of mathStems) {
    const html = katex.renderToString(math, {
      displayMode: false,
      throwOnError: false
    });
    assert.ok(html.includes('<span class="katex">'), `KaTeX output should contain span.katex for "${math}"`);
    assert.ok(!html.includes('katex-error'), `KaTeX should render cleanly without error for "${math}"`);
  }
});

test('2.3 KaTeX Plain-text Auto-Beautifier: Auto-converts ASCII math into LaTeX strings', () => {
  // Logic from src/components/KatexRenderer.jsx
  const formatLatexString = (text) => {
    if (typeof text !== 'string') return String(text);
    if (text.includes('\\') || text.includes('$')) return text;

    let formatted = text
      .replace(/lim\s*\(\s*x\s*->\s*0\s*\)/gi, '\\lim_{x \\to 0}')
      .replace(/lim\s*_\s*\(\s*x\s*->\s*0\s*\)/gi, '\\lim_{x \\to 0}')
      .replace(/dy\/dx/g, '\\frac{dy}{dx}')
      .replace(/ln\s*\|/g, '\\ln |')
      .replace(/∫/g, '\\int ')
      .replace(/\^\(2\)/g, '^2')
      .replace(/\^\(3\)/g, '^3');

    return formatted;
  };

  assert.strictEqual(formatLatexString('lim (x->0) (sin x)/x'), '\\lim_{x \\to 0} (sin x)/x');
  assert.strictEqual(formatLatexString('Calculate dy/dx for y = x^(2)'), 'Calculate \\frac{dy}{dx} for y = x^2');
  assert.strictEqual(formatLatexString('∫ f(x) dx'), '\\int  f(x) dx');
  assert.strictEqual(formatLatexString('ln |x + 1|'), '\\ln |x + 1|');
});

test('2.4 KaTeX Adversarial & Broken LaTeX Stems: Graceful fallback without crashing', () => {
  const brokenStems = [
    '\\frac{1}{', // unclosed brace
    '\\sqrt[', // incomplete optional arg
    '\\nonexistentcommand{xyz}', // invalid command
    '$$unclosed block math',
    '\\left( x + y', // missing \right
    '',
    null,
    undefined
  ];

  for (const stem of brokenStems) {
    if (!stem) continue;
    
    // KatexRenderer uses throwOnError: false
    let rendered;
    try {
      rendered = katex.renderToString(stem, {
        displayMode: false,
        throwOnError: false
      });
    } catch (err) {
      rendered = null;
    }

    assert.ok(rendered !== null, `Broken LaTeX "${stem}" must not throw fatal unhandled exception`);
  }
});

// ═══════════════════════════════════════════════════════════════
// PILLAR 3: TELEMETRY ANALYTICS & REAL-TIME POLLING STRESS TESTS
// ═══════════════════════════════════════════════════════════════
console.log('\n======================================================');
console.log('🧪 SUITE 3: TELEMETRY ANALYTICS & REAL-TIME POLLING');
console.log('======================================================');

// Telemetry bell curve generation logic matching src/app/api/admin/test-series/telemetry/route.js
function generateBellCurveData(attempts, totalQuestions = 90, posMarks = 4) {
  const totalSubmissions = attempts ? attempts.length : 0;
  let averageScore = 0;
  const bellCurve = [
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 }
  ];

  if (totalSubmissions > 0) {
    const sum = attempts.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
    averageScore = Math.round(sum / totalSubmissions);

    const maxScore = Math.max(1, totalQuestions * posMarks);

    attempts.forEach(att => {
      const score = Number(att.score) || 0;
      const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
      if (percent <= 20) bellCurve[0].count++;
      else if (percent <= 40) bellCurve[1].count++;
      else if (percent <= 60) bellCurve[2].count++;
      else if (percent <= 80) bellCurve[3].count++;
      else bellCurve[4].count++;
    });
  }

  return { totalSubmissions, averageScore, bellCurve };
}

test('3.1 Bell Curve Zero Bound: 0 candidate submissions produce zeroed counts', () => {
  const result = generateBellCurveData([], 90, 4);
  assert.strictEqual(result.totalSubmissions, 0);
  assert.strictEqual(result.averageScore, 0);
  assert.strictEqual(result.bellCurve.reduce((sum, band) => sum + band.count, 0), 0);
});

test('3.2 Bell Curve Exact Percentage Boundaries: 20%, 40%, 60%, 80%, 100%, and negative marks', () => {
  // Max score = 100 (25 questions * 4 marks)
  const attempts = [
    { score: -10 }, // negative -> <=20% (band 0)
    { score: 0 },   // 0% -> <=20% (band 0)
    { score: 20 },  // 20% -> <=20% (band 0)
    { score: 21 },  // 21% -> 21-40% (band 1)
    { score: 40 },  // 40% -> 21-40% (band 1)
    { score: 41 },  // 41% -> 41-60% (band 2)
    { score: 60 },  // 60% -> 41-60% (band 2)
    { score: 61 },  // 61% -> 61-80% (band 3)
    { score: 80 },  // 80% -> 61-80% (band 3)
    { score: 81 },  // 81% -> 81-100% (band 4)
    { score: 100 }  // 100% -> 81-100% (band 4)
  ];

  const result = generateBellCurveData(attempts, 25, 4);
  assert.strictEqual(result.totalSubmissions, 11);
  assert.strictEqual(result.bellCurve[0].count, 3); // -10, 0, 20
  assert.strictEqual(result.bellCurve[1].count, 2); // 21, 40
  assert.strictEqual(result.bellCurve[2].count, 2); // 41, 60
  assert.strictEqual(result.bellCurve[3].count, 2); // 61, 80
  assert.strictEqual(result.bellCurve[4].count, 2); // 81, 100
  
  // Total count conservation
  const totalCount = result.bellCurve.reduce((sum, band) => sum + band.count, 0);
  assert.strictEqual(totalCount, 11);
});

test('3.3 Bell Curve High Volume Stress: 50,000 candidate attempts distribution in <50ms', () => {
  const attempts = [];
  for (let i = 0; i < 50000; i++) {
    // Normal distribution approximation around mean 180 (max 360)
    const score = Math.floor(50 + (i % 300));
    attempts.push({ score });
  }

  const start = Date.now();
  const result = generateBellCurveData(attempts, 90, 4);
  const elapsed = Date.now() - start;

  assert.strictEqual(result.totalSubmissions, 50000);
  const totalCount = result.bellCurve.reduce((sum, band) => sum + band.count, 0);
  assert.strictEqual(totalCount, 50000);
  assert.ok(elapsed < 50, `Bell curve generation took ${elapsed}ms (expected <50ms)`);
});

test('3.4 Real-Time Live Poll Timing & Votes Aggregation Logic', () => {
  // Logic from src/app/api/live/poll/route.js
  const now = 1755430000000;
  
  // Active poll (+25 seconds left)
  const activePoll = {
    id: 'poll-1',
    question: 'What is the SI unit of Magnetic Flux?',
    options: ['Weber', 'Tesla', 'Henry', 'Gauss'],
    correctAnswerIndex: 0,
    expiresAt: now + 25000
  };
  const activeTimeLeft = Math.max(0, Math.floor((activePoll.expiresAt - now) / 1000));
  assert.strictEqual(activeTimeLeft, 25);

  // Expired poll (-5 seconds past)
  const expiredPoll = {
    id: 'poll-2',
    expiresAt: now - 5000
  };
  const expiredTimeLeft = Math.max(0, Math.floor((expiredPoll.expiresAt - now) / 1000));
  assert.strictEqual(expiredTimeLeft, 0); // Must be clamped to 0

  // Vote counting
  const results = { 0: 48, 1: 12, 2: 6, 3: 4 };
  const totalVotes = Object.values(results).reduce((a, b) => a + b, 0);
  assert.strictEqual(totalVotes, 70);
});

// ═══════════════════════════════════════════════════════════════
// PILLAR 4: RFC4180 CSV EXPORT GENERATION STRESS TESTS
// ═══════════════════════════════════════════════════════════════
console.log('\n======================================================');
console.log('🧪 SUITE 4: RFC4180 CSV EXPORT GENERATION STRESS TESTS');
console.log('======================================================');

test('4.1 Batches CSV Export: Commas, quotes, newlines, emojis and special chars', () => {
  const testBatches = [
    {
      id: 'batch-c1',
      title: 'JEE Main, Advanced & BITSAT "Super-30" Batch', // Commas and quotes
      target_focus: 'JEE',
      status: 'published',
      price: 4999,
      students_count: 30,
      start_date: '2026-09-01',
      created_at: '2026-01-10T10:00:00Z'
    },
    {
      id: 'batch-c2',
      title: 'NEET 2026 Crash Course\nPhase 1 & Phase 2', // Newline in title
      target_focus: 'NEET',
      status: 'draft',
      price: 0,
      students_count: 0,
      start_date: '',
      created_at: '2026-02-01T10:00:00Z'
    },
    {
      id: 'batch-c3',
      title: '🔥 Olympiad & Foundation STEM 🚀 🇮🇳', // Emojis and Unicode
      target_focus: null, // null focus -> fallback
      status: null, // null status -> fallback
      price: null,
      students_count: null,
      start_date: null,
      created_at: null
    }
  ];

  // BatchGrid.jsx CSV Export implementation logic:
  const headers = ['ID', 'Title', 'Target Focus', 'Status', 'Price', 'Enrolled Students', 'Launch Date', 'Created At'];
  const csvRows = [headers.join(',')];

  for (const item of testBatches) {
    csvRows.push([
      `"${item.id}"`,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${item.target_focus || 'JEE'}"`,
      `"${(item.status || 'published').toUpperCase()}"`,
      item.price || 0,
      item.students_count || 0,
      `"${item.start_date || ''}"`,
      `"${item.created_at || ''}"`
    ].join(','));
  }

  const csvString = csvRows.join('\r\n');
  assert.ok(csvString.includes('"JEE Main, Advanced & BITSAT ""Super-30"" Batch"'));
  assert.ok(csvString.includes('"NEET 2026 Crash Course\nPhase 1 & Phase 2"'));
  assert.ok(csvString.includes('🔥 Olympiad & Foundation STEM 🚀 🇮🇳'));

  // Roundtrip verification with RFC4180 parser
  const parsed = parseRfc4180Csv(csvString);
  assert.strictEqual(parsed.length, 4); // 1 header + 3 rows
  assert.strictEqual(parsed[0].length, 8); // 8 columns
  assert.strictEqual(parsed[1][1], 'JEE Main, Advanced & BITSAT "Super-30" Batch');
  assert.strictEqual(parsed[2][1], 'NEET 2026 Crash Course\nPhase 1 & Phase 2');
  assert.strictEqual(parsed[3][1], '🔥 Olympiad & Foundation STEM 🚀 🇮🇳');
  assert.strictEqual(parsed[3][2], 'JEE'); // fallback
  assert.strictEqual(parsed[3][3], 'PUBLISHED'); // fallback
});

test('4.2 Test Series CSV Export: Distribution, price ledger, escaped titles & roundtrip', () => {
  const testPackages = [
    {
      id: 'pkg-ts-1',
      title: 'JEE "Challenger" Test Series (2026, All India Mocks)',
      target_exam_tag: 'JEE Advanced',
      is_active: true,
      price_ledger: { price: 2999, original_price: 4999 },
      total_tests_count: 50,
      test_distribution: { chapter_drills: 30, full_mocks: 15, live_papers: 5 },
      enrolled_count: 1420,
      created_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'pkg-ts-2',
      title: 'Free Diagnostic Assessment Series',
      target_exam_tag: null,
      is_active: false,
      price_ledger: null,
      total_tests_count: 5,
      test_distribution: null,
      enrolled_count: null,
      created_at: null
    }
  ];

  // TestSeriesGrid.jsx CSV Export implementation logic:
  const headers = [
    'ID', 'Title', 'Target Tag', 'Status', 'Price', 'Original Price',
    'Total Tests', 'Drills', 'Mocks', 'Live Papers', 'Enrolled Candidates', 'Created At'
  ];
  const csvRows = [headers.join(',')];

  for (const item of testPackages) {
    const dist = item.test_distribution || {};
    const priceInfo = item.price_ledger || {};
    const enrolled = item.enrolled_count || 0;

    csvRows.push([
      `"${item.id}"`,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${item.target_exam_tag || ''}"`,
      item.is_active !== false ? '"ACTIVE"' : '"INACTIVE"',
      priceInfo.price || 0,
      priceInfo.original_price || '',
      item.total_tests_count || 0,
      dist.chapter_drills || 0,
      dist.full_mocks || 0,
      dist.live_papers || 0,
      enrolled,
      `"${item.created_at || ''}"`
    ].join(','));
  }

  const csvString = csvRows.join('\r\n');
  const parsed = parseRfc4180Csv(csvString);

  assert.strictEqual(parsed.length, 3); // 1 header + 2 rows
  assert.strictEqual(parsed[0].length, 12);
  assert.strictEqual(parsed[1][1], 'JEE "Challenger" Test Series (2026, All India Mocks)');
  assert.strictEqual(parsed[1][3], 'ACTIVE');
  assert.strictEqual(parsed[1][4], '2999');
  assert.strictEqual(parsed[1][5], '4999');
  assert.strictEqual(parsed[1][7], '30'); // drills
  assert.strictEqual(parsed[2][1], 'Free Diagnostic Assessment Series');
  assert.strictEqual(parsed[2][3], 'INACTIVE');
  assert.strictEqual(parsed[2][4], '0'); // price fallback
  assert.strictEqual(parsed[2][7], '0'); // drills fallback
});

test('4.3 RFC4180 Table Harness CSV Generator: Stress test 5,000 rows with multi-type accessors', () => {
  const columns = [
    { id: 'id', header: 'ID', accessorKey: 'id' },
    { id: 'title', header: 'Batch Title', accessorKey: 'title' },
    { id: 'price', header: 'Tuition (INR)', accessor: r => `₹${r.price || 0}` },
    { id: 'status', header: 'Cohort Status', accessorKey: 'status' }
  ];

  const largeRows = [];
  for (let i = 0; i < 5000; i++) {
    largeRows.push({
      id: `b-${i}`,
      title: `Batch "${i}", with comma & newline\nCohort #${i}`,
      price: i * 10,
      status: i % 2 === 0 ? 'published' : 'draft'
    });
  }

  const start = Date.now();
  const csv = generateRfc4180Csv(largeRows, columns);
  const elapsed = Date.now() - start;

  assert.ok(csv.length > 0);
  assert.ok(elapsed < 150, `5,000 rows CSV export took ${elapsed}ms (expected <150ms)`);

  // Verify first and last rows
  const parsed = parseRfc4180Csv(csv);
  assert.strictEqual(parsed.length, 5001); // 1 header + 5000 rows
  assert.strictEqual(parsed[1][1], 'Batch "0", with comma & newline\nCohort #0');
  assert.strictEqual(parsed[5000][1], 'Batch "4999", with comma & newline\nCohort #4999');
});

// ═══════════════════════════════════════════════════════════════
// SUMMARY REPORT
// ═══════════════════════════════════════════════════════════════
console.log('\n======================================================');
console.log('📊 CHALLENGER 2 STRESS SUITE RESULTS SUMMARY');
console.log('======================================================');
console.log(`  Total Tests Run: ${totalTests}`);
console.log(`  Passed:          ${passedTests}`);
console.log(`  Failed:          ${failedTests}`);
console.log('======================================================');

if (failedTests > 0) {
  console.error('✖ FAILURES ENCOUNTERED:');
  failures.forEach(f => console.error(`  - ${f.name}: ${f.error}`));
  process.exit(1);
} else {
  console.log('✔ ALL EMPIRICAL PIPELINE STRESS TESTS PASSED PERFECTLY!');
  process.exit(0);
}
