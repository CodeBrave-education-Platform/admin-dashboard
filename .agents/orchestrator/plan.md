# Orchestration Plan: Google Gemini PDF Parser Integration

## Mission
Integrate `@google/genai` in Next.js admin dashboard to natively parse PDF exam papers into structured JSON matching application schema, update frontend modal for Base64 transmission, and establish automated verification test harness.

## Execution Strategy (Project Pattern)
1. **Survey (Phase 0)**:
   - Spawn 3 parallel Explorers / Spec Miners to investigate:
     - Explorer 1: Backend parse-pdf route, Next.js API conventions, `@google/genai` usage, environment variables (GEMINI_API_KEY).
     - Explorer 2: Frontend `UniversalPdfImporterModal.jsx` and client PDF extraction flow.
     - Explorer 3 / Spec Miner: Question schemas (matrix, assertion-reasoning, single/multiple choice, integer, options, correct answers, explanations) across the dashboard.
2. **Architecture & Decomposition (Phase 1)**:
   - Synthesize survey findings into `PROJECT.md`.
   - Feature inventory and interface contracts.
3. **Implementation & Testing Track (Phase 2 - 4)**:
   - Milestone 1: Implement Backend Gemini Route (`src/app/api/admin/ai/parse-pdf/route.js`) with `@google/genai` SDK, `inlineData`, system prompt, schema validation.
   - Milestone 2: Implement Frontend Base64 Upload in `UniversalPdfImporterModal.jsx` (FileReader / Data URL / Base64 payload, bypass client-side extraction).
   - Milestone 3: Create Programmatic Verification Test (`test-gemini-payload.js`) mocking `@google/genai` and asserting `inlineData` structure + JSON schema instructions.
4. **Verification & Audit (Phase 5)**:
   - 2 Reviewers independently checking correctness & frontend logic.
   - 2 Challengers running edge case & integration validation.
   - 1 Forensic Auditor for zero-tolerance integrity check.
   - Gate verification.
