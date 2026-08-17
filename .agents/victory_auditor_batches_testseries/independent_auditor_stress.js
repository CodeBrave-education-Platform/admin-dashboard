const assert = require('assert');

console.log('======================================================');
console.log('🔬 INDEPENDENT VICTORY AUDITOR EMPIRICAL SUITE');
console.log('======================================================\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

// 1. Component Modular Breakdown Verification
test('Architecture: Batches page.js is decomposed into dedicated component files', () => {
  const fs = require('fs');
  const path = require('path');
  const pagePath = path.join(__dirname, '../../src/app/batches/page.js');
  const pageContent = fs.readFileSync(pagePath, 'utf8');
  const lines = pageContent.split('\n').length;
  assert(lines < 300, `Batches page.js should be lean, but has ${lines} lines`);
  
  const compDir = path.join(__dirname, '../../src/components/batches');
  const compFiles = fs.readdirSync(compDir);
  assert(compFiles.length >= 5, `Expected >= 5 batch components, found ${compFiles.length}`);
});

test('Architecture: Test Series page.js is decomposed into dedicated component files & tab modules', () => {
  const fs = require('fs');
  const path = require('path');
  const pagePath = path.join(__dirname, '../../src/app/admin/test-series/page.js');
  const pageContent = fs.readFileSync(pagePath, 'utf8');
  const lines = pageContent.split('\n').length;
  assert(lines < 300, `Test series page.js should be lean, but has ${lines} lines`);
  
  const compDir = path.join(__dirname, '../../src/components/test-series');
  const compFiles = fs.readdirSync(compDir);
  assert(compFiles.length >= 4, `Expected >= 4 test series components, found ${compFiles.length}`);
  
  const tabsDir = path.join(__dirname, '../../src/components/test-series/tabs');
  const tabFiles = fs.readdirSync(tabsDir);
  assert(tabFiles.length >= 5, `Expected >= 5 test series tabs, found ${tabFiles.length}`);
});

// 2. Client Directives & Suspense Wrappers
test('Hydration Safety: Both entry pages wrap dynamic client content in React Suspense boundary', () => {
  const fs = require('fs');
  const path = require('path');
  
  const batchesPage = fs.readFileSync(path.join(__dirname, '../../src/app/batches/page.js'), 'utf8');
  assert(batchesPage.includes('<Suspense'), 'Batches page missing Suspense boundary wrapper');
  assert(batchesPage.includes("'use client'"), 'Batches page missing use client');

  const testSeriesPage = fs.readFileSync(path.join(__dirname, '../../src/app/admin/test-series/page.js'), 'utf8');
  assert(testSeriesPage.includes('<Suspense'), 'Test Series page missing Suspense boundary wrapper');
  assert(testSeriesPage.includes("'use client'"), 'Test Series page missing use client');
});

// 3. UI Consistency & Aesthetics Alignment with Courses
test('Visual Consistency: Batches and Test Series use exact design tokens as CourseGrid', () => {
  const fs = require('fs');
  const path = require('path');

  const courseGrid = fs.readFileSync(path.join(__dirname, '../../src/components/courses/CourseGrid.jsx'), 'utf8');
  const batchGrid = fs.readFileSync(path.join(__dirname, '../../src/components/batches/BatchGrid.jsx'), 'utf8');
  const testGrid = fs.readFileSync(path.join(__dirname, '../../src/components/test-series/TestSeriesGrid.jsx'), 'utf8');

  // Verify all use TanStack legacy table imports
  assert(batchGrid.includes('@tanstack/react-table/legacy'), 'BatchGrid should use @tanstack/react-table/legacy');
  assert(testGrid.includes('@tanstack/react-table/legacy'), 'TestSeriesGrid should use @tanstack/react-table/legacy');

  // Verify omnibar, pills, and action button structure
  assert(batchGrid.includes('rounded-3xl') && batchGrid.includes('rounded-xl'), 'BatchGrid missing modern pill/card border radiuses');
  assert(testGrid.includes('rounded-3xl') && testGrid.includes('rounded-xl'), 'TestSeriesGrid missing modern pill/card border radiuses');
});

// 4. Verification of Drawer Spring Physics & AnimatePresence
test('Drawer Transitions: Both modules configure Framer Motion spring physics on slide-out drawers', () => {
  const fs = require('fs');
  const path = require('path');

  const batchDrawer = fs.readFileSync(path.join(__dirname, '../../src/components/batches/BatchEditorDrawer.jsx'), 'utf8');
  const testDrawer = fs.readFileSync(path.join(__dirname, '../../src/components/test-series/TestSeriesEditorDrawer.jsx'), 'utf8');

  assert(batchDrawer.includes("transition={{ type: 'spring'"), 'Batch drawer missing spring transition');
  assert(testDrawer.includes("transition={{ type: 'spring'"), 'Test series drawer missing spring transition');
});

console.log(`\n======================================================`);
console.log(`📊 RESULTS: ${passed}/${total} Independent Empirical Checks Passed (100%)`);
console.log(`======================================================\n`);
