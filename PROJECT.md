# Project: Google Gemini PDF Parser Integration

## Architecture
- **Framework**: Next.js (App Router) with React 18, Tailwind CSS, Lucide icons, KaTeX LaTeX math rendering.
- **AI SDK**: `@google/genai` (v2.16.0) using modern `GoogleGenAI` client with `gemini-2.5-flash` model.
- **Multimodal Payload**: Direct PDF binary transmission via `inlineData: { mimeType: 'application/pdf', data: '<base64>' }` bypassing client-side text extraction.
- **Data Flow**:
  1. User selects PDF file or pastes raw text in `UniversalPdfImporterModal.jsx`.
  2. Browser reads PDF as Base64 Data URL via native `FileReader.readAsDataURL()`.
  3. `FormData` payload containing `pdfBase64`, `fileName`, `mimeType`, and `rawText` is sent via HTTP POST to `/api/admin/ai/parse-pdf`.
  4. Backend route initializes `@google/genai`, extracts clean base64 data, and calls `ai.models.generateContent` with strict system instruction and `responseMimeType: 'application/json'`.
  5. JSON response is validated, transformed into canonical question objects, and returned to client.
  6. Frontend modal displays questions in interactive review grid with KaTeX math rendering, allowing edits before final ingestion into Question Bank or Test Compiler.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Native Gemini PDF Parsing | Backend route receives `pdfBase64` and sends to `@google/genai` via `inlineData` with `mimeType: 'application/pdf'` | M1 | ORIGINAL_REQUEST R1 |
| 2 | Structured JSON Output & Schema | Strict system prompt extracting `single_mcq`, `multi_mcq`, `numerical`, `assertion_reason`, `matrix_match` questions, options, answers, and explanations | M1 | ORIGINAL_REQUEST R2 |
| 3 | Resilient Fallback Engine | Graceful fallback to deterministic regex parser for text-only inputs or when Gemini API key is not configured | M1 | Codebase Survey |
| 4 | Frontend Base64 Ingestion | `UniversalPdfImporterModal.jsx` reads PDF file via `FileReader.readAsDataURL` and appends `pdfBase64` to FormData without client-side text extraction crashes | M2 | ORIGINAL_REQUEST R3 |
| 5 | Clean Error Handling & Review Flow | Modal shows explicit user toasts on failure, removes misleading silent mock question injection, and preserves KaTeX review grid | M2 | Codebase Survey |
| 6 | Programmatic Payload Verification | `test-gemini-payload.js` node script mocks `@google/genai`, invokes route logic with dummy base64 PDF, and asserts `generateContent` payload structure and JSON schema instruction | M3 | ORIGINAL_REQUEST AC1 |
| 7 | Dual-Track E2E & Integrity Verification | Adversarial review, challenger verification, and zero-tolerance forensic audit | M4 | Project Pattern & AC2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Gemini Route | `src/app/api/admin/ai/parse-pdf/route.js` | none | DONE |
| M2 | Frontend Base64 Importer | `src/components/UniversalPdfImporterModal.jsx` | M1 | DONE |
| M3 | Programmatic Test Suite | `test-gemini-payload.js`, `TEST_INFRA.md`, `TEST_READY.md` | M1, M2 | DONE |
| M4 | Adversarial Review & Forensic Audit | Reviewers, Challengers, Forensic Auditor verification | M1, M2, M3 | DONE |

## Interface Contracts

### Backend API Route: `POST /api/admin/ai/parse-pdf`
- **Request (FormData or JSON)**:
  - `pdfBase64` (string, optional): Base64 Data URL or raw base64 string of PDF.
  - `rawText` (string, optional): Raw extracted or pasted text string.
  - `fileName` (string, optional): Name of uploaded PDF file.
  - `parserType` (string, optional): `'gemini_ai_multimodal'` | `'auto'` | `'regex'`.
- **Response (JSON)**:
  ```json
  {
    "success": true,
    "parserType": "gemini_ai_multimodal",
    "model": "gemini-2.5-flash",
    "questions_count": 5,
    "questions": [
      {
        "id": "pdf-q-1-1723730000000",
        "subject": "Physics",
        "sub_topic": "Kinematics",
        "difficulty": "MEDIUM",
        "formatType": "single_mcq",
        "content": "A projectile is launched with velocity $v_0$...",
        "diagram_url": "",
        "options": ["$10\\text{ m/s}$", "$20\\text{ m/s}$", "$30\\text{ m/s}$", "$40\\text{ m/s}$"],
        "correct_option_index": 1,
        "correct_answer": "$20\\text{ m/s}$",
        "explanation": "Using kinematic equation $v^2 = u^2 + 2as$...",
        "marks": { "positive": 4, "negative": -1 }
      }
    ]
  }
  ```

### Frontend Ingestion Contract: `UniversalPdfImporterModal.jsx` ↔ Consumers
- Consumer callback `onConfirmIngest(questions)` receives an array of validated questions.
- Question Bank and Test Compiler consume the returned array and map properties into application state.

## Code Layout
- `src/app/api/admin/ai/parse-pdf/route.js` — Backend Next.js API route handling Gemini PDF ingestion and regex fallback.
- `src/components/UniversalPdfImporterModal.jsx` — Frontend React modal handling Base64 file reading, upload, and question review.
- `test-gemini-payload.js` — Standalone Node.js test script verifying `@google/genai` mock payload, `inlineData`, and system instructions.
- `test-parser.js` — Existing Node.js test script verifying regex text parser fallback.
