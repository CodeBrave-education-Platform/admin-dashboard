# Exam Pattern & Test Specification Mining Report

**Agent**: Explorer 2 (Exam Pattern & Test Spec Miner)  
**Date**: 2026-08-15  
**Working Directory**: `D:\admin dashboard\.agents\explorer_survey_patterns`  
**Target Verification Suite**: `test-parser.js` (Node.js test runner)  
**Target API**: `src/app/api/admin/ai/parse-pdf/route.js` & `src/components/UniversalPdfImporterModal.jsx`

---

## 1. Executive Summary & Objective

In Indian competitive examinations (JEE Main/Advanced, NEET-UG, GATE, UPSC, CBSE Board Exams) and university test papers, PDF question documents exhibit vast variations in typographic formatting, option alignment, numbering conventions, mathematical notation, chemical formula syntax, and page layout artifacts.

When PDF extractors (such as `pdfjs-dist` or `pdf-parse`) convert vector PDF streams into raw text, they produce unstructured plain text characterized by:
1. Interleaved page headers, footers, section tags, and watermarks.
2. Flattened multi-column or horizontally placed inline options.
3. Sub-lists (e.g. `Statement I`, `Statement II`, `1.`, `2.`, `(i)`, `(ii)`) inside problem stems that look identical to top-level question numbering.
4. Embedded formulas containing parentheses, brackets, and negative signs that break naive option-splitting regexes (e.g., `[Ni(CN)4]2-`, `sin(2x)`, `-4 m/s²`).
5. Trailing answer key markers (`Ans: B`, `Answer: (3)`, `Correct Option: 1`, `KEY: [D]`) and multi-line step-by-step explanations.

This document specifies:
- **5+ Canonical Exam Patterns** capturing real-world diversity.
- The **Canonical Test Fixture String** with realistic noise to be used by `test-parser.js`.
- The **Strict JSON Output Schema** adhering to the Admin Dashboard Question Bank (`QuestionBankClient.jsx`, `UniversalPdfImporterModal.jsx`).
- An **Edge Case Taxonomy** covering 12 distinct failure modes.
- The **4-Tier Programmatic Assertion Suite** for `test-parser.js`.
- Architectural recommendations comparing Upgraded Regex Engines, LLM APIs, and Hybrid Parsers.

---

## 2. Deep Specification of 5+ Exam Question Patterns

### Pattern 1: Standard Multi-Line Lettered MCQ with Bracketed/Lettered Options
- **Source Archetype**: Standard CBSE / NEET / State CET Physics Paper.
- **Structural Characteristics**:
  - Question stem spans multiple lines with physical quantities, Greek letters ($\theta$), and exponents.
  - Options are arranged vertically on separate lines prefixed with `(A)`, `(B)`, `(C)`, `(D)` or `A.`, `B.`, `C.`, `D.`.
  - Trailing metadata contains explicit `Ans:` tag and `Explanation:` paragraph.
- **Syntax Rule**:
  - Prefix: `(?:^|\n)\s*(?:Q(?:ues(?:tion)?)?\.?\s*)?(\d+)[\.\:\)]`
  - Option Delimiter: `(?:^|\n)\s*[\(\[]?\s*([A-D])\s*[\)\]\.\-\:]\s*(.+)`
  - Answer Tag: `\b(?:Ans(?:wer)?|Key|Correct(?:\s*Option)?)\s*[\:\-\=]?\s*[\(\[]?\s*([A-D])\s*[\)\]]?`

```text
Q.1 A uniform solid cylinder of mass M and radius R rolls without slipping down an inclined plane of inclination θ with the horizontal. The acceleration of the center of mass of the cylinder is:
(A) g sin θ
(B) (2/3) g sin θ
(C) (1/2) g sin θ
(D) (3/4) g sin θ
Ans: (B)
Explanation: For a solid cylinder, moment of inertia I = (1/2)MR². Acceleration down an incline without slipping is a = (g sin θ) / (1 + I / MR²) = (g sin θ) / (1 + 1/2) = (2/3) g sin θ.
```

