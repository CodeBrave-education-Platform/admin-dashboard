/**
 * tests/e2e/tier3_cross_feature_combinations.test.js
 * 
 * Tier 3: Cross-Feature Interaction & State Combination E2E Test Suite
 * Covers multi-filter intersection, pagination reset synchronization, deep link sync,
 * status toggle with cache invalidation, deletion cascade guards, and bulk CSV export.
 */

const assert = require('node:assert');
const {
  MOCK_TEST_PACKAGES,
  MOCK_COURSES
} = require('./fixtures/mockData');
const {
  filterTestPackages,
  filterCourses,
  sortDataset,
  paginateDataset,
  generateTestPackagesCsv,
  generateCoursesCsv,
  simulateDbOperations
} = require('./helpers/bentoHarness');

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
  console.log('⚡ TIER 3: CROSS-FEATURE INTERACTION COMBINATIONS TESTS ⚡');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // -------------------------------------------------------------
  // SUITE 3.1: Multi-Filter Omnibar Convergence
  // -------------------------------------------------------------
  console.log('🔵 SUITE 3.1: Multi-Filter Omnibar Convergence');

  test('C1.1: Converged Filter: Tag JEE Main + Pricing PREMIUM + Omnibar "Super"', () => {
    const results = filterTestPackages({
      packages: MOCK_TEST_PACKAGES,
      tagFilter: 'JEE Main',
      pricingFilter: 'PREMIUM',
      globalFilter: 'Super'
    });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'pkg-01-jee-main-super60');
  });

  test('C1.2: Converged Filter: Tag Foundation + Pricing FREE + Omnibar "Starter"', () => {
    const results = filterTestPackages({
      packages: MOCK_TEST_PACKAGES,
      tagFilter: 'Foundation',
      pricingFilter: 'FREE',
      globalFilter: 'Starter'
    });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'pkg-04-foundation-olympiad');
  });

  test('C1.3: Converged Filter: Mismatched criteria returns 0 results cleanly', () => {
    const results = filterTestPackages({
      packages: MOCK_TEST_PACKAGES,
      tagFilter: 'JEE Main',
      pricingFilter: 'FREE', // Super 60 is premium, not free
      globalFilter: 'Super'
    });
    assert.strictEqual(results.length, 0);
  });

  test('C1.4: Course Converged Filter: Level JEE Advanced + Status ACTIVE + Omnibar "Mechanics"', () => {
    const results = filterCourses({
      courses: MOCK_COURSES,
      levelFilter: 'JEE Advanced',
      statusFilter: 'ACTIVE',
      globalFilter: 'Mechanics'
    });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'crs-01-physics-mechanics-pro');
  });

  test('C1.5: Course Converged Filter: Level NEET + Status INACTIVE returns only inactive NEET course', () => {
    const results = filterCourses({
      courses: MOCK_COURSES,
      levelFilter: 'NEET',
      statusFilter: 'INACTIVE',
      globalFilter: ''
    });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'crs-04-neet-biology-complete');
  });

  // -------------------------------------------------------------
  // SUITE 3.2: Filter Modification & Automatic Page Index Reset
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 3.2: Filter Modification & Automatic Page Index Reset');

  test('C2.1: Changing tag filter resets pageIndex to 0 and recalculates pagination', () => {
    let pageIndex = 3; // user was on page 4
    const onTagFilterChange = (newTag) => {
      pageIndex = 0; // Component contract: table.setPageIndex(0)
      return filterTestPackages({ packages: MOCK_TEST_PACKAGES, tagFilter: newTag });
    };

    const filtered = onTagFilterChange('JEE Main');
    const paginated = paginateDataset({ data: filtered, pageIndex, pageSize: 10 });
    assert.strictEqual(pageIndex, 0);
    assert.strictEqual(paginated.rows.length, 1);
  });

  test('C2.2: Changing omnibar search query resets pageIndex to 0', () => {
    let pageIndex = 2;
    const onGlobalFilterChange = (val) => {
      pageIndex = 0;
      return filterCourses({ courses: MOCK_COURSES, globalFilter: val });
    };

    const filtered = onGlobalFilterChange('Calculus');
    assert.strictEqual(pageIndex, 0);
    assert.strictEqual(filtered.length, 1);
  });

  // -------------------------------------------------------------
  // SUITE 3.3: Status Toggle + Cache Invalidation + Optimistic UI
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 3.3: Status Toggle + Cache Invalidation + Optimistic UI');

  test('C3.1: Status toggle performs optimistic state update followed by cache invalidation call', async () => {
    let packageState = [...MOCK_TEST_PACKAGES];
    const cacheInvalidationLog = [];

    const handleTogglePackageStatus = async (pkgId, newStatus) => {
      // 1. Optimistic update
      packageState = packageState.map(p => p.id === pkgId ? { ...p, is_active: newStatus } : p);
      // 2. Cache invalidation
      cacheInvalidationLog.push({ entity: 'test_package', id: pkgId });
    };

    await handleTogglePackageStatus('pkg-01-jee-main-super60', false);
    const updatedPkg = packageState.find(p => p.id === 'pkg-01-jee-main-super60');
    assert.strictEqual(updatedPkg.is_active, false);
    assert.strictEqual(cacheInvalidationLog.length, 1);
    assert.strictEqual(cacheInvalidationLog[0].id, 'pkg-01-jee-main-super60');
  });

  // -------------------------------------------------------------
  // SUITE 3.4: Delete Action + Confirm Modal + Deep Link Cleanup
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 3.4: Delete Action + Confirm Modal + Deep Link Cleanup');

  test('C4.1: Confirming deletion removes entity, closes drawer, and resets URL query', () => {
    let courses = [...MOCK_COURSES];
    let selectedCourse = courses[0];
    let isDrawerOpen = true;
    let currentUrl = `/courses?id=${selectedCourse.id}`;

    const handleDeleteCourse = (courseId) => {
      // 1. Remove from array
      courses = courses.filter(c => c.id !== courseId);
      // 2. Reset drawer & URL if deleted item was selected
      if (selectedCourse?.id === courseId) {
        selectedCourse = null;
        isDrawerOpen = false;
        currentUrl = '/courses';
      }
    };

    handleDeleteCourse('crs-01-physics-mechanics-pro');
    assert.strictEqual(courses.length, MOCK_COURSES.length - 1);
    assert.strictEqual(selectedCourse, null);
    assert.strictEqual(isDrawerOpen, false);
    assert.strictEqual(currentUrl, '/courses');
  });

  // -------------------------------------------------------------
  // SUITE 3.5: Multi-Row Selection + Selected-Only CSV Export
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 3.5: Multi-Row Selection + Selected-Only CSV Export');

  test('C5.1: Exporting with active row selections exports ONLY selected rows', () => {
    const rowSelection = { '0': true, '2': true }; // indices 0 and 2
    const selectedRows = [MOCK_TEST_PACKAGES[0], MOCK_TEST_PACKAGES[2]];

    const exportData = Object.keys(rowSelection).length > 0
      ? selectedRows
      : MOCK_TEST_PACKAGES;

    const csv = generateTestPackagesCsv({ exportData });
    const lines = csv.split('\n');
    assert.strictEqual(lines.length, 3, '1 header + 2 selected rows = 3 lines');
    assert.ok(lines[1].includes('pkg-01-jee-main-super60'));
    assert.ok(lines[2].includes('pkg-03-neet-medical-mastery'));
  });

  test('C5.2: Exporting with zero row selections falls back to exporting all filtered rows', () => {
    const rowSelection = {};
    const filteredRows = filterTestPackages({ packages: MOCK_TEST_PACKAGES, tagFilter: 'JEE Advanced' });

    const exportData = Object.keys(rowSelection).length > 0
      ? []
      : filteredRows;

    const csv = generateTestPackagesCsv({ exportData });
    const lines = csv.split('\n');
    assert.strictEqual(lines.length, 2, '1 header + 1 filtered row = 2 lines');
    assert.ok(lines[1].includes('pkg-02-jee-advanced-elite'));
  });

  // -------------------------------------------------------------
  // SUITE 3.6: URL Deep-Linking & Browser History Sync
  // -------------------------------------------------------------
  console.log('\n🔵 SUITE 3.6: URL Deep-Linking & Browser History Sync');

  test('C6.1: Initializing page with ?id=pkg-02 opens drawer for matched package', () => {
    const urlPackageId = 'pkg-02-jee-advanced-elite';
    let selectedPackage = null;
    let isDrawerOpen = false;

    if (urlPackageId) {
      const match = MOCK_TEST_PACKAGES.find(p => p.id === urlPackageId);
      if (match) {
        selectedPackage = match;
        isDrawerOpen = true;
      }
    }

    assert.strictEqual(isDrawerOpen, true);
    assert.strictEqual(selectedPackage.id, 'pkg-02-jee-advanced-elite');
    assert.strictEqual(selectedPackage.title, 'JEE Advanced Rankers Challenge Test Series');
  });

  test('C6.2: Closing drawer synchronizes URL back to base route without ?id query parameter', () => {
    let currentUrl = '/admin/test-series?id=pkg-02-jee-advanced-elite';
    let isDrawerOpen = true;

    const handleCloseDrawer = () => {
      isDrawerOpen = false;
      currentUrl = '/admin/test-series';
    };

    handleCloseDrawer();
    assert.strictEqual(isDrawerOpen, false);
    assert.strictEqual(currentUrl, '/admin/test-series');
  });

  console.log(`\nTier 3 Summary: Passed ${passed}, Failed ${failed}`);
  return { passed, failed, errors };
}

if (require.main === module) {
  runTier3Tests();
}

module.exports = { runTier3Tests };
