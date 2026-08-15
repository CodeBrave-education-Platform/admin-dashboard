# Handoff Report — Explorer 1 (Codebase & Parser Explorer)

**Recipient:** Project Orchestrator / Implementer Agent  
**Date:** 2026-08-15  
**Working Directory:** `D:\admin dashboard\.agents\explorer_survey_codebase`  

---

## 1. Observation

### Codebase Architecture & File Mapping
- **Next.js & React Framework:** `package.json` (lines 11–30) defines Next.js `16.2.6`, React `19.2.4`, `@google/genai` `^2.16.0`, `pdf-parse` `^2.4.5`, `@supabase/supabase-js` `^2.106.2`, and `katex` `^0.18.1`.
- **Primary Backend Extraction Route:** `src/app/api/admin/ai/parse-pdf/route.js` (lines 13–299) exposes a Next.js `POST` route handling `rawText` and returning `{ success, parserType, questions_count, questions }`.
- **Primary Frontend Importer Modal:** `src/components/UniversalPdfImporterModal.jsx` (lines 8–476) is used across four admin modules:
  - `src/app/admin/questions/QuestionBankClient.jsx` (lines 526–546)
  - `src/app/admin/test-series/compiler/CompilerClient.jsx` (lines 675–694)
  - `src/components/TestCompiler.jsx` (lines 891–910)
  - `src/app/admin/courses/CourseStudioClient.jsx` (lines 425–431)
- **Database Schema & Question Ingestion:**
  - Supabase `questions` table schema in `src/app/admin/questions/QuestionBankClient.jsx` (lines 96–118) stores `{ id, subject, topic, formatType, difficulty, questionText, diagramUrl, options, correctAnswer, explanation }`.
  - Supabase `test_questions` table schema in `src/app/admin/test-series/compiler/CompilerClient.jsx` (lines 192–203) stores `{ subject, sub_topic, difficulty, content, options, correct_option_index }`.

### Empirical Parser Verification & Failure Observations
Running the current parser in `src/app/api/admin/ai/parse-pdf/route.js` against 5 representative exam formats (`.agents/explorer_survey_codebase/test_current_parser.js` & `test_failure_cases.js`) demonstrated the following concrete failures:
1. **Option D Content Pollution:** In Question 1, Option D captured `'50 J Answer: (A) Explanation: KE = 1/2 * m * v^2 = 0.5 * 5 * 100 = 250 J.'` because `ansRegex` (`route.js:53`) failed on bracketed `(A)` and `options[currentOptionIdx] += ' ' + trimmedLine` (`route.js:84`) treated answer and explanation lines as option text.
2. **Numeric Option Failure:** In Question 2 with options `(1) Ribosome (2) Mitochondria (3) Nucleus (4) Golgi apparatus`, the parser returned placeholder options `['Option A', 'Option B', 'Option C', 'Option D']` because regexes at `route.js:68` and `route.js:94` only match `(A|B|C|D)`.
3. **Internal Number List Splitting:** In multi-statement questions (e.g. matching items `1. Photosynthesis`, `2. Respiration`), `questionRegex` (`route.js:159`) matched each statement item as an independent question, turning 1 question into 4 malformed fragments.
4. **Digit-Only Line Deletion:** `cleanExtractedText` (`route.js:21`) deleted isolated single-digit lines (`/^\s*\d+\s*$/`), preventing question extraction when question numbers appear on separate lines.
5. **No Explanation Extraction:** `parseQuestionBlock` (`route.js:45–151`) contains no logic to extract `Explanation:` or `Solution:` blocks, leaving `explanation: ''` empty for all questions.

---

## 2. Logic Chain

1. **Premise 1:** The user request (`ORIGINAL_REQUEST.md`) requires extracting questions, options, and correct answers from complex exam PDFs with zero missed questions and correct option mapping, validated by a Node.js test script `test-parser.js`.
2. **Premise 2:** As observed in `src/app/api/admin/ai/parse-pdf/route.js`, the current parsing logic is a single-pass regex algorithm with restrictive regex constraints (`[A-Da-d]` only, lack of bracket matching in `ansRegex`, no explanation state, and no lookahead).
3. **Premise 3:** An LLM-only approach would introduce external API dependencies (`GEMINI_API_KEY`), per-document financial costs, rate limit risks, and network latency (5-15s per upload), whereas a deterministic state machine parser executes in <5ms at $0 cost and runs reliably in offline test scripts.
4. **Conclusion:** The optimal solution is to rewrite `src/app/api/admin/ai/parse-pdf/route.js` into an **Upgraded Multi-Pass Deterministic / State Machine Parser** (with optional Google GenAI fallback when an API key is present) and update `UniversalPdfImporterModal.jsx` layout extraction.

---

## 3. Caveats

- **Network-Restricted Environments:** The parser test suite `test-parser.js` will run in offline environments; therefore, the deterministic parser must not depend on network calls or external APIs for core test verification.
- **Image-Only PDFs:** Scanned or image-only PDFs without an OCR text layer cannot be parsed via text regex without OCR preprocessing. The UI modal already has fallback notices for image-based PDFs.
- **No Source Code Changes Made:** As an Explorer, no modifications were made to `src/` files. All test scripts were kept strictly inside `.agents/explorer_survey_codebase/`.

---

## 4. Conclusion

The PDF parsing architecture centers on `src/app/api/admin/ai/parse-pdf/route.js` and `src/components/UniversalPdfImporterModal.jsx`. 

The current implementation fails on complex papers due to 6 specific regex limitations (swallowing answers into Option D, lack of numeric option support, internal list splitting, option bracket clipping, digit line stripping, and missing explanation parsers).

**Actionable Recommendation for Implementer:**
1. Upgrade `src/app/api/admin/ai/parse-pdf/route.js` with a robust multi-pass tokenizer and state machine supporting:
   - All question prefix formats (`Q1.`, `Question 1:`, `1.`, `1)`, `[1]`, `(1)`, `Ques 1.`) with sequence validation.
   - All option delimiters (`(A)-(D)`, `A.-D.`, `(a)-(d)`, `(1)-(4)`, `1.-4.`, `[A]-[D]`, inline and multi-column).
   - Answer key patterns (`Ans:`, `Answer:`, `Key:`, `Correct Option:`, numeric and letter formats, inline and end-of-document tables).
   - Solution/Explanation patterns (`Explanation:`, `Solution:`, `Sol:`, `Hint:`, `Derivation:`).
2. Enhance `UniversalPdfImporterModal.jsx` with y-coordinate line-clustering to preserve vertical line breaks from PDF.js.
3. Create `test-parser.js` in the project root containing the 5 diverse question test cases and assertions.

---

## 5. Verification Method

To independently verify these findings:
1. Run the test script in the agent folder:
   ```bash
   node .agents/explorer_survey_codebase/test_current_parser.js
   node .agents/explorer_survey_codebase/test_failure_cases.js
   ```
2. Inspect the core files:
   - `src/app/api/admin/ai/parse-pdf/route.js` (lines 13–225)
   - `src/components/UniversalPdfImporterModal.jsx` (lines 35–88)
   - `src/app/admin/questions/QuestionBankClient.jsx` (lines 526–546)
3. Invalidation condition: If `test_current_parser.js` extracts all 5 questions with clean options (no answers or explanations inside Option D) and correct option indexes without code changes, this report would be invalidated. (Tested: it currently fails on Questions 1, 2, 3, and 4).
