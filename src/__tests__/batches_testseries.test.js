/**
 * batches_testseries.test.js
 * 
 * Comprehensive 4-Tier Test Suite for Batches and Test Series modules in src/__tests__/
 * 
 * Run command:
 *   node src/__tests__/batches_testseries.test.js
 */

const { runMasterTestSuite } = require('../../tests/run_all_tests');

if (require.main === module) {
  try {
    runMasterTestSuite();
  } catch (err) {
    console.error('Fatal Error:', err);
    process.exit(1);
  }
}

module.exports = { runMasterTestSuite };
