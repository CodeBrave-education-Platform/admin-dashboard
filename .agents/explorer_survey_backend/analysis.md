# Backend & SDK Survey Analysis Report

**Target Project**: `D:\admin dashboard`  
**Explorer**: Backend & SDK Survey (Explorer 1)  
**Date**: 2026-08-15  

---

## Executive Summary

This survey report provides a comprehensive architectural and technical assessment of the backend AI and PDF parsing capabilities within `D:\admin dashboard`. 

Key takeaways:
1. **Modern SDK Installed**: `@google/genai` version `^2.16.0` is already installed in `package.json` and present in `node_modules/@google/genai`. The legacy `@google/generative-ai` package is not present.
2. **Current Route Implementation**: `src/app/api/admin/ai/parse-pdf/route.js` currently uses an in-memory deterministic regex parser engine (`parseExtractedText`, `cleanExtractedText`, `parseQuestionBlock`, `detectSubject`) operating on pre-extracted text strings. It does not yet invoke Gemini or accept binary/base64 PDF data.
3. **Gemini SDK Architecture**: The new `@google/genai` SDK uses `import { GoogleGenAI } from '@google/genai'`, instantiated via `new GoogleGenAI({ apiKey: ... })`, and invokes content generation via `ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [...], config: { ... } })`. Multimodal PDFs are passed in `contents` using `inlineData` with `{ mimeType: 'application/pdf', data: '<base64_string>' }`.
4. **Environment Variables**: `.env.local`, `.env.production`, and `netlify.env` currently configure Supabase and Upstash Redis credentials, but do not yet include `GEMINI_API_KEY` or `GOOGLE_GENAI_API_KEY`. The backend must support `process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY`.
5. **Frontend Integration**: `src/components/UniversalPdfImporterModal.jsx` currently extracts text client-side via `pdf.js` before sending `rawText` to `/api/admin/ai/parse-pdf`. For native Gemini multimodal PDF ingestion, the frontend should encode the uploaded PDF file as base64 and send it directly to the route.

---

## 1. Route Architecture & File Survey

### 1.1 `src/app/api/admin/ai/parse-pdf/route.js`
- **Current Behavior**:
  - Accepts `POST` requests with either JSON body (`{ rawText, parserType }`) or `multipart/form-data` (`rawText`, `parserType`).
  - Executes deterministic 5-stage text parsing:
    - Stage 1: `cleanExtractedText(text)` — Strips watermarks, pagination ("Page X of Y"), and header banners.
    - Stage 2: `parseExtractedText(text)` — Matches question boundaries (`Q.1`, `Question 1`, `1.`, `[1]`, `(1)`) with monotonic sequence validation.
    - Stage 3 & 4: `parseQuestionBlock(block)` — Extracts 4 options (Strategies A, B, C), explanation/solution blocks, and normalizes answer keys (`A-D`, `1-4`) to 0-based indices (`correct_option_index`).
    - Stage 5: `detectSubject(content, explanation, options)` — Classifies questions into Physics, Chemistry, Biology, Mathematics, or Computer Science using STEM keyword dictionaries.
  - Returns `{ success: true, parserType: 'deterministic_engine', questions_count: N, questions: [...] }`.
- **Modifications Needed for Gemini PDF Integration**:
  - Accept `base64Pdf` / `pdfBase64` / `file` parameter in JSON or FormData.
  - Strip data URL prefix if present (`data:application/pdf;base64,`).
  - When `base64Pdf` is supplied (or when `parserType === 'gemini'` or by default when PDF is uploaded), call `@google/genai` `ai.models.generateContent` with PDF `inlineData`.
  - Supply a comprehensive system instruction and JSON output schema to return questions matching the application schema.
  - Provide seamless fallback to `parseExtractedText` if `rawText` is provided without `base64Pdf` or if Gemini API key is missing.

### 1.2 Other API Routes in Project
- `src/app/api/admin/test-series/telemetry/route.js`: Admin test-series telemetry tracking.
- `src/app/api/live/poll/route.js`: Live polling route using Upstash Redis.
- `src/app/auth/callback/route.js`: Supabase authentication callback.
- **Finding**: No other Gemini/AI routes exist in the project. `parse-pdf` is the central AI parsing entry point.

---

## 2. Package & Dependency Survey

### 2.1 `package.json` Dependencies Check
```json
{
  "name": "admin-dashboard",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@google/genai": "^2.16.0",
    "@hello-pangea/dnd": "^18.0.1",
    "@supabase/ssr": "^0.10.3",
    "@supabase/supabase-js": "^2.106.2",
    "@upstash/ratelimit": "^2.0.8",
    "@upstash/redis": "^1.38.2",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "framer-motion": "^12.40.0",
    "katex": "^0.18.1",
    "lucide-react": "^1.17.0",
    "next": "16.2.6",
    "next-themes": "^0.4.6",
    "pdf-parse": "^2.4.5",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "recharts": "^3.8.1",
    "tailwind-merge": "^3.6.0"
  }
}
```

### 2.2 SDK Comparison & Status
| Metric | `@google/genai` (Current) | `@google/generative-ai` (Legacy) |
|---|---|---|
| **Status in project** | Installed (`^2.16.0`) | Not installed |
| **Package Location** | `node_modules/@google/genai` | N/A |
| **Google Status** | Official unified SDK for Gemini 2.0+ / 2.5 | Legacy SDK (maintenance / frozen) |
| **Installation Needed?** | **NO** — Already installed and functional | **NO** — Do not install |

