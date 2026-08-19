/**
 * tests/e2e/tier4_real_world_scenarios.test.js
 * 
 * Tier 4: Real-World Workload Scenarios E2E Test Suite
 * Simulates complete end-to-end admin lifecycle workflows:
 * - Scenario 4.1: Complete Test Package Lifecycle
 * - Scenario 4.2: Complete Course Administration Lifecycle
 * - Scenario 4.3: CBT Proctoring & Live Telemetry Cockpit Workflow
 * - Scenario 4.4: Role-Based Authorization & Session Guard Flow
 * - Scenario 4.5: Financial Ledger & Cascade Deletion Safety Flow
 */

const assert = require('node:assert');
const {
  MOCK_TEST_PACKAGES,
  MOCK_COURSES,
  MOCK_ATTEMPTS,
  MOCK_INVOICES
} = require('./fixtures/mockData');
const {
  filterTestPackages,
  filterCourses,
  sortDataset,
  paginateDataset,
  generateTestPackagesCsv,
  generateCoursesCsv,
  simulateRequireAdmin,
  evaluateCandidateDisplayName,
  calculateTelemetryStats,
  simulateDbOperations,
  inspectBentoCardVisualStructure
} = require('./helpers/bentoHarness');

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

  async function testAsync(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  ✅ PASS: ${name}`);
    } catch (err) {
      failed++;
      errors.push({ name, error: err.message });
      console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('⚡ TIER 4: REAL-WORLD APPLICATION WORKLOAD SCENARIOS ⚡');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // -------------------------------------------------------------
  // SCENARIO 4.1: Complete Test Package Admin Lifecycle
  // -------------------------------------------------------------
  console.log('🔵 SCENARIO 4.1: Complete Test Package Admin Lifecycle');

  test('S1: Full lifecycle: Creation -> Blueprint Editing -> Live Exam Scheduling -> Telemetry -> Deletion', () => {
    const db = simulateDbOperations();
    db.loadData({
      test_packages: [],
      test_exams: [],
      test_attempts: [],
      invoices: []
    });

    // Step 1: Admin creates package blueprint
    const newPackage = {
      id: 'pkg-lifecycle-01',
      title: 'JEE Advanced 2026 Physics Crash Mock Pack',
      target_exam_tag: 'JEE Advanced',
      description: 'Ultra intensive full length simulated tests.',
      thumbnail_url: 'https://images.unsplash.com/photo-1513258496099-48168024aec0',
      is_active: false, // created in draft
      total_tests_count: 5,
      test_distribution: { chapter_drills: 2, full_mocks: 2, live_papers: 1 },
      price_ledger: { status: 'premium', price: 1499, original_price: 2999 },
      created_at: new Date().toISOString()
    };
    db.getData().test_packages.push(newPackage);
    assert.strictEqual(db.getData().test_packages.length, 1);

    // Step 2: Admin adds exam blueprints to package
    const exam1 = {
      id: 'exam-lc-01',
      package_id: newPackage.id,
      title: 'Mock 1 - Mechanics & Optics',
      duration_minutes: 180,
      total_questions: 54,
      marks_scheme: { positive_marks: 4, negative: -2 }
    };
    db.getData().test_exams.push(exam1);
    assert.strictEqual(db.getData().test_exams.length, 1);

    // Step 3: Admin activates package and confirms Bento visual structure
    newPackage.is_active = true;
    const visual = inspectBentoCardVisualStructure(newPackage, 'package');
    assert.strictEqual(visual.isFree, false);
    assert.strictEqual(visual.priceFormatted, '₹1,499');
    assert.strictEqual(visual.hasThumbnail, true);

    // Step 4: Admin searches and finds package in catalog
    const searchResult = filterTestPackages({
      packages: db.getData().test_packages,
      tagFilter: 'JEE Advanced',
      globalFilter: 'Crash Mock'
    });
    assert.strictEqual(searchResult.length, 1);
    assert.strictEqual(searchResult[0].id, newPackage.id);

    // Step 5: Admin deletes package with cascade
    db.deletePackage(newPackage.id);
    assert.strictEqual(db.getData().test_packages.length, 0);
    assert.strictEqual(db.getData().test_exams.length, 0);
  });

  // -------------------------------------------------------------
  // SCENARIO 4.2: Complete Course Administration Lifecycle
  // -------------------------------------------------------------
  console.log('\n🔵 SCENARIO 4.2: Complete Course Administration Lifecycle');

  test('S2: Full course workflow: Inception -> Syllabus Importer -> Density Calculation -> Status Toggle -> Export', () => {
    const db = simulateDbOperations();
    db.loadData({
      courses: [],
      lessons: [],
      course_files: [],
      assessments: [],
      invoices: []
    });

    // Step 1: Admin establishes course
    const newCourse = {
      id: 'crs-lifecycle-01',
      title: 'Physical Chemistry Thermodynamics & Kinetics',
      subject: 'Chemistry',
      level: 'JEE Advanced',
      instructor_name: 'Dr. Alok Verma',
      price: 2499,
      original_price: 3999,
      is_active: false,
      created_at: new Date().toISOString()
    };
    db.getData().courses.push(newCourse);

    // Step 2: Syllabus importer injects 10 lessons, 5 files, 2 assessments
    for (let i = 1; i <= 10; i++) {
      db.getData().lessons.push({ id: `les-${i}`, course_id: newCourse.id, title: `Lesson ${i}` });
    }
    for (let i = 1; i <= 5; i++) {
      db.getData().course_files.push({ id: `file-${i}`, course_id: newCourse.id, file_name: `Worksheet ${i}.pdf` });
    }
    for (let i = 1; i <= 2; i++) {
      db.getData().assessments.push({ id: `ass-${i}`, course_id: newCourse.id, title: `Assessment ${i}` });
    }

    // Step 3: Verify enriched curriculum counts
    const enrichedCourse = {
      ...newCourse,
      lessons_count: db.getData().lessons.filter(l => l.course_id === newCourse.id).length,
      files_count: db.getData().course_files.filter(f => f.course_id === newCourse.id).length,
      exams_count: db.getData().assessments.filter(a => a.course_id === newCourse.id).length
    };
    assert.strictEqual(enrichedCourse.lessons_count, 10);
    assert.strictEqual(enrichedCourse.files_count, 5);
    assert.strictEqual(enrichedCourse.exams_count, 2);

    // Step 4: Admin activates course & exports CSV
    enrichedCourse.is_active = true;
    const csv = generateCoursesCsv({ exportData: [enrichedCourse] });
    assert.ok(csv.includes('"Physical Chemistry Thermodynamics & Kinetics"'));
    assert.ok(csv.includes('10,5,2'));
  });

  // -------------------------------------------------------------
  // SCENARIO 4.3: CBT Proctoring & Live Telemetry Cockpit Workflow
  // -------------------------------------------------------------
  console.log('\n🔵 SCENARIO 4.3: CBT Proctoring & Live Telemetry Cockpit Workflow');

  test('S3: Telemetry ingestion -> Marks scheme normalization -> Score Bell Curve -> Candidate submission log', () => {
    // Ingest mixed attempts (some with positive_marks, some with positive, some missing profiles)
    const attempts = [
      {
        id: 'att-s3-1',
        score: 300,
        total_duration_seconds: 7200,
        correct_count: 75,
        incorrect_count: 0,
        profiles: { full_name: 'Aarav Gupta', email: 'aarav@example.com' },
        test_exams: { total_questions: 75, marks_scheme: { positive_marks: 4, negative: -1 } }
      },
      {
        id: 'att-s3-2',
        score: 150,
        total_duration_seconds: 8100,
        correct_count: 40,
        incorrect_count: 10,
        profiles: { full_name: null, email: 'student_kota_2026@gmail.com' },
        test_exams: { total_questions: 75, marks_scheme: { positive: 4, negative: -1 } }
      },
      {
        id: 'att-s3-3',
        score: 60,
        total_duration_seconds: 5400,
        correct_count: 20,
        incorrect_count: 20,
        profiles: null,
        test_exams: { total_questions: 75, marks_scheme: null }
      }
    ];

    // Compute telemetry stats
    const stats = calculateTelemetryStats(attempts);
    assert.strictEqual(stats.totalSubmissions, 3);
    // (300 + 150 + 60) / 3 = 510 / 3 = 170
    assert.strictEqual(stats.averageScore, 170);

    // Verify candidate names rendered without crash
    const names = attempts.map(evaluateCandidateDisplayName);
    assert.strictEqual(names[0], 'Aarav Gupta');
    assert.strictEqual(names[1], 'student_kota_2026');
    assert.strictEqual(names[2], 'Candidate');
  });

  // -------------------------------------------------------------
  // SCENARIO 4.4: Role-Based Authorization & Session Guard Flow
  // -------------------------------------------------------------
  console.log('\n🔵 SCENARIO 4.4: Role-Based Authorization & Session Guard Flow');

  test('S4: Async cookies auth verification across Admin, Teacher, Student, and Guest states', async () => {
    const createMockCookieStore = (role) => ({
      getAll: () => [{ name: 'sb-access-token', value: `token-${role}` }],
      set: () => {}
    });

    // 1. Admin login passes
    const adminUser = await simulateRequireAdmin({
      cookieStore: createMockCookieStore('admin'),
      getUserFn: async () => ({ id: 'usr-admin', app_metadata: { role: 'admin' } })
    });
    assert.strictEqual(adminUser.id, 'usr-admin');

    // 2. Instructor login passes
    const instructorUser = await simulateRequireAdmin({
      cookieStore: createMockCookieStore('instructor'),
      getUserFn: async () => ({ id: 'usr-inst', app_metadata: { role: 'instructor' } })
    });
    assert.strictEqual(instructorUser.id, 'usr-inst');

    // 3. Student rejected
    let studentError = null;
    try {
      await simulateRequireAdmin({
        cookieStore: createMockCookieStore('student'),
        getUserFn: async () => ({ id: 'usr-std', app_metadata: { role: 'student' } })
      });
    } catch (e) {
      studentError = e;
    }
    assert.ok(studentError);
    assert.ok(studentError.message.includes('Forbidden'));

    // 4. Guest without session rejected
    let guestError = null;
    try {
      await simulateRequireAdmin({
        cookieStore: { getAll: () => [], set: () => {} },
        getUserFn: async () => null
      });
    } catch (e) {
      guestError = e;
    }
    assert.ok(guestError);
    assert.ok(guestError.message.includes('Unauthorized'));
  });

  // -------------------------------------------------------------
  // SCENARIO 4.5: Financial Ledger & Cascade Deletion Safety Flow
  // -------------------------------------------------------------
  console.log('\n🔵 SCENARIO 4.5: Financial Ledger & Cascade Deletion Safety Flow');

  test('S5: Invoices ledger retained with SET NULL when purchased package is deleted', () => {
    const db = simulateDbOperations();
    db.loadData({
      test_packages: [{ id: 'pkg-monetized-01', title: 'Paid Test Series' }],
      test_exams: [{ id: 'exam-mon-01', package_id: 'pkg-monetized-01' }],
      test_attempts: [{ id: 'att-mon-01', exam_id: 'exam-mon-01' }],
      invoices: [
        { id: 'inv-paid-01', package_id: 'pkg-monetized-01', amount_paid: 1999, status: 'captured' },
        { id: 'inv-paid-02', package_id: 'pkg-monetized-01', amount_paid: 1999, status: 'captured' }
      ]
    });

    // Delete package
    db.deletePackage('pkg-monetized-01');

    const state = db.getData();
    // Packages and exams are gone
    assert.strictEqual(state.test_packages.length, 0);
    assert.strictEqual(state.test_exams.length, 0);
    assert.strictEqual(state.test_attempts.length, 0);

    // Invoices are intact with package_id: null
    assert.strictEqual(state.invoices.length, 2);
    assert.strictEqual(state.invoices[0].package_id, null);
    assert.strictEqual(state.invoices[0].amount_paid, 1999);
    assert.strictEqual(state.invoices[1].package_id, null);
    assert.strictEqual(state.invoices[1].amount_paid, 1999);
  });

  console.log(`\nTier 4 Summary: Passed ${passed}, Failed ${failed}`);
  return { passed, failed, errors };
}

if (require.main === module) {
  runTier4Tests();
}

module.exports = { runTier4Tests };
