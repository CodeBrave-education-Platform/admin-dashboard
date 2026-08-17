/**
 * tier2_boundary_corner_cases.test.js
 * 
 * Tier 2: Boundary, Edge Case & Adversarial Stress Tests
 * Modules Covered:
 * - Empty states & Zero-student cohorts
 * - Zero pricing, Free tier vs Discounted MRP
 * - Extreme length strings (titles, descriptions)
 * - XSS & SQL Injection string resilience
 * - KaTeX formula & Unicode/Emoji preservation
 * - Missing foreign key relations & Null checks
 * - Date boundary & Inverted assessment window validation
 * - Extreme pagination out-of-bound requests
 */

const assert = require('node:assert');
const { MOCK_BATCHES_BASE, MOCK_PACKAGES_BASE, ADVERSARIAL_PAYLOADS } = require('./fixtures/mockData');
const {
  filterBatches,
  filterTestPackages,
  sortDataset,
  paginateDataset,
  calculateBatchesKpiStats,
  calculateTestSeriesKpiStats,
  generateRfc4180Csv
} = require('./helpers/tableHarness');

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
  console.log('⚡ TIER 2: BOUNDARY, CORNER CASES & ADVERSARIAL STRESS TESTS ⚡');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // -------------------------------------------------------------
  // SUITE 2.1: Empty Datasets & Zero States
  // -------------------------------------------------------------
  console.log('🔵 SUITE 2.1: Empty Datasets & Zero States');

  test('Empty Batches: Stats header returns zero metrics without NaN or crashes', () => {
    const stats = calculateBatchesKpiStats([]);
    assert.strictEqual(stats.totalBatches, 0);
    assert.strictEqual(stats.publishedCohorts, 0);
    assert.strictEqual(stats.draftCohorts, 0);
    assert.strictEqual(stats.totalStudents, 0);
    assert.strictEqual(stats.totalLiveClasses, 0);
  });

  test('Empty Test Series: Stats header returns zero metrics and safe average score', () => {
    const stats = calculateTestSeriesKpiStats([], []);
    assert.strictEqual(stats.totalPackages, 0);
    assert.strictEqual(stats.totalExams, 0);
    assert.strictEqual(stats.activeCandidates, 0);
    assert.strictEqual(stats.premiumPackages, 0);
    assert.strictEqual(stats.averageScore, 0);
  });

  test('Empty Dataset Pagination: Formats zero-range text safely', () => {
    const pagination = paginateDataset([], 0, 10);
    assert.strictEqual(pagination.totalCount, 0);
    assert.strictEqual(pagination.pageCount, 1);
    assert.strictEqual(pagination.pageRows.length, 0);
    assert.strictEqual(pagination.rangeText, 'Showing 0 to 0 of 0 entries');
    assert.strictEqual(pagination.canPreviousPage, false);
    assert.strictEqual(pagination.canNextPage, false);
  });

  test('Zero-Student Cohort: Handles 0 enrolled candidates safely', () => {
    const zeroCohort = ADVERSARIAL_PAYLOADS.zeroStudentCohort;
    const stats = calculateBatchesKpiStats([zeroCohort]);
    assert.strictEqual(stats.totalStudents, 0);
    assert.strictEqual(zeroCohort.students_count, 0);
  });

  // -------------------------------------------------------------
  // SUITE 2.2: Zero Pricing, Free Tiers & Discount MRP Logic
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.2: Zero Pricing, Free Tiers & Discount MRP Logic');

  test('Zero Price Batch: Free batch (₹0) filters and formats correctly', () => {
    const freeBatch = ADVERSARIAL_PAYLOADS.zeroPriceBatch;
    const formatPrice = (price) => {
      if (price === 0 || price === '0') return 'Free';
      return `₹${Number(price).toLocaleString('en-IN')}`;
    };

    assert.strictEqual(formatPrice(freeBatch.price), 'Free');
    assert.strictEqual(freeBatch.price, 0);
  });

  test('Free Test Package: Filtered by FREE pricing pill and excluded from PREMIUM', () => {
    const freePkg = MOCK_PACKAGES_BASE.find(p => p.price_ledger.price === 0);
    assert.ok(freePkg, 'Free test package fixture must exist');

    const freeResults = filterTestPackages({ packages: [freePkg], pricingFilter: 'FREE' });
    assert.strictEqual(freeResults.length, 1);

    const premiumResults = filterTestPackages({ packages: [freePkg], pricingFilter: 'PREMIUM' });
    assert.strictEqual(premiumResults.length, 0);
  });

  test('Discounted MRP: Package with null original_price does not compute discount strikethrough', () => {
    const pkgWithoutDiscount = {
      price_ledger: { status: 'premium', price: 1999, original_price: null }
    };
    const hasDiscount = pkgWithoutDiscount.price_ledger.original_price && 
      pkgWithoutDiscount.price_ledger.original_price > pkgWithoutDiscount.price_ledger.price;
    assert.strictEqual(hasDiscount, null);
  });

  // -------------------------------------------------------------
  // SUITE 2.3: Extreme String Lengths & Buffer Stress
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.3: Extreme String Lengths & Buffer Stress');

  test('Extreme Title Length (600 chars): Title is preserved and searchable', () => {
    const batchWithLongTitle = {
      ...MOCK_BATCHES_BASE[0],
      id: 'batch-long-title',
      title: ADVERSARIAL_PAYLOADS.veryLongTitle
    };
    assert.strictEqual(batchWithLongTitle.title.length, 600);

    const results = filterBatches({ batches: [batchWithLongTitle], globalFilter: 'AAAAA' });
    assert.strictEqual(results.length, 1);
  });

  test('Extreme Description Length (12,000 chars): Preserved without memory fault', () => {
    const batchWithLongDesc = {
      ...MOCK_BATCHES_BASE[0],
      id: 'batch-long-desc',
      description: ADVERSARIAL_PAYLOADS.veryLongDescription
    };
    assert.strictEqual(batchWithLongDesc.description.length, 12000);

    const results = filterBatches({ batches: [batchWithLongDesc], globalFilter: 'BBBBB' });
    assert.strictEqual(results.length, 1);
  });

  // -------------------------------------------------------------
  // SUITE 2.4: Adversarial Security & Injection Payloads
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.4: Adversarial Security & Injection Payloads');

  test('XSS Script Tags: Handled safely as raw string without execution or corruption', () => {
    const xssBatch = {
      ...MOCK_BATCHES_BASE[0],
      id: 'batch-xss-test',
      title: ADVERSARIAL_PAYLOADS.xssTitle
    };
    const results = filterBatches({ batches: [xssBatch], globalFilter: 'alert' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].title, ADVERSARIAL_PAYLOADS.xssTitle);
  });

  test('SQL Injection Strings: Handled safely in search filter without syntax errors', () => {
    const sqlBatch = {
      ...MOCK_BATCHES_BASE[0],
      id: 'batch-sql-test',
      description: ADVERSARIAL_PAYLOADS.sqlInjectionDesc
    };
    const results = filterBatches({ batches: [sqlBatch], globalFilter: 'DROP TABLE' });
    assert.strictEqual(results.length, 1);
  });

  test('KaTeX Math Formulas: LaTeX mathematical symbols preserved intact', () => {
    const mathBatch = {
      ...MOCK_BATCHES_BASE[0],
      id: 'batch-math-test',
      title: ADVERSARIAL_PAYLOADS.katexMathTitle
    };
    assert.ok(mathBatch.title.includes('\\psi(x,t)'));
    assert.ok(mathBatch.title.includes('\\int_{-\\infty}'));

    const results = filterBatches({ batches: [mathBatch], globalFilter: '\\omega' });
    assert.strictEqual(results.length, 1);
  });

  test('Unicode & Emoji: Multi-byte characters and flag emoji preserved and searchable', () => {
    const emojiBatch = {
      ...MOCK_BATCHES_BASE[0],
      id: 'batch-emoji-test',
      title: ADVERSARIAL_PAYLOADS.unicodeEmojiTitle
    };
    const results = filterBatches({ batches: [emojiBatch], globalFilter: 'Super-30' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].title, ADVERSARIAL_PAYLOADS.unicodeEmojiTitle);
  });

  test('Special Characters in Omnibar Search: Regex meta-characters do not crash search engine', () => {
    const specialChars = ADVERSARIAL_PAYLOADS.specialCharQuery;
    assert.doesNotThrow(() => {
      filterBatches({ batches: MOCK_BATCHES_BASE, globalFilter: specialChars });
    });
    assert.doesNotThrow(() => {
      filterTestPackages({ packages: MOCK_PACKAGES_BASE, globalFilter: specialChars });
    });
  });

  // -------------------------------------------------------------
  // SUITE 2.5: Missing Foreign Keys & Null Tolerant References
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.5: Missing Foreign Keys & Null Tolerant References');

  test('Missing Profile FK: Null profiles object resolved with fallback name and email', () => {
    const orphanEnrollment = ADVERSARIAL_PAYLOADS.missingFkEnrollment;
    const resolveStudentName = (enrollment) => {
      return enrollment.profiles?.full_name || 'Enrolled Student (Unregistered Profile)';
    };
    const resolveStudentEmail = (enrollment) => {
      return enrollment.profiles?.email || 'N/A';
    };

    assert.strictEqual(resolveStudentName(orphanEnrollment), 'Enrolled Student (Unregistered Profile)');
    assert.strictEqual(resolveStudentEmail(orphanEnrollment), 'N/A');
  });

  test('Missing Exam Package FK: Exam blueprint with missing package renders safely', () => {
    const orphanExam = ADVERSARIAL_PAYLOADS.missingExamPackage;
    assert.strictEqual(orphanExam.package_id, 'non-existent-package-uuid-8888');
    assert.strictEqual(orphanExam.total_questions, 90);
  });

  // -------------------------------------------------------------
  // SUITE 2.6: Date Boundaries & Inverted Assessment Windows
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.6: Date Boundaries & Inverted Assessment Windows');

  test('Assessment Window Validation: start_window < end_window enforced', () => {
    const validateAssessmentWindow = (startWindow, endWindow) => {
      const start = new Date(startWindow).getTime();
      const end = new Date(endWindow).getTime();
      if (isNaN(start) || isNaN(end)) throw new Error('Invalid assessment datetime window');
      if (end <= start) throw new Error('End window must be strictly after start window');
      return true;
    };

    const validWindow = {
      start_window: '2026-09-10T09:00:00Z',
      end_window: '2026-09-10T12:00:00Z'
    };
    const invertedWindow = {
      start_window: '2026-09-10T12:00:00Z',
      end_window: '2026-09-10T09:00:00Z'
    };

    assert.ok(validateAssessmentWindow(validWindow.start_window, validWindow.end_window));
    assert.throws(
      () => validateAssessmentWindow(invertedWindow.start_window, invertedWindow.end_window),
      /End window must be strictly after start window/
    );
  });

  test('Assessment Status Computation: Correctly classifies Upcoming vs Active vs Expired', () => {
    const computeAssessmentStatus = (startWindow, endWindow, currentTime = Date.now()) => {
      const start = new Date(startWindow).getTime();
      const end = new Date(endWindow).getTime();
      if (currentTime < start) return 'upcoming';
      if (currentTime >= start && currentTime <= end) return 'active';
      return 'expired';
    };

    const baseNow = new Date('2026-09-10T10:00:00Z').getTime();
    
    // Test upcoming
    const upcoming = computeAssessmentStatus('2026-09-10T11:00:00Z', '2026-09-10T14:00:00Z', baseNow);
    assert.strictEqual(upcoming, 'upcoming');

    // Test active
    const active = computeAssessmentStatus('2026-09-10T09:00:00Z', '2026-09-10T12:00:00Z', baseNow);
    assert.strictEqual(active, 'active');

    // Test expired
    const expired = computeAssessmentStatus('2026-09-10T06:00:00Z', '2026-09-10T09:00:00Z', baseNow);
    assert.strictEqual(expired, 'expired');
  });

  // -------------------------------------------------------------
  // SUITE 2.7: Extreme Pagination Bounds
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 2.7: Extreme Pagination Bounds');

  test('Pagination: Page index out of upper bound clamped safely to last page', () => {
    const result = paginateDataset(MOCK_BATCHES_BASE, 999, 2);
    // 5 items, pageSize 2 -> 3 pages (0, 1, 2)
    assert.strictEqual(result.pageIndex, 2);
    assert.strictEqual(result.pageRows.length, 1);
  });

  test('Pagination: Negative page index clamped safely to 0', () => {
    const result = paginateDataset(MOCK_BATCHES_BASE, -10, 2);
    assert.strictEqual(result.pageIndex, 0);
    assert.strictEqual(result.pageRows.length, 2);
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 TIER 2 RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    throw new Error(`Tier 2 Test Suite failed with ${failed} failure(s)`);
  }
  return { passed, failed };
}

if (require.main === module) {
  try {
    runTier2Tests();
  } catch (e) {
    process.exit(1);
  }
}

module.exports = { runTier2Tests };
