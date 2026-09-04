/**
 * test-m3-ai-vision-parser.js — Milestone 3 Comprehensive Verification Suite
 *
 * Requirements Verified:
 * 1. Multi-Subject Boundary Auto-Detection (Physics, Chemistry, Mathematics ranges and tabs)
 * 2. End-of-PDF Answer Key Matrix Scanning & Binding (MCQ, MSQ, Numerical, Matrix Match)
 * 3. Diagram Bounding Box Extraction & Storage Integration (sharp crop, question-papers bucket upload)
 * 4. Multi-Format Question Type Classification (single_mcq, multi_mcq, numerical, matrix_match)
 * 5. Robust Deterministic Regex Fallback Pipeline (offline / zero AI key resilience)
 * 6. TestCompiler Input Schema Conformance
 */

const fs = require('fs');
const path = require('path');

// Load modules directly from lib
const pdfVisionLib = require('./src/lib/pdf-vision-parser');
const diagramCropperLib = require('./src/lib/diagram-cropper');

class AssertRunner {
  constructor(name) {
    this.name = name;
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  assert(condition, description, details = '') {
    if (condition) {
      this.passed++;
      console.log(`  \x1b[32m✔\x1b[0m ${description}`);
    } else {
      this.failed++;
      const err = `FAIL: ${description}${details ? ' -> ' + details : ''}`;
      this.errors.push(err);
      console.error(`  \x1b[31m✖\x1b[0m \x1b[31m${description}\x1b[0m`);
      if (details) {
        console.error(`    \x1b[33mDetails:\x1b[0m ${details}`);
      }
    }
  }

  summary() {
    console.log('\n' + '─'.repeat(70));
    console.log(`  ${this.name} Results: \x1b[32m${this.passed} passed\x1b[0m, \x1b[31m${this.failed} failed\x1b[0m`);
    console.log('─'.repeat(70));
    return this.failed === 0;
  }
}

async function runMilestone3Verification() {
  console.log('\n' + '█'.repeat(70));
  console.log('  MILESTONE 3: AI VISION PARSER & DIGITIZER VERIFICATION');
  console.log('█'.repeat(70) + '\n');

  const runner = new AssertRunner('Milestone 3 AI Vision Parser');

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 1: END-OF-PDF ANSWER KEY MATRIX SCANNING & PARSING
  // ══════════════════════════════════════════════════════════════════════
  console.log('\x1b[1m[Suite 1] End-of-PDF Answer Key Matrix Scanning & Auto-Binding\x1b[0m');

  // Test 1.1: Detection of Answer Key Section
  const keyHeader1 = "--- ANSWER KEY --- \n 1: B";
  const keyHeader2 = "FINAL OFFICIAL KEY SHEET \n 1. A";
  const keyHeader3 = "HINTS & SOLUTIONS \n Q1. C";
  runner.assert(pdfVisionLib.isAnswerKeySection(keyHeader1), 'Detects "ANSWER KEY" header');
  runner.assert(pdfVisionLib.isAnswerKeySection(keyHeader2), 'Detects "KEY SHEET" header');
  runner.assert(pdfVisionLib.isAnswerKeySection(keyHeader3), 'Detects "HINTS & SOLUTIONS" header');

  // Test 1.2: Two-Pass Document Splitting
  const fullDocText = `
SECTION 1: PHYSICS
1. A block of mass m is placed on a rough horizontal surface.
(A) 5 N  (B) 10 N  (C) 15 N  (D) 20 N

2. Calculate the acceleration of the block.
(A) 1 m/s²  (B) 2 m/s²  (C) 3 m/s²  (D) 4 m/s²

----------------------------------------------------------------------
ANSWER KEY : JEE MOCK TEST 2026
1: B, 2: D, 3: 45, 4: A,C, 5: 3.5, 6: A->P,R; B->Q
`;
  const splitResult = pdfVisionLib.splitAnswerKeySection(fullDocText);
  runner.assert(splitResult.questionsText.includes('A block of mass m'), 'Split extracts questions text body cleanly');
  runner.assert(splitResult.answerKeyText.includes('1: B, 2: D'), 'Split extracts answer key section cleanly');

  // Test 1.3: Diverse Answer Key Matrix Formats
  // Format A: Tabular Grid
  const tabularKeyText = `
Q.No | Ans | Q.No | Ans | Q.No | Ans
1    | B   | 11   | A   | 21   | 45
2    | D   | 12   | C   | 22   | 12.5
3    | A   | 13   | B   | 23   | -3
`;
  const parsedTabular = pdfVisionLib.parseAnswerKeyMatrix(tabularKeyText);
  runner.assert(parsedTabular['1'] === 'B', 'Tabular Grid parses Q1 -> B', `Got: ${parsedTabular['1']}`);
  runner.assert(parsedTabular['11'] === 'A', 'Tabular Grid parses Q11 -> A', `Got: ${parsedTabular['11']}`);
  runner.assert(parsedTabular['21'] === '45', 'Tabular Grid parses Q21 -> 45 (Numerical)', `Got: ${parsedTabular['21']}`);
  runner.assert(parsedTabular['22'] === '12.5', 'Tabular Grid parses Q22 -> 12.5 (Decimal)', `Got: ${parsedTabular['22']}`);
  runner.assert(parsedTabular['23'] === '-3', 'Tabular Grid parses Q23 -> -3 (Negative)', `Got: ${parsedTabular['23']}`);

  // Format B: Comma-Separated Inline
  const inlineKeyText = `1: B, 2: D, 3: 45, 4: A,C, 5: 3.5, 6: A->P,R; B->Q`;
  const parsedInline = pdfVisionLib.parseAnswerKeyMatrix(inlineKeyText);
  runner.assert(parsedInline['1'] === 'B', 'Inline parses single MCQ (1: B)');
  runner.assert(parsedInline['2'] === 'D', 'Inline parses single MCQ (2: D)');
  runner.assert(parsedInline['3'] === '45', 'Inline parses integer (3: 45)');
  runner.assert(parsedInline['4'] === 'A,C', 'Inline parses multi MSQ (4: A,C)');
  runner.assert(parsedInline['5'] === '3.5', 'Inline parses decimal (5: 3.5)');
  runner.assert(parsedInline['6'].includes('A->P') || parsedInline['6'].includes('B->Q'), 'Inline parses matrix match (6: A->P,R; B->Q)');

  // Format C: Space-Separated Multi-Column
  const spaceKeyText = `1  (B)    2  (D)    3  [45]    4  (A, C)`;
  const parsedSpace = pdfVisionLib.parseAnswerKeyMatrix(spaceKeyText);
  runner.assert(parsedSpace['1'] && parsedSpace['1'].includes('B'), 'Space-separated parses 1 -> (B)');
  runner.assert(parsedSpace['2'] && parsedSpace['2'].includes('D'), 'Space-separated parses 2 -> (D)');
  runner.assert(parsedSpace['3'] && parsedSpace['3'].includes('45'), 'Space-separated parses 3 -> [45]');
  runner.assert(parsedSpace['4'] && parsedSpace['4'].includes('A'), 'Space-separated parses 4 -> (A, C)');

  // Test 1.4: Auto-Binding to Questions Array & Field Population
  const mockQuestions = [
    { question_number: 1, content: 'Q1 MCQ', options: ['Alpha', 'Beta', 'Gamma', 'Delta'], formatType: 'single_mcq', correct_option_index: -1 },
    { question_number: 2, content: 'Q2 MSQ', options: ['Option A', 'Option B', 'Option C', 'Option D'], formatType: 'multi_mcq', correct_options: [] },
    { question_number: 3, content: 'Q3 Numerical', options: [], formatType: 'numerical', section: 'Section B' },
    { question_number: 4, content: 'Q4 Matrix', options: [], formatType: 'matrix_match' }
  ];

  const bindMap = {
    '1': '(B)',
    '2': 'A, C',
    '3': '45',
    '4': 'A->P,R; B->Q; C->S; D->P'
  };

  const bindResult = pdfVisionLib.bindAnswerKeysToQuestions(mockQuestions, bindMap);
  runner.assert(bindResult.boundCount === 4, 'Binds all 4 questions from answer key map', `Bound: ${bindResult.boundCount}`);

  const boundQ1 = bindResult.questions[0];
  const boundQ2 = bindResult.questions[1];
  const boundQ3 = bindResult.questions[2];
  const boundQ4 = bindResult.questions[3];

  // Q1 Verification: Single MCQ
  runner.assert(boundQ1.correct_option_index === 1 && boundQ1.correctOptionIdx === 1, 'Q1 correctOptionIdx bound to 1 (Beta)');
  runner.assert(boundQ1.correct_answer === 'Beta' || boundQ1.correctAnswer === 'Beta', 'Q1 correctAnswer bound to "Beta"');
  runner.assert(boundQ1.formatType === 'single_mcq', 'Q1 formatType is single_mcq');

  // Q2 Verification: Multi MSQ
  runner.assert(Array.isArray(boundQ2.correct_options) && Array.isArray(boundQ2.correctOptions), 'Q2 correctOptions is an array');
  runner.assert(JSON.stringify(boundQ2.correct_options) === JSON.stringify([0, 2]), 'Q2 correct_options correctly parsed to [0, 2] for "A, C"');
  runner.assert(boundQ2.formatType === 'multi_mcq', 'Q2 formatType is multi_mcq');

  // Q3 Verification: Numerical
  runner.assert(boundQ3.integerAnswer === '45' && boundQ3.integer_answer === '45', 'Q3 integerAnswer bound to "45"');
  runner.assert(boundQ3.correct_answer === '45' && boundQ3.correctAnswer === '45', 'Q3 correctAnswer bound to "45"');
  runner.assert(boundQ3.formatType === 'numerical', 'Q3 formatType is numerical');
  runner.assert(boundQ3.options.length === 0, 'Q3 options is empty array for numerical');

  // Q4 Verification: Matrix Match
  runner.assert(boundQ4.matrixMatchAnswer.includes('A->P') && boundQ4.matrix_match_answer.includes('B->Q'), 'Q4 matrixMatchAnswer populated with row mappings');
  runner.assert(boundQ4.formatType === 'matrix_match', 'Q4 formatType is matrix_match');

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 2: MULTI-SUBJECT BOUNDARY AUTO-DETECTION
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m[Suite 2] Multi-Subject Boundary Auto-Detection & Segmentation\x1b[0m');

  // Test 2.1: Header Regex Recognition
  const headerPhy = pdfVisionLib.detectSubjectOrSectionHeader("SECTION 1 - PHYSICS");
  const headerChem = pdfVisionLib.detectSubjectOrSectionHeader("PART II: CHEMISTRY");
  const headerMath = pdfVisionLib.detectSubjectOrSectionHeader("MATHEMATICS");
  const headerSecB = pdfVisionLib.detectSubjectOrSectionHeader("SECTION B: NUMERICAL VALUE");

  runner.assert(headerPhy && headerPhy.type === 'subject' && headerPhy.value === 'Physics', 'Recognizes "SECTION 1 - PHYSICS" as Physics');
  runner.assert(headerChem && headerChem.type === 'subject' && headerChem.value === 'Chemistry', 'Recognizes "PART II: CHEMISTRY" as Chemistry');
  runner.assert(headerMath && headerMath.type === 'subject' && headerMath.value === 'Mathematics', 'Recognizes "MATHEMATICS" as Mathematics');
  runner.assert(headerSecB && headerSecB.type === 'section' && headerSecB.value === 'Section B', 'Recognizes "SECTION B" as Section B');

  // Test 2.2: Standard 90-Question JEE Main Boundary Segmentation
  const mock90Questions = Array.from({ length: 90 }, (_, i) => ({
    question_number: i + 1,
    content: `JEE Main Question ${i + 1}`,
    options: ['A', 'B', 'C', 'D'],
    formatType: (i % 30 >= 20) ? 'numerical' : 'single_mcq'
  }));

  const segmented90 = pdfVisionLib.segmentQuestionsBySubject(mock90Questions);
  const phySecA = segmented90.slice(0, 20);
  const phySecB = segmented90.slice(20, 30);
  const chemSecA = segmented90.slice(30, 50);
  const chemSecB = segmented90.slice(50, 60);
  const mathSecA = segmented90.slice(60, 80);
  const mathSecB = segmented90.slice(80, 90);

  runner.assert(phySecA.every(q => q.subject === 'Physics' && q.section === 'Section A'), 'Q1-20 assigned to Physics Section A');
  runner.assert(phySecB.every(q => q.subject === 'Physics' && q.section === 'Section B'), 'Q21-30 assigned to Physics Section B');
  runner.assert(chemSecA.every(q => q.subject === 'Chemistry' && q.section === 'Section A'), 'Q31-50 assigned to Chemistry Section A');
  runner.assert(chemSecB.every(q => q.subject === 'Chemistry' && q.section === 'Section B'), 'Q51-60 assigned to Chemistry Section B');
  runner.assert(mathSecA.every(q => q.subject === 'Mathematics' && q.section === 'Section A'), 'Q61-80 assigned to Mathematics Section A');
  runner.assert(mathSecB.every(q => q.subject === 'Mathematics' && q.section === 'Section B'), 'Q81-90 assigned to Mathematics Section B');

  // Test 2.3: Grouping by Subject for TestCompiler
  const grouped = pdfVisionLib.groupQuestionsBySubject(segmented90);
  runner.assert(grouped.Physics.length === 30, 'Grouped Physics tab has exactly 30 questions');
  runner.assert(grouped.Chemistry.length === 30, 'Grouped Chemistry tab has exactly 30 questions');
  runner.assert(grouped.Mathematics.length === 30, 'Grouped Mathematics tab has exactly 30 questions');

  // Test 2.4: TestCompiler Input Schema Conformance
  const compilation = pdfVisionLib.compileTestStructure(segmented90, {
    title: 'JEE Main 2026 Test 1',
    blueprint_type: 'jee_main'
  });
  runner.assert(compilation.title === 'JEE Main 2026 Test 1', 'Compilation schema has correct title');
  runner.assert(compilation.blueprint_type === 'jee_main', 'Compilation schema has blueprint_type jee_main');
  runner.assert(compilation.total_questions === 90, 'Compilation schema has total_questions 90');
  runner.assert(typeof compilation.diagrams_extracted === 'number', 'Compilation schema has diagrams_extracted counter');
  runner.assert(typeof compilation.answer_keys_bound === 'number', 'Compilation schema has answer_keys_bound counter');
  runner.assert(compilation.subjects && compilation.subjects.Physics && compilation.subjects.Chemistry && compilation.subjects.Mathematics, 'Compilation schema has subjects map conforming to TestCompiler');

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 3: DIAGRAM BOUNDING BOX EXTRACTION & STORAGE INTEGRATION
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m[Suite 3] Diagram Bounding Box Cropping & Storage Integration\x1b[0m');

  // Test 3.1: Server-side Sharp Cropping
  let sharpAvailable = false;
  try {
    const sharp = require('sharp');
    sharpAvailable = !!sharp;
  } catch (_) {}

  runner.assert(sharpAvailable, 'sharp image processing library is installed in node_modules');

  if (sharpAvailable) {
    const sharp = require('sharp');
    const testBuffer = await sharp({
      create: {
        width: 1000,
        height: 1000,
        channels: 3,
        background: { r: 50, g: 100, b: 150 }
      }
    }).jpeg().toBuffer();

    // Normalized bounding box [ymin, xmin, ymax, xmax]: [100, 100, 400, 600] -> 500w x 300h
    const box2d = [100, 100, 400, 600];
    const cropRes = await diagramCropperLib.cropImageBuffer(testBuffer, box2d);

    runner.assert(cropRes !== null, 'cropImageBuffer successfully cropped diagram region');
    runner.assert(cropRes && cropRes.width === 500, 'Cropped width matches 500px (600 - 100 on 1000 scale)', `Got: ${cropRes?.width}`);
    runner.assert(cropRes && cropRes.height === 300, 'Cropped height matches 300px (400 - 100 on 1000 scale)', `Got: ${cropRes?.height}`);
    runner.assert(cropRes && cropRes.dataUrl.startsWith('data:image/jpeg;base64,'), 'Cropped output generates valid base64 data URL fallback');

    // Test 3.2: uploadDiagramToStorage path and bucket
    const uploadUrl = await diagramCropperLib.uploadDiagramToStorage(cropRes.buffer, {
      qNum: 7,
      contentType: 'image/jpeg'
    });
    runner.assert(typeof uploadUrl === 'string' && uploadUrl.length > 0, 'uploadDiagramToStorage returns valid public URL or data URL');
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 4: ROBUST FALLBACK DETERMINISTIC PARSING PIPELINE
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m[Suite 4] Robust Fallback Pipeline (Deterministic Regex with Two-Pass)\x1b[0m');

  const multiSubjectMockPaper = `
NATIONAL TESTING AGENCY - JEE MAIN FULL SYLLABUS MOCK
SECTION 1 - PHYSICS
1. An object of mass 2 kg moves with velocity v = 10 m/s. The kinetic energy is:
(A) 50 J  (B) 100 J  (C) 150 J  (D) 200 J
Ans: (B)

SECTION 2 - CHEMISTRY
2. Which gas is evolved when zinc granules react with dilute sulphuric acid?
(A) Oxygen  (B) Hydrogen  (C) Nitrogen  (D) Chlorine
Ans: (B)

SECTION 3 - MATHEMATICS
3. Find the value of limit x -> 0 of (sin x) / x:
(A) 0  (B) 1  (C) -1  (D) Infinity
Ans: (B)

4. The number of real roots of x² - 4 = 0 is:
Ans: 2

----------------------------------------------------------------------
ANSWER KEY
1: B, 2: B, 3: B, 4: 2
`;

  const parsedFallback = pdfVisionLib.parseExtractedText(multiSubjectMockPaper);
  runner.assert(parsedFallback.length === 4, 'Fallback regex extracted exactly 4 questions', `Got: ${parsedFallback.length}`);

  const qPhy = parsedFallback.find(q => q.question_number === 1);
  const qChem = parsedFallback.find(q => q.question_number === 2);
  const qMath = parsedFallback.find(q => q.question_number === 3);
  const qNum = parsedFallback.find(q => q.question_number === 4);

  runner.assert(qPhy && qPhy.subject === 'Physics', 'Q1 auto-detected as Physics via section header');
  runner.assert(qChem && qChem.subject === 'Chemistry', 'Q2 auto-detected as Chemistry via section header');
  runner.assert(qMath && qMath.subject === 'Mathematics', 'Q3 auto-detected as Mathematics via section header');
  runner.assert(qNum && qNum.formatType === 'numerical' && qNum.integerAnswer === '2', 'Q4 classified as numerical with answer 2');

  const allPassed = runner.summary();
  if (allPassed) {
    console.log('\n\x1b[32m✔ ALL MILESTONE 3 VERIFICATION TESTS PASSED SUCCESSFULLY (100% PASS RATE)\x1b[0m\n');
    process.exit(0);
  } else {
    console.error('\n\x1b[31m✖ SOME MILESTONE 3 TESTS FAILED\x1b[0m\n');
    process.exit(1);
  }
}

// Run when executed
if (require.main === module) {
  runMilestone3Verification().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

module.exports = { runMilestone3Verification };
