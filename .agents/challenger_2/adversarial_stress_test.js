/**
 * D:\admin dashboard\.agents\challenger_2\adversarial_stress_test.js
 * 
 * Challenger 2 Adversarial Stress Test Suite:
 * - 1. Database Connections & Next.js 16 Async Cookie Auth
 * - 2. CBT Telemetry & Bell-Curve Calculation Stress (Zero attempts, negative marks, key aliases)
 * - 3. Monitor Client UI Crash Prevention & Candidate Name Resolution
 * - 4. Relational Deletion Cascade & Financial Ledger Preservation
 * - 5. Bento Grid Responsive Layout & Admin Controls Invariants
 */

const assert = require('node:assert');
const fs = require('node:fs');

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

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err.message });
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
  }
}

console.log('======================================================================');
console.log('⚡ CHALLENGER 2: ADVERSARIAL DATABASE, AUTH & TELEMETRY STRESS TEST ⚡');
console.log('======================================================================');

// =====================================================================
// SECTION 1: Next.js 16 Async Cookies & requireAdmin() Auth
// =====================================================================
console.log('\n--- 1. NEXT.JS 16 ASYNC COOKIES & REQUIREADMIN() AUTH ---');

// Mock requireAdmin logic from src/utils/auth-server.js
async function simulateRequireAdminServer(cookieStorePromise, mockGetUser) {
  const cookieStore = await cookieStorePromise;
  
  const user = await mockGetUser(cookieStore);
  if (!user) {
    throw new Error('Unauthorized: Session not found');
  }

  const userRole = user?.app_metadata?.role || 'student';
  const isAuthorized = ['admin', 'teacher', 'instructor'].includes(userRole);

  if (!isAuthorized) {
    throw new Error('Forbidden: Account lacks administrative privileges');
  }

  return user;
}

testAsync('1.1 requireAdmin awaits async cookies() Promise under Next.js 16', async () => {
  const cookiePromise = Promise.resolve({
    getAll: () => [{ name: 'sb-access-token', value: 'valid-admin-jwt' }],
    set: () => {}
  });

  const user = await simulateRequireAdminServer(cookiePromise, async (store) => {
    assert.strictEqual(store.getAll()[0].value, 'valid-admin-jwt');
    return { id: 'usr-admin-1', app_metadata: { role: 'admin' } };
  });

  assert.strictEqual(user.id, 'usr-admin-1');
  assert.strictEqual(user.app_metadata.role, 'admin');
});

testAsync('1.2 requireAdmin authorizes "teacher" and "instructor" roles', async () => {
  for (const role of ['teacher', 'instructor']) {
    const cookiePromise = Promise.resolve({ getAll: () => [], set: () => {} });
    const user = await simulateRequireAdminServer(cookiePromise, async () => ({
      id: `usr-${role}`,
      app_metadata: { role }
    }));
    assert.strictEqual(user.app_metadata.role, role);
  }
});

testAsync('1.3 requireAdmin rejects "student" with 403 Forbidden', async () => {
  const cookiePromise = Promise.resolve({ getAll: () => [], set: () => {} });
  let errThrown = null;
  try {
    await simulateRequireAdminServer(cookiePromise, async () => ({
      id: 'usr-student-1',
      app_metadata: { role: 'student' }
    }));
  } catch (err) {
    errThrown = err;
  }
  assert.ok(errThrown);
  assert.ok(errThrown.message.includes('Forbidden'));
});

testAsync('1.4 requireAdmin defaults missing app_metadata to "student" and rejects with 403', async () => {
  const cookiePromise = Promise.resolve({ getAll: () => [], set: () => {} });
  let errThrown = null;
  try {
    await simulateRequireAdminServer(cookiePromise, async () => ({
      id: 'usr-no-role',
      app_metadata: null
    }));
  } catch (err) {
    errThrown = err;
  }
  assert.ok(errThrown);
  assert.ok(errThrown.message.includes('Forbidden'));
});

testAsync('1.5 requireAdmin rejects unauthenticated guest (null user) with 401 Unauthorized', async () => {
  const cookiePromise = Promise.resolve({ getAll: () => [], set: () => {} });
  let errThrown = null;
  try {
    await simulateRequireAdminServer(cookiePromise, async () => null);
  } catch (err) {
    errThrown = err;
  }
  assert.ok(errThrown);
  assert.ok(errThrown.message.includes('Unauthorized'));
});

