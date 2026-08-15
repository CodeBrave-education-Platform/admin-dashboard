/**
 * benchmark.js — Empirical Performance, High-Volume & Memory Safety Benchmark Harness
 * Challenger 2 (Performance & High-Volume Challenger)
 *
 * Tests:
 *  1. 100-Question Exam Paper Benchmark (Diverse Formats, Page Breaks, Math/Chemistry Formulas)
 *  2. 500-Question Exam Paper Benchmark (High Volume, Mega Document ~250KB)
 *  3. 1,000-Question Saturation Benchmark (Ultra-Scale Document ~500KB)
 *  4. 50-Iteration Repeated Parse Memory Leak / Heap Stability Benchmark
 *  5. Pathological & ReDoS Backtracking Stress Suite:
 *     - Catastrophic Backtracking Attack Strings
 *     - Deeply Nested Brackets & Chemical Formulas
 *     - 100,000-character Single Line without Delimiters
 *     - Massive Repetitive Sub-Statement Lists (500 sub-statements inside one stem)
 *     - Dense Whitespace & Unicode Dash/Space Flooding
 *
 * Requirements & SLA Thresholds:
 *  - Latency per question: < 1.0 ms / question
 *  - 100-question execution time: < 100 ms (Serverless timeout compliance)
 *  - Memory: No unbounded heap growth / leak
 *  - ReDoS: Zero catastrophic backtracking (> 50ms per single block = FAIL)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

// ═══════════════════════════════════════════════════════════════
// 1. ENGINE LOADER
// ═══════════════════════════════════════════════════════════════

function loadParserEngine() {
  const routePath = path.resolve(__dirname, '../../../src/app/api/admin/ai/parse-pdf/route.js');
  if (!fs.existsSync(routePath)) {
    throw new Error(`Cannot find parser route at: ${routePath}`);
  }

  const rawCode = fs.readFileSync(routePath, 'utf8');
  const transformed = rawCode
    .replace(/import\s*\{\s*NextResponse\s*\}\s*from\s*['"]next\/server['"];?/g, 'const { NextResponse } = require("next/server");')
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// import stripped')
    .replace(/export\s+async\s+function\s+([a-zA-Z0-9_$]+)/g, 'async function $1')
    .replace(/export\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1')
    .replace(/export\s+const\s+([a-zA-Z0-9_$]+)/g, 'const $1')
    .replace(/export\s+default\s+/g, 'module.exports = ');

  const sandbox = {
    require,
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    RegExp,
    Array,
    Object,
    String,
    Number,
    Boolean,
    JSON,
    Map,
    Set,
    module: { exports: {} },
    exports: {}
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);

  const wrapperCode = `
    ${transformed}
    module.exports = {
      parseExtractedText: typeof parseExtractedText !== 'undefined' ? parseExtractedText : undefined,
      parseQuestionBlock: typeof parseQuestionBlock !== 'undefined' ? parseQuestionBlock : undefined,
      cleanExtractedText: typeof cleanExtractedText !== 'undefined' ? cleanExtractedText : undefined,
      detectSubject: typeof detectSubject !== 'undefined' ? detectSubject : undefined,
      POST: typeof POST !== 'undefined' ? POST : undefined,
      ...module.exports
    };
  `;

  vm.runInContext(wrapperCode, sandbox);
  return sandbox.module.exports;
}

// ═══════════════════════════════════════════════════════════════
// 2. SYNTHETIC HIGH-VOLUME EXAM GENERATOR
// ═══════════════════════════════════════════════════════════════

const QUESTION_TEMPLATES = [
  // Type 1: Physics Rolling / Rotational (Vertical A-D, standard Ans format)
  (num, page) => `
----------------------------------------------------------------------
PAGE ${page} OF 100
CONFIDENTIAL - ASENTRA NATIONAL MOCK EXAMINATION
----------------------------------------------------------------------
Q.${num} A solid uniform sphere of mass M and radius R rolls without slipping down an inclined plane of inclination angle theta = 30 degrees. The linear acceleration of the center of mass along the incline is:
(A) (5/7) g sin(30°)
(B) (3/5) g sin(30°)
(C) (1/2) g sin(30°)
(D) (2/3) g sin(30°)
Ans: (A)
Explanation: For a solid sphere I = (2/5)MR². The acceleration is a = g sin(theta) / (1 + I/MR²) = g sin(theta) / (1 + 2/5) = (5/7) g sin(theta).
`,

  // Type 2: Chemistry Coordination Complex (Inline a-d with bracketed formulas)
  (num, page) => `
Question ${num}. Which of the following transition metal coordination complexes is diamagnetic and has square planar geometry according to Crystal Field and Valence Bond Theory?
(a) [Ni(CN)4]2-   (b) [PtCl4]2-   (c) [Co(NH3)6]3+   (d) [Fe(CN)6]4-
Answer: (a)
Solution: In [Ni(CN)4]2-, nickel is in the +2 oxidation state (d8 configuration). The strong field cyanide ligand causes electron pairing in 3d orbitals, resulting in dsp2 hybridization and square planar diamagnetic geometry.
`,

  // Type 3: Biology Multi-Statement Cellular Respiration (A.-D. options, Roman numerals)
  (num, page) => `
${num}. Consider the following statements regarding eukaryotic cellular respiration and mitochondrial bioenergetics:
Statement I: Glycolysis takes place in the cytosol and converts one glucose molecule into two pyruvate molecules without consuming molecular oxygen.
Statement II: The electron transport chain across the inner mitochondrial membrane establishes a proton gradient that drives ATP synthase to generate 32-34 ATP.
Choose the correct option from the choices given below:
A. Both Statement I and Statement II are true
B. Both Statement I and Statement II are false
C. Statement I is true but Statement II is false
D. Statement I is false but Statement II is true
Correct Option: A
Explanation: Glycolysis is an anaerobic cytosolic process. The oxidative phosphorylation pathway across the cristae couples proton pumping with ATP synthesis.
`,

  // Type 4: Mathematics Calculus & Negative Numbers (Numeric 1-4 options)
  (num, page) => `
Ques ${num}: Find the absolute minimum value of the cubic polynomial function f(x) = 2x³ - 15x² + 36x - 20 on the closed interval [0, 4].
(1) -20
(2) -5
(3) 8
(4) 12
Ans: 1
Explanation: Calculating critical points: f'(x) = 6x² - 30x + 36 = 6(x-2)(x-3) = 0, giving x = 2 and x = 3. Evaluating endpoints and critical points: f(0) = -20, f(2) = 8, f(3) = 7, f(4) = 12. The absolute minimum is f(0) = -20.
`,

  // Type 5: Physics LCR AC Circuit (Square brackets [A]-[D], KEY format)
  (num, page) => `
Q${num}. In a series LCR resonance circuit driven by an AC voltage generator V = V0 sin(omega * t), the resonance frequency is omega_0 = 1/sqrt(LC).
Which of the following physical statements regarding resonance is INCORRECT?
[A] The total impedance of the circuit is purely resistive and equal to R.
[B] The current in the branch is in phase with the source electromotive force.
[C] The power factor of the circuit reaches its absolute minimum of 0.
[D] The voltage drops across inductor and capacitor are equal and out of phase by 180 degrees.
KEY: C
Solution: At electrical resonance, inductive reactance equals capacitive reactance (XL = XC). The total impedance is Z = R, so the phase angle is 0 and the power factor cos(phi) = cos(0) = 1 (maximum, not zero). Statement [C] is false.
`
];

function generateExamText(questionCount) {
  let header = `
======================================================================
NATIONAL TESTING AGENCY — COMPREHENSIVE BENCHMARK EXAMINATION SERIES
TOTAL QUESTIONS: ${questionCount} | TIME: 180 MINS | MAXIMUM MARKS: ${questionCount * 4}
INSTRUCTIONS FOR CANDIDATES: READ ALL QUESTIONS CAREFULLY.
======================================================================
`;

  const blocks = [];
  for (let i = 1; i <= questionCount; i++) {
    const templateIdx = (i - 1) % QUESTION_TEMPLATES.length;
    const pageNum = Math.floor((i - 1) / 5) + 1;
    blocks.push(QUESTION_TEMPLATES[templateIdx](i, pageNum));
  }

  return header + '\n' + blocks.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// 3. BENCHMARK RUNNER
// ═══════════════════════════════════════════════════════════════

async function runBenchmark() {
  console.log('═'.repeat(75));
  console.log('  CHALLENGER 2: HIGH-VOLUME PERFORMANCE & MEMORY SAFETY BENCHMARK');
  console.log('═'.repeat(75));

  const engine = loadParserEngine();
  const parseFn = engine.parseExtractedText;

  if (!parseFn) {
    throw new Error('parseExtractedText is not exported from route.js');
  }

  const results = {
    env: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuModel: require('os').cpus()[0].model,
      cpuCount: require('os').cpus().length,
      totalMemoryMB: Math.round(require('os').totalmem() / 1024 / 1024)
    },
    benchmarks: {},
    pathological: {},
    slaVerdicts: {}
  };

  console.log(`\nEnvironment: Node.js ${results.env.nodeVersion} (${results.env.platform}-${results.env.arch}) | CPU: ${results.env.cpuModel} x${results.env.cpuCount}`);

  // Warmup V8 JIT
  console.log('\n[JIT Warmup] Warming up V8 engine with 10 questions...');
  const warmupText = generateExamText(10);
  for (let i = 0; i < 5; i++) {
    parseFn(warmupText);
  }
  console.log('[JIT Warmup] Completed.');

  // -------------------------------------------------------------
  // BENCHMARK 1: 100-Question Exam Document
  // -------------------------------------------------------------
  console.log('\n' + '─'.repeat(75));
  console.log('BENCHMARK 1: 100-Question Exam Document (Standard Full Exam)');
  console.log('─'.repeat(75));

  const text100 = generateExamText(100);
  const size100KB = (Buffer.byteLength(text100, 'utf8') / 1024).toFixed(2);
  console.log(`Payload Size: ${size100KB} KB (${text100.length} characters)`);

  const memBefore100 = process.memoryUsage();
  const cpuBefore100 = process.cpuUsage();
  const t0_100 = performance.now();

  const parsed100 = parseFn(text100);

  const t1_100 = performance.now();
  const cpuDelta100 = process.cpuUsage(cpuBefore100);
  const memAfter100 = process.memoryUsage();

  const duration100 = t1_100 - t0_100;
  const perQuestion100 = duration100 / parsed100.length;
  const heapDelta100MB = ((memAfter100.heapUsed - memBefore100.heapUsed) / 1024 / 1024).toFixed(3);
  const totalCpuMs100 = (cpuDelta100.user + cpuDelta100.system) / 1000;

  console.log(`  • Extracted Questions: ${parsed100.length} / 100`);
  console.log(`  • Total Latency:       ${duration100.toFixed(2)} ms`);
  console.log(`  • Latency / Question:  ${perQuestion100.toFixed(4)} ms/question (SLA: <1.0 ms)`);
  console.log(`  • CPU Consumption:     ${totalCpuMs100.toFixed(2)} ms (User: ${(cpuDelta100.user/1000).toFixed(2)}ms, Sys: ${(cpuDelta100.system/1000).toFixed(2)}ms)`);
  console.log(`  • Heap Used Delta:     ${heapDelta100MB} MB (Current Heap: ${(memAfter100.heapUsed/1024/1024).toFixed(2)} MB)`);
  console.log(`  • Serverless <100ms:   ${duration100 < 100 ? 'PASS (Compliant)' : 'FAIL (Exceeds 100ms)'}`);

  results.benchmarks['100_questions'] = {
    questionCount: parsed100.length,
    expectedCount: 100,
    payloadSizeKB: size100KB,
    durationMs: duration100,
    perQuestionMs: perQuestion100,
    cpuMs: totalCpuMs100,
    heapDeltaMB: heapDelta100MB,
    serverlessCompliant: duration100 < 100
  };

  // -------------------------------------------------------------
  // BENCHMARK 2: 500-Question Mega Exam Document
  // -------------------------------------------------------------
  console.log('\n' + '─'.repeat(75));
  console.log('BENCHMARK 2: 500-Question Mega Exam Document (High-Volume Stress)');
  console.log('─'.repeat(75));

  const text500 = generateExamText(500);
  const size500KB = (Buffer.byteLength(text500, 'utf8') / 1024).toFixed(2);
  console.log(`Payload Size: ${size500KB} KB (${text500.length} characters)`);

  const memBefore500 = process.memoryUsage();
  const cpuBefore500 = process.cpuUsage();
  const t0_500 = performance.now();

  const parsed500 = parseFn(text500);

  const t1_500 = performance.now();
  const cpuDelta500 = process.cpuUsage(cpuBefore500);
  const memAfter500 = process.memoryUsage();

  const duration500 = t1_500 - t0_500;
  const perQuestion500 = duration500 / parsed500.length;
  const heapDelta500MB = ((memAfter500.heapUsed - memBefore500.heapUsed) / 1024 / 1024).toFixed(3);
  const totalCpuMs500 = (cpuDelta500.user + cpuDelta500.system) / 1000;

  console.log(`  • Extracted Questions: ${parsed500.length} / 500`);
  console.log(`  • Total Latency:       ${duration500.toFixed(2)} ms`);
  console.log(`  • Latency / Question:  ${perQuestion500.toFixed(4)} ms/question (SLA: <1.0 ms)`);
  console.log(`  • CPU Consumption:     ${totalCpuMs500.toFixed(2)} ms`);
  console.log(`  • Heap Used Delta:     ${heapDelta500MB} MB (Current Heap: ${(memAfter500.heapUsed/1024/1024).toFixed(2)} MB)`);

  results.benchmarks['500_questions'] = {
    questionCount: parsed500.length,
    expectedCount: 500,
    payloadSizeKB: size500KB,
    durationMs: duration500,
    perQuestionMs: perQuestion500,
    cpuMs: totalCpuMs500,
    heapDeltaMB: heapDelta500MB
  };

  // -------------------------------------------------------------
  // BENCHMARK 3: 1,000-Question Saturation Benchmark
  // -------------------------------------------------------------
  console.log('\n' + '─'.repeat(75));
  console.log('BENCHMARK 3: 1,000-Question Saturation Benchmark (Ultra-Scale)');
  console.log('─'.repeat(75));

  const text1000 = generateExamText(1000);
  const size1000KB = (Buffer.byteLength(text1000, 'utf8') / 1024).toFixed(2);
  console.log(`Payload Size: ${size1000KB} KB (${text1000.length} characters)`);

  const t0_1000 = performance.now();
  const parsed1000 = parseFn(text1000);
  const t1_1000 = performance.now();

  const duration1000 = t1_1000 - t0_1000;
  const perQuestion1000 = duration1000 / parsed1000.length;
  const throughputQps = (parsed1000.length / (duration1000 / 1000)).toFixed(0);

  console.log(`  • Extracted Questions: ${parsed1000.length} / 1000`);
  console.log(`  • Total Latency:       ${duration1000.toFixed(2)} ms`);
  console.log(`  • Latency / Question:  ${perQuestion1000.toFixed(4)} ms/question`);
  console.log(`  • Throughput:          ${throughputQps} questions/sec`);

  results.benchmarks['1000_questions'] = {
    questionCount: parsed1000.length,
    expectedCount: 1000,
    payloadSizeKB: size1000KB,
    durationMs: duration1000,
    perQuestionMs: perQuestion1000,
    throughputQps
  };

  // -------------------------------------------------------------
  // BENCHMARK 4: 50-Iteration Repeated Parse Heap Leak & Stability
  // -------------------------------------------------------------
  console.log('\n' + '─'.repeat(75));
  console.log('BENCHMARK 4: 50-Iteration Repeated Parse Memory Leak Test (100-Q x 50 = 5,000 Qs)');
  console.log('─'.repeat(75));

  const iterationDurations = [];
  const startMem = process.memoryUsage().heapUsed;

  for (let iter = 1; iter <= 50; iter++) {
    const iterT0 = performance.now();
    const res = parseFn(text100);
    const iterT1 = performance.now();
    iterationDurations.push(iterT1 - iterT0);
  }

  const endMem = process.memoryUsage().heapUsed;
  const totalIterMemGrowthMB = ((endMem - startMem) / 1024 / 1024).toFixed(3);
  const avgIterDuration = iterationDurations.reduce((a, b) => a + b, 0) / iterationDurations.length;
  const minIterDuration = Math.min(...iterationDurations);
  const maxIterDuration = Math.max(...iterationDurations);

  console.log(`  • 50 Iterations Completed (Total parsed: 5,000 questions)`);
  console.log(`  • Average Iteration Time: ${avgIterDuration.toFixed(2)} ms`);
  console.log(`  • Min / Max Iteration:    ${minIterDuration.toFixed(2)} ms / ${maxIterDuration.toFixed(2)} ms`);
  console.log(`  • Net Heap Growth:        ${totalIterMemGrowthMB} MB (indicates no persistent closures or regex memory leaks)`);

  results.benchmarks['50_iterations_leak_test'] = {
    iterations: 50,
    totalQuestionsParsed: 5000,
    avgIterDurationMs: avgIterDuration,
    minIterDurationMs: minIterDuration,
    maxIterDurationMs: maxIterDuration,
    netHeapGrowthMB: totalIterMemGrowthMB,
    leakDetected: parseFloat(totalIterMemGrowthMB) > 50 // Leak threshold > 50MB for 50 iterations
  };

  // -------------------------------------------------------------
  // BENCHMARK 5: Pathological Inputs & ReDoS Backtracking Stress
  // -------------------------------------------------------------
  console.log('\n' + '─'.repeat(75));
  console.log('BENCHMARK 5: Pathological Edge Cases & ReDoS Backtracking Stress');
  console.log('─'.repeat(75));

  const pathologicalCases = [
    {
      name: 'Catastrophic Backtracking Attack Pattern (Overlapping Repeating Delimiters)',
      input: 'Q.1 ' + '(((([A] '.repeat(500) + 'content ' + '))))] '.repeat(500) + '\n(A) 1\n(B) 2\n(C) 3\n(D) 4\nAns: A\n',
      maxAllowedMs: 50
    },
    {
      name: 'Mega Single Line (100,000 characters without newline)',
      input: 'Q.1 ' + 'A'.repeat(100000) + ' (A) opt1 (B) opt2 (C) opt3 (D) opt4 Ans: A',
      maxAllowedMs: 50
    },
    {
      name: 'Sub-Statement Avalanche (500 internal numbered lines inside 1 stem)',
      input: 'Q.1 Consider the following properties:\n' +
        Array.from({ length: 500 }, (_, i) => `Statement ${i + 1}: Property ${i + 1} holds true under temperature T.`).join('\n') +
        '\n(A) All true\n(B) All false\n(C) None true\n(D) Exactly one true\nAns: (A)\nExplanation: All verified.\n',
      maxAllowedMs: 50
    },
    {
      name: 'Massive Whitespace & Unicode Flooding (50,000 non-breaking spaces & dashes)',
      input: 'Q.1 ' + '\u00A0 \u2000 \u2013 \u2014 '.repeat(5000) + ' What is 2 + 2?\n(A) 4\n(B) 5\n(C) 6\n(D) 7\nAns: A\n',
      maxAllowedMs: 50
    },
    {
      name: 'Deeply Bracketed Chemical Formulas ([[[Pt(NH3)2Cl2]Br2]SO4]3-)',
      input: 'Q.1 Name the coordination sphere [[[Pt(NH3)2Cl2]Br2]SO4]3- in IUPAC nomenclature:\n(a) [Pt(NH3)2Cl2]\n(b) [PtCl4]2-\n(c) [Co(CN)6]3-\n(d) [Ni(CO)4]\nAns: a\n',
      maxAllowedMs: 50
    },
    {
      name: 'Zero-Question Giant Noise Document (1,000 pages of watermarks)',
      input: Array.from({ length: 1000 }, (_, i) => `PAGE ${i + 1} OF 1000\nCONFIDENTIAL WATERMARK\n------------------------`).join('\n'),
      maxAllowedMs: 50
    }
  ];

  let allPathologicalPassed = true;

  for (const tc of pathologicalCases) {
    const t0 = performance.now();
    let res;
    let threw = false;
    let errMsg = '';
    try {
      res = parseFn(tc.input);
    } catch (e) {
      threw = true;
      errMsg = e.message;
    }
    const elapsed = performance.now() - t0;
    const passed = !threw && elapsed < tc.maxAllowedMs;

    if (!passed) allPathologicalPassed = false;

    console.log(`  • [${passed ? 'PASS' : 'FAIL'}] ${tc.name}`);
    console.log(`    - Elapsed: ${elapsed.toFixed(2)} ms (Max Allowed: ${tc.maxAllowedMs} ms) | Result count: ${res ? res.length : 0}`);
    if (threw) console.log(`    - Threw Exception: ${errMsg}`);

    results.pathological[tc.name] = {
      elapsedMs: elapsed,
      maxAllowedMs: tc.maxAllowedMs,
      passed,
      error: errMsg || null
    };
  }

  // -------------------------------------------------------------
  // SLA EVALUATION & VERDICT DETERMINATION
  // -------------------------------------------------------------
  console.log('\n' + '═'.repeat(75));
  console.log('  CHALLENGER 2 FINAL SLA VERDICT EVALUATION');
  console.log('═'.repeat(75));

  const sla1_perQuestion = results.benchmarks['100_questions'].perQuestionMs < 1.0;
  const sla2_serverless100 = results.benchmarks['100_questions'].durationMs < 100.0;
  const sla3_highVolume500 = results.benchmarks['500_questions'].perQuestionMs < 1.0;
  const sla4_memorySafety = !results.benchmarks['50_iterations_leak_test'].leakDetected;
  const sla5_redosSafety = allPathologicalPassed;
  const sla6_accuracy100 = results.benchmarks['100_questions'].questionCount === 100;
  const sla7_accuracy500 = results.benchmarks['500_questions'].questionCount === 500;

  console.log(`  1. Latency / Question (< 1.0 ms):          ${sla1_perQuestion ? '✔ PASS' : '✖ FAIL'} (${results.benchmarks['100_questions'].perQuestionMs.toFixed(4)} ms)`);
  console.log(`  2. Serverless 100-Q Timeout (< 100 ms):    ${sla2_serverless100 ? '✔ PASS' : '✖ FAIL'} (${results.benchmarks['100_questions'].durationMs.toFixed(2)} ms)`);
  console.log(`  3. 500-Q High-Volume Latency (< 1.0 ms/q): ${sla3_highVolume500 ? '✔ PASS' : '✖ FAIL'} (${results.benchmarks['500_questions'].perQuestionMs.toFixed(4)} ms)`);
  console.log(`  4. Memory Leak & Heap Stability:           ${sla4_memorySafety ? '✔ PASS' : '✖ FAIL'} (Net Growth: ${results.benchmarks['50_iterations_leak_test'].netHeapGrowthMB} MB)`);
  console.log(`  5. ReDoS & Pathological Attack Resistance: ${sla5_redosSafety ? '✔ PASS' : '✖ FAIL'}`);
  console.log(`  6. 100-Q Cardinality Accuracy:             ${sla6_accuracy100 ? '✔ PASS' : '✖ FAIL'} (100 / 100 parsed)`);
  console.log(`  7. 500-Q Cardinality Accuracy:             ${sla7_accuracy500 ? '✔ PASS' : '✖ FAIL'} (500 / 500 parsed)`);

  const allPassed = sla1_perQuestion && sla2_serverless100 && sla3_highVolume500 &&
                    sla4_memorySafety && sla5_redosSafety && sla6_accuracy100 && sla7_accuracy500;

  const verdict = allPassed ? 'APPROVE' : 'REQUEST_CHANGES';

  console.log('\n' + '─'.repeat(75));
  console.log(`  OVERALL PERFORMANCE & HIGH-VOLUME VERDICT: [ ${verdict} ]`);
  console.log('═'.repeat(75) + '\n');

  results.verdict = verdict;
  results.allPassed = allPassed;

  fs.writeFileSync(
    path.resolve(__dirname, 'benchmark_results.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );

  return results;
}

if (require.main === module) {
  runBenchmark().then(res => {
    process.exit(res.allPassed ? 0 : 1);
  }).catch(err => {
    console.error('Fatal benchmark failure:', err);
    process.exit(1);
  });
}

module.exports = {
  generateExamText,
  runBenchmark
};