---

### Pattern 2: Inline / Horizontal Options on Single Line with Chemical Formulas & Brackets
- **Source Archetype**: JEE Advanced / NEET Chemistry Paper (Coordination Chemistry & Inorganic).
- **Structural Characteristics**:
  - Multiple options are laid out on a single line or across two horizontal columns: `(a) ... (b) ... (c) ... (d) ...`.
  - Option text contains internal parentheses `(...)` and brackets `[...]` (e.g. `[Ni(CN)4]2-`, `[Fe(H2O)6]2+`).
  - *Key Challenge*: Regexes using `[^\(\[\n]+` fail catastrophically by truncating at the opening bracket `[` or parenthesis `(`.
- **Syntax Rule**:
  - Lookahead delimiter matching: `(?:\s{2,}|\n|^)[\(\[]?\s*([a-dA-D])\s*[\)\]\.\-]\s+` requiring multi-space or boundary separation between adjacent inline options.

```text
Question 2. Which of the following coordination complexes is diamagnetic and exhibits square planar geometry according to Valence Bond Theory?
(a) [Ni(CN)4]2-   (b) [NiCl4]2-   (c) [CoF6]3-   (d) [Fe(H2O)6]2+
Answer: (a)
Solution: In [Ni(CN)4]2-, Ni is in +2 oxidation state (3d8). CN- is a strong field ligand causing pairing of 3d electrons, resulting in dsp2 hybridization and diamagnetic square planar geometry.
```

---

### Pattern 3: Assertion-Reasoning / Roman Numeral Statement Matching
- **Source Archetype**: UPSC / NTA NEET / AIIMS Biology & General Science.
- **Structural Characteristics**:
  - Question stem embeds sub-items: `Statement I: ...` / `Statement II: ...` or `I. ...`, `II. ...`, `III. ...` or `Assertion (A): ... Reason (R): ...`.
  - Options refer back to statements: `A. Both Statement I and Statement II are correct`, `B. Both are incorrect`, etc.
  - *Key Challenge*: Naive question splitters matching `\d+\.` or `(A)` inside the stem misidentify `Statement I` or `Assertion (A)` as new questions or option markers.
- **Syntax Rule**:
  - Question boundary detection must differentiate top-level sequential question indices from internal Roman numerals (`I`, `II`, `III`, `IV`) and statement headers (`Statement I`, `Assertion (A)`).

```text
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
```

---

### Pattern 4: Unconventional Option Numbering (1), (2), (3), (4) with Negative Numbers & Math
- **Source Archetype**: NTA JEE Main Official Online Test Paper (Mathematics).
- **Structural Characteristics**:
  - Options are numbered with digits: `(1)`, `(2)`, `(3)`, `(4)` or `1.`, `2.`, `3.`, `4.` instead of letters.
  - Options contain signed negative numbers (`-5`, `-1`, `-22/7`), algebraic expressions, or calculus functions.
  - *Key Challenge 1*: The answer key uses numeric index `Ans: 1` which must be mapped to option index `0` (1-based to 0-based conversion).
  - *Key Challenge 2*: `1.`, `2.` lines must not be confused with question numbering.
  - *Key Challenge 3*: Negative signs `-` must not be stripped or treated as option hyphens/bullets.

```text
Ques 4: Find the minimum value of f(x) = 2x³ - 9x² + 12x - 5 on the interval [0, 3].
(1) -5
(2) -1
(3) 0
(4) 4
Ans: 1
Explanation: f'(x) = 6x² - 18x + 12 = 6(x-1)(x-2) = 0 at critical points x=1, x=2. f(0) = -5, f(1) = 0, f(2) = -1, f(3) = 4. The absolute minimum on [0,3] is f(0) = -5.
```

---

