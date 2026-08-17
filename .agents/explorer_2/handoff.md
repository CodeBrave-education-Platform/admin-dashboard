# Handoff Report — Explorer 2: Syllabus Parsing, Import Logic & Document Handling

**Date**: 2026-08-17  
**Working Directory**: `D:\admin dashboard\.agents\explorer_2`  
**Target Module**: Course Management & Syllabus System (`src/app/courses/page.js`, `src/components/CourseManageClient.jsx`, `src/components/UniversalPdfImporterModal.jsx`, `src/app/api/admin/ai/parse-pdf/route.js`)  
**Status**: Completed (Hard Handoff)  

---

## 1. Observation

Direct code analysis and file inspections across the codebase revealed the following components, lines of code, and structures:

1. **Client-side PDF and DOCX loader scripts** in `src/app/courses/page.js` (lines 12–53):
   - `loadPdfJs()`: Dynamically injects script tag for `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`, configures `GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'`, and returns `window.pdfjsLib`.
   - `loadMammoth()`: Dynamically injects `https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js` and returns `window.mammoth`.

2. **2D Spatial Layout Text Reconstruction** in `src/app/courses/page.js` (lines 55–91):
   - `extractTextWithLayout(page)` clusters items from `page.getTextContent().items` by Y-coordinate using `Math.abs(parseFloat(key) - y) < 3.5` tolerance, sorts Y descending (`b - a`), sorts X ascending (`a.transform[4] - b.transform[4]`), and joins lines with `\n`.

3. **Syllabus Regex Parser** in `src/app/courses/page.js` (lines 93–143):
   - `parseSyllabusText(text)`:
     - Strips headers via `/^(?:page|chapter|syllabus|table of contents|index|course overview|curriculum)/i`.
     - Extracts durations via `/(?:[-–—(📎[]\s*)?(\d+)\s*(?:min|minute|hour|hr|h|m)s?[\)\]]?\s*$/i`, converting hour units (`* 60`) or minutes.
     - Strips numbering prefixes via `/^(?:\d+[\.\-\s)]+|lesson\s*\d+[\.\-\s)]+|module\s*\d+[\.\-\s)]+|topic\s*\d+[\.\-\s)]+)\s*/i`.
     - Strips punctuation via `/^[:\-\s\+]+|[:\-\s\+]+$/g`.
     - Produces draft lesson objects with `id`, `title`, `duration_minutes`, `description`, `order_index`.

4. **Syllabus File Upload & Supabase Ingestion** in `src/app/courses/page.js` (lines 177–273):
   - `handleSyllabusFileUpload(e)`: Handles file reading via `FileReader.readAsArrayBuffer(file)` for both PDF and DOCX, validates extracted text, parses lessons, and populates `draftLessons`.
   - `handleImportSyllabus(e)`: Inserts into Supabase `lessons` table:
     ```javascript
     const payload = draftLessons.map(l => ({
       course_id: selectedCourseId,
       title: l.title.trim(),
       duration_minutes: parseInt(l.duration_minutes) || 60,
       description: l.description.trim() || null,
       order_index: parseInt(l.order_index) || 1
     }));
     const { error } = await supabase.from('lessons').insert(payload);
     ```
   - Invalidation: Triggers `invalidateCache('course', null, selectedCourseId)` and reloads active course.

5. **Course Management & Curriculum Tabs** in `src/components/CourseManageClient.jsx` (lines 1850–2910):
   - **Configuration (`settings`)**: Updates course metadata (`title`, `description`, `price`, `level`, `thumbnail_url`, `start_date`, `end_date`) to `courses` table (lines 1338–1367).
   - **Syllabus & Video (`syllabus`)**: Adds video lectures to `lessons` table with `video_url`, `video_source`, `video_id`, `duration_minutes`, `subject`, `order_index`, `assignment_title`, `assignment_url` (lines 1370–1430).
   - **Reference Sheets (`materials`)**: Adds reference PDFs to `course_files` table with `lesson_id`, `file_name`, `file_path`, `is_premium` (lines 1448–1476).
   - **Rich Readings (`readings`)**: Compiles Markdown + LaTeX equations to HTML and saves to `lessons.reading_material` (lines 1724–1745).
   - **JEE Mock Linkages (`exams`)**: Links CBT assessments in `assessments` table (`title`, `duration_minutes`, `type`, `start_window`, `end_window`, `lesson_id`) (lines 1493–1525) and builds individual questions into `questions` table with PDF question extractor (lines 1568–1721).
   - **Live Classes (`live`)**: Schedules live video sessions into `live_sessions` table and handles quick-polls (lines 447–647).
   - **Doubt Board (`doubts`)**: Manages hierarchical Q&A threads in `lesson_doubts` table (lines 1748–1840).