---

## 3. `@google/genai` SDK Usage & Gemini API Contract

### 3.1 Initialization Syntax
In `@google/genai` v2.16.0:
```javascript
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey });
```
*Note: Do NOT use `new GoogleGenerativeAI(apiKey)` which was the syntax of `@google/generative-ai`.*

### 3.2 Model Configuration
- **Recommended Model**: `'gemini-2.5-flash'`
  - Native multimodal document processing (PDF pages rendered directly by model).
  - Sub-second to few-second latency.
  - Highly cost-effective for exam paper processing.
  - Fallback/Alternative models: `'gemini-1.5-flash'`, `'gemini-2.0-flash'`.

### 3.3 Multimodal PDF `inlineData` Structure
In `@google/genai`, the payload for multimodal document analysis is structured inside `contents`:
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64PdfData // raw base64 string without data URL header
      }
    },
    {
      text: `Extract all exam questions from this PDF document into structured JSON...`
    }
  ],
  config: {
    responseMimeType: 'application/json',
    temperature: 0.1,
    systemInstruction: `You are an expert exam parser. Extract all questions with complete LaTeX formulas, 4 options (A, B, C, D), correct option index (0-3), explanation, subject, and formatType.`
  }
});

const rawTextOutput = response.text;
const parsedQuestions = JSON.parse(rawTextOutput);
```

### 3.4 Target Question Schema
The application frontend (`UniversalPdfImporterModal.jsx` and Question Bank) requires questions in the following JSON structure:
```typescript
interface ParsedQuestion {
  id: string; // e.g. "pdf-q-1-1771165800000"
  subject: "Physics" | "Chemistry" | "Biology" | "Mathematics" | "General" | "Computer Science";
  sub_topic: string; // e.g. "Mechanics", "Valence Bond Theory"
  difficulty: "EASY" | "MEDIUM" | "HARD";
  formatType: "single_mcq" | "multiple_mcq" | "matrix_match" | "numerical" | "assertion_reason";
  content: string; // Question stem with LaTeX formulas
  options: string[]; // Exactly 4 clean option strings without leading prefixes
  correct_option_index: number; // 0, 1, 2, or 3
  correct_answer: string; // Matches options[correct_option_index]
  explanation: string; // Derivation / rationale
  diagram_url: string; // "" or image URL
}
```

---

## 4. Environment Variables Survey

### 4.1 Surveyed Files
1. **`.env.local`**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
2. **`.env.production`**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `UPSTASH_REDIS_REST_URL`
3. **`netlify.env`**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_SITE_URL`

### 4.2 Findings & Recommendations
- `GEMINI_API_KEY` is not currently set in `.env.local`.
- The code must support standard naming conventions:
  1. `process.env.GEMINI_API_KEY` (primary)
  2. `process.env.GOOGLE_GENAI_API_KEY` (secondary)
  3. `process.env.GOOGLE_API_KEY` (tertiary)
- In the implementation phase or when running live tests with Gemini, a valid Gemini API key can be set in `.env.local` or injected via environment variables.

---

## 5. Verification & Test Suite Strategy

### 5.1 Programmatic Verification (`test-gemini-payload.js`)
As specified in Acceptance Criteria R1/AC1:
- Create `test-gemini-payload.js` that:
  1. Mocks `@google/genai` module / `GoogleGenAI` class.
  2. Simulates a `POST` request with base64 PDF data.
  3. Asserts that `ai.models.generateContent` is invoked with:
     - `contents[0].inlineData.mimeType === 'application/pdf'`
     - `contents[0].inlineData.data === '<base64 string>'`
     - `model === 'gemini-2.5-flash'` (or configured model)
     - `config.responseMimeType === 'application/json'` or JSON prompt instructions.
  4. Asserts that the response from the route is properly structured with `success: true` and an array of valid question objects.

### 5.2 Existing Test Suite Compatibility
- `test-parser.js` currently tests the 5-stage deterministic regex engine on raw text fixtures.
- Retaining `parseExtractedText` and its export aliases (`parseTextToQuestions`, `parseExamPdfText`) ensures all existing unit tests in `test-parser.js` continue to pass 100% without regression.

---

## 6. Implementation Action Plan for Implementer

1. **Update `src/app/api/admin/ai/parse-pdf/route.js`**:
   - Import `GoogleGenAI` from `@google/genai`.
   - Parse incoming request for `base64Pdf` (or `pdfBase64`, `file`, `rawText`).
   - If `base64Pdf` is provided and API key is present, invoke Gemini (`gemini-2.5-flash`) with PDF `inlineData` and JSON response configuration.
   - If Gemini is invoked, validate and sanitize output questions (assign UUID/IDs, ensure 4 options, default subject/difficulty if missing).
   - If `rawText` is provided or Gemini is unavailable, fall back seamlessly to `parseExtractedText(rawText)`.
2. **Update `src/components/UniversalPdfImporterModal.jsx`**:
   - When a PDF file is selected, convert it to base64 via `FileReader.readAsDataURL(file)`.
   - Send `base64Pdf` in the request payload to `/api/admin/ai/parse-pdf`.
3. **Add Programmatic Test `test-gemini-payload.js`**:
   - Verify mock execution of `@google/genai` with correct `inlineData` format and response handling.
