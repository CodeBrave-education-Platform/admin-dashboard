# Project: Admin Dashboard PDF Exam Parser & Cost-Effective Architecture

## Architecture
- **Text Extraction Layer (`UniversalPdfImporterModal.jsx`)**: Browser-side PDF.js stream extraction with vertical line-clustering and whitespace normalization.
- **Parser API Endpoint (`src/app/api/admin/ai/parse-pdf/route.js`)**:
  - Modular 5-Stage Deterministic Parser Pipeline:
    1. *Stage 1: Noise Sanitizer & Normalizer* (Removes watermarks, headers, footers, cleans non-standard bullets while preserving numeric lines and mathematical characters).
    2. *Stage 2: Question Segmentation & Sequence Validator* (Identifies true question boundaries `Q1.`, `1.`, `Question 1:`, `(1)`, `[1]` while ignoring sub-statement lists `Statement I`, `1. ... 2. ...` inside question stems).
    3. *Stage 3: Multi-Strategy Option Tokenizer* (Supports multi-line, multi-column, inline options for `(A)-(D)`, `A.-D.`, `(1)-(4)`, `1.-4.`, `[A]-[D]` while preserving bracketed formulas like `[Ni(CN)4]2-` and math expressions).
    4. *Stage 4: Answer Key & Explanation Extractor* (Extracts answer labels `Ans:`, `Answer:`, `Key:`, `Correct Option:` in letter and numeric formats; extracts multi-line `Explanation:`, `Solution:`, `Hint:` blocks; prevents Option D pollution).
    5. *Stage 5: Subject & Domain Classifier* (Weighted keyword classification for Physics, Chemistry, Mathematics, Biology, Computer Science, General).
  - *Optional Hybrid Fallback*: Supports Google GenAI (`@google/genai`) when API key is provided and regex confidence is low.
- **Verification Layer (`test-parser.js`)**: Standalone Node.js test script asserting 100% extraction accuracy across 5 distinct, diverse exam question formats.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Test Harness & Fixture Design | Standalone `test-parser.js` test runner with 5 diverse question formats, assertions across 5 tiers | M1 (Track A) | ORIGINAL_REQUEST & Explorer 2 |
| 2 | Question Boundary Segmentation | Accurate detection of question boundaries with lookahead and sequence validation (prevent sub-statement splits) | M2 (Track B) | ORIGINAL_REQUEST R1 & Explorer 1 |
| 3 | Multi-Format Option Parsing | Robust extraction of `A-D`, `a-d`, `(1)-(4)`, `1-4`, `[A]-[D]`, inline options, and bracket preservation (`[Ni(CN)4]2-`) | M2 (Track B) | ORIGINAL_REQUEST R1 & Explorer 1/2 |
| 4 | Answer Key & Solution Extraction | Extraction of answer indicators (`Ans: (B)`, `Answer: 1`, `Key: [C]`) and multi-sentence explanations without polluting Option D | M2 (Track B) | ORIGINAL_REQUEST R1 & Explorer 1/2 |
| 5 | Text Sanitization & Layout Preserving | Filter watermarks, headers, footers (`Page X of Y`), preserve isolated numbers and negative values | M2 (Track B) | ORIGINAL_REQUEST R1 & Explorer 1/2 |
| 6 | Architectural Soundness Justification | Comprehensive documentation justifying deterministic parser over LLM API ($0 cost, <10ms latency, privacy, offline) | M3 | ORIGINAL_REQUEST R2 & Explorer 3 |
| 7 | Full E2E & Programmatic Verification | Execution of `node test-parser.js` and dual-track review, challenge, and forensic audit | M4 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Test Infrastructure & Suite (`test-parser.js`) | Standalone test script `test-parser.js` with 5 diverse exam formats, 5-tier assertions | None | DONE |
| M2 | Core Multi-Pass Parser Engine | Upgrade `src/app/api/admin/ai/parse-pdf/route.js` with 5-stage deterministic engine | M1 | DONE |
| M3 | Architecture Justification Documentation | Create `ARCHITECTURE_JUSTIFICATION.md` for R2 (Cost, Latency, Privacy, Determinism) | M2 | DONE |
| M4 | Comprehensive Gate & Victory Verification | Multi-agent review (Reviewers, Challengers, Forensic Auditor) and test-parser execution | M1, M2, M3 | IN_PROGRESS |

## Interface Contracts

### Parser Core Interface (`src/app/api/admin/ai/parse-pdf/route.js` & `test-parser.js`)
```typescript
interface ParsePdfRequest {
  rawText: string;
}

interface ParsedQuestion {
  id?: string;
  question_number?: number;
  content: string; // Clean question stem (without options, answer, or explanation)
  options: string[]; // Exactly 4 clean option strings
  correct_answer: string; // e.g. "A", "B", "C", "D" or "1", "2", "3", "4" or option text
  correct_option_index: number; // 0, 1, 2, or 3 (-1 if undetected)
  explanation: string; // Extracted solution or hint
  subject: string; // e.g. "Physics", "Chemistry", "Mathematics", "Biology", "General"
  formatType: "single_mcq" | "multiple_mcq" | "numerical" | "assertion_reason";
  difficulty: "Easy" | "Medium" | "Hard";
}

interface ParsePdfResponse {
  success: boolean;
  parserType: "deterministic_engine" | "gemini_ai";
  questions_count: number;
  questions: ParsedQuestion[];
}
```

## Code Layout
- `src/app/api/admin/ai/parse-pdf/route.js` — Core backend PDF parser endpoint
- `src/components/UniversalPdfImporterModal.jsx` — Client-side PDF text extraction modal
- `test-parser.js` — Programmatic test verification script
- `ARCHITECTURE_JUSTIFICATION.md` — Architectural justification & cost-benefit documentation
- `TEST_INFRA.md` & `TEST_READY.md` — Test suite infrastructure and readiness certification
