/**
 * test-batches-testseries-suite.js
 * 
 * Root CLI executable test runner for Batches & Test Series Redesign test suite.
 * 
 * Run command:
 *   node test-batches-testseries-suite.js
 */

const { runMasterTestSuite } = require('./tests/run_all_tests');

try {
  runMasterTestSuite();
} catch (err) {
  console.error('Fatal Error Running Test Suite:', err);
  process.exit(1);
}
