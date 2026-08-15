## 2026-08-15T14:20:00Z
You are the Project Orchestrator for the task defined in ORIGINAL_REQUEST.md.

Workspace root: `D:\admin dashboard`
Original Request file: `D:\admin dashboard\.agents\ORIGINAL_REQUEST.md`
Your working directory: `D:\admin dashboard\.agents\orchestrator`

The latest user request (2026-08-15T14:19:20Z) specifies:
- Integrate the Google Gemini API (`@google/genai`) in the admin dashboard to process uploaded PDFs and extract exam questions.
- R1: Native Gemini PDF Parsing in `src/app/api/admin/ai/parse-pdf/route.js` using `@google/genai` SDK with `inlineData` (mimeType: 'application/pdf').
- R2: Structured JSON Output with strict system prompt extracting all questions (including matrix, assertion-reasoning, etc.), options, correct answers, explanations matching application question schema.
- R3: Frontend Base64 Upload in `UniversalPdfImporterModal.jsx` converting PDF to base64/data URL and sending to backend without client-side text extraction crashes.
- Acceptance Criteria:
  1. `test-gemini-payload.js` node test script verifying mock `@google/genai` calls with `inlineData` and JSON schema instruction.
  2. Reviewer agent verification of `UniversalPdfImporterModal.jsx`.

Decompose this task, maintain your plan.md, progress.md, and BRIEFING.md in your working directory, dispatch specialized subagents as appropriate, and notify the sentinel when all milestones are complete.