### Pattern 5: Bracketed Labels [A]-[D], Mixed Spacing, Trailing KEY & Multi-Paragraph Solutions
- **Source Archetype**: GATE / University Engineering Examination (Electrical / Physics).
- **Structural Characteristics**:
  - Options enclosed in square brackets: `[A]`, `[B]`, `[C]`, `[D]`.
  - Trailing metadata labeled with `KEY:` followed by a multi-sentence explanation with reasoning steps.
  - Interspersed OCR irregularities: multiple trailing spaces, inconsistent indentation, punctuation variations (`Ans.`, `KEY:`, `Solution:`).

```text
Q5. In a series LCR circuit connected to an AC source of voltage V = V0 sin(ωt), resonance occurs when the inductive reactance equals the capacitive reactance (XL = XC).
At resonance condition, which of the following statements is FALSE?
[A] The impedance of the circuit is purely resistive and minimum.
[B] The current in the circuit is in phase with the applied voltage.
[C] The power factor of the circuit is zero.
[D] The current amplitude reaches its maximum value.
KEY: C
Solution: At resonance, Z = R (minimum), current is maximum I0 = V0/R, and phase difference φ = 0. Therefore, the power factor cos(φ) = cos(0) = 1, NOT zero. Hence statement [C] is false.
```

---

### Additional Discovered Pattern: Multi-Column OCR & Header Artifact Interleaving
- **Source Archetype**: Scanned PDF conversion with running header banners and watermark stamps.
- **Structural Characteristics**:
  - Header text: `NATIONAL TESTING AGENCY - JEE PRACTICE MOCK TEST - 2026`
  - Sub-header: `Time: 180 min | Max Marks: 300 | Negative Marking: -1`
  - Watermark: `CONFIDENTIAL - ASENTRA EDUCATION PLATFORM`
  - Page footers: `Page 1 of 5`, `www.nta.ac.in`
  - These lines appear before, between, or after questions and must be stripped cleanly without eating question lines.

---

## 3. Canonical Test Fixture String (`RAW_FIXTURE_TEXT`)

The exact string below is designed as the universal input for `test-parser.js`. It contains all 5 distinct question formats with header/footer/watermark noise:

