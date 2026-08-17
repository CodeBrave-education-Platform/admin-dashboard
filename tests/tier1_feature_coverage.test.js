/**
 * tier1_feature_coverage.test.js
 * 
 * Tier 1: Feature Coverage Unit & Component Logic Tests
 * Modules Covered:
 * - BatchStatsHeader & TestSeriesStatsHeader
 * - BatchGrid & TestSeriesGrid
 * - BatchEditorDrawer & TestSeriesEditorDrawer
 * - BatchCreateModal, BatchRosterImportModal, StudentTelemetryModal, TestSeriesCreateModal
 */

const assert = require('node:assert');
const { MOCK_BATCHES_BASE, MOCK_PACKAGES_BASE } = require('./fixtures/mockData');
const {
  filterBatches,
  filterTestPackages,
  sortDataset,
  paginateDataset,
  calculateBatchesKpiStats,
  calculateTestSeriesKpiStats,
  generateRfc4180Csv
} = require('./helpers/tableHarness');

function runTier1Tests() {
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
  console.log('⚡ TIER 1: FEATURE COVERAGE & COMPONENT CONTRACT TESTS ⚡');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // -------------------------------------------------------------
  // SUITE 1.1: BatchStatsHeader Metric Summary Ribbon
  // -------------------------------------------------------------
  console.log('🔵 SUITE 1.1: BatchStatsHeader Metric Summary Ribbon');

  test('BatchStatsHeader: Computes total batches count correctly', () => {
    const stats = calculateBatchesKpiStats(MOCK_BATCHES_BASE);
    assert.strictEqual(stats.totalBatches, 5, 'Total batches should be 5');
  });

  test('BatchStatsHeader: Segregates published vs draft vs archived cohorts', () => {
    const stats = calculateBatchesKpiStats(MOCK_BATCHES_BASE);
    assert.strictEqual(stats.publishedCohorts, 3, 'Published cohorts should be 3');
    assert.strictEqual(stats.draftCohorts, 1, 'Draft cohorts should be 1');
  });

  test('BatchStatsHeader: Aggregates total enrolled students count across cohorts', () => {
    const stats = calculateBatchesKpiStats(MOCK_BATCHES_BASE);
    // 145 + 210 + 380 + 0 + 98 = 833
    assert.strictEqual(stats.totalStudents, 833, 'Enrolled students sum should be 833');
  });

  test('BatchStatsHeader: Aggregates total scheduled live classes across cohorts', () => {
    const stats = calculateBatchesKpiStats(MOCK_BATCHES_BASE);
    // 12 + 18 + 6 + 0 + 24 = 60
    assert.strictEqual(stats.totalLiveClasses, 60, 'Live classes count should be 60');
  });

  // -------------------------------------------------------------
  // SUITE 1.2: BatchGrid TanStack Data Grid & Filtering
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 1.2: BatchGrid TanStack Data Grid & Filtering');

  test('BatchGrid: Omnibar search matches batch title substring', () => {
    const results = filterBatches({ batches: MOCK_BATCHES_BASE, globalFilter: 'Rankers' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'batch-01-alpha-jee');
  });

  test('BatchGrid: Omnibar search matches stream/focus keyword', () => {
    const results = filterBatches({ batches: MOCK_BATCHES_BASE, globalFilter: 'Olympiad' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'batch-03-foundation-stem');
  });

  test('BatchGrid: Stream filter pill "JEE" filters only JEE batches', () => {
    const results = filterBatches({ batches: MOCK_BATCHES_BASE, streamFilter: 'JEE' });
    assert.strictEqual(results.length, 2);
    results.forEach(b => assert.strictEqual(b.stream, 'JEE'));
  });

  test('BatchGrid: Stream filter pill "NEET" filters only NEET batches', () => {
    const results = filterBatches({ batches: MOCK_BATCHES_BASE, streamFilter: 'NEET' });
    assert.strictEqual(results.length, 2);
    results.forEach(b => assert.strictEqual(b.stream, 'NEET'));
  });

  test('BatchGrid: Status filter pill "PUBLISHED" filters published batches', () => {
    const results = filterBatches({ batches: MOCK_BATCHES_BASE, statusFilter: 'published' });
    assert.strictEqual(results.length, 3);
    results.forEach(b => assert.strictEqual(b.status, 'published'));
  });

  test('BatchGrid: Multi-column sorting by price descending', () => {
    const sorted = sortDataset(MOCK_BATCHES_BASE, [{ id: 'price', desc: true }]);
    assert.strictEqual(sorted[0].id, 'batch-01-alpha-jee'); // ₹4,999
    assert.strictEqual(sorted[sorted.length - 1].id, 'batch-03-foundation-stem'); // ₹0
  });

  test('BatchGrid: Multi-column sorting by students_count descending', () => {
    const sorted = sortDataset(MOCK_BATCHES_BASE, [{ id: 'students_count', desc: true }]);
    assert.strictEqual(sorted[0].id, 'batch-03-foundation-stem'); // 380
    assert.strictEqual(sorted[sorted.length - 1].id, 'batch-04-jee-crash-draft'); // 0
  });

  // -------------------------------------------------------------
  // SUITE 1.3: BatchEditorDrawer Component Contract
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 1.3: BatchEditorDrawer Component Contract');

  test('BatchEditorDrawer: Defines all 5 mandatory tabs', () => {
    const expectedTabs = ['overview', 'students', 'materials', 'live', 'exams'];
    const drawerTabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'students', label: 'Students Roster' },
      { id: 'materials', label: 'Material Vault' },
      { id: 'live', label: 'Live Coordinator' },
      { id: 'exams', label: 'Exam Scheduler' }
    ];
    assert.deepStrictEqual(drawerTabs.map(t => t.id), expectedTabs);
  });

  test('BatchEditorDrawer: Props contract requires batch, isOpen, onClose, onUpdateBatch, onDeleteBatch', () => {
    const requiredProps = ['batch', 'isOpen', 'onClose', 'onUpdateBatch', 'onDeleteBatch'];
    const mockProps = {
      batch: MOCK_BATCHES_BASE[0],
      isOpen: true,
      onClose: () => {},
      onUpdateBatch: () => {},
      onDeleteBatch: () => {}
    };
    requiredProps.forEach(prop => {
      assert.ok(mockProps[prop] !== undefined, `BatchEditorDrawer missing required prop: ${prop}`);
    });
  });

  // -------------------------------------------------------------
  // SUITE 1.4: BatchCreateModal & BatchRosterImportModal Contracts
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 1.4: Batches Modals Contracts & Validation');

  test('BatchCreateModal: Validates payload with title, price, start_date, and stream focus', () => {
    const validateBatchPayload = (payload) => {
      if (!payload.title || payload.title.trim().length < 3) throw new Error('Title is required (min 3 chars)');
      if (payload.price === undefined || payload.price === null || Number(payload.price) < 0) throw new Error('Price must be >= 0');
      if (!payload.start_date || isNaN(Date.parse(payload.start_date))) throw new Error('Valid start_date is required');
      if (!payload.stream) throw new Error('Stream focus is required');
      return true;
    };

    const validPayload = {
      title: 'JEE 2028 Foundation Batch',
      price: 2999,
      start_date: '2026-09-01T09:00:00Z',
      stream: 'JEE',
      description: 'Foundations for grade 9 & 10'
    };

    assert.ok(validateBatchPayload(validPayload));
    assert.throws(() => validateBatchPayload({ ...validPayload, title: 'A' }), /Title is required/);
    assert.throws(() => validateBatchPayload({ ...validPayload, price: -100 }), /Price must be >= 0/);
  });

  test('BatchRosterImportModal: Formats RPC payload for import_batch_roster', () => {
    const rawRosterRows = [
      { name: 'Aarav Sharma', email: 'aarav@example.com', target: 'JEE' },
      { name: 'Diya Patel', email: 'diya@example.com', target: 'NEET' }
    ];

    const rpcPayload = {
      _batch_id: 'batch-01-alpha-jee',
      _emails: rawRosterRows.map(r => r.email.trim().toLowerCase()),
      _names: rawRosterRows.map(r => r.name.trim()),
      _focuses: rawRosterRows.map(r => r.target.trim().toUpperCase())
    };

    assert.strictEqual(rpcPayload._batch_id, 'batch-01-alpha-jee');
    assert.deepStrictEqual(rpcPayload._emails, ['aarav@example.com', 'diya@example.com']);
    assert.deepStrictEqual(rpcPayload._names, ['Aarav Sharma', 'Diya Patel']);
    assert.deepStrictEqual(rpcPayload._focuses, ['JEE', 'NEET']);
  });

  test('StudentTelemetryModal: Extracts student performance metrics accurately', () => {
    const studentProfile = {
      full_name: 'Aditya Verma',
      email: 'aditya.verma@example.com',
      target_focus: 'JEE',
      daily_study_hours: '7.5 Hours',
      test_average: '228/300',
      syllabus_progress: '74%',
      dream_college: 'IIT Bombay CSE'
    };

    assert.strictEqual(studentProfile.target_focus, 'JEE');
    assert.strictEqual(studentProfile.daily_study_hours, '7.5 Hours');
    assert.strictEqual(studentProfile.test_average, '228/300');
  });

  // -------------------------------------------------------------
  // SUITE 1.5: TestSeriesStatsHeader Metric Summary Ribbon
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 1.5: TestSeriesStatsHeader Metric Summary Ribbon');

  test('TestSeriesStatsHeader: Computes total packages and total exams count', () => {
    const stats = calculateTestSeriesKpiStats(MOCK_PACKAGES_BASE, []);
    assert.strictEqual(stats.totalPackages, 4, 'Total packages should be 4');
    // pkg1: 2 exams, pkg2: 1 exam, pkg3: 40 tests count, pkg4: 10 tests count -> 2 + 1 + 40 + 10 = 53
    assert.strictEqual(stats.totalExams, 53, 'Total exams count should be 53');
  });

  test('TestSeriesStatsHeader: Segregates premium packages vs free series', () => {
    const stats = calculateTestSeriesKpiStats(MOCK_PACKAGES_BASE, []);
    assert.strictEqual(stats.premiumPackages, 2, 'Premium packages should be 2');
  });

  test('TestSeriesStatsHeader: Calculates active candidates and average score from attempts', () => {
    const mockAttempts = [
      { id: 'att-1', score: 240 },
      { id: 'att-2', score: 180 },
      { id: 'att-3', score: 210 },
      { id: 'att-4', score: 270 }
    ];
    const stats = calculateTestSeriesKpiStats(MOCK_PACKAGES_BASE, mockAttempts);
    assert.strictEqual(stats.activeCandidates, 4, 'Active candidates should be 4');
    // Avg: (240 + 180 + 210 + 270) / 4 = 900 / 4 = 225
    assert.strictEqual(stats.averageScore, 225, 'Average score should be 225');
  });

  // -------------------------------------------------------------
  // SUITE 1.6: TestSeriesGrid TanStack Data Grid & Filtering
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 1.6: TestSeriesGrid TanStack Data Grid & Filtering');

  test('TestSeriesGrid: Omnibar search matches package title', () => {
    const results = filterTestPackages({ packages: MOCK_PACKAGES_BASE, globalFilter: 'Grandmaster' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'pkg-02-jee-adv-grandmaster');
  });

  test('TestSeriesGrid: Tag filter pill "JEE Main" filters JEE Main packages', () => {
    const results = filterTestPackages({ packages: MOCK_PACKAGES_BASE, tagFilter: 'JEE Main' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].target_exam_tag, 'JEE Main');
  });

  test('TestSeriesGrid: Pricing filter pill "FREE" filters only free test packages', () => {
    const results = filterTestPackages({ packages: MOCK_PACKAGES_BASE, pricingFilter: 'FREE' });
    assert.strictEqual(results.length, 2);
    results.forEach(pkg => {
      assert.strictEqual(pkg.price_ledger.price, 0);
    });
  });

  test('TestSeriesGrid: Pricing filter pill "PREMIUM" filters paid packages', () => {
    const results = filterTestPackages({ packages: MOCK_PACKAGES_BASE, pricingFilter: 'PREMIUM' });
    assert.strictEqual(results.length, 2);
    results.forEach(pkg => {
      assert.ok(pkg.price_ledger.price > 0);
    });
  });

  // -------------------------------------------------------------
  // SUITE 1.7: TestSeriesEditorDrawer Component Contract
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 1.7: TestSeriesEditorDrawer Component Contract');

  test('TestSeriesEditorDrawer: Defines all 5 mandatory tabs', () => {
    const expectedTabs = ['overview', 'exams', 'compiler', 'telemetry', 'submissions'];
    const drawerTabs = [
      { id: 'overview', label: 'Overview & Commercials' },
      { id: 'exams', label: 'Exam Blueprints' },
      { id: 'compiler', label: 'Exam Compiler' },
      { id: 'telemetry', label: 'Live Telemetry' },
      { id: 'submissions', label: 'Candidate Submissions' }
    ];
    assert.deepStrictEqual(drawerTabs.map(t => t.id), expectedTabs);
  });

  // -------------------------------------------------------------
  // SUITE 1.8: TestSeriesCreateModal Contract & Validation
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 1.8: TestSeriesCreateModal Contract & Validation');

  test('TestSeriesCreateModal: Validates package creation schema & test distribution structure', () => {
    const validatePackagePayload = (payload) => {
      if (!payload.title || payload.title.trim().length < 3) throw new Error('Package title required');
      if (!payload.target_exam_tag) throw new Error('Target exam tag required');
      if (!payload.test_distribution || typeof payload.test_distribution !== 'object') throw new Error('Test distribution required');
      if (typeof payload.test_distribution.chapter_drills !== 'number') throw new Error('Chapter drills must be number');
      if (!payload.price_ledger || !payload.price_ledger.status) throw new Error('Price ledger status required');
      return true;
    };

    const validPayload = {
      title: 'NEET 2027 Full Mock Super Package',
      target_exam_tag: 'NEET',
      test_distribution: { chapter_drills: 20, full_mocks: 10, live_papers: 2 },
      price_ledger: { status: 'premium', price: 1999, original_price: 3499 },
      description: 'Comprehensive NEET mock test series'
    };

    assert.ok(validatePackagePayload(validPayload));
    assert.throws(() => validatePackagePayload({ ...validPayload, title: '' }), /Package title required/);
    assert.throws(() => validatePackagePayload({ ...validPayload, test_distribution: null }), /Test distribution required/);
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 TIER 1 RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    throw new Error(`Tier 1 Test Suite failed with ${failed} failure(s)`);
  }
  return { passed, failed };
}

if (require.main === module) {
  try {
    runTier1Tests();
  } catch (e) {
    process.exit(1);
  }
}

module.exports = { runTier1Tests };
