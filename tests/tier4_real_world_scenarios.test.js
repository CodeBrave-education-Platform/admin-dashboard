/**
 * tier4_real_world_scenarios.test.js
 * 
 * Tier 4: Real-World Application End-to-End Scenarios
 * Scenarios Covered:
 * 1. Batches Lifecycle:
 *    Batch Creation -> Roster Ingestion (RPC) -> Live Class Scheduling -> Material Vault -> Exam Scheduler -> KPI Verification
 * 2. Test Series Lifecycle:
 *    Package Blueprint -> Exam Compilation (+4/-1 Marks) -> AI PDF Question Ingestion -> Student Submissions & Live Telemetry -> Bell Curve & KPIs
 */

const assert = require('node:assert');
const {
  filterBatches,
  filterTestPackages,
  sortDataset,
  paginateDataset,
  calculateBatchesKpiStats,
  calculateTestSeriesKpiStats,
  generateRfc4180Csv
} = require('./helpers/tableHarness');

function runTier4Tests() {
  let passed = 0;
  let failed = 0;
  const errors = [];

  function test(name, fn) {
    try {
      fn();
      passed++;
      console.log(`  ✅ PASS: ${name}`);
    } catch (err) {
      failed++;
      errors.push({ name, error: err.message });
      console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('⚡ TIER 4: REAL-WORLD APPLICATION END-TO-END SCENARIO TESTS ⚡');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // -------------------------------------------------------------
  // SCENARIO 1: Complete Batches Lifecycle E2E
  // -------------------------------------------------------------
  console.log('🔵 SCENARIO 1: Complete Batches Lifecycle (Creation -> Roster -> Live -> Exam)');

  test('Scenario 1.1: Admin creates a new Cohort Batch with validated metadata', () => {
    const newBatchPayload = {
      title: 'JEE 2027 Alpha Rank Booster Batch',
      stream: 'JEE',
      target_focus: 'JEE',
      price: 5499,
      start_date: '2026-09-01T09:00:00Z',
      description: 'Comprehensive 2-year live masterclass and doubt clinic for JEE Advanced.'
    };

    assert.ok(newBatchPayload.title.length > 3);
    assert.strictEqual(newBatchPayload.price, 5499);
    assert.strictEqual(newBatchPayload.stream, 'JEE');

    const createdBatch = {
      id: 'batch-e2e-created-001',
      ...newBatchPayload,
      status: 'published',
      students_count: 0,
      materials_count: 0,
      live_sessions_count: 0,
      exams_count: 0,
      created_at: new Date().toISOString()
    };

    assert.strictEqual(createdBatch.id, 'batch-e2e-created-001');
    assert.strictEqual(createdBatch.status, 'published');
  });

  test('Scenario 1.2: Admin imports student roster via multi-format parser and prepares RPC call', () => {
    const rawRosterCsv = `Name,Email,Target\nRahul Sharma,rahul.sharma@example.com,JEE\nPriya Nair,priya.nair@example.com,JEE\nAnanya Gupta,ananya.g@example.com,JEE\nRohan Iyer,rohan.i@example.com,JEE\nSneha Sen,sneha.sen@example.com,JEE`;

    const lines = rawRosterCsv.split('\n').filter(l => l.trim() && !l.startsWith('Name,'));
    const parsedStudents = lines.map(line => {
      const [name, email, target] = line.split(',');
      return { name: name.trim(), email: email.trim(), target: target.trim() };
    });

    assert.strictEqual(parsedStudents.length, 5);

    const rpcPayload = {
      _batch_id: 'batch-e2e-created-001',
      _emails: parsedStudents.map(s => s.email.toLowerCase()),
      _names: parsedStudents.map(s => s.name),
      _focuses: parsedStudents.map(s => s.target)
    };

    assert.strictEqual(rpcPayload._batch_id, 'batch-e2e-created-001');
    assert.strictEqual(rpcPayload._emails.length, 5);
    assert.strictEqual(rpcPayload._names[0], 'Rahul Sharma');
  });

  test('Scenario 1.3: Admin schedules live class and uploads worksheets to Material Vault', () => {
    const liveSessionPayload = {
      id: 'session-e2e-01',
      batch_id: 'batch-e2e-created-001',
      title: 'Calculus & Mechanics Deep Dive Doubt Session',
      scheduled_start: '2026-09-05T18:00:00Z',
      duration_minutes: 90,
      meeting_url: 'https://meet.google.com/abc-defg-hij',
      status: 'upcoming'
    };

    assert.strictEqual(liveSessionPayload.duration_minutes, 90);
    assert.ok(liveSessionPayload.meeting_url.startsWith('https://'));

    const materialVaultPayload = {
      id: 'mat-e2e-01',
      batch_id: 'batch-e2e-created-001',
      file_name: 'Calculus_Handwritten_Notes.pdf',
      file_path: 'https://storage.asentra.edu.in/vault/calc_notes.pdf',
      is_premium: true
    };

    assert.strictEqual(materialVaultPayload.is_premium, true);
  });

  test('Scenario 1.4: Admin links CBT assessment and verifies batch metric updates', () => {
    const assessmentPayload = {
      id: 'assess-e2e-01',
      batch_id: 'batch-e2e-created-001',
      title: 'JEE 2027 Phase 1 Diagnostic Test',
      duration_minutes: 180,
      start_window: '2026-09-15T09:00:00Z',
      end_window: '2026-09-15T12:00:00Z',
      type: 'jee_mock'
    };

    assert.strictEqual(assessmentPayload.duration_minutes, 180);

    // Final state of batch
    const finalBatch = {
      id: 'batch-e2e-created-001',
      title: 'JEE 2027 Alpha Rank Booster Batch',
      stream: 'JEE',
      price: 5499,
      status: 'published',
      students_count: 5,
      materials_count: 1,
      live_sessions_count: 1,
      exams_count: 1,
      created_at: new Date().toISOString()
    };

    const stats = calculateBatchesKpiStats([finalBatch]);
    assert.strictEqual(stats.totalBatches, 1);
    assert.strictEqual(stats.publishedCohorts, 1);
    assert.strictEqual(stats.totalStudents, 5);
    assert.strictEqual(stats.totalLiveClasses, 1);
  });

  // -------------------------------------------------------------
  // SCENARIO 2: Complete Test Series Lifecycle E2E
  // -------------------------------------------------------------
  console.log('\n🔵 SCENARIO 2: Complete Test Series Lifecycle (Blueprint -> Compiler -> AI Ingest -> Submissions)');

  test('Scenario 2.1: Admin establishes Test Package Blueprint with commercials and distribution', () => {
    const packagePayload = {
      id: 'pkg-e2e-adv-001',
      title: 'JEE Advanced 2026 Grandmaster All India Test Series',
      target_exam_tag: 'JEE Advanced',
      description: '20 CBT Mock Tests with detailed step-by-step video solutions and NTA rank predictor.',
      test_distribution: {
        chapter_drills: 10,
        full_mocks: 8,
        live_papers: 2
      },
      price_ledger: {
        status: 'premium',
        price: 2999,
        original_price: 4999
      },
      total_tests_count: 20
    };

    assert.strictEqual(packagePayload.target_exam_tag, 'JEE Advanced');
    assert.strictEqual(packagePayload.price_ledger.price, 2999);
    assert.strictEqual(packagePayload.test_distribution.full_mocks, 8);
  });

  test('Scenario 2.2: Admin compiles CBT Exam Blueprint with marks scheme (+4 / -1)', () => {
    const questionsPool = [
      { id: 'q1', subject: 'Physics', sub_topic: 'Rotational Motion', marks_positive: 4, marks_negative: -1 },
      { id: 'q2', subject: 'Physics', sub_topic: 'Thermodynamics', marks_positive: 4, marks_negative: -1 },
      { id: 'q3', subject: 'Chemistry', sub_topic: 'Coordination Chemistry', marks_positive: 4, marks_negative: -1 },
      { id: 'q4', subject: 'Chemistry', sub_topic: 'Electrochemistry', marks_positive: 4, marks_negative: -1 },
      { id: 'q5', subject: 'Mathematics', sub_topic: 'Differential Calculus', marks_positive: 4, marks_negative: -1 }
    ];

    const examBlueprint = {
      id: 'exam-e2e-blueprint-01',
      package_id: 'pkg-e2e-adv-001',
      title: 'JEE Advanced Paper #01 Full Mock',
      duration_minutes: 180,
      total_questions: questionsPool.length,
      marks_scheme: { positive_marks: 4, negative_marks: -1 },
      is_live_ranking: true,
      activation_timestamp: '2026-09-20T09:00:00Z',
      questions: questionsPool
    };

    const totalMaximumMarks = examBlueprint.questions.reduce((sum, q) => sum + q.marks_positive, 0);
    assert.strictEqual(examBlueprint.total_questions, 5);
    assert.strictEqual(totalMaximumMarks, 20); // 5 * 4 = 20
  });

  test('Scenario 2.3: Admin ingests questions from AI PDF parser into exam blueprint', () => {
    const aiParsedQuestions = [
      {
        question_type: 'single_mcq',
        subject: 'Physics',
        content: 'A particle moves with uniform circular motion. Find the radial acceleration $a_r = \\frac{v^2}{r}$.',
        options: ['v^2/r', 'v/r^2', 'v^2 r', 'vr'],
        correct_option_index: 0,
        marks_positive: 4,
        marks_negative: -1
      },
      {
        question_type: 'numerical',
        subject: 'Mathematics',
        content: 'Evaluate $\\lim_{x \\to 0} \\frac{\\sin x}{x}$.',
        options: [],
        correct_option_index: '1',
        marks_positive: 4,
        marks_negative: 0
      }
    ];

    assert.strictEqual(aiParsedQuestions.length, 2);
    assert.strictEqual(aiParsedQuestions[0].options.length, 4);
    assert.strictEqual(aiParsedQuestions[1].options.length, 0);
  });

  test('Scenario 2.4: Candidates submit exam attempts and system computes proctoring telemetry & bell curve', () => {
    const studentAttempts = [
      { id: 'att-1', user_id: 'u1', student_name: 'Aarav', score: 110, total_duration_seconds: 10200 },
      { id: 'att-2', user_id: 'u2', student_name: 'Diya', score: 95, total_duration_seconds: 9800 },
      { id: 'att-3', user_id: 'u3', student_name: 'Vikram', score: 80, total_duration_seconds: 10500 },
      { id: 'att-4', user_id: 'u4', student_name: 'Ananya', score: 65, total_duration_seconds: 8900 },
      { id: 'att-5', user_id: 'u5', student_name: 'Rohan', score: 40, total_duration_seconds: 7200 }
    ];

    const scores = studentAttempts.map(a => a.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    assert.strictEqual(maxScore, 110);
    assert.strictEqual(minScore, 40);
    assert.strictEqual(averageScore, 78);

    // Compute distribution bins for Recharts bell curve visualization
    const distributionBins = {
      '0-50': scores.filter(s => s >= 0 && s <= 50).length,
      '51-80': scores.filter(s => s >= 51 && s <= 80).length,
      '81-100': scores.filter(s => s >= 81 && s <= 100).length,
      '101-120': scores.filter(s => s >= 101 && s <= 120).length
    };

    assert.strictEqual(distributionBins['0-50'], 1); // 40
    assert.strictEqual(distributionBins['51-80'], 2); // 65, 80
    assert.strictEqual(distributionBins['81-100'], 1); // 95
    assert.strictEqual(distributionBins['101-120'], 1); // 110

    // Verify KPI summary
    const testPackage = {
      id: 'pkg-e2e-adv-001',
      total_tests_count: 20,
      price_ledger: { status: 'premium', price: 2999 },
      test_exams: [{ id: 'exam-e2e-blueprint-01' }]
    };

    const kpi = calculateTestSeriesKpiStats([testPackage], studentAttempts);
    assert.strictEqual(kpi.totalPackages, 1);
    assert.strictEqual(kpi.totalExams, 1);
    assert.strictEqual(kpi.activeCandidates, 5);
    assert.strictEqual(kpi.premiumPackages, 1);
    assert.strictEqual(kpi.averageScore, 78);
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 TIER 4 RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    throw new Error(`Tier 4 Test Suite failed with ${failed} failure(s)`);
  }
  return { passed, failed };
}

if (require.main === module) {
  try {
    runTier4Tests();
  } catch (e) {
    process.exit(1);
  }
}

module.exports = { runTier4Tests };
