/**
 * tests/e2e/tier2_boundary_corner_cases.test.js
 * 
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 * Covers empty data arrays, missing thumbnails, broken images, null/undefined properties,
 * extreme prices, long titles, special characters, zero counts, and telemetry edge cases.
 */

const assert = require('node:assert');
const {
  MOCK_TEST_PACKAGES,
  MOCK_COURSES,
  MOCK_CORNER_CASES
} = require('./fixtures/mockData');
const {
  filterTestPackages,
  filterCourses,
  sortDataset,
  paginateDataset,
  generateTestPackagesCsv,
  generateCoursesCsv,
  evaluateCandidateDisplayName,
  calculateTelemetryStats,
  inspectBentoCardVisualStructure
} = require('./helpers/bentoHarness');

function runTier2Tests() {
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
  console.log('⚡ TIER 2: BOUNDARY & CORNER CASES TESTS ⚡');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // -------------------------------------------------------------
  // SUITE 2.1: Empty Data Arrays & Zero States
  // -------------------------------------------------------------
  console.log('🔵 SUITE 2.1: Empty Data Arrays & Zero States');

  test('B1.1: Filtering an empty package array returns empty array with zero exceptions', () => {
    const results = filterTestPackages({ packages: [], tagFilter: 'JEE Main', globalFilter: 'Test' });
    assert.deepStrictEqual(results, []);
  });

  test('B1.2: Filtering an empty course array returns empty array with zero exceptions', () => {
    const results = filterCourses({ courses: [], levelFilter: 'JEE Advanced', globalFilter: 'Maths' });
    assert.deepStrictEqual(results, []);
  });

  test('B1.3: Pagination with 0 rows returns 1 page count and canNext/Previous false', () => {
    const p = paginateDataset({ data: [], pageIndex: 0, pageSize: 10 });
    assert.strictEqual(p.rows.length, 0);
    assert.strictEqual(p.pageCount, 1);
    assert.strictEqual(p.canPreviousPage, false);
    assert.strictEqual(p.canNextPage, false);
  });

  test('B1.4: Telemetry computation on empty attempts returns 0 submissions and 0 average', () => {
    const stats = calculateTelemetryStats([]);
    assert.strictEqual(stats.totalSubmissions, 0);
    assert.strictEqual(stats.averageScore, 0);
    assert.strictEqual(stats.bellCurve.length, 5);
    stats.bellCurve.forEach(band => assert.strictEqual(band.count, 0));
  });

  test('B1.5: CSV generation on empty dataset produces valid headers row without data rows', () => {
    const csvPkg = generateTestPackagesCsv({ exportData: [] });
    const linesPkg = csvPkg.split('\n');
    assert.strictEqual(linesPkg.length, 1);
    assert.ok(linesPkg[0].includes('Title'));

    const csvCrs = generateCoursesCsv({ exportData: [] });
    const linesCrs = csvCrs.split('\n');
    assert.strictEqual(linesCrs.length, 1);
    assert.ok(linesCrs[0].includes('Subject'));
  });

  // -------------------------------------------------------------
  // SUITE 2.2: Missing/Malformed Thumbnails & Fallback Resilience
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.2: Missing/Malformed Thumbnails & Fallback Resilience');

  test('B2.1: Null or undefined thumbnail URL triggers fallback gradient container', () => {
    const pkgNull = { id: 'p1', thumbnail_url: null };
    const visualNull = inspectBentoCardVisualStructure(pkgNull, 'package');
    assert.strictEqual(visualNull.hasThumbnail, false);
    assert.strictEqual(visualNull.hasFallbackContainer, true);

    const pkgUndef = { id: 'p2', thumbnail_url: undefined };
    const visualUndef = inspectBentoCardVisualStructure(pkgUndef, 'package');
    assert.strictEqual(visualUndef.hasThumbnail, false);
    assert.strictEqual(visualUndef.hasFallbackContainer, true);
  });

  test('B2.2: Empty string thumbnail URL triggers fallback container without broken img crash', () => {
    const courseEmpty = { id: 'c1', thumbnail_url: '' };
    const visualEmpty = inspectBentoCardVisualStructure(courseEmpty, 'course');
    assert.strictEqual(visualEmpty.hasThumbnail, false);
    assert.strictEqual(visualEmpty.hasFallbackContainer, true);
  });

  test('B2.3: Subject-specific fallback badges provide default styling when icon is unmapped', () => {
    const courseUnknownSubject = { id: 'c2', subject: 'UnknownSubject', thumbnail_url: null };
    const visual = inspectBentoCardVisualStructure(courseUnknownSubject, 'course');
    assert.strictEqual(visual.hasSubjectBadge, true);
  });

  // -------------------------------------------------------------
  // SUITE 2.3: Price Ledger Boundary & Extreme Numbers
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.3: Price Ledger Boundary & Extreme Numbers');

  test('B3.1: Free package (₹0) correctly renders FREE pill and status free', () => {
    const pkg = { id: 'p-free', price_ledger: { status: 'free', price: 0 } };
    const visual = inspectBentoCardVisualStructure(pkg, 'package');
    assert.strictEqual(visual.isFree, true);
    assert.strictEqual(visual.priceFormatted, 'FREE');
  });

  test('B3.2: Extreme high price (₹99,999,999) formats with Indian numbering grouping', () => {
    const pkg = { id: 'p-extreme', price_ledger: { status: 'premium', price: 99999999 } };
    const visual = inspectBentoCardVisualStructure(pkg, 'package');
    assert.strictEqual(visual.isFree, false);
    assert.strictEqual(visual.priceFormatted, '₹9,99,99,999');
  });

  test('B3.3: Missing price_ledger object defaults safely to FREE without undefined exception', () => {
    const pkg = { id: 'p-no-ledger', price_ledger: null };
    const visual = inspectBentoCardVisualStructure(pkg, 'package');
    assert.strictEqual(visual.isFree, true);
    assert.strictEqual(visual.priceFormatted, 'FREE');
  });

  test('B3.4: Decimal fractional prices format properly', () => {
    const course = { id: 'c-dec', price: 1499.50 };
    const visual = inspectBentoCardVisualStructure(course, 'course');
    assert.strictEqual(visual.priceFormatted, '₹1,499.5');
  });

  // -------------------------------------------------------------
  // SUITE 2.4: Extreme Text Lengths, Unicode & Special Characters
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.4: Extreme Text Lengths, Unicode & Special Characters');

  test('B4.1: Omnibar handles 500-character search strings without regex error', () => {
    const longString = 'JEE '.repeat(100);
    const results = filterTestPackages({ packages: MOCK_TEST_PACKAGES, globalFilter: longString });
    assert.strictEqual(Array.isArray(results), true);
  });

  test('B4.2: Omnibar handles regex special characters (.+*?^$()[]{}|\\) literally', () => {
    const regexInputs = ['.*', '(?=.*)', 'a|b', '[0-9]+', '^(JEE)$'];
    regexInputs.forEach(input => {
      const results = filterTestPackages({ packages: MOCK_TEST_PACKAGES, globalFilter: input });
      assert.strictEqual(Array.isArray(results), true);
    });
  });

  test('B4.3: Course with 500-character title formats in CSV without truncating unescaped columns', () => {
    const longCourse = {
      id: 'crs-long',
      title: 'Advanced ' + 'Quantum Mechanics '.repeat(30),
      subject: 'Physics',
      level: 'JEE Advanced',
      price: 2999
    };
    const csv = generateCoursesCsv({ exportData: [longCourse] });
    assert.ok(csv.includes(longCourse.title));
  });

  test('B4.4: Omnibar search handles unicode emojis and international accents', () => {
    const pkgWithEmoji = {
      id: 'pkg-emoji',
      title: '🎯 Target AIR 1 Physics Blitzkrieg 🚀',
      target_exam_tag: 'JEE Advanced',
      price_ledger: { status: 'premium', price: 1999 }
    };
    const results = filterTestPackages({ packages: [pkgWithEmoji], globalFilter: '🎯' });
    assert.strictEqual(results.length, 1);
  });

  // -------------------------------------------------------------
  // SUITE 2.5: Zero Counts & Missing Sub-structures
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.5: Zero Counts & Missing Sub-structures');

  test('B5.1: Package with zero test distribution handles null distribution object', () => {
    const pkg = { id: 'p-nodist', test_distribution: null, total_tests_count: 0 };
    const csv = generateTestPackagesCsv({ exportData: [pkg] });
    assert.ok(csv.includes(',0,0,0,0,'));
  });

  test('B5.2: Course with zero lessons, files, exams handles null array relations', () => {
    const course = { id: 'c-empty-rel', lessons: null, course_files: null, assessments: null };
    const csv = generateCoursesCsv({ exportData: [course] });
    assert.ok(csv.includes(',0,0,0,0,'));
  });

  // -------------------------------------------------------------
  // SUITE 2.6: Monitor Client Candidate Profile Edge Cases
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.6: Monitor Client Candidate Profile Edge Cases');

  test('B6.1: Candidate with null profiles displays "Candidate"', () => {
    assert.strictEqual(evaluateCandidateDisplayName({ profiles: null }), 'Candidate');
  });

  test('B6.2: Candidate with email missing @ symbol displays full string without crash', () => {
    const att = { profiles: { email: 'studentwithoutat', full_name: null } };
    assert.strictEqual(evaluateCandidateDisplayName(att), 'studentwithoutat');
  });

  test('B6.3: Candidate with empty string email displays "Candidate"', () => {
    const att = { profiles: { email: '', full_name: '' } };
    assert.strictEqual(evaluateCandidateDisplayName(att), 'Candidate');
  });

  test('B6.4: Candidate with special characters in email name formats correctly', () => {
    const att = { profiles: { email: 'john.doe+jee2026@domain.co.in', full_name: null } };
    assert.strictEqual(evaluateCandidateDisplayName(att), 'john.doe+jee2026');
  });

  // -------------------------------------------------------------
  // SUITE 2.7: Telemetry Marks Scheme Boundary Cases
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.7: Telemetry Marks Scheme Boundary Cases');

  test('B7.1: Telemetry with total_questions 0 calculates 0% percentages safely without NaN', () => {
    const attempt = {
      score: 0,
      test_exams: { total_questions: 0, marks_scheme: { positive_marks: 4 } }
    };
    const stats = calculateTelemetryStats([attempt]);
    assert.strictEqual(stats.averageScore, 0);
    assert.strictEqual(stats.bellCurve[0].count, 1);
  });

  test('B7.2: Telemetry with negative attempt score places score in 0-20% bucket safely', () => {
    const attempt = {
      score: -20,
      test_exams: { total_questions: 90, marks_scheme: { positive_marks: 4 } }
    };
    const stats = calculateTelemetryStats([attempt]);
    assert.strictEqual(stats.averageScore, -20);
    assert.strictEqual(stats.bellCurve[0].count, 1);
  });

  console.log(`\nTier 2 Summary: Passed ${passed}, Failed ${failed}`);
  return { passed, failed, errors };
}

if (require.main === module) {
  runTier2Tests();
}

module.exports = { runTier2Tests };
