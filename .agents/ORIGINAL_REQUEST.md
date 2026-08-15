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
