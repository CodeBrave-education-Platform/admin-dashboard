# E2E Test Infra: Google Gemini PDF Parser Integration

## Test Philosophy
- Requirement-driven, opaque-box, verifying payload fidelity, SDK compatibility, error handling, and end-to-end question extraction.
- Methodology: Programmatic Unit Mocks + Boundary & Corner Testing + Cross-Component Verification.

## Feature Inventory & Test Coverage Goals
| # | Feature | Requirement | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Combination) | Tier 4 (Real-World) |
|---|---------|-------------|:-----------------:|:-----------------:|:--------------------:|:-------------------:|
| 1 | Native Gemini PDF Parsing (`inlineData`) | ORIGINAL_REQUEST R1 | Base64 PDF parsing with `mimeType: application/pdf` | Large base64, missing prefix, corrupt data | Base64 + prompt instruction | Full PDF question parsing |
| 2 | Structured JSON Output (5 question types) | ORIGINAL_REQUEST R2 | single_mcq, multi_mcq, numerical, assertion_reason, matrix_match | Empty options, missing explanation, null diagram | Mixed subjects & difficulties | Full exam paper extraction |
| 3 | Frontend Base64 Ingestion | ORIGINAL_REQUEST R3 | `FileReader.readAsDataURL`, FormData `pdfBase64` | Paste text fallback, no file, empty text | File upload + review step edit | Full UI modal upload & ingest |
| 4 | Programmatic Payload Verification Script | ORIGINAL_REQUEST AC1 | Mock `@google/genai`, verify `generateContent` args | Missing API key, network error mock | Schema instruction assertions | `node test-gemini-payload.js` exit 0 |

## Test Runners
1. **`test-gemini-payload.js`**:
   - `node test-gemini-payload.js`
   - Mocks `@google/genai`, invokes backend parse logic with dummy base64 PDF, verifies `generateContent` was called with `inlineData: { mimeType: 'application/pdf', data: '...' }` and JSON schema instruction.
2. **`test-parser.js`**:
   - `node test-parser.js`
   - Verifies existing regex fallback parser extracts 5 diverse questions from raw text.
