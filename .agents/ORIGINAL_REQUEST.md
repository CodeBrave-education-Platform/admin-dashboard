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


## 2026-08-17T05:49:57Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full Team

Redesign the Course Management UI (`src/app/courses/page.js`) into a best-in-class, flawless, modern experience. Tear down the complex monolithic dropdown-based legacy interface and replace it with a hyper-optimized TanStack Data Grid and slide-out Drawer pattern, keeping aesthetics and speed at a premium standard. Use a very large team of agents to ensure the UI, logic, and integrations are flawless.

Working directory: D:\admin dashboard
Integrity mode: demo

## Requirements

### R1. UI Modernization & Architecture
Replace the current dropdown-based empty state with a rich Data Grid (using TanStack Table) showing all courses. When a course is clicked, open a slide-out drawer (`CourseEditorDrawer.jsx`) for editing syllabus, files, and exams, removing the need for a massive blank workspace.

### R2. Component Teardown
Dismantle the 900-line monolithic `src/app/courses/page.js` file into smaller, focused components (e.g., `CourseGrid.jsx`, `CourseEditorDrawer.jsx`). Maintain the existing PDF/Docx syllabus import logic but move it into the new component architecture.

### R3. Premium UX/Aesthetics
The redesign must feel premium, using smooth animations (Framer Motion is permitted) and meticulous typography/spacing. Avoid cliché dashboard tropes. Ensure fluid responsiveness.

## Acceptance Criteria

### Functionality & Polish
- [ ] The courses page loads without React hydration or runtime errors.
- [ ] A Data Grid correctly displays existing courses from the Supabase database.
- [ ] Clicking a course opens a slide-out drawer containing its syllabus details.
- [ ] The 900+ line `page.js` is successfully split into at least 3 distinct component files.

## 2026-08-17T07:11:42Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full Team

Redesign the "Batches" and "Test Series" sections of the admin dashboard to match the new best-in-class architecture implemented in the Courses section. Replace legacy interfaces with high-performance TanStack Data Grids, omnibar filtering, and Framer Motion slide-out drawers for editing. Use a very large team of agents to ensure the UI, logic, and integrations are flawless.

Working directory: D:\admin dashboard
Integrity mode: demo

## Requirements

### R1. UI Modernization & Architecture
Replace the current pages for Batches and Test Series with a rich Data Grid (using TanStack Table). When a batch or test series is clicked, open a slide-out drawer for editing its respective details and settings.

### R2. Component Teardown & Consistency
Dismantle any monolithic files for these sections into smaller, focused components (e.g., `BatchGrid.jsx`, `TestSeriesGrid.jsx`, `BatchEditorDrawer.jsx`). Ensure the design system, padding, typography, and Framer Motion animations are exactly consistent with the newly created `src/components/courses/CourseGrid.jsx`.

### R3. Premium UX/Aesthetics
The redesign must feel premium, using smooth animations and meticulous typography/spacing. Ensure fluid responsiveness and avoid cliché dashboard tropes.

## Acceptance Criteria

### Functionality & Polish
- [ ] The Batches and Test Series pages load without React hydration or runtime errors.
- [ ] Data Grids correctly display existing records from the Supabase database.
- [ ] Clicking a record opens a slide-out drawer containing its specific editable details.
- [ ] The codebase for these sections is successfully split into focused modular component files.
- [ ] Visual design perfectly matches the aesthetic standard established in the Courses section.
