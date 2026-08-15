const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadParser() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'src/app/api/admin/ai/parse-pdf/route.js'),
    path.resolve(__dirname, 'src/app/api/admin/ai/parse-pdf/route.js'),
    path.resolve(__dirname, '../../src/app/api/admin/ai/parse-pdf/route.js')
  ];

  let routePath = possiblePaths.find(p => fs.existsSync(p));
  const rawCode = fs.readFileSync(routePath, 'utf8');
  
  let transformed = rawCode
    .replace(/import\s*\{\s*NextResponse\s*\}\s*from\s*['"]next\/server['"];?/g, 'const { NextResponse } = require("next/server");')
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// import removed')
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
  const wrappedCode = `
    ${transformed}
    
    module.exports = {
      parseTextToQuestions: typeof parseTextToQuestions !== 'undefined' ? parseTextToQuestions : undefined,
      parseExamPdfText: typeof parseExamPdfText !== 'undefined' ? parseExamPdfText : undefined,
      parseExtractedText: typeof parseExtractedText !== 'undefined' ? parseExtractedText : undefined,
      parseQuestionBlock: typeof parseQuestionBlock !== 'undefined' ? parseQuestionBlock : undefined,
      cleanExtractedText: typeof cleanExtractedText !== 'undefined' ? cleanExtractedText : undefined,
      detectSubject: typeof detectSubject !== 'undefined' ? detectSubject : undefined,
      POST: typeof POST !== 'undefined' ? POST : undefined,
      ...module.exports
    };
  `;

  vm.runInContext(wrappedCode, sandbox);
  const exp = sandbox.module.exports;
  return exp.parseTextToQuestions || exp.parseExamPdfText || exp.parseExtractedText || exp;
}

const RAW_FIXTURE_TEXT = `
NATIONAL TESTING AGENCY - MOCK EXAMINATION TEST SERIES 2026
SECTION I : COMPREHENSIVE SCIENCE & MATHEMATICS
Time: 180 min | Total Marks: 300 | General Instructions: Read carefully.
----------------------------------------------------------------------
CONFIDENTIAL - DO NOT DISTRIBUTE - ASENTRA EDUCATION PORTAL

Q.1 A uniform solid cylinder of mass M and radius R rolls without slipping down an inclined plane of inclination θ with the horizontal. The acceleration of the center of mass of the cylinder is:
(A) g sin θ
(B) (2/3) g sin θ
(C) (1/2) g sin θ
(D) (3/4) g sin θ
Ans: (B)
Explanation: For a solid cylinder, moment of inertia I = (1/2)MR². Acceleration down an incline without slipping is a = (g sin θ) / (1 + I / MR²) = (g sin θ) / (1 + 1/2) = (2/3) g sin θ.

Page 1 of 5
----------------------------------------------------------------------
CONFIDENTIAL - ASENTRA TEST SERIES

Question 2. Which of the following coordination complexes is diamagnetic and exhibits square planar geometry according to Valence Bond Theory?
(a) [Ni(CN)4]2-   (b) [NiCl4]2-   (c) [CoF6]3-   (d) [Fe(H2O)6]2+
Answer: (a)
Solution: In [Ni(CN)4]2-, Ni is in +2 oxidation state (3d8). CN- is a strong field ligand causing pairing of 3d electrons, resulting in dsp2 hybridization and diamagnetic square planar geometry.

Page 2 of 5
----------------------------------------------------------------------

3. Given below are two statements regarding eukaryotic cellular respiration:
Statement I: Glycolysis occurs in the cytoplasm and does not require molecular oxygen.
Statement II: The complete oxidation of one glucose molecule via the Krebs cycle and oxidative phosphorylation produces net 36 to 38 ATP molecules.
In light of the above statements, choose the most appropriate answer from the options given below:
A. Both Statement I and Statement II are correct
B. Both Statement I and Statement II are incorrect
C. Statement I is correct but Statement II is incorrect
D. Statement I is incorrect but Statement II is correct
Correct Option: A
Explanation: Glycolysis is an anaerobic pathway taking place in the cytosol. Aerobic respiration completes inside mitochondria generating 36-38 ATP per glucose.

Page 3 of 5
----------------------------------------------------------------------

Ques 4: Find the minimum value of f(x) = 2x³ - 9x² + 12x - 5 on the interval [0, 3].
(1) -5
(2) -1
(3) 0
(4) 4
Ans: 1
Explanation: f'(x) = 6x² - 18x + 12 = 6(x-1)(x-2) = 0 at critical points x=1, x=2. f(0) = -5, f(1) = 0, f(2) = -1, f(3) = 4. The absolute minimum on [0,3] is f(0) = -5.

Page 4 of 5
----------------------------------------------------------------------

Q5. In a series LCR circuit connected to an AC source of voltage V = V0 sin(ωt), resonance occurs when the inductive reactance equals the capacitive reactance (XL = XC).
At resonance condition, which of the following statements is FALSE?
[A] The impedance of the circuit is purely resistive and minimum.
[B] The current in the circuit is in phase with the applied voltage.
[C] The power factor of the circuit is zero.
[D] The current amplitude reaches its maximum value.
KEY: C
Solution: At resonance, Z = R (minimum), current is maximum I0 = V0/R, and phase difference φ = 0. Therefore, the power factor cos(φ) = cos(0) = 1, NOT zero. Hence statement [C] is false.

Page 5 of 5
`;

const parse = loadParser();
const results = parse(RAW_FIXTURE_TEXT);
console.log('Results length:', results.length);
console.log(JSON.stringify(results, null, 2));
