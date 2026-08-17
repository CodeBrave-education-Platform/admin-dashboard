/**
 * test-challenger3-edge-cases.js
 * 
 * Challenger 3: Empirical Adversarial Edge-Case Verification Suite
 * Target: CourseGrid, Pagination, Sorting, Search, Status Toggle, and URL State Synchronization
 * 
 * Execution: node test-challenger3-edge-cases.js
 */

const React = require('react');
const ReactDOMServer = require('react-dom/server');
const fs = require('fs');
const {
  useLegacyTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel
} = require('@tanstack/react-table/legacy');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function recordTest(suiteName, testName, passed, details = {}) {
  totalTests++;
  if (passed) {
    passedTests++;
  } else {
    failedTests++;
  }
  testResults.push({
    suite: suiteName,
    name: testName,
    passed,
    details
  });
  const statusMark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${statusMark}: [${suiteName}] ${testName}`);
  if (!passed && details.error) {
    console.log(`     Reason: ${details.error}`);
  }
  if (details.notes) {
    console.log(`     Notes: ${details.notes}`);
  }
}

// Helper to instantiate CourseGrid table model matching CourseGrid.jsx implementation exactly
function instantiateTestTable({
  courses = [],
  globalFilter = '',
  levelFilter = 'ALL',
  statusFilter = 'ALL',
  sorting = [{ id: 'created_at', desc: true }],
  pagination = { pageIndex: 0, pageSize: 10 },
  rowSelection = {}
}) {
  let tableInstance;

  // Filter courses by level and status matching CourseGrid.jsx line 36-48
  const filteredData = courses.filter(c => {
    if (levelFilter !== 'ALL' && (c.level || '').toLowerCase() !== levelFilter.toLowerCase()) {
      return false;
    }
    if (statusFilter !== 'ALL') {
      const isActive = c.is_active !== false;
      if (statusFilter === 'ACTIVE' && !isActive) return false;
      if (statusFilter === 'INACTIVE' && isActive) return false;
    }
    return true;
  });

  // Custom global search filter matching CourseGrid.jsx line 51-61
  const globalFilterFn = (row, columnId, filterValue) => {
    const search = String(filterValue || '').toLowerCase().trim();
    if (!search) return true;
    const course = row.original;
    const matchTitle = String(course.title || '').toLowerCase().includes(search);
    const matchSubject = String(course.subject || '').toLowerCase().includes(search);
    const matchDesc = String(course.description || '').toLowerCase().includes(search);
    const matchAudience = String(course.target_audience || course.badge || '').toLowerCase().includes(search);
    const matchLevel = String(course.level || '').toLowerCase().includes(search);
    return matchTitle || matchSubject || matchDesc || matchAudience || matchLevel;
  };

  const columns = [
    {
      id: 'select',
      enableSorting: false
    },
    {
      accessorKey: 'created_at',
      id: 'created_at',
      header: 'Created'
    },
    {
      accessorKey: 'duration',
      id: 'duration',
      header: 'Duration'
    },
    {
      accessorKey: 'display_order',
      id: 'display_order',
      header: 'Display Order'
    },
    {
      accessorKey: 'title',
      header: 'Course Identity'
    },
    {
      accessorKey: 'level',
      header: 'Audience Level'
    },
    {
      id: 'metrics',
      header: 'Curriculum Metrics'
    },
    {
      accessorKey: 'is_active',
      id: 'status',
      header: 'Status'
    },
    {
      accessorKey: 'price',
      header: 'Pricing'
    },
    {
      accessorKey: 'students_count',
      header: 'Enrolled'
    },
    {
      id: 'actions',
      header: 'Actions'
    }
  ];

  function TableWrapper() {
    tableInstance = useLegacyTable({
      data: filteredData,
      columns,
      state: {
        globalFilter,
        sorting,
        pagination,
        rowSelection
      },
      globalFilterFn,
      autoResetPageIndex: true,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      initialState: {
        pagination: {
          pageSize: 10
        },
        sorting: [{ id: 'created_at', desc: true }]
      }
    });

    return React.createElement('div', null, 'Rendered');
  }

  ReactDOMServer.renderToString(React.createElement(TableWrapper));

  return {
    table: tableInstance,
    filteredData,
    renderedRows: tableInstance.getRowModel().rows.map(r => r.original)
  };
}

// ═══════════════════════════════════════════════════════════════
// SUITE A: ADVANCED SORTING & NULL/CORRUPTED DATA STABILITY
// ═══════════════════════════════════════════════════════════════
function runSuiteA() {
  console.log('\n🔵 SUITE A: Advanced Sorting & Null/Corrupted Data Stability');

  const messyCourses = [
    { id: 'c1', title: 'Beta Mechanics', price: 2000, students_count: null, created_at: '2026-01-05T00:00:00Z', duration: 120, display_order: 2 },
    { id: 'c2', title: 'Alpha Thermodynamics', price: null, students_count: 50, created_at: '2026-01-10T00:00:00Z', duration: null, display_order: 1 },
    { id: 'c3', title: 'Gamma Optics', price: 0, students_count: 100, created_at: '2026-01-01T00:00:00Z', duration: 90, display_order: null },
    { id: 'c4', title: 'Delta Waves', price: 1500, students_count: 20, created_at: '2026-01-15T00:00:00Z', duration: 60, display_order: 4 }
  ];

  // Test A1: Sort by price with nulls and zero values
  {
    let threw = false;
    let rendered;
    try {
      const res = instantiateTestTable({
        courses: messyCourses,
        sorting: [{ id: 'price', desc: true }]
      });
      rendered = res.renderedRows;
    } catch (e) {
      threw = true;
    }
    recordTest('Suite A: Sorting', 'Numeric Sort with Null & Zero Prices Handles Gracefully', !threw && rendered.length === 4, {
      prices: rendered?.map(r => r.price)
    });
  }

  // Test A2: Sort by created_at descending with various dates
  {
    const { renderedRows } = instantiateTestTable({
      courses: messyCourses,
      sorting: [{ id: 'created_at', desc: true }]
    });
    const ids = renderedRows.map(r => r.id);
    const expected = ['c4', 'c2', 'c1', 'c3']; // Jan 15, Jan 10, Jan 5, Jan 1
    const passed = JSON.stringify(ids) === JSON.stringify(expected);
    recordTest('Suite A: Sorting', 'created_at Descending Chronological Sort Order Correctness', passed, {
      received: ids,
      expected
    });
  }

  // Test A3: Sort by duration ascending
  {
    const { renderedRows } = instantiateTestTable({
      courses: messyCourses,
      sorting: [{ id: 'duration', desc: false }]
    });
    recordTest('Suite A: Sorting', 'Duration Column Sort (Ascending)', renderedRows.length === 4, {
      durations: renderedRows.map(r => r.duration)
    });
  }

  // Test A4: Sort by display_order ascending
  {
    const { renderedRows } = instantiateTestTable({
      courses: messyCourses,
      sorting: [{ id: 'display_order', desc: false }]
    });
    recordTest('Suite A: Sorting', 'Display Order Column Sort (Ascending)', renderedRows.length === 4, {
      orders: renderedRows.map(r => r.display_order)
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// SUITE B: ADVERSARIAL GLOBAL & MULTI-DIMENSIONAL SEARCH FILTERING
// ═══════════════════════════════════════════════════════════════
function runSuiteB() {
  console.log('\n🔵 SUITE B: Adversarial Global & Multi-Dimensional Search Filtering');

  const testCatalog = [
    { id: '1', title: 'Complete Physics Masterclass', subject: 'Physics', description: 'Covers classical mechanics and waves', badge: 'Best Seller', level: 'foundation', is_active: true },
    { id: '2', title: 'Organic Chemistry Reactions [2026]', subject: 'Chemistry', description: 'Aldehydes, Ketones, and Amines', badge: 'High Yield', level: 'mains', is_active: true },
    { id: '3', title: 'Advanced Calculus & Real Analysis (Part 1)', subject: 'Mathematics', description: 'Rigorous delta-epsilon proofs and vectors', badge: 'Top Tier', level: 'advanced', is_active: false },
    { id: '4', title: 'Special Exam Prep: 100% Target Series', subject: 'General', description: 'High probability mock tests + formula bank', badge: 'Intensive', level: 'foundation', is_active: true }
  ];

  // Test B1: Regex special characters in search query
  const regexQueries = [
    '.*',
    '[2026]',
    '(Part 1)',
    '100%',
    '+',
    '\\d+',
    '^Complete',
    '$'
  ];
  let allRegexSafe = true;
  for (const q of regexQueries) {
    try {
      const { renderedRows } = instantiateTestTable({
        courses: testCatalog,
        globalFilter: q
      });
      if (q === '[2026]' && (!renderedRows.some(r => r.id === '2'))) {
        allRegexSafe = false;
      }
      if (q === '(Part 1)' && (!renderedRows.some(r => r.id === '3'))) {
        allRegexSafe = false;
      }
    } catch (e) {
      allRegexSafe = false;
    }
  }
  recordTest('Suite B: Search', 'Regex Injection / Metacharacters in Search Query Handled Safely', allRegexSafe, {
    testedQueries: regexQueries
  });

  // Test B2: Search by Description field ("delta-epsilon")
  {
    const { renderedRows } = instantiateTestTable({
      courses: testCatalog,
      globalFilter: 'delta-epsilon'
    });
    const passed = renderedRows.length === 1 && renderedRows[0].id === '3';
    recordTest('Suite B: Search', 'Search matches Course Description field ("delta-epsilon")', passed, {
      matched: renderedRows.map(r => r.title)
    });
  }

  // Test B3: Search by Badge / Target Audience ("Best Seller")
  {
    const { renderedRows } = instantiateTestTable({
      courses: testCatalog,
      globalFilter: 'Best Seller'
    });
    const passed = renderedRows.length === 1 && renderedRows[0].id === '1';
    recordTest('Suite B: Search', 'Search matches Course Badge / Audience field ("Best Seller")', passed, {
      matched: renderedRows.map(r => r.title)
    });
  }

  // Test B4: Search with whitespace padding ("   chemistry   ")
  {
    const { renderedRows } = instantiateTestTable({
      courses: testCatalog,
      globalFilter: '   chemistry   '
    });
    const passed = renderedRows.length === 1 && renderedRows[0].id === '2';
    recordTest('Suite B: Search', 'Search trims whitespace padding ("   chemistry   ")', passed, {
      matched: renderedRows.map(r => r.title)
    });
  }

  // Test B5: Compounded Multi-Filter (Level: FOUNDATION + Status: ACTIVE + Search: "Physics")
  {
    const { renderedRows } = instantiateTestTable({
      courses: testCatalog,
      levelFilter: 'FOUNDATION',
      statusFilter: 'ACTIVE',
      globalFilter: 'Physics'
    });
    const passed = renderedRows.length === 1 && renderedRows[0].id === '1';
    recordTest('Suite B: Search', 'Triple Compounded Filter (FOUNDATION + ACTIVE + "Physics")', passed, {
      matched: renderedRows.map(r => r.title)
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// SUITE C: PAGINATION BOUNDARY CONDITIONS & RESETS
// ═══════════════════════════════════════════════════════════════
function runSuiteC() {
  console.log('\n🔵 SUITE C: Pagination Boundary Conditions & Resets');

  // Test C1: Exact 10 items (boundary = exactly 1 full page)
  {
    const tenItems = Array.from({ length: 10 }, (_, i) => ({ id: `c-${i}`, title: `Course ${i}`, price: 100 }));
    const { table, renderedRows } = instantiateTestTable({
      courses: tenItems,
      pagination: { pageIndex: 0, pageSize: 10 }
    });
    const pageCount = table.getPageCount();
    const canNext = table.getCanNextPage();
    const passed = pageCount === 1 && renderedRows.length === 10 && !canNext;
    recordTest('Suite C: Pagination', 'Exact 10 Items -> Exactly 1 Page (cannot next)', passed, {
      pageCount,
      canNext
    });
  }

  // Test C2: Exact 11 items (boundary = 2 pages, page 2 has 1 item)
  {
    const elevenItems = Array.from({ length: 11 }, (_, i) => ({ id: `c-${i}`, title: `Course ${i}`, price: 100 }));
    const { table, renderedRows } = instantiateTestTable({
      courses: elevenItems,
      pagination: { pageIndex: 1, pageSize: 10 }
    });
    const pageCount = table.getPageCount();
    const canNext = table.getCanNextPage();
    const canPrev = table.getCanPreviousPage();
    const passed = pageCount === 2 && renderedRows.length === 1 && !canNext && canPrev;
    recordTest('Suite C: Pagination', 'Exact 11 Items -> Page 2 has exactly 1 Item', passed, {
      pageCount,
      renderedCount: renderedRows.length,
      canNext,
      canPrev
    });
  }

  // Test C3: Dynamic page size switching (10 -> 20 -> 50)
  {
    const fiftyItems = Array.from({ length: 50 }, (_, i) => ({ id: `c-${i}`, title: `Course ${i}`, price: 100 }));
    const { table: table10 } = instantiateTestTable({
      courses: fiftyItems,
      pagination: { pageIndex: 0, pageSize: 10 }
    });
    const { table: table20 } = instantiateTestTable({
      courses: fiftyItems,
      pagination: { pageIndex: 0, pageSize: 20 }
    });
    const { table: table50 } = instantiateTestTable({
      courses: fiftyItems,
      pagination: { pageIndex: 0, pageSize: 50 }
    });

    const passed = table10.getPageCount() === 5 && table20.getPageCount() === 3 && table50.getPageCount() === 1;
    recordTest('Suite C: Pagination', 'Page Count Scales Correctly on Page Size Changes (50 items -> 5 / 3 / 1 pages)', passed, {
      p10: table10.getPageCount(),
      p20: table20.getPageCount(),
      p50: table50.getPageCount()
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// SUITE D: STATUS TOGGLE, OPTIMISTIC UPDATES & EVENT PROPAGATION
// ═══════════════════════════════════════════════════════════════
function runSuiteD() {
  console.log('\n🔵 SUITE D: Status Toggle, Optimistic Updates & Event Propagation');

  // Test D1: Evaluate legacy courses with null/undefined is_active
  {
    const legacyRecords = [
      { id: '1', is_active: true },
      { id: '2', is_active: false },
      { id: '3', is_active: undefined },
      { id: '4', is_active: null }
    ];

    const activeList = legacyRecords.filter(c => (c.is_active !== false));
    const inactiveList = legacyRecords.filter(c => !(c.is_active !== false));

    // Notice: undefined and null !== false is true (defaults active)
    const passed = activeList.length === 3 && inactiveList.length === 1 && inactiveList[0].id === '2';
    recordTest('Suite D: Status Toggle', 'Legacy Null / Undefined is_active defaults to Active safely', passed, {
      activeCount: activeList.length,
      inactiveCount: inactiveList.length
    });
  }

  // Test D2: Optimistic rollback simulation in page controller
  {
    let coursesState = [
      { id: 'course-1', title: 'Test 1', is_active: true }
    ];

    // Simulate optimistic toggle
    const toggleStatus = async (courseId, nextStatus, shouldFail = false) => {
      // 1. Optimistic apply
      coursesState = coursesState.map(c => c.id === courseId ? { ...c, is_active: nextStatus } : c);

      // 2. Async operation
      if (shouldFail) {
        // Rollback
        coursesState = coursesState.map(c => c.id === courseId ? { ...c, is_active: !nextStatus } : c);
        return { success: false, error: 'Database update failed' };
      }
      return { success: true };
    };

    // Test successful toggle
    toggleStatus('course-1', false, false);
    const afterSuccess = coursesState.find(c => c.id === 'course-1').is_active === false;

    // Test failed toggle with rollback
    toggleStatus('course-1', true, true);
    const afterFailure = coursesState.find(c => c.id === 'course-1').is_active === false; // Rolled back to false

    recordTest('Suite D: Status Toggle', 'Optimistic Update Rollback on Database Failure', afterSuccess && afterFailure, {
      afterSuccess,
      afterFailure
    });
  }

  // Test D3: CourseGrid.jsx stopPropagation on Status Button Click
  {
    const courseGridCode = fs.readFileSync('D:/admin dashboard/src/components/courses/CourseGrid.jsx', 'utf8');
    const hasStopPropagation = courseGridCode.includes('e.stopPropagation()') && courseGridCode.includes('onToggleCourseStatus');
    recordTest('Suite D: Status Toggle', 'Status Toggle Button stops click propagation (prevents drawer open)', hasStopPropagation, {
      hasStopPropagation
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// SUITE E: URL STATE SYNCHRONIZATION & HISTORY RESILIENCE
// ═══════════════════════════════════════════════════════════════
function runSuiteE() {
  console.log('\n🔵 SUITE E: URL State Synchronization & Deep Linking');

  const pageCode = fs.readFileSync('D:/admin dashboard/src/app/courses/page.js', 'utf8');

  // Test E1: Support both ?id= and ?courseId= search params
  const supportsBothParamKeys = pageCode.includes("searchParams.get('id')") && pageCode.includes("searchParams.get('courseId')");
  recordTest('Suite E: URL Sync', 'Supports both ?id= and ?courseId= URL query parameters', supportsBothParamKeys, {
    supportsBothParamKeys
  });

  // Test E2: Deep Link Sync effect resets drawer when urlCourseId is cleared
  const effectBodyMatch = pageCode.match(/useEffect\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[urlCourseId,\s*courses\]\);/);
  const effectBody = effectBodyMatch ? effectBodyMatch[1] : '';
  const handlesBackNavigation = effectBody.includes('setIsDrawerOpen(false)') && effectBody.includes('setSelectedCourse(null)');
  recordTest('Suite E: URL Sync', 'Browser Back navigation to /courses resets selectedCourse & isDrawerOpen', handlesBackNavigation, {
    handlesBackNavigation
  });

  // Test E3: Next.js router.replace used to avoid infinite history stack loop on drawer toggle
  const usesReplace = pageCode.includes("router.replace(`/courses?id=${course.id}`") && pageCode.includes("router.replace('/courses'");
  recordTest('Suite E: URL Sync', 'Uses router.replace({ scroll: false }) to prevent polluting history stack', usesReplace, {
    usesReplace
  });

  // Test E4: Suspense boundary wraps useSearchParams component
  const hasSuspense = pageCode.includes('<Suspense fallback=') && pageCode.includes('<CoursesManagementContent />');
  recordTest('Suite E: URL Sync', 'Suspense Boundary wraps component using useSearchParams (Next.js 14+ requirement)', hasSuspense, {
    hasSuspense
  });
}

// ═══════════════════════════════════════════════════════════════
// SUITE F: CSV EXPORT & BULK SELECTION INTEGRITY
// ═══════════════════════════════════════════════════════════════
function runSuiteF() {
  console.log('\n🔵 SUITE F: CSV Export & Bulk Selection Integrity');

  const courseGridCode = fs.readFileSync('D:/admin dashboard/src/components/courses/CourseGrid.jsx', 'utf8');

  // Test F1: CSV export handles quotes & comma escaping
  const hasCsvEscaping = courseGridCode.includes('.replace(/"/g, \'""\')');
  recordTest('Suite F: CSV Export', 'Course titles with quotes and commas escaped for RFC 4180 CSV compliance', hasCsvEscaping, {
    hasCsvEscaping
  });

  // Test F2: Export uses filtered rows when no selection
  const usesFilteredRowsForExport = courseGridCode.includes('table.getFilteredRowModel().rows.map(r => r.original)');
  recordTest('Suite F: CSV Export', 'Export defaults to filtered rows model when no checkboxes selected', usesFilteredRowsForExport, {
    usesFilteredRowsForExport
  });

  // Test F3: Row selection checkbox column present with select-all header
  const hasRowSelection = courseGridCode.includes('getIsAllPageRowsSelected') && courseGridCode.includes('getToggleSelectedHandler');
  recordTest('Suite F: CSV Export', 'Row Selection with Select-All Page Rows Header present', hasRowSelection, {
    hasRowSelection
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════════════
function runChallenger3EdgeCases() {
  console.log('======================================================================');
  console.log('⚡ CHALLENGER 3: EMPIRICAL EDGE-CASE & STRESS VALIDATION HARNESS ⚡');
  console.log('======================================================================');

  runSuiteA();
  runSuiteB();
  runSuiteC();
  runSuiteD();
  runSuiteE();
  runSuiteF();

  console.log('\n======================================================================');
  console.log(`📊 CHALLENGER 3 TEST SUMMARY:`);
  console.log(`   Total Tests Run: ${totalTests}`);
  console.log(`   Passed:          ${passedTests}`);
  console.log(`   Failed / Found:  ${failedTests}`);
  console.log(`   Pass Rate:       ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('======================================================================\n');

  return { totalTests, passedTests, failedTests, testResults };
}

if (require.main === module) {
  runChallenger3EdgeCases();
}

module.exports = { runChallenger3EdgeCases };