```javascript
export const RAW_FIXTURE_TEXT = `
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
```

---

## 4. Expected Output Schema & Canonical Data

### 4.1 Schema Definition
Each parsed question returned by the parser must conform to the following object structure:

| Property | Type | Nullable | Description / Rules |
|---|---|---|---|
| `id` | `string` | No | Unique identifier (e.g. `pdf-q-1-1718000000000` or `pdf-q-1`) |
| `subject` | `string` | No | Detected subject (`Physics`, `Chemistry`, `Biology`, `Mathematics`, `General`) |
| `sub_topic` | `string` | No | Topic classifier, default `'General'` |
| `difficulty` | `string` | No | Difficulty level (`'EASY'`, `'MEDIUM'`, `'HARD'`), default `'MEDIUM'` |
| `formatType` | `string` | No | Question format (`'single_mcq'`, `'multiple_mcq'`, `'numerical'`), default `'single_mcq'` |
| `content` | `string` | No | Clean question stem text (header metadata, option labels, and answer keys stripped) |
| `diagram_url` | `string` | No | Diagram image link or empty string `""` |
| `options` | `string[]` | No | Array of exactly 4 cleaned option strings (option prefixes like `(A)`, `1.` removed) |
| `correct_option_index` | `number` | No | 0-based integer index (`0`, `1`, `2`, or `3`) matching the correct option |
| `correct_answer` | `string` | No | Exact string content of `options[correct_option_index]` |
| `explanation` | `string` | No | Extracted solution/explanation text, or empty string `""` |

---

### 4.2 Canonical Parsed JSON Dataset (`EXPECTED_PARSED_OUTPUT`)

```json
[
  {
    "subject": "Physics",
    "formatType": "single_mcq",
    "content": "A uniform solid cylinder of mass M and radius R rolls without slipping down an inclined plane of inclination θ with the horizontal. The acceleration of the center of mass of the cylinder is:",
    "options": [
      "g sin θ",
      "(2/3) g sin θ",
      "(1/2) g sin θ",
      "(3/4) g sin θ"
    ],
    "correct_option_index": 1,
    "correct_answer": "(2/3) g sin θ",
    "explanation": "For a solid cylinder, moment of inertia I = (1/2)MR². Acceleration down an incline without slipping is a = (g sin θ) / (1 + I / MR²) = (g sin θ) / (1 + 1/2) = (2/3) g sin θ."
  },
  {
    "subject": "Chemistry",
    "formatType": "single_mcq",
    "content": "Which of the following coordination complexes is diamagnetic and exhibits square planar geometry according to Valence Bond Theory?",
    "options": [
      "[Ni(CN)4]2-",
      "[NiCl4]2-",
      "[CoF6]3-",
      "[Fe(H2O)6]2+"
    ],
    "correct_option_index": 0,
    "correct_answer": "[Ni(CN)4]2-",
    "explanation": "In [Ni(CN)4]2-, Ni is in +2 oxidation state (3d8). CN- is a strong field ligand causing pairing of 3d electrons, resulting in dsp2 hybridization and diamagnetic square planar geometry."
  },
  {
    "subject": "Biology",
    "formatType": "single_mcq",
    "content": "Given below are two statements regarding eukaryotic cellular respiration:\nStatement I: Glycolysis occurs in the cytoplasm and does not require molecular oxygen.\nStatement II: The complete oxidation of one glucose molecule via the Krebs cycle and oxidative phosphorylation produces net 36 to 38 ATP molecules.\nIn light of the above statements, choose the most appropriate answer from the options given below:",
    "options": [
      "Both Statement I and Statement II are correct",
      "Both Statement I and Statement II are incorrect",
      "Statement I is correct but Statement II is incorrect",
      "Statement I is incorrect but Statement II is correct"
    ],
    "correct_option_index": 0,
    "correct_answer": "Both Statement I and Statement II are correct",
    "explanation": "Glycolysis is an anaerobic pathway taking place in the cytosol. Aerobic respiration completes inside mitochondria generating 36-38 ATP per glucose."
  },
  {
    "subject": "Mathematics",
    "formatType": "single_mcq",
    "content": "Find the minimum value of f(x) = 2x³ - 9x² + 12x - 5 on the interval [0, 3].",
    "options": [
      "-5",
      "-1",
      "0",
      "4"
    ],
    "correct_option_index": 0,
    "correct_answer": "-5",
    "explanation": "f'(x) = 6x² - 18x + 12 = 6(x-1)(x-2) = 0 at critical points x=1, x=2. f(0) = -5, f(1) = 0, f(2) = -1, f(3) = 4. The absolute minimum on [0,3] is f(0) = -5."
  },
  {
    "subject": "Physics",
    "formatType": "single_mcq",
    "content": "In a series LCR circuit connected to an AC source of voltage V = V0 sin(ωt), resonance occurs when the inductive reactance equals the capacitive reactance (XL = XC).\nAt resonance condition, which of the following statements is FALSE?",
    "options": [
      "The impedance of the circuit is purely resistive and minimum.",
      "The current in the circuit is in phase with the applied voltage.",
      "The power factor of the circuit is zero.",
      "The current amplitude reaches its maximum value."
    ],
    "correct_option_index": 2,
    "correct_answer": "The power factor of the circuit is zero.",
    "explanation": "At resonance, Z = R (minimum), current is maximum I0 = V0/R, and phase difference φ = 0. Therefore, the power factor cos(φ) = cos(0) = 1, NOT zero. Hence statement [C] is false."
  }
]
```

---

## 5. Edge Cases & Failure Modes Taxonomy

| ID | Edge Case Category | Input Symptom / Real-World Trigger | Failure Mode in Naive Parser | Required Parser Behavior |
|---|---|---|---|---|
| **E01** | **Header / Watermark Intrusion** | `Page 1 of 5`, `CONFIDENTIAL - NTA`, `Time: 180 min` | Ingested into question stems or creates empty question fragments | Pre-cleaning pipeline strips page numbers, institute watermarks, and exam banners. |
| **E02** | **Sub-List False Boundary** | `Statement I: ... Statement II: ...` or `1. ... 2. ...` in stem | Split into 3-4 broken question fragments | Validate question indices sequentially; ignore `1.`/`2.` inside a stem before options appear. |
| **E03** | **Nested Brackets / Parens in Options** | `(a) [Ni(CN)4]2- (b) [NiCl4]2-` | Regex `[^\(\[\n]+` stops at `[` yielding empty/mutilated option | Delimit by option labels + multi-space lookaheads instead of character class exclusions. |
| **E04** | **Negative Numbers in Options** | `(1) -5 (2) -1 (3) 0` | Strips leading `-` or treats as bullet delimiter | Preserve signed numbers `-` and negative exponents `10^-3`. |
| **E05** | **Digit Option Numbering** | `(1) opt1 (2) opt2 (3) opt3 (4) opt4` | Not recognized as options (only `A-D` supported) | Support `(1)-(4)` and `1.-4.` option sets and map to 0-3 indices. |
| **E06** | **Numeric Answer Keys** | `Ans: 1` or `Ans: (2)` or `Correct Option: 4` | Fails because regex only searches `[A-D]` | Map numeric key `1..4` to `0..3` (`num - 1`). |
| **E07** | **Option Label Leakage** | `(A) g sin θ` | Option stored as `(A) g sin θ` or `A. g sin θ` | Strip `(A)`, `A.`, `[A]`, `(1)` prefixes from stored option string. |
| **E08** | **Answer Marker Leakage** | `Ans: B\nExplanation: ...` appended to Option D | Option D contains `... Ans: B Explanation: ...` | Detect answer and explanation tags and peel them off the option/stem buffers. |
| **E09** | **Hardcoded Empty Explanation** | `route.js` lines 191 & 220 hardcoded `explanation: ''` | Drops explanations even when present in PDF | Capture `Explanation:` or `Solution:` blocks into the `explanation` field. |
| **E10** | **Single Digit Lines Stripped** | `cleanExtractedText` uses `/^\s*\d+\s*$/` | Strips isolated single-digit options (e.g. `0`, `4`) | Only strip isolated numbers if they match isolated page counters, not option lines. |
| **E11** | **Multi-line Option Wrap** | Option text spans across 2 lines before next option label | Second line assigned to question stem or lost | Maintain `currentOptionIdx` state accumulator until next option header is reached. |
| **E12** | **Subject Detection Accuracy** | Keywords like `cylinder`, `current`, `respiration`, `integral` | Misclassified as Mathematics default | Score keyword density across Physics, Chemistry, Biology, Mathematics. |

---

## 6. Architecture & Trade-Off Analysis

In accordance with Acceptance Criteria **R2** and **Agent-as-Judge Verification**:

### Option A: Pure LLM API (e.g., Gemini 2.0 Flash / OpenAI GPT-4o-mini)
- **Pros**:
  - Extremely high natural-language tolerance for unpredictable OCR typos and arbitrary layout shifts.
  - Native JSON schema mode (`response_mime_type: "application/json"`).
- **Cons**:
  - High latency (1.5s - 6.0s per PDF page).
  - API costs scale linearly with pages and active test-takers/admins ($0.15 - $1.00 per 1,000 pages).
  - Network dependency & rate limits (fails in offline/self-hosted environments or when rate-limited).
  - Non-deterministic outputs (hallucinations of missing options or altered math equations).

### Option B: Naive Single-Pass Regex (Current Implementation)
- **Pros**:
  - 0ms latency, zero API cost.
- **Cons**:
  - Fragile: breaks on inline options, Roman numerals, numeric options, and nested brackets.

### Option C: Deterministic Multi-Pass Rule-Based Engine (Recommended Architecture)
- **Architecture**:
  1. **Pass 1: Text Sanitization & Header Filtering** — Removes watermarks, pagination artifacts, and running banners using deterministic negative filters.
  2. **Pass 2: Question Block Segmentation** — Identifies true question anchors (`Q.1`, `Question 2`, `3.`) using ascending numerical sequence validation and option-presence lookaheads.
  3. **Pass 3: Dual-Mode Option Parser** — Evaluates line-based options first; if not found, falls back to lookahead-delimited inline option extraction supporting `(A)-(D)`, `(a)-(d)`, `[A]-[D]`, `(1)-(4)`, and `1.-4.`.
  4. **Pass 4: Metadata & Solution Extraction** — Extracts `Ans:`, `Answer:`, `Correct Option:`, `KEY:`, maps `1-4` or `A-D` to index `0-3`, and extracts `Explanation:` / `Solution:`.
  5. **Pass 5: Keyword-Density Subject Classifier** — Categorizes questions into Physics, Chemistry, Biology, or Mathematics.
- **Pros**:
  - 100% cost-free, < 5ms execution time, zero network dependencies, 100% deterministic, zero hallucination risk.
  - Can optionally provide an LLM fallback toggle (`parserType: 'llm_fallback'`) if an unconventional PDF yields 0 parsed questions.

---

## 7. Multi-Tier Programmatic Verification Suite (`test-parser.js`)

The `test-parser.js` verification suite must execute 4 distinct assertion tiers:

### Tier 1: Sanity & Question Cardinality
- Assert `parsedQuestions.length === 5`.
- Assert every question object has all required keys: `id`, `subject`, `formatType`, `content`, `options`, `correct_option_index`, `correct_answer`, `explanation`.
- Assert `options.length === 4` for all questions.

### Tier 2: Option Mapping & Content Extraction
- **Q1 (Physics)**:
  - `content` contains "uniform solid cylinder" and "rolls without slipping".
  - `options[0]` equals `"g sin θ"`.
  - `options[1]` equals `"(2/3) g sin θ"`.
  - `options[2]` equals `"(1/2) g sin θ"`.
  - `options[3]` equals `"(3/4) g sin θ"`.
- **Q2 (Chemistry Inline)**:
  - `content` contains "coordination complexes is diamagnetic".
  - `options[0]` equals `"[Ni(CN)4]2-"` (asserts square brackets `[...]` are NOT stripped).
  - `options[1]` equals `"[NiCl4]2-"`.
  - `options[2]` equals `"[CoF6]3-"`.
  - `options[3]` equals `"[Fe(H2O)6]2+"`.
- **Q3 (Biology Assertion/Reason)**:
  - `content` includes `"Statement I: Glycolysis occurs"` and `"Statement II: The complete oxidation"`.
  - `options[0]` equals `"Both Statement I and Statement II are correct"`.
- **Q4 (Math Unconventional Options)**:
  - `content` contains `"minimum value of f(x) = 2x³ - 9x² + 12x - 5"`.
  - `options[0]` equals `"-5"` (asserts negative sign `-` preserved).
  - `options[1]` equals `"-1"`.
  - `options[2]` equals `"0"`.
  - `options[3]` equals `"4"`.
- **Q5 (Physics Bracketed Options)**:
  - `content` contains `"series LCR circuit"` and `"resonance occurs"`.
  - `options[0]` starts with `"The impedance of the circuit"`.
  - `options[2]` equals `"The power factor of the circuit is zero."`.

### Tier 3: Answer Key & Explanation Resolution
- **Q1**: `correct_option_index === 1`, `correct_answer === "(2/3) g sin θ"`, `explanation` contains `"moment of inertia I = (1/2)MR²"`.
- **Q2**: `correct_option_index === 0`, `correct_answer === "[Ni(CN)4]2-"`, `explanation` contains `"Ni is in +2 oxidation state"`.
- **Q3**: `correct_option_index === 0`, `correct_answer === "Both Statement I and Statement II are correct"`, `explanation` contains `"Glycolysis is an anaerobic pathway"`.
- **Q4**: `correct_option_index === 0`, `correct_answer === "-5"`, `explanation` contains `"f'(x) = 6x² - 18x + 12"`.
- **Q5**: `correct_option_index === 2`, `correct_answer === "The power factor of the circuit is zero."`, `explanation` contains `"power factor cos(φ) = cos(0) = 1"`.

### Tier 4: Edge Case & Cleanliness Verification
- Assert no question stem contains watermark strings (`"ASENTRA EDUCATION PORTAL"`, `"MOCK EXAMINATION TEST SERIES 2026"`).
- Assert no option string contains unstripped prefixes (e.g. `(A)`, `A.`, `[A]`, `(1)`).
- Assert subjects are correctly assigned: `Physics`, `Chemistry`, `Biology`, `Mathematics`, `Physics`.

---

## 8. Specification Tables

### Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Cleaning | Header/Watermark Stripping | Strips running headers, footers, watermarks | Raw PDF text stream | Cleaned lines | False positives on single-digit lines | `route.js:13-31` |
| 2 | Subject Detection | Keyword Subject Classifier | Matches subject domain via keyword dictionary | Question content string | `'Physics'`, `'Chemistry'`, `'Biology'`, `'Mathematics'` | Falls back to `'Mathematics'` | `route.js:33-43` |
| 3 | Question Segmentation | Sequential Anchor Matcher | Detects question boundaries (`Q1.`, `Question 1:`, `1.`) | Cleaned text | Array of question text chunks | Breaks on statement sub-lists (`1.`, `2.`) | `route.js:159-170` |
| 4 | Option Parsing | Line-by-Line Option Extractor | Matches options on separate lines (`(A)`, `A.`, `(a)`) | Question block | Array of 4 option strings | Fails on numeric `(1)-(4)` options | `route.js:68-88` |
| 5 | Option Parsing | Lookahead Inline Extractor | Matches horizontal options on a single line | Question block | Array of 4 option strings | Truncates on internal `[` or `(` | `route.js:94-118` |
| 6 | Answer Extraction | Answer Marker Normalizer | Extracts `Ans:`, `Answer:`, `KEY:` and maps to index | Question block | `correct_option_index` (0-3) | Only matches `[A-D]`, fails on numbers | `route.js:53-65` |
| 7 | Solution Parsing | Explanation Extractor | Captures `Explanation:` / `Solution:` text | Question block | `explanation` string | Currently hardcoded to `''` in route | `route.js:191,220` |
| 8 | UI Ingestion | Importer Review Modal | Visual modal with editable KaTeX math & diagram preview | Parsed question array | Ingested Question Bank entries | Discards unselected questions | `UniversalPdfImporterModal.jsx` |

### Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---|---|---|
| 1 | Cleaning | `42` (single number option on line) | Removed by `cleanExtractedText` as page counter |
| 2 | Question Splitter | `Q1. Statements: \n 1. Velocity... \n 2. Acceleration...` | Split into 3 separate question objects |
| 3 | Inline Option Extractor | `(a) [Ni(CN)4]2- (b) [NiCl4]2-` | Truncates at `[` giving empty or corrupted option |
| 4 | Numeric Option Extractor | `(1) -5 \n (2) -1 \n (3) 0 \n (4) 4` | Options ignored; falls back to `Option A..D` placeholder |
| 5 | Answer Key Extractor | `Ans: 1` | Not detected because regex expects `[A-Da-d]` |
| 6 | Explanation Extractor | `Explanation: Since battery is disconnected...` | Discarded; returns empty string in API response |
| 7 | Watermark Filter | `--- ASENTRA EDUCATION PORTAL ---` | Leaks into the first question stem |
| 8 | Formula Parsing | `sin(2x) + cos(3x)` | Truncates on `(` in naive regex |

---