6. **Universal PDF Multimodal Parser** in `src/components/UniversalPdfImporterModal.jsx` and `src/app/api/admin/ai/parse-pdf/route.js`:
   - Handles question bank PDF imports via `@google/genai` multimodal pipeline and 5-stage deterministic regex fallback.

---

## 2. Logic Chain

1. **From Observation 1 & 2 to Extraction Independence**:
   - The syllabus parser in `src/app/courses/page.js` is completely executed client-side in the browser using dynamic CDN script injections (`pdf.js` and `mammoth.js`) and raw `ArrayBuffer` processing. It does not depend on any server-side API endpoint or Node.js binary bindings.

2. **From Observation 3 & 4 to Schema Compatibility**:
   - The syllabus extractor creates draft records that match the exact schema of the `lessons` table (`course_id`, `title`, `duration_minutes`, `description`, `order_index`).
   - When moving to the new TanStack Data Grid and slide-out Drawer architecture (`CourseGrid.jsx` and `CourseEditorDrawer.jsx`), this extraction logic can be isolated into standalone utility functions (`syllabusParser.js` and `documentLoaders.js`) and a standalone modal component (`SyllabusImporterModal.jsx`) without altering the Supabase table schema or payload formats.

3. **From Observation 5 to Component Isolation**:
   - `CourseManageClient.jsx` already encapsulates the entire multi-tab editing experience (`settings`, `syllabus`, `materials`, `readings`, `doubts`, `live`, `exams`, `compiler`).
   - The slide-out drawer (`CourseEditorDrawer.jsx`) can directly host `CourseManageClient` (or modular tab subcomponents) and pass `initialCourse`, `initialLessons`, `initialFiles`, and `initialExams` as props, preserving all rich functionality without regression.

4. **From Observation 4 & 5 to Invalidation Consistency**:
   - All mutations in the syllabus flow invoke `invalidateCache('course', ...)` and `invalidateCache('catalog', ...)`. This ensures Redis cache eviction and student portal webhook notifications are fully preserved.

---

## 3. Caveats

- **Scanned Image PDFs**: The client-side PDF parser relies on `page.getTextContent()`. It cannot extract text from pure raster/scanned image PDFs without an OCR layer (unlike the backend Gemini multimodal route `/api/admin/ai/parse-pdf` which handles images/scans). If OCR for syllabus is needed in the future, the backend Gemini route can be adapted for syllabus schemas.
- **Client-Side CDN Dependencies**: Both `pdf.js` and `mammoth.js` are currently pulled from `cdnjs.cloudflare.com`. If offline/air-gapped operation is required, these should be bundled into `package.json` or served from `/public/vendor/`.
- No other caveats; all extraction mechanisms and data models have been fully mapped.

---

## 4. Conclusion

1. **Extraction Flow Mapped**: The syllabus extraction pipeline is a client-side layout-aware engine that accurately parses `.pdf` and `.docx` files into structured lessons with automatic duration and sequence parsing.
2. **Schema Fully Identified**: The complete database hierarchy (`courses` -> `lessons`, `course_files`, `assessments` -> `questions`, `live_sessions`, `lesson_doubts`) and its CRUD operations are fully documented.
3. **Refactoring Blueprint Ready**: The 913-line monolithic `src/app/courses/page.js` can be cleanly decomposed into:
   - `CourseGrid.jsx` (TanStack Table for courses)
   - `CourseEditorDrawer.jsx` (Slide-out drawer containing course syllabus/files/exams)
   - `SyllabusImporterModal.jsx` (Modal for PDF/Word import and review)
   - `syllabusParser.js` & `documentLoaders.js` (Modularized extraction logic)

---

## 5. Verification Method

To independently verify these findings:

1. **Inspect Syllabus Parsing Logic**:
   - View `src/app/courses/page.js` lines 12–143 and verify regex patterns, duration extraction, and layout binning logic.
2. **Inspect Supabase Insertion & Schema**:
   - View `src/app/courses/page.js` lines 246–260 and `src/components/CourseManageClient.jsx` lines 1396–1413 to verify `lessons`, `course_files`, and `assessments` payloads.
3. **Inspect Cache Invalidation**:
   - View `src/utils/invalidateCache.js` lines 35–65 to confirm Redis DEL commands and student webhook dispatch.
4. **Inspect Analysis Report**:
   - View `D:\admin dashboard\.agents\explorer_2\analysis.md` for the complete architectural report.
