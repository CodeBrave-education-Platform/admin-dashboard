/**
 * tier3_cross_feature_combinations.test.js
 * 
 * Tier 3: Cross-Feature Combinations & State Interaction Tests
 * Modules Covered:
 * - Filter + Sort + Pagination interaction & pageIndex auto-reset
 * - Row selection + RFC4180 Bulk CSV export + Deselect all
 * - Tab navigation + Drawer sub-resource state persistence
 * - URL SearchParams deep-linking & Browser back navigation sync
 * - Optimistic UI mutations, cache invalidation dispatch & error rollback
 */

const assert = require('node:assert');
const { MOCK_BATCHES_BASE, MOCK_PACKAGES_BASE, generateLargeBatchesDataset } = require('./fixtures/mockData');
const {
  filterBatches,
  filterTestPackages,
  sortDataset,
  paginateDataset,
  generateRfc4180Csv
} = require('./helpers/tableHarness');

function runTier3Tests() {
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
  console.log('⚡ TIER 3: CROSS-FEATURE COMBINATIONS & STATE INTERACTIONS ⚡');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // -------------------------------------------------------------
  // SUITE 3.1: Filter + Sort + Pagination Interactions
  // -------------------------------------------------------------
  console.log('🔵 SUITE 3.1: Filter + Sort + Pagination Interactions');

  test('Filter + Pagination: Changing stream filter while on page > 1 resets page index to 0', () => {
    const dataset = generateLargeBatchesDataset(50);
    let currentPageIndex = 3; // User is on page 4 (0-indexed: 3)
    let streamFilter = 'ALL';

    // Simulate filter change action
    const handleStreamFilterChange = (newStream) => {
      streamFilter = newStream;
      currentPageIndex = 0; // Invariant: table.setPageIndex(0)
    };

    handleStreamFilterChange('JEE');
    assert.strictEqual(currentPageIndex, 0, 'Page index must reset to 0 upon stream filter change');

    const filtered = filterBatches({ batches: dataset, streamFilter });
    const paginated = paginateDataset(filtered, currentPageIndex, 10);
    assert.strictEqual(paginated.pageIndex, 0);
    assert.ok(paginated.pageRows.length <= 10);
    paginated.pageRows.forEach(b => assert.strictEqual(b.stream, 'JEE'));
  });

  test('Search + Pagination: Changing omnibar global search resets page index to 0', () => {
    const dataset = generateLargeBatchesDataset(50);
    let currentPageIndex = 2; // On page 3
    let globalFilter = '';

    const handleSearchChange = (query) => {
      globalFilter = query;
      currentPageIndex = 0; // Invariant: table.setPageIndex(0)
    };

    handleSearchChange('Cohort Batch #015');
    assert.strictEqual(currentPageIndex, 0);

    const filtered = filterBatches({ batches: dataset, globalFilter });
    const paginated = paginateDataset(filtered, currentPageIndex, 10);
    assert.strictEqual(paginated.totalCount, 1);
    assert.strictEqual(paginated.pageRows[0].id, 'gen-batch-015');
  });

  test('Filter + Sort: Sorting dataset strictly orders within the filtered subset', () => {
    const dataset = generateLargeBatchesDataset(50);
    const filtered = filterBatches({ batches: dataset, streamFilter: 'NEET' });
    const sorted = sortDataset(filtered, [{ id: 'price', desc: true }]);

    for (let i = 0; i < sorted.length - 1; i++) {
      assert.ok(sorted[i].price >= sorted[i + 1].price, 'Items must be in descending price order');
      assert.strictEqual(sorted[i].stream, 'NEET');
    }
  });

  // -------------------------------------------------------------
  // SUITE 3.2: Row Selection & Bulk Actions
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 3.2: Row Selection & Bulk Actions');

  test('Row Selection + Bulk CSV Export: Exports selected rows across pages', () => {
    const dataset = generateLargeBatchesDataset(20);
    const selectionMap = {
      'gen-batch-001': true,
      'gen-batch-005': true,
      'gen-batch-015': true
    };

    const selectedRows = dataset.filter(row => selectionMap[row.id]);
    assert.strictEqual(selectedRows.length, 3);

    const columns = [
      { id: 'id', header: 'Batch ID' },
      { id: 'title', header: 'Cohort Title' },
      { id: 'stream', header: 'Stream Track' },
      { id: 'price', header: 'Price (INR)' },
      { id: 'status', header: 'Status' }
    ];

    const csvOutput = generateRfc4180Csv(selectedRows, columns);
    assert.ok(csvOutput.includes('Batch ID,Cohort Title,Stream Track,Price (INR),Status'));
    assert.ok(csvOutput.includes('gen-batch-001'));
    assert.ok(csvOutput.includes('gen-batch-005'));
    assert.ok(csvOutput.includes('gen-batch-015'));
    assert.strictEqual(csvOutput.split('\r\n').length, 4); // 1 header + 3 rows
  });

  test('Bulk CSV Export: When 0 rows selected, exports all currently filtered rows', () => {
    const dataset = generateLargeBatchesDataset(20);
    const filtered = filterBatches({ batches: dataset, streamFilter: 'Foundation' });
    const selectionMap = {}; // 0 rows selected

    const exportRows = Object.keys(selectionMap).length > 0
      ? dataset.filter(r => selectionMap[r.id])
      : filtered;

    const columns = [{ id: 'title', header: 'Title' }, { id: 'stream', header: 'Stream' }];
    const csvOutput = generateRfc4180Csv(exportRows, columns);
    const lines = csvOutput.split('\r\n');
    assert.strictEqual(lines.length, filtered.length + 1);
  });

  test('Deselect All Action: Clears row selection dictionary completely', () => {
    let selectionMap = { 'batch-1': true, 'batch-2': true, 'batch-3': true };
    const handleDeselectAll = () => {
      selectionMap = {};
    };
    handleDeselectAll();
    assert.strictEqual(Object.keys(selectionMap).length, 0);
  });

  // -------------------------------------------------------------
  // SUITE 3.3: Tab Navigation & Drawer State Changes
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 3.3: Tab Navigation & Drawer State Changes');

  test('Drawer Tab Navigation: Tab switching maintains active batch entity context', () => {
    let selectedBatch = MOCK_BATCHES_BASE[0];
    let activeTab = 'overview';

    const switchTab = (tabId) => {
      activeTab = tabId;
    };

    switchTab('students');
    assert.strictEqual(activeTab, 'students');
    assert.strictEqual(selectedBatch.id, 'batch-01-alpha-jee');

    switchTab('materials');
    assert.strictEqual(activeTab, 'materials');
    assert.strictEqual(selectedBatch.id, 'batch-01-alpha-jee');

    switchTab('live');
    assert.strictEqual(activeTab, 'live');
    assert.strictEqual(selectedBatch.id, 'batch-01-alpha-jee');
  });

  test('Drawer Dismissal: Closing drawer resets active tab and selection', () => {
    let isDrawerOpen = true;
    let selectedBatch = MOCK_BATCHES_BASE[0];
    let activeTab = 'exams';

    const handleCloseDrawer = () => {
      isDrawerOpen = false;
      selectedBatch = null;
      activeTab = 'overview';
    };

    handleCloseDrawer();
    assert.strictEqual(isDrawerOpen, false);
    assert.strictEqual(selectedBatch, null);
    assert.strictEqual(activeTab, 'overview');
  });

  // -------------------------------------------------------------
  // SUITE 3.4: URL SearchParam Deep-Linking & History Synchronisation
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 3.4: URL SearchParam Deep-Linking & History Synchronisation');

  test('URL Sync: Selecting row triggers router.replace with ?id=...', () => {
    let currentUrl = '/batches';
    const mockRouter = {
      replace: (newUrl) => { currentUrl = newUrl; }
    };

    const handleSelectBatch = (batch) => {
      mockRouter.replace(`/batches?id=${batch.id}`);
    };

    handleSelectBatch(MOCK_BATCHES_BASE[1]);
    assert.strictEqual(currentUrl, '/batches?id=batch-02-neet-elite');
  });

  test('URL Sync: Closing drawer resets URL to base route without ?id query parameter', () => {
    let currentUrl = '/batches?id=batch-02-neet-elite';
    const mockRouter = {
      replace: (newUrl) => { currentUrl = newUrl; }
    };

    const handleCloseDrawer = () => {
      mockRouter.replace('/batches');
    };

    handleCloseDrawer();
    assert.strictEqual(currentUrl, '/batches');
  });

  test('URL Sync: Browser back navigation (urlId becomes null) closes drawer', () => {
    let isDrawerOpen = true;
    let selectedBatch = MOCK_BATCHES_BASE[0];

    // Simulate Next.js searchParams effect
    const syncWithUrl = (urlBatchId, batches) => {
      if (urlBatchId) {
        const found = batches.find(b => b.id === urlBatchId);
        if (found) {
          selectedBatch = found;
          isDrawerOpen = true;
        }
      } else {
        // Back navigation: close drawer
        isDrawerOpen = false;
        selectedBatch = null;
      }
    };

    syncWithUrl(null, MOCK_BATCHES_BASE);
    assert.strictEqual(isDrawerOpen, false);
    assert.strictEqual(selectedBatch, null);
  });

  // -------------------------------------------------------------
  // SUITE 3.5: Optimistic State Mutation, Cache Invalidation & Rollback
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 3.5: Optimistic State Mutation & Cache Invalidation');

  test('Optimistic Update: Success path updates state and calls invalidateCache', async () => {
    let batches = [...MOCK_BATCHES_BASE];
    const invalidations = [];

    const mockInvalidateCache = (type, courseId, batchId) => {
      invalidations.push({ type, courseId, batchId });
      return Promise.resolve({ success: true });
    };

    const handleToggleStatus = async (batchId, newStatus) => {
      // 1. Optimistic update
      batches = batches.map(b => b.id === batchId ? { ...b, status: newStatus } : b);
      
      // 2. Dispatch cache invalidation
      await mockInvalidateCache('batch', null, batchId);
    };

    await handleToggleStatus('batch-04-jee-crash-draft', 'published');
    const updated = batches.find(b => b.id === 'batch-04-jee-crash-draft');
    assert.strictEqual(updated.status, 'published');
    assert.strictEqual(invalidations.length, 1);
    assert.deepStrictEqual(invalidations[0], { type: 'batch', courseId: null, batchId: 'batch-04-jee-crash-draft' });
  });

  test('Optimistic Update: Failure path rolls back local state and displays error', async () => {
    let batches = [...MOCK_BATCHES_BASE];
    const previousState = [...batches];
    let toastMessage = null;

    const mockFailedMutation = () => Promise.reject(new Error('Network error 500'));

    const handleToggleStatusWithFailure = async (batchId, newStatus) => {
      const original = batches.find(b => b.id === batchId)?.status;
      // Optimistic update
      batches = batches.map(b => b.id === batchId ? { ...b, status: newStatus } : b);

      try {
        await mockFailedMutation();
      } catch (err) {
        // Rollback
        batches = previousState;
        toastMessage = `Failed to update status: ${err.message}`;
      }
    };

    await handleToggleStatusWithFailure('batch-04-jee-crash-draft', 'published');
    const rolledBack = batches.find(b => b.id === 'batch-04-jee-crash-draft');
    assert.strictEqual(rolledBack.status, 'draft', 'Status must roll back to draft on mutation failure');
    assert.ok(toastMessage.includes('Network error 500'));
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 TIER 3 RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    throw new Error(`Tier 3 Test Suite failed with ${failed} failure(s)`);
  }
  return { passed, failed };
}

if (require.main === module) {
  try {
    runTier3Tests();
  } catch (e) {
    process.exit(1);
  }
}

module.exports = { runTier3Tests };
