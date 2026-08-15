## 2026-08-15T13:28:26Z
You are Test Writer (Track A: E2E & Programmatic Testing).
Your working directory is: D:\admin dashboard\.agents\worker_test_writer
Your parent is the Project Orchestrator (Conversation ID: 3c1e0b3f-6e58-45e8-8e52-606049829221).

MANDATORY: Read the original user request at `D:\admin dashboard\.agents\ORIGINAL_REQUEST.md` and the pattern specification at `D:\admin dashboard\.agents\explorer_survey_patterns\analysis.md` before doing anything else. Also read `D:\admin dashboard\PROJECT.md`.

Your Mission:
1. Create the comprehensive, standalone test script `D:\admin dashboard\test-parser.js` required by Acceptance Criteria R1.
2. The test script must:
   - Import or load the parsing engine from `D:\admin dashboard\src\app\api\admin\ai\parse-pdf\route.js` (or require/import the extraction function, handling both ES module / CommonJS environments or dynamically loading `parseTextToQuestions`).
   - Define a realistic `RAW_FIXTURE_TEXT` containing 5 diverse, complex exam question formats (incorporating headers, footers, watermarks, inline options, chemical brackets like `[Ni(CN)4]2-`, statement lists, numeric options `(1)-(4)`, negative numbers `-5`, and trailing answer keys and explanations).
   - Execute the parser against `RAW_FIXTURE_TEXT`.
   - Assert all 4 tiers of criteria:
     - Tier 1: Sanity Check — exactly 5 question objects returned (`questions.length === 5`).
     - Tier 2: Option Array Integrity — every question has `options` array with exactly 4 elements (`length === 4`).
     - Tier 3: Mathematical / Text Content Fidelity — verify Option D is not corrupted with answer/explanation strings, formulas like `[Ni(CN)4]2-` and `(x + y)^2` retain brackets, and negative numbers `-5` are preserved.
     - Tier 4: Answer Resolution & Metadata — verify `correct_option_index` (0-3), `correct_answer`, `explanation`, and `subject`.
   - Print clear structured test progress and exit with status code 0 on complete pass, or exit with status code 1 on any assertion failure.
3. Create `D:\admin dashboard\TEST_INFRA.md` and `D:\admin dashboard\TEST_READY.md` documenting the test suite, test runner command, and coverage checklist.
4. Report back when `test-parser.js`, `TEST_INFRA.md`, and `TEST_READY.md` are written.

File Ownership: You own `D:\admin dashboard\test-parser.js`, `D:\admin dashboard\TEST_INFRA.md`, and `D:\admin dashboard\TEST_READY.md`. Do not modify `src/app/api/admin/ai/parse-pdf/route.js`.
