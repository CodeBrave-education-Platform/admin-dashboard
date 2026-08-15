# Original User Request

## 2026-08-15T13:21:09Z

# Teamwork Project Prompt — Draft

Fix the PDF parsing logic in the admin dashboard so it accurately extracts all questions, options, and correct answers from complex exam paper PDFs.

Working directory: `D:\admin dashboard`
Integrity mode: development

## Requirements

### R1. Robust PDF Extraction
The system must extract all questions, including their text, options, and correct answers, even if the formatting is unconventional.

### R2. Cost-Effective Architecture
The agent team should determine the best architecture based on the codebase, balancing accuracy with API costs. 

## Acceptance Criteria

### Extraction Accuracy
- [ ] Programmatic Verification: Write a Node.js test script `test-parser.js` that feeds a raw extracted text string containing 5 diverse question formats into the parser. The script must assert that exactly 5 question objects are returned with correctly mapped options.

### Architectural Soundness
- [ ] Agent-as-Judge Verification: The final implementation PR must clearly state whether it uses an LLM API or an upgraded Regex algorithm, justifying why it is the best approach for this codebase.

## 2026-08-15T14:19:20Z

# Teamwork Project Prompt — Draft

Integrate the Google Gemini API (`@google/genai`) in the admin dashboard to process uploaded PDFs and extract exam questions. The solution must handle scanned images, complex formatting, and matrix questions natively, replacing the brittle regex approach.

Working directory: `D:\admin dashboard`
Integrity mode: benchmark

## Requirements

### R1. Native Gemini PDF Parsing
The backend API route (`src/app/api/admin/ai/parse-pdf/route.js`) must be updated to receive a base64 encoded PDF file and send it to the Gemini model (`gemini-2.5-flash` or similar) using the `@google/genai` SDK via `inlineData`. 

### R2. Structured JSON Output
The Gemini API call must include a strict system prompt instructing it to extract all questions (including matrix, assertion-reasoning, etc.), options, correct answers, and explanations, returning a structured JSON array matching the application's existing question schema.

### R3. Frontend Base64 Upload
The frontend (`UniversalPdfImporterModal.jsx`) must be updated to convert the selected PDF into a base64 string and transmit it to the backend, bypassing the client-side text extraction when the Gemini parser is invoked.

## Acceptance Criteria

### API Integration Validity
- [ ] Programmatic Verification: A Node.js test script `test-gemini-payload.js` must mock the `@google/genai` module, invoke the POST route with a dummy base64 PDF, and assert that the `generateContent` method is called with the correct `inlineData` structure (mimeType: 'application/pdf') and a JSON schema instruction.

### Frontend Logic
- [ ] Agent-as-Judge: A reviewer agent must inspect `UniversalPdfImporterModal.jsx` and confirm it correctly reads the file as a data URL/base64 and appends it to the FormData payload without crashing.