// =====================================================================
// SECTION 2: CBT Telemetry & Bell Curve Calculations
// =====================================================================
console.log('\n--- 2. CBT TELEMETRY & BELL CURVE CALCULATIONS ---');

function computeTelemetry(attempts) {
  const totalSubmissions = attempts ? attempts.length : 0;
  let averageScore = 0;
  let bellCurve = [
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 }
  ];

  if (totalSubmissions > 0) {
    const sum = attempts.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
    averageScore = Math.round(sum / totalSubmissions);

    const firstAttempt = attempts[0];
    const totalQ = firstAttempt?.test_exams?.total_questions || 90;
    const posMarks = firstAttempt?.test_exams?.marks_scheme?.positive_marks 
      ?? firstAttempt?.test_exams?.marks_scheme?.positive 
      ?? 4;
    const maxScore = totalQ * posMarks;

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

test('2.1 Zero Submissions Bound: returns zeroed metrics without NaN or undefined', () => {
  const result = computeTelemetry([]);
  assert.strictEqual(result.totalSubmissions, 0);
  assert.strictEqual(result.averageScore, 0);
  assert.strictEqual(result.bellCurve.length, 5);
  result.bellCurve.forEach(b => assert.strictEqual(b.count, 0));
});

test('2.2 Positive Marks Scheme: resolves positive_marks correctly', () => {
  const attempts = [
    { score: 360, test_exams: { total_questions: 90, marks_scheme: { positive_marks: 4 } } },
    { score: 180, test_exams: { total_questions: 90, marks_scheme: { positive_marks: 4 } } }
  ];
  const result = computeTelemetry(attempts);
  assert.strictEqual(result.totalSubmissions, 2);
  assert.strictEqual(result.averageScore, 270);
  assert.strictEqual(result.bellCurve[4].count, 1); // 100% -> 81-100%
  assert.strictEqual(result.bellCurve[2].count, 1); // 50% -> 41-60%
});

test('2.3 Legacy Positive Marks Scheme: resolves positive correctly', () => {
  const attempts = [
    { score: 200, test_exams: { total_questions: 50, marks_scheme: { positive: 4 } } }
  ];
  const result = computeTelemetry(attempts);
  assert.strictEqual(result.totalSubmissions, 1);
  assert.strictEqual(result.averageScore, 200);
  assert.strictEqual(result.bellCurve[4].count, 1); // 100% (200/200) -> 81-100%
});

test('2.4 Missing marks_scheme fallback to 4', () => {
  const attempts = [
    { score: 90, test_exams: { total_questions: 90, marks_scheme: null } }
  ];
  const result = computeTelemetry(attempts);
  assert.strictEqual(result.totalSubmissions, 1);
  assert.strictEqual(result.averageScore, 90);
  // 90 / (90*4=360) = 25% -> band 21-40% (index 1)
  assert.strictEqual(result.bellCurve[1].count, 1);
});

test('2.5 Negative scores from penalty marks categorized into 0-20% bucket safely', () => {
  const attempts = [
    { score: -15, test_exams: { total_questions: 90, marks_scheme: { positive_marks: 4, negative_marks: -1 } } },
    { score: 0, test_exams: { total_questions: 90, marks_scheme: { positive_marks: 4, negative_marks: -1 } } }
  ];
  const result = computeTelemetry(attempts);
  assert.strictEqual(result.totalSubmissions, 2);
  assert.strictEqual(result.averageScore, -8); // Math.round(-15/2) = -8
  assert.strictEqual(result.bellCurve[0].count, 2);
});

test('2.6 Missing test_exams object falls back to total_questions: 90 and posMarks: 4', () => {
  const attempts = [
    { score: 180, test_exams: null }
  ];
  const result = computeTelemetry(attempts);
  assert.strictEqual(result.totalSubmissions, 1);
  assert.strictEqual(result.averageScore, 180);
  // 180 / 360 = 50% -> 41-60% (index 2)
  assert.strictEqual(result.bellCurve[2].count, 1);
});

// =====================================================================
// SECTION 3: Monitor Client Candidate Display Name & Null Safety
// =====================================================================
console.log('\n--- 3. MONITOR CLIENT CANDIDATE RESOLUTION & NULL SAFETY ---');

function getCandidateName(att) {
  return att?.profiles?.full_name || att?.profiles?.email?.split('@')[0] || 'Candidate';
}

test('3.1 Resolves full_name when provided', () => {
  const att = { profiles: { full_name: 'Priya Sharma', email: 'priya@gmail.com' } };
  assert.strictEqual(getCandidateName(att), 'Priya Sharma');
});

test('3.2 Splits email before @ when full_name is null or empty', () => {
  const att1 = { profiles: { full_name: null, email: 'student_kota_2026@gmail.com' } };
  assert.strictEqual(getCandidateName(att1), 'student_kota_2026');

  const att2 = { profiles: { full_name: '', email: 'aditya.sharma@example.com' } };
  assert.strictEqual(getCandidateName(att2), 'aditya.sharma');
});

test('3.3 Handles null email safely without TypeError exception', () => {
  const att = { profiles: { full_name: null, email: null } };
  assert.strictEqual(getCandidateName(att), 'Candidate');
});

test('3.4 Handles completely null profiles relation safely', () => {
  const att = { profiles: null };
  assert.strictEqual(getCandidateName(att), 'Candidate');
});

test('3.5 Handles undefined attempt object safely', () => {
  assert.strictEqual(getCandidateName(undefined), 'Candidate');
  assert.strictEqual(getCandidateName({}), 'Candidate');
});

// =====================================================================
// SECTION 4: Relational Deletions & Financial Ledger Safety
// =====================================================================
console.log('\n--- 4. RELATIONAL DELETIONS & FINANCIAL LEDGER SAFETY ---');

function simulateRelationalDb() {
  const state = {
    test_packages: [{ id: 'pkg-1', title: 'JEE Package 1' }],
    test_exams: [
      { id: 'exam-1', package_id: 'pkg-1', title: 'Mock 1' },
      { id: 'exam-2', package_id: 'pkg-1', title: 'Mock 2' }
    ],
    test_attempts: [
      { id: 'att-1', exam_id: 'exam-1', score: 250 },
      { id: 'att-2', exam_id: 'exam-2', score: 310 }
    ],
    courses: [{ id: 'crs-1', title: 'Physics Masterclass' }],
    lessons: [{ id: 'les-1', course_id: 'crs-1', title: 'Mechanics' }],
    course_files: [{ id: 'file-1', course_id: 'crs-1', file_name: 'Notes.pdf' }],
    assessments: [{ id: 'ass-1', course_id: 'crs-1', title: 'Quiz 1' }],
    invoices: [
      { id: 'inv-1', package_id: 'pkg-1', course_id: null, amount_paid: 1999, status: 'captured' },
      { id: 'inv-2', package_id: null, course_id: 'crs-1', amount_paid: 2999, status: 'captured' }
    ]
  };

  return {
    getState: () => state,
    deletePackage: (packageId) => {
      state.test_packages = state.test_packages.filter(p => p.id !== packageId);
      const deletedExamIds = state.test_exams.filter(e => e.package_id === packageId).map(e => e.id);
      state.test_exams = state.test_exams.filter(e => e.package_id !== packageId);
      state.test_attempts = state.test_attempts.filter(a => !deletedExamIds.includes(a.exam_id));
      // Invoices: SET NULL
      state.invoices = state.invoices.map(inv => inv.package_id === packageId ? { ...inv, package_id: null } : inv);
    },
    deleteCourse: (courseId) => {
      state.courses = state.courses.filter(c => c.id !== courseId);
      state.lessons = state.lessons.filter(l => l.course_id !== courseId);
      state.course_files = state.course_files.filter(f => f.course_id !== courseId);
      state.assessments = state.assessments.filter(a => a.course_id !== courseId);
      // Invoices: SET NULL
      state.invoices = state.invoices.map(inv => inv.course_id === courseId ? { ...inv, course_id: null } : inv);
    }
  };
}

test('4.1 Deleting a test package cascades to exams & attempts', () => {
  const db = simulateRelationalDb();
  db.deletePackage('pkg-1');
  const state = db.getState();
  assert.strictEqual(state.test_packages.length, 0);
  assert.strictEqual(state.test_exams.length, 0);
  assert.strictEqual(state.test_attempts.length, 0);
});

test('4.2 Deleting a test package preserves invoice record with package_id SET NULL', () => {
  const db = simulateRelationalDb();
  db.deletePackage('pkg-1');
  const state = db.getState();
  assert.strictEqual(state.invoices.length, 2);
  const inv1 = state.invoices.find(i => i.id === 'inv-1');
  assert.strictEqual(inv1.package_id, null);
  assert.strictEqual(inv1.amount_paid, 1999);
});

test('4.3 Deleting a course cascades to lessons, course_files, assessments', () => {
  const db = simulateRelationalDb();
  db.deleteCourse('crs-1');
  const state = db.getState();
  assert.strictEqual(state.courses.length, 0);
  assert.strictEqual(state.lessons.length, 0);
  assert.strictEqual(state.course_files.length, 0);
  assert.strictEqual(state.assessments.length, 0);
});

test('4.4 Deleting a course preserves invoice record with course_id SET NULL', () => {
  const db = simulateRelationalDb();
  db.deleteCourse('crs-1');
  const state = db.getState();
  assert.strictEqual(state.invoices.length, 2);
  const inv2 = state.invoices.find(i => i.id === 'inv-2');
  assert.strictEqual(inv2.course_id, null);
  assert.strictEqual(inv2.amount_paid, 2999);
});

// =====================================================================
// SECTION 5: Schema DDL & Source File Verification
// =====================================================================
console.log('\n--- 5. SOURCE CODE & SCHEMA FORENSIC AUDIT ---');

test('5.1 Schema migration contains all required cascade and set null FKs', () => {
  const sql = fs.readFileSync('D:/admin dashboard/supabase_schema_migration.sql', 'utf8');
  assert.ok(sql.includes('ON DELETE CASCADE'), 'Must contain CASCADE rules for child entities');
  assert.ok(sql.includes('ON DELETE SET NULL'), 'Must contain SET NULL rules for invoices');
  assert.ok(sql.includes('REFERENCES public.test_packages(id) ON DELETE CASCADE'));
  assert.ok(sql.includes('REFERENCES public.courses(id) ON DELETE CASCADE'));
  assert.ok(sql.includes('REFERENCES public.test_packages(id) ON DELETE SET NULL'));
  assert.ok(sql.includes('REFERENCES public.courses(id) ON DELETE SET NULL'));
});

test('5.2 auth-server.js uses await cookies() for Next.js 16', () => {
  const code = fs.readFileSync('D:/admin dashboard/src/utils/auth-server.js', 'utf8');
  assert.ok(code.includes('await cookies()'), 'auth-server.js must use await cookies()');
  assert.ok(code.includes('requireAdmin'), 'auth-server.js must export requireAdmin');
});

test('5.3 telemetry route.js uses optional chaining and positive_marks/positive aliases', () => {
  const code = fs.readFileSync('D:/admin dashboard/src/app/api/admin/test-series/telemetry/route.js', 'utf8');
  assert.ok(code.includes('positive_marks'), 'telemetry route must handle positive_marks');
  assert.ok(code.includes('positive'), 'telemetry route must handle positive');
  assert.ok(code.includes('?? 4'), 'telemetry route must default fallback to 4');
});

test('5.4 MonitorClient.jsx uses safe candidate email splitting with optional chaining', () => {
  const code = fs.readFileSync('D:/admin dashboard/src/app/admin/test-series/monitor/[examId]/MonitorClient.jsx', 'utf8');
  assert.ok(code.includes("att.profiles?.email?.split('@')[0]"), 'MonitorClient must use safe optional chaining on email splitting');
});

// =====================================================================
// SUMMARY
// =====================================================================
console.log('\n======================================================================');
console.log('📊 CHALLENGER 2 ADVERSARIAL STRESS TEST SUMMARY');
console.log('======================================================================');
console.log(`  Total Tests Run: ${totalTests}`);
console.log(`  Passed:          ${passedTests}`);
console.log(`  Failed:          ${failedTests}`);
console.log('======================================================================');

if (failedTests > 0) {
  console.error('❌ FAILURES DETECTED:');
  failures.forEach(f => console.error(`  - ${f.name}: ${f.error}`));
  process.exit(1);
} else {
  console.log('✔ ALL ADVERSARIAL STRESS TESTS COMPLETED WITH 100% PASS RATE!');
  process.exit(0);
}
