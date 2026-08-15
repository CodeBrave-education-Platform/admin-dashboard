// Test additional failure modes of current parser

const { execSync } = require('child_process');

const failureCases = [
  {
    name: 'Case A: Internal numbered statements (1. 2. 3.) inside Question',
    text: `
Q1. Match the following:
1. Photosynthesis
2. Respiration
3. Transpiration
Choose the correct code:
(A) 1-a, 2-b, 3-c
(B) 1-b, 2-c, 3-a
(C) 1-c, 2-a, 3-b
(D) 1-a, 2-c, 3-b
Answer: A
`
  },
  {
    name: 'Case B: Isolated line numbers in raw extracted text (e.g. page numbers or question numbers on separate line)',
    text: `
1
What is the SI unit of electric current?
(A) Volt
(B) Ampere
(C) Ohm
(D) Watt
Answer: B

2
Which gas is evolved during photosynthesis?
(A) Oxygen
(B) Carbon dioxide
(C) Nitrogen
(D) Hydrogen
Ans: A
`
  },
  {
    name: 'Case C: Multi-column options on same line without parentheses e.g. "A. 10 m/s   B. 20 m/s   C. 30 m/s   D. 40 m/s"',
    text: `
Q1. A car travels 100 m in 5 seconds. Find average speed.
A. 10 m/s    B. 20 m/s    C. 30 m/s    D. 40 m/s
Ans: B
`
  },
  {
    name: 'Case D: Options containing parentheses e.g. "(A) f(x) = (x+1)/(x-1) (B) f(x) = sqrt(x) (C) f(x) = ln(x) (D) f(x) = exp(x)"',
    text: `
Q1. Which function is continuous on R?
(A) f(x) = (x+1)/(x-1)
(B) f(x) = sqrt(x)
(C) f(x) = sin(x)
(D) f(x) = tan(x)
Answer: C
`
  },
  {
    name: 'Case E: Answer key given in separate section at the bottom of exam paper',
    text: `
1. What is the unit of force?
(A) Joule (B) Newton (C) Pascal (D) Watt

2. What is the unit of power?
(A) Joule (B) Newton (C) Pascal (D) Watt

ANSWER KEY:
1: B
2: D
`
  }
];

// Let's test with the current parser code
const fs = require('fs');
const testScript = fs.readFileSync('D:/admin dashboard/.agents/explorer_survey_codebase/test_current_parser.js', 'utf8');

// extract parseExtractedText function
eval(testScript.split('// 5 Diverse Question Formats')[0]);

failureCases.forEach((tc) => {
  console.log(`\n========================================`);
  console.log(`TESTING ${tc.name}`);
  console.log(`========================================`);
  const res = parseExtractedText(tc.text);
  console.log(`Extracted ${res.length} questions:`);
  res.forEach((q, i) => {
    console.log(`  [${i+1}] ID: ${q.id}, Content: "${q.content.replace(/\n/g, ' ')}"`);
    console.log(`      Options:`, q.options);
    console.log(`      Correct Answer:`, q.correct_answer, `(Index: ${q.correct_option_index})`);
  });
});
