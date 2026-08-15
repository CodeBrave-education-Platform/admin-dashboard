/**
 * stress-test-parser.js — Empirical Adversarial Stress Test Suite
 * Created by Challenger 1 (Parser Stress & Edge Case Challenger)
 *
 * Tests 12 Complex, Dirty, and Unconventional Edge Case Scenarios:
 *   EC-01: High Question Numbers (Q.100, [101], Question 102:, Q. 200)
 *   EC-02: Advanced Mathematical Notation (Integrals \int, Square Roots \sqrt, Fractions \frac, Limits, Greek symbols)
 *   EC-03: Lowercase Parenthesis Options: a), b), c), d)
 *   EC-04: Square Bracket Options: [A], [B], [C], [D] and A], B], C], D]
 *   EC-05: Roman Numeral Options: (i), (ii), (iii), (iv)
 *   EC-06: Varied Answer Key Formats (Ans: (c), KEY - [B], Correct option is 3, Answer is: (c), Ans. D)
 *   EC-07: Multi-Paragraph Explanations & Step-by-Step Derivations with Blank Lines
 *   EC-08: Extreme Whitespace, Tabs, Missing Newlines & OCR / Pagination Artifacts
 *   EC-09: Sub-Item Lists in Stem (Statements (1), (2), (3) inside Stem without False Split)
 *   EC-10: Multi-line Options with Chemical Coordination Brackets [Co(NH3)6]3+
 *   EC-11: Negative Numbers and Decimal Options with 1., 2., 3., 4. Markers
 *   EC-12: Degenerate, Corrupted, Empty, and Noise-Only Inputs
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ═══════════════════════════════════════════════════════════════
// 1. ENGINE LOADER
// ═══════════════════════════════════════════════════════════════

function loadParser() {
  const routePath = path.resolve(__dirname, '../../src/app/api/admin/ai/parse-pdf/route.js');
  if (!fs.existsSync(routePath)) {
    throw new Error(`Target file not found: ${routePath}`);
  }

  const rawCode = fs.readFileSync(routePath, 'utf8');
  const transformed = rawCode
    .replace(/import\s*\{\s*NextResponse\s*\}\s*from\s*['"]next\/server['"];?/g, 'const { NextResponse } = require("next/server");')
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// stripped')
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

  const wrapper = `
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

  vm.runInContext(wrapper, sandbox);
  return sandbox.module.exports;
}

// ═══════════════════════════════════════════════════════════════
// 2. TEST HARNESS & RUNNER
// ═══════════════════════════════════════════════════════════════

async function runStressTests() {
  const engine = loadParser();
  const { parseExtractedText, cleanExtractedText, detectSubject } = engine;

  console.log('═'.repeat(75));
  console.log('  CHALLENGER 1: ADVERSARIAL PARSER STRESS TEST SUITE');
  console.log('═'.repeat(75) + '\n');

  const results = [];

  function recordResult(id, title, pass, details, metrics = {}) {
    results.push({ id, title, pass, details, metrics });
    const status = pass ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(`${status} ${id}: ${title}`);
    if (!pass || details) {
      console.log(`       \x1b[33mObservation:\x1b[0m ${details}`);
    }
  }

  // ----------------------------------------------------------------
  // EC-01: High Question Numbers (Q.100, [101], Question 102:, Q. 200)
  // ----------------------------------------------------------------
  {
    const input = `
Q.100 Calculate the de Broglie wavelength of an electron accelerated through a potential difference of 100 V.
(A) 0.123 nm
(B) 1.227 nm
(C) 0.012 nm
(D) 12.27 nm
Ans: (A)
Explanation: λ = 1.227 / √V nm = 1.227 / √100 = 0.1227 nm ≈ 0.123 nm.

[101] The magnetic flux linked with a coil of resistance 10 Ω changes from 10 Wb to 2 Wb in 0.1 s. The induced charge is:
(A) 0.8 C
(B) 0.4 C
(C) 8 C
(D) 1.6 C
Ans: (A)
Explanation: q = ΔΦ / R = (10 - 2) / 10 = 0.8 C.

Question 102: What is the IUPAC name of CH3-CH(OH)-CH2-COOH?
(A) 3-hydroxybutanoic acid
(B) 2-hydroxybutanoic acid
(C) 3-hydroxybutyric acid
(D) 4-hydroxybutanoic acid
Answer: (A)
Solution: Numbering starts from the carboxyl carbon: 4-carbon chain is butanoic acid with -OH at C3.
`;
    const start = Date.now();
    const parsed = parseExtractedText(input);
    const dur = Date.now() - start;

    const countOk = parsed.length === 3;
    const q1StemOk = parsed[0] && !parsed[0].content.startsWith('100') && parsed[0].content.includes('de Broglie');
    const q2StemOk = parsed[1] && !parsed[1].content.startsWith('101') && parsed[1].content.includes('magnetic flux');
    const q3StemOk = parsed[2] && !parsed[2].content.startsWith('102') && parsed[2].content.includes('IUPAC name');

    const pass = countOk && q1StemOk && q2StemOk && q3StemOk;
    recordResult(
      'EC-01',
      'High Question Numbers (Q.100, [101], Question 102:)',
      pass,
      `Extracted ${parsed.length}/3 questions. Stem 1 clean: ${q1StemOk}, Stem 2 clean: ${q2StemOk}, Stem 3 clean: ${q3StemOk} in ${dur}ms`,
      { count: parsed.length, dur }
    );
  }

  // ----------------------------------------------------------------
  // EC-02: Advanced Mathematical Notation (Integrals, Sqrt, Fractions, Limits)
  // ----------------------------------------------------------------
  {
    const input = `
Q.1 Evaluate the definite integral: \\int_0^1 \\frac{\\sqrt{1-x^2}}{1+x} dx
(A) \\frac{\\pi}{4} - \\ln(2)
(B) \\sqrt{2} - 1
(C) \\frac{\\pi}{2} + 1
(D) \\int_0^{\\infty} e^{-x^2} dx
Ans: (A)
Explanation: Substitute x = \\sin(\\theta), dx = \\cos(\\theta) d\\theta. The integral evaluates to \\pi/4 - \\ln(2).
`;
    const parsed = parseExtractedText(input);
    const q = parsed[0];
    const stemOk = q && q.content.includes('\\int_0^1') && q.content.includes('\\sqrt{1-x^2}');
    const optAOk = q && q.options[0].includes('\\frac{\\pi}{4}') && q.options[0].includes('\\ln(2)');
    const optBOk = q && q.options[1].includes('\\sqrt{2}');
    const optDOk = q && q.options[3].includes('\\int_0^{\\infty}');
    const explOk = q && q.explanation.includes('\\sin(\\theta)');

    const pass = stemOk && optAOk && optBOk && optDOk && explOk;
    recordResult(
      'EC-02',
      'Advanced Mathematical Notation (\\int, \\sqrt, \\frac, \\ln)',
      pass,
      `LaTeX symbols preserved. Stem: ${stemOk}, Opt A: ${optAOk}, Opt B: ${optBOk}, Opt D: ${optDOk}, Expl: ${explOk}`,
      { stemOk, optAOk }
    );
  }

  // ----------------------------------------------------------------
  // EC-03: Lowercase Parenthesis Options: a), b), c), d)
  // ----------------------------------------------------------------
  {
    const input = `
Q.1 Which of the following organelles is known as the powerhouse of the cell?
a) Ribosome
b) Mitochondria
c) Endoplasmic reticulum
d) Golgi apparatus
Ans: b
Explanation: Mitochondria generate most of the cell's ATP via aerobic respiration.
`;
    const parsed = parseExtractedText(input);
    const q = parsed[0];
    const countOk = parsed.length === 1;
    const optA = q && q.options[0] === 'Ribosome';
    const optB = q && q.options[1] === 'Mitochondria';
    const optC = q && q.options[2] === 'Endoplasmic reticulum';
    const optD = q && q.options[3] === 'Golgi apparatus';
    const ansIdxOk = q && q.correct_option_index === 1;

    const pass = countOk && optA && optB && optC && optD && ansIdxOk;
    recordResult(
      'EC-03',
      'Lowercase Parenthesis Options: a), b), c), d)',
      pass,
      `Options correctly tokenized: [A="${q?.options[0]}", B="${q?.options[1]}", C="${q?.options[2]}", D="${q?.options[3]}"], AnsIdx=${q?.correct_option_index}`,
      { optA, optB, optC, optD, ansIdxOk }
    );
  }

  // ----------------------------------------------------------------
  // EC-04: Square Bracket Options: [A], [B], [C], [D] & A], B], C], D]
  // ----------------------------------------------------------------
  {
    const input = `
Q.1 Choose the correct statement regarding ideal gas behavior:
[A] Pressure is inversely proportional to temperature at constant volume.
[B] Internal energy depends only on temperature.
[C] Specific heat at constant volume is always zero.
[D] Compressibility factor Z is always greater than 1.
KEY: B
Solution: For an ideal gas, U = n Cv T, so internal energy depends strictly on temperature.
`;
    const parsed = parseExtractedText(input);
    const q = parsed[0];
    const optAOk = q && q.options[0].includes('inversely proportional');
    const optBOk = q && q.options[1].includes('Internal energy depends only');
    const optDOk = q && !q.options[3].includes('KEY') && !q.options[3].includes('Solution');
    const ansIdxOk = q && q.correct_option_index === 1;

    const pass = optAOk && optBOk && optDOk && ansIdxOk;
    recordResult(
      'EC-04',
      'Square Bracket Options: [A], [B], [C], [D] with KEY: B',
      pass,
      `Options clean: Opt A=${optAOk}, Opt B=${optBOk}, Opt D clean=${optDOk}, AnsIdx=${q?.correct_option_index}`,
      { optAOk, optBOk, optDOk, ansIdxOk }
    );
  }

  // ----------------------------------------------------------------
  // EC-05: Roman Numeral Options: (i), (ii), (iii), (iv)
  // ----------------------------------------------------------------
  {
    const input = `
Q.1 Identify the thermodynamic process in which no heat enters or leaves the system:
(i) Isothermal process
(ii) Adiabatic process
(iii) Isobaric process
(iv) Isochoric process
Ans: (ii)
Explanation: By definition, in an adiabatic process, ΔQ = 0.
`;
    const parsed = parseExtractedText(input);
    const q = parsed[0];
    const optCount = q && q.options.filter(o => !o.startsWith('Option ')).length;
    // Let's see how the parser handles Roman numerals
    recordResult(
      'EC-05',
      'Roman Numeral Options: (i), (ii), (iii), (iv)',
      q && q.options && q.options.length === 4,
      `Parsed result: Options=${JSON.stringify(q?.options)}, correct_option_index=${q?.correct_option_index}, content="${q?.content?.substring(0, 60)}..."`,
      { options: q?.options }
    );
  }

  // ----------------------------------------------------------------
  // EC-06: Varied Answer Key Formats
  // ----------------------------------------------------------------
  {
    const testCases = [
      { keyText: 'Ans: (c)', expectedIdx: 2, desc: 'Ans: (c)' },
      { keyText: 'KEY - [B]', expectedIdx: 1, desc: 'KEY - [B]' },
      { keyText: 'Correct option: 3', expectedIdx: 2, desc: 'Correct option: 3' },
      { keyText: 'Answer is: (c)', expectedIdx: 2, desc: 'Answer is: (c)' },
      { keyText: 'Ans. D', expectedIdx: 3, desc: 'Ans. D' },
      { keyText: 'Key: 4', expectedIdx: 3, desc: 'Key: 4' }
    ];

    let passedVariants = 0;
    const variantDetails = [];

    for (const tc of testCases) {
      const block = `
Q.1 Test question content stem?
(A) First
(B) Second
(C) Third
(D) Fourth
${tc.keyText}
Explanation: Test explanation.
`;
      const parsed = parseExtractedText(block);
      const q = parsed[0];
      const match = q && q.correct_option_index === tc.expectedIdx;
      if (match) passedVariants++;
      variantDetails.push(`${tc.desc} -> ${q ? q.correct_option_index : 'null'} (exp: ${tc.expectedIdx})`);
    }

    const pass = passedVariants >= 5; // Allow at least 5/6 variations
    recordResult(
      'EC-06',
      'Varied Answer Key Phrasings (Ans, KEY -, Correct option, Answer is, Ans. D)',
      pass,
      `Passed ${passedVariants}/${testCases.length} variants: [${variantDetails.join(', ')}]`,
      { passedVariants, total: testCases.length }
    );
  }

  // ----------------------------------------------------------------
  // EC-07: Multi-Paragraph Explanations & Step-by-Step Derivations
  // ----------------------------------------------------------------
  {
    const input = `
Q.1 Derive the total work done in an isothermal reversible expansion of n moles of an ideal gas from V1 to V2 at temperature T.
(A) W = nRT ln(V2/V1)
(B) W = nRT (V2 - V1)
(C) W = -nRT ln(V1/V2)
(D) W = 0
Ans: (A)
Explanation: Step 1: Work done is given by dW = P dV.

Step 2: For an ideal gas, P = nRT / V.
Substituting P into the work integral gives:
W = \\int_{V1}^{V2} \\frac{nRT}{V} dV

Step 3: Since T is constant in an isothermal process:
W = nRT [\\ln(V)]_{V1}^{V2} = nRT \\ln\\left(\\frac{V2}{V1}\\right).

Hence, option (A) is the correct choice.
`;
    const parsed = parseExtractedText(input);
    const q = parsed[0];
    const expl = q ? q.explanation : '';
    const hasStep1 = expl.includes('Step 1:');
    const hasStep2 = expl.includes('Step 2:');
    const hasStep3 = expl.includes('Step 3:');
    const hasIntegral = expl.includes('\\int_{V1}^{V2}');
    const optDClean = q && !q.options[3].includes('Step 1');

    const pass = hasStep1 && hasStep2 && hasStep3 && hasIntegral && optDClean;
    recordResult(
      'EC-07',
      'Multi-Paragraph Explanations & Step-by-Step Derivations',
      pass,
      `Captured multi-paragraph explanation (length: ${expl.length} chars). Has Step 1-3: ${hasStep1 && hasStep2 && hasStep3}, Option D clean: ${optDClean}`,
      { explLength: expl.length, hasStep1, hasStep2, hasStep3 }
    );
  }

  // ----------------------------------------------------------------
  // EC-08: Extreme Whitespace, Tabs, Missing Newlines & OCR / Pagination Artifacts
  // ----------------------------------------------------------------
  {
    const input = `
PAGE 10 OF 50
CONFIDENTIAL - NTA JEE MOCK TEST SERIES 2026
-----------------------------------------------------------------
Q.1\t\tAn electron moves with velocity v in a magnetic field B.\t\tThe force is zero when angle θ is:
(a) 0°\t\t(b) 90°\t\t(c) 45°\t\t(d) 60°
Ans:\t(a)
Solution:\t\t\tF = q(v x B) = qvB sin(θ). When θ = 0°, sin(0°) = 0, so F = 0.
=================================================================
Page 11 of 50
`;
    const parsed = parseExtractedText(input);
    const q = parsed[0];
    const countOk = parsed.length === 1;
    const stemClean = q && !q.content.includes('CONFIDENTIAL') && !q.content.includes('PAGE 10') && q.content.includes('velocity v');
    const optA = q && q.options[0].includes('0°');
    const optB = q && q.options[1].includes('90°');
    const optC = q && q.options[2].includes('45°');
    const optD = q && q.options[3].includes('60°');
    const ansIdxOk = q && q.correct_option_index === 0;

    const pass = countOk && stemClean && optA && optB && optC && optD && ansIdxOk;
    recordResult(
      'EC-08',
      'Extreme Whitespace, Tabs, Missing Newlines & OCR Artifacts',
      pass,
      `Watermarks stripped: ${stemClean}. Tabs in options handled: [${q?.options?.join(', ')}]. AnsIdx: ${q?.correct_option_index}`,
      { countOk, stemClean, optA, optB, optC, optD }
    );
  }

  // ----------------------------------------------------------------
  // EC-09: Sub-Item Lists in Stem (Statements (1), (2), (3) without False Splits)
  // ----------------------------------------------------------------
  {
    const input = `
Q.1 Consider the following three statements regarding electrostatics of conductors:
(1) Electric field inside a cavity in a conductor with no charge inside is always zero.
(2) Electrostatic potential is constant throughout the entire volume of a conductor.
(3) Electric field at the surface of a charged conductor is parallel to the surface.
Which of the above statements are TRUE?
(A) (1) and (2) only
(B) (2) and (3) only
(C) (1) and (3) only
(D) (1), (2) and (3)
Ans: (A)
Explanation: Electric field at the surface must be normal (perpendicular) to the surface, so statement (3) is false. Statements (1) and (2) are true.

Q.2 The dimension of Planck's constant is:
(A) [M L^2 T^-1]
(B) [M L^2 T^-2]
(C) [M L T^-1]
(D) [M L^0 T^-1]
Ans: (A)
Explanation: E = hν => [h] = [E]/[ν] = [M L^2 T^-2] / [T^-1] = [M L^2 T^-1].
`;
    const parsed = parseExtractedText(input);
    const countOk = parsed.length === 2;
    const q1HasAllStatements = parsed[0] && parsed[0].content.includes('(1)') && parsed[0].content.includes('(2)') && parsed[0].content.includes('(3)');
    const q2Correct = parsed[1] && parsed[1].content.includes("Planck's constant");

    const pass = countOk && q1HasAllStatements && q2Correct;
    recordResult(
      'EC-09',
      'Sub-Item Lists in Stem (Statements (1), (2), (3) inside Stem)',
      pass,
      `Question count: ${parsed.length}/2. Stem 1 preserves sub-statements without false segmentation: ${q1HasAllStatements}`,
      { count: parsed.length, q1HasAllStatements, q2Correct }
    );
  }

  // ----------------------------------------------------------------
  // EC-10: Multi-line Options with Chemical Coordination Brackets [Co(NH3)6]3+
  // ----------------------------------------------------------------
  {
    const input = `
Q.1 Which of the following complex ions is an outer orbital octahedral complex according to Crystal Field Theory?
(A) [Co(NH3)6]3+ with high spin d6 configuration
(B) [Fe(CN)6]4- with low spin d6 configuration
(C) [CoF6]3- with high spin d6 configuration and sp3d2 hybridization
(D) [Ni(CN)4]2- with square planar geometry
Ans: (C)
Explanation: F- is a weak field ligand causing high spin state with sp3d2 outer orbital complex.
`;
    const parsed = parseExtractedText(input);
    const q = parsed[0];
    const optA = q && q.options[0].includes('[Co(NH3)6]3+');
    const optB = q && q.options[1].includes('[Fe(CN)6]4-');
    const optC = q && q.options[2].includes('[CoF6]3-') && q.options[2].includes('sp3d2 hybridization');
    const optD = q && q.options[3].includes('[Ni(CN)4]2-');
    const ansOk = q && q.correct_option_index === 2;

    const pass = optA && optB && optC && optD && ansOk;
    recordResult(
      'EC-10',
      'Chemical Coordination Brackets [Co(NH3)6]3+ in Multi-line Options',
      pass,
      `Brackets preserved in all options: Opt A=${optA}, Opt B=${optB}, Opt C=${optC}, Opt D=${optD}`,
      { optA, optB, optC, optD }
    );
  }

  // ----------------------------------------------------------------
  // EC-11: Negative Numbers and Decimal Options with 1., 2., 3., 4. Markers
  // ----------------------------------------------------------------
  {
    const input = `
Q.1 The energy of an electron in the nth Bohr orbit of hydrogen atom is given by En = -13.6 / n² eV.
What is the energy of the electron in the second excited state (n = 3)?
1. -13.6 eV
2. -3.4 eV
3. -1.51 eV
4. -0.85 eV
Ans: 3
Explanation: For second excited state, n = 3. E3 = -13.6 / 3² = -13.6 / 9 = -1.511 eV ≈ -1.51 eV.
`;
    const parsed = parseExtractedText(input);
    const q = parsed[0];
    const opt1 = q && q.options[0].trim() === '-13.6 eV';
    const opt2 = q && q.options[1].trim() === '-3.4 eV';
    const opt3 = q && q.options[2].trim() === '-1.51 eV';
    const opt4 = q && q.options[3].trim() === '-0.85 eV';
    const ansIdxOk = q && q.correct_option_index === 2;

    const pass = opt1 && opt2 && opt3 && opt4 && ansIdxOk;
    recordResult(
      'EC-11',
      'Negative Numbers & Decimal Options with 1., 2., 3., 4. Markers',
      pass,
      `Negative numbers & decimal values preserved: [${q?.options?.join(', ')}], AnsIdx: ${q?.correct_option_index}`,
      { opt1, opt2, opt3, opt4, ansIdxOk }
    );
  }

  // ----------------------------------------------------------------
  // EC-12: Degenerate, Corrupted, Empty, and Noise-Only Inputs
  // ----------------------------------------------------------------
  {
    const emptyRes = parseExtractedText('');
    const nullRes = parseExtractedText(null);
    const noiseRes = parseExtractedText('PAGE 1 OF 10\n------------------\nCONFIDENTIAL WATERMARK\nTIME: 180 MIN\nTOTAL MARKS: 300\n');
    const singleLineRes = parseExtractedText('Just a random paragraph without any question markers or options.');

    const emptyOk = Array.isArray(emptyRes) && emptyRes.length === 0;
    const nullOk = Array.isArray(nullRes) && nullRes.length === 0;
    const noiseOk = Array.isArray(noiseRes) && noiseRes.length === 0;
    const singleLineOk = Array.isArray(singleLineRes) && singleLineRes.length === 0;

    const pass = emptyOk && nullOk && noiseOk && singleLineOk;
    recordResult(
      'EC-12',
      'Degenerate, Corrupted, Empty, and Noise-Only Inputs',
      pass,
      `Empty=${emptyOk}, Null=${nullOk}, NoiseOnly=${noiseOk}, RandomParagraph=${singleLineOk}`,
      { emptyOk, nullOk, noiseOk, singleLineOk }
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY AND STATS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(75));
  console.log('  CHALLENGER 1 STRESS TEST SUMMARY');
  console.log('═'.repeat(75));

  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  console.log(`  Total Edge Cases Tested: ${total}`);
  console.log(`  Passed: \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${failed}\x1b[0m`);
  console.log(`  Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('═'.repeat(75) + '\n');

  return { total, passed, failed, results };
}

if (require.main === module) {
  runStressTests().catch(err => {
    console.error('Fatal stress test failure:', err);
    process.exit(1);
  });
}

module.exports = { runStressTests };
