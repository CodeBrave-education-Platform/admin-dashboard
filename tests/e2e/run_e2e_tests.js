/**
 * tests/e2e/run_e2e_tests.js
 * 
 * Master E2E Test Suite Runner for Bento Grid & Zero-Defect Database QA
 * Executes all 5 testing tiers and reports execution metrics.
 * 
 * Command: node tests/e2e/run_e2e_tests.js
 */

const { runTier1Tests } = require('./tier1_feature_coverage.test');
const { runTier2Tests } = require('./tier2_boundary_corner_cases.test');
const { runTier3Tests } = require('./tier3_cross_feature_combinations.test');
const { runTier4Tests } = require('./tier4_real_world_scenarios.test');
const { runTier5Tests } = require('./tier5_adversarial_audit.test');

function runAllE2ETests() {
  console.log('\n======================================================================');
  console.log('🌟 ADMIN DASHBOARD BENTO GRID & ZERO-DEFECT DATABASE E2E TEST SUITE 🌟');
  console.log('======================================================================\n');

  const startTime = Date.now();
  let totalPassed = 0;
  let totalFailed = 0;
  const tierResults = [];

  // Tier 1
  try {
    const t1 = runTier1Tests();
    totalPassed += t1.passed;
    totalFailed += t1.failed;
    tierResults.push({ name: 'Tier 1 - Feature Coverage (7 Features, >=5 tests each)', passed: t1.passed, failed: t1.failed });
  } catch (err) {
    console.error('Tier 1 Suite Error:', err.message);
    totalFailed++;
    tierResults.push({ name: 'Tier 1 - Feature Coverage', passed: 0, failed: 1 });
  }

  // Tier 2
  try {
    const t2 = runTier2Tests();
    totalPassed += t2.passed;
    totalFailed += t2.failed;
    tierResults.push({ name: 'Tier 2 - Boundary & Corner Cases (Empty data, edge values)', passed: t2.passed, failed: t2.failed });
  } catch (err) {
    console.error('Tier 2 Suite Error:', err.message);
    totalFailed++;
    tierResults.push({ name: 'Tier 2 - Boundary & Corner Cases', passed: 0, failed: 1 });
  }

  // Tier 3
  try {
    const t3 = runTier3Tests();
    totalPassed += t3.passed;
    totalFailed += t3.failed;
    tierResults.push({ name: 'Tier 3 - Cross-Feature Interactions (Filter + Sort + DeepLink)', passed: t3.passed, failed: t3.failed });
  } catch (err) {
    console.error('Tier 3 Suite Error:', err.message);
    totalFailed++;
    tierResults.push({ name: 'Tier 3 - Cross-Feature Interactions', passed: 0, failed: 1 });
  }

  // Tier 4
  try {
    const t4 = runTier4Tests();
    totalPassed += t4.passed;
    totalFailed += t4.failed;
    tierResults.push({ name: 'Tier 4 - Real-World Application Workload Scenarios (E2E workflows)', passed: t4.passed, failed: t4.failed });
  } catch (err) {
    console.error('Tier 4 Suite Error:', err.message);
    totalFailed++;
    tierResults.push({ name: 'Tier 4 - Real-World Scenarios', passed: 0, failed: 1 });
  }

  // Tier 5
  try {
    const t5 = runTier5Tests();
    totalPassed += t5.passed;
    totalFailed += t5.failed;
    tierResults.push({ name: 'Tier 5 - Adversarial Integrity & Hardening Audit', passed: t5.passed, failed: t5.failed });
  } catch (err) {
    console.error('Tier 5 Suite Error:', err.message);
    totalFailed++;
    tierResults.push({ name: 'Tier 5 - Adversarial Audit', passed: 0, failed: 1 });
  }

  const durationMs = Date.now() - startTime;

  console.log('\n======================================================================');
  console.log('📊 E2E MASTER TEST SUITE EXECUTION SUMMARY');
  console.log('======================================================================');
  tierResults.forEach(tier => {
    const status = tier.failed === 0 ? 'PASSED ✅' : 'FAILED ❌';
    console.log(`  ${tier.name.padEnd(65)} : ${status} (${tier.passed} passed, ${tier.failed} failed)`);
  });
  console.log('----------------------------------------------------------------------');
  console.log(`  Total Assertions / Tests:  ${totalPassed + totalFailed}`);
  console.log(`  Passed:                    ${totalPassed}`);
  console.log(`  Failed:                    ${totalFailed}`);
  console.log(`  Execution Duration:        ${durationMs}ms`);
  console.log('======================================================================\n');

  if (totalFailed > 0) {
    console.error(`❌ E2E SUITE FAILED with ${totalFailed} failure(s)`);
    process.exit(1);
  } else {
    console.log('🎉 ALL 5 TIERS PASSED WITH ZERO DEFECTS (Status Code 0)\n');
    return { totalPassed, totalFailed, durationMs, tierResults };
  }
}

if (require.main === module) {
  runAllE2ETests();
}

module.exports = { runAllE2ETests };
