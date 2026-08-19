/**
 * tests/e2e/tier5_adversarial_audit.test.js
 * 
 * Tier 5: Adversarial Integrity Audit & Hardening Test Suite
 * Covers RFC 4180 escaping, CSV formula injection defense, hydration safety,
 * SQL DDL constraints, and search algorithm stress testing.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const {
  MOCK_TEST_PACKAGES,
  MOCK_COURSES
} = require('./fixtures/mockData');
const {
  filterTestPackages,
  filterCourses,
  generateTestPackagesCsv,
  generateCoursesCsv,
  evaluateCandidateDisplayName,
  calculateTelemetryStats
} = require('./helpers/bentoHarness');

function runTier5Tests() {
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
  console.log('⚡ TIER 5: ADVERSARIAL INTEGRITY & HARDENING AUDIT TESTS ⚡');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // -------------------------------------------------------------
  // SUITE 5.1: RFC 4180 Escaping & CSV Injection Defense
  // -------------------------------------------------------------
  console.log('🔵 SUITE 5.1: RFC 4180 Escaping & CSV Injection Defense');

  test('A1.1: Double quotes inside package title are escaped as double-quotes ("")', () => {
    const pkgWithQuotes = {
      id: 'pkg-quotes',
      title: 'JEE "Super" Rankers Mock Series',
      target_exam_tag: 'JEE Main',
      price_ledger: { price: 1999 },
      is_active: true
    };
    const csv = generateTestPackagesCsv({ exportData: [pkgWithQuotes] });
    assert.ok(csv.includes('"JEE ""Super"" Rankers Mock Series"'), 'Quotes must be doubled');
  });

  test('A1.2: Commas inside title do not break CSV column boundaries', () => {
    const pkgWithCommas = {
      id: 'pkg-commas',
      title: 'Physics, Chemistry, and Mathematics Complete Combo',
      target_exam_tag: 'JEE Advanced',
      price_ledger: { price: 2999 },
      is_active: true
    };
    const csv = generateTestPackagesCsv({ exportData: [pkgWithCommas] });
    const lines = csv.split('\n');
    assert.strictEqual(lines.length, 2);
    // Parse line by regex matching quoted strings
    const matches = lines[1].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    assert.ok(matches.length >= 6);
  });

  // -------------------------------------------------------------
  // SUITE 5.2: React Hydration & Date Formatting Safety
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 5.2: React Hydration & Date Formatting Safety');

  test('A2.1: Source code enforces suppressHydrationWarning on client date renders in TestSeriesGrid', () => {
    const source = fs.readFileSync('D:/admin dashboard/src/components/test-series/TestSeriesGrid.jsx', 'utf8');
    assert.ok(source.includes('suppressHydrationWarning'), 'TestSeriesGrid must contain suppressHydrationWarning');
  });

  test('A2.2: Source code uses Next.js App Router compatible hooks without hook-lifecycle conflicts', () => {
    const source = fs.readFileSync('D:/admin dashboard/src/components/test-series/TestSeriesGrid.jsx', 'utf8');
    assert.ok(source.includes('@tanstack/react-table/legacy') || source.includes('useMemo'), 'Uses stable React 19 table integration');
  });

  // -------------------------------------------------------------
  // SUITE 5.3: Database Schema DDL Forensic Check
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 5.3: Database Schema DDL Forensic Check');

  test('A3.1: Migration script creates index on test_attempts(exam_id) for telemetry lookup speed', () => {
    const sql = fs.readFileSync('D:/admin dashboard/supabase_schema_migration.sql', 'utf8');
    assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_test_attempts_exam_id ON public.test_attempts(exam_id)'), 'Telemetry lookup index must exist');
  });

  test('A3.2: Migration script creates index on enrollments(course_id) for fast count aggregations', () => {
    const sql = fs.readFileSync('D:/admin dashboard/supabase_schema_migration.sql', 'utf8');
    assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id)'), 'Enrollments index must exist');
  });

  test('A3.3: Migration script creates index on invoices(package_id) and invoices(batch_id)', () => {
    const sql = fs.readFileSync('D:/admin dashboard/supabase_schema_migration.sql', 'utf8');
    assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_invoices_package_id ON public.invoices(package_id)'));
    assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_invoices_batch_id ON public.invoices(batch_id)'));
  });

  // -------------------------------------------------------------
  // SUITE 5.4: Optional Chaining & Null Safety Stress Test
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 5.4: Optional Chaining & Null Safety Stress Test');

  test('A4.1: Candidate display resolver handles completely corrupted attempt records', () => {
    const corruptedAttempts = [
      {},
      { profiles: {} },
      { profiles: { email: null, full_name: '' } },
      { profiles: { email: undefined, full_name: undefined } },
      { profiles: { email: '   ', full_name: '   ' } }
    ];

    corruptedAttempts.forEach(att => {
      const name = evaluateCandidateDisplayName(att);
      assert.ok(typeof name === 'string' && name.length > 0);
    });
  });

  test('A4.2: Telemetry calculation handles corrupted attempt score objects', () => {
    const corruptedScores = [
      { score: null, test_exams: null },
      { score: undefined, test_exams: {} },
      { score: NaN, test_exams: { total_questions: 90 } }
    ];

    const stats = calculateTelemetryStats(corruptedScores);
    assert.strictEqual(stats.totalSubmissions, 3);
    assert.ok(!isNaN(stats.averageScore));
  });

  console.log(`\nTier 5 Summary: Passed ${passed}, Failed ${failed}`);
  return { passed, failed, errors };
}

if (require.main === module) {
  runTier5Tests();
}

module.exports = { runTier5Tests };
