# PDF Parser Test Infrastructure & Verification Architecture

## 1. Executive Summary

This document specifies the test harness, programmatic runner, and verification architecture for the Admin Dashboard PDF Exam Parser (`src/app/api/admin/ai/parse-pdf/route.js`).

The test suite is implemented in `test-parser.js` as a standalone, zero-dependency Node.js programmatic test runner designed to verify 100% extraction accuracy across diverse, complex Indian competitive examination formats (JEE Main/Advanced, NEET-UG, CBSE, GATE, UPSC).

---

## 2. Test Execution Command

The test harness is fully self-contained and executable in any Node.js 18+ / 20+ / 24+ environment:

```bash
# Run the standalone programmatic test runner
node test-parser.js
```

### Exit Codes
- `0`: All assertion tiers (Tier 1 through Tier 5) passed with zero errors.
- `1`: One or more assertions failed (detailed error trace printed to stderr/stdout).

---

## 3. Architecture of `test-parser.js`

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           test-parser.js                                │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Canonical Raw Fixture (`RAW_FIXTURE_TEXT`)                           │
│    - 5 complex exam formats + headers + footers + watermarks            │
├─────────────────────────────────────────────────────────────────────────┤
│ 2. Resilient Engine Loader (`loadParserEngine`)                         │
│    - Strategy 1: Dynamic ESM Import (`import(...)`)                     │
│    - Strategy 2: Sandboxed Node VM execution with Next.js polyfills    │
│    - Strategy 3: Mock `POST(request)` FormData API handler wrapper      │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. Multi-Tier Assertion Engine (`TestSuite`)                            │
│    - Tier 1: Sanity & Question Cardinality                              │
│    - Tier 2: Option Array Integrity & Formatting                        │
│    - Tier 3: Mathematical & Chemical Content Fidelity                  │
│    - Tier 4: Answer Resolution & Metadata Accuracy                      │
│    - Tier 5: Adversarial Boundary & Stress Testing                      │
├─────────────────────────────────────────────────────────────────────────┤
│ 4. Structured Progress & Summary Reporter                               │
│    - Color-coded real-time checkmarks (✔ / ✖)                           │
│    - Tier-by-tier metrics and failure diagnostics                       │
│    - Deterministic exit code generation (0 or 1)                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Strategy Parser Loader

Because Next.js App Router route files (`route.js`) utilize ES Module syntax (`import { NextResponse } from 'next/server'`) inside packages that may not have `"type": "module"` set in `package.json`, `test-parser.js` embeds a multi-strategy dynamic loader:

1. **Native Dynamic Import**: Attempts to import the module via `import('file:///...')`.
2. **Sandboxed Node.js VM Evaluation**: If direct ESM import fails due to Next.js runtime specifiers, `test-parser.js` safely compiles and runs the route code inside a sandboxed `vm.createContext()` with:
   - Polyfilled `NextResponse` via `require('next/server')`
   - Polyfilled `global` and `globalThis` objects
   - Automated export harvesting for `parseTextToQuestions`, `parseExamPdfText`, `parseExtractedText`, or `POST`.
3. **HTTP / FormData Wrapper**: If the file only exports `POST`, the loader constructs a mock Next.js `Request` with `formData()` and extracts the JSON response.

---

## 5. Specification of 5 Canonical Exam Patterns in `RAW_FIXTURE_TEXT`

| Pattern | Archetype | Unique Structural Features Tested | Edge Cases Covered |
|---|---|---|---|
| **Pattern 1** | Standard Vertical MCQ (CBSE/NEET Physics) | Multi-line physics stem with Greek characters ($\theta$), vertical options `(A)`-`(D)`, `Ans: (B)`, multi-line `Explanation:`. | Verifies question on same line as `Q.1`, prevents Option D swallowing `Explanation:`. |
| **Pattern 2** | Inline Horizontal Options (JEE Chemistry) | Horizontal options on a single line `(a)... (b)... (c)... (d)...`, coordination complexes `[Ni(CN)4]2-`. | Ensures regex does NOT truncate options at `[` or `(` inside chemical formulas. |
| **Pattern 3** | Multi-Statement Biology (UPSC/NEET) | Question stem embeds `Statement I:` and `Statement II:`, lettered options `A.`-`D.`, `Correct Option: A`. | Prevents question splitter from treating `Statement I` / `II` as separate questions. |
| **Pattern 4** | Numeric Options & Negative Numbers (NTA JEE Math) | Digit options `(1)`, `(2)`, `(3)`, `(4)`, signed negative numbers `-5`, `-1`, numeric answer key `Ans: 1`. | Preserves leading minus signs `-`, converts 1-based numeric answer to 0-based index `0`. |
| **Pattern 5** | Bracketed Labels & Multi-Sentence Solution (GATE Engineering) | Bracketed options `[A]`-`[D]`, `KEY: C`, multi-sentence `Solution:` paragraph with formula derivations. | Prevents Option D from swallowing `KEY: C` and `Solution:`, assigns `Physics`. |

---

## 6. Assertion Tiers & Validation Rules

### Tier 1: Sanity Check & Question Cardinality
- Assert parser result is an `Array`.
- Assert `questions.length === 5`.
- Assert all question objects contain required contract keys: `content`, `options`, `correct_option_index`, `correct_answer`, `explanation`, `subject`.
- Assert each `content` stem is a non-empty string (>10 chars).

### Tier 2: Option Array Integrity & Formatting
- Assert `options` is an `Array` with `options.length === 4` for every question.
- Assert every option is a non-empty string.
- Assert no option contains placeholder text (`Option A`, `Option Placeholder`).
- Assert option label prefixes (`(A)`, `(a)`, `[A]`, `(1)`, `1.`) are cleanly stripped from option values.

### Tier 3: Mathematical & Chemical Content Fidelity
- Assert Q1 preserves Greek symbols (`θ`) and fractional formulas (`(2/3) g sin θ`).
- Assert Q2 preserves square brackets and coordination chemistry formulas (`[Ni(CN)4]2-`, `[NiCl4]2-`, `[CoF6]3-`, `[Fe(H2O)6]2+`).
- Assert Q3 stem contains both `Statement I` and `Statement II` without premature splitting.
- Assert Q4 options preserve negative numbers (`-5`, `-1`, `0`, `4`).
- Assert Option D across all questions is completely clean of leaked `Ans:`, `KEY:`, `Correct Option:`, `Explanation:`, and `Solution:` tags.
- Assert all question stems and options are free of watermark banners and pagination noise (`CONFIDENTIAL`, `ASENTRA EDUCATION PORTAL`, `Page X of Y`).

### Tier 4: Answer Resolution & Metadata Accuracy
- Assert `correct_option_index` is an integer in range `[0, 3]`:
  - Q1: `1` (Option B)
  - Q2: `0` (Option A)
  - Q3: `0` (Option A)
  - Q4: `0` (Option 1 mapped from `Ans: 1`)
  - Q5: `2` (Option C mapped from `KEY: C`)
- Assert `correct_answer` matches the extracted option text.
- Assert `explanation` captures the full solution text (not empty `""`).
- Assert `subject` is accurately classified:
  - Q1: `Physics`
  - Q2: `Chemistry`
  - Q3: `Biology`
  - Q4: `Mathematics`
  - Q5: `Physics`

### Tier 5: Adversarial Boundary & Stress Testing
- Assert empty input `""` returns `[]` without throwing exceptions.
- Assert noise-only document (headers/watermarks only) returns 0 questions without false positive fragments.
