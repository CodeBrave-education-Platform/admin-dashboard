# Comprehensive Technical Analysis: Syllabus Parsing, Import Logic, and Document Handling

**Project**: ASENTRA Admin Dashboard / Education Portal  
**Target Module**: Course Management & Syllabus System (`src/app/courses/page.js`, `src/components/CourseManageClient.jsx`, `src/components/UniversalPdfImporterModal.jsx`, `src/app/api/admin/ai/parse-pdf/route.js`)  
**Investigator**: Explorer 2  
**Date**: 2026-08-17  

---

## 1. Executive Summary

The Course Management and Syllabus subsystem in the Admin Dashboard is responsible for cataloging courses, assembling hierarchical curricula (subjects, lessons/modules, worksheets, reading materials), managing assessments (quizzes, mock exams, question banks), orchestrating live classroom telemetry/polls, and handling student doubt threads.

A key highlight is the **Dual-Engine Document Extraction Architecture**:
1. **Client-Side Document Parsing (Syllabus & Assessment Outlines)**:
   - **PDF Parsing**: Powered by CDN-loaded `pdfjs-dist` (v3.11.174) with a custom spatial 2D layout reconstruction algorithm (`extractTextWithLayout`) that clusters text fragments by Y-coordinate (within a 3.5px line-height tolerance) and sorts horizontally by X-coordinate.
   - **DOCX Parsing**: Powered by CDN-loaded `mammoth.js` (v1.6.0) extracting raw structured text directly from ArrayBuffers.
   - **Deterministic Regex Parser (`parseSyllabusText`)**: Transforms raw document text into structured curriculum lessons with sequence indices, titles, durations (handling minute/hour conversions), and unit descriptions.
2. **Multimodal AI & Regex Assessment Parser (`/api/admin/ai/parse-pdf`)**:
   - Backend Next.js route leveraging `@google/genai` (v2.17.1) with `gemini-2.5-flash` model (`inlineData` base64 PDF payload) alongside a 5-stage deterministic fallback parser for full question extraction (LaTeX math, options A-D, answer keys, explanations, and diagram metadata).

---

## 2. Step-by-Step Document Extraction & Import Flow

### 2.1 Syllabus Import Flow (`src/app/courses/page.js`)

```
+----------------------------------------------------------------------------------------------------+
|                                    1. User Selects Course & File                                    |
|  - Admin selects course from catalog dropdown (or future Data Grid row)                            |
|  - Clicks "Import Syllabus" button -> opens modal overlay `showImportSyllabusModal`                |
|  - Drags & drops or browses `.pdf` or `.docx` file into file input                                 |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                    2. Client-Side Document Loader                                   |
|  [PDF Branch]:                                  |  [DOCX Branch]:                                  |
|  - `loadPdfJs()` dynamically loads script from  |  - `loadMammoth()` dynamically loads script from |
|    cdnjs (`pdf.min.js` & `pdf.worker.min.js`)   |    cdnjs (`mammoth.browser.min.js`)              |
|  - Reads file via `FileReader.readAsArrayBuffer`|  - Reads file via `FileReader.readAsArrayBuffer` |
|  - `pdfjsLib.getDocument({ data })` iterates    |  - `mammoth.extractRawText({ arrayBuffer })`     |
|    through pages 1..N calling                   |    returns plain text                            |
|    `extractTextWithLayout(page)`                |                                                  |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                  3. Spatial Layout Reconstruction                                  |
|  `extractTextWithLayout(page)`:                                                                    |
|  - Retrieves `page.getTextContent().items`                                                         |
|  - Bins text items into `linesMap` where `|Y_key - Y_item| < 3.5px` (vertical tolerance)            |
|  - Sorts Y buckets descending (`b - a`, top-to-bottom reading order)                               |
|  - Sorts X coordinates ascending (`a.transform[4] - b.transform[4]`, left-to-right)               |
|  - Joins horizontal fragments with space `' '` and lines with `'\n'`                               |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                4. Syllabus Regex Parsing & Cleaning                                |
|  `parseSyllabusText(text)`:                                                                        |
|  - Filters out headers/footers/page numbers:                                                       |
|    `/^(?:page|chapter|syllabus|table of contents|index|course overview|curriculum)/i`              |
|    `/^\d+\s*$/` and lines < 3 characters                                                           |
|  - Detects duration: `/(?:[-–—(📎[]\s*)?(\d+)\s*(?:min|minute|hour|hr|h|m)s?[\)\]]?\s*$/i`         |
|    - Converts 'hour'/'hr' to minutes (`val * 60`), strips duration from title                      |
|  - Strips lesson prefixes:                                                                         |
|    `/^(?:\d+[\.\-\s)]+|lesson\s*\d+[\.\-\s)]+|module\s*\d+[\.\-\s)]+|topic\s*\d+[\.\-\s)]+)\s*/i`  |
|  - Trims trailing/leading punctuation: `/^[:\-\s\+]+|[:\-\s\+]+$/g`                                |
|  - Assembles draft lesson objects: `{ id, title, duration_minutes, description, order_index }`     |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                   5. Interactive Review Data Grid                                  |
|  - Renders editable preview table in modal                                                         |
|  - Admin can tweak sequence (`order_index`), title, duration, description, add rows, delete rows   |
|  - "Reset File" allows starting over                                                               |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                               6. Database Persistence & Invalidation                               |
|  `handleImportSyllabus`:                                                                           |
|  - Maps draft lessons to Supabase payload:                                                         |
|    `{ course_id, title, duration_minutes, description, order_index }`                              |
|  - Executes `supabase.from('lessons').insert(payload)`                                             |
|  - Invalidates cache: `invalidateCache('course', null, selectedCourseId)`                          |
|  - Reloads course curriculum via `handleSelectCourse(selectedCourseId)`                            |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Detailed Regex Patterns & Transformation Rules

### 3.1 Syllabus Document Extraction

| Regex Target | Pattern | Transformation / Rationale |
|---|---|---|
| **Document Noise & Headers** | `/^(?:page\|chapter\|syllabus\|table of contents\|index\|course overview\|curriculum)/i` | Discards document title banners, TOC lines, and recurring header texts. |
| **Isolated Numbers** | `/^\d+\s*$/` | Strips standalone line/page numbers so they are not parsed as lessons. |
| **Duration Extraction** | `/(?:[-–—(📎[]\s*)?(\d+)\s*(?:min\|minute\|hour\|hr\|h\|m)s?[\)\]]?\s*$/i` | Matches durations at end of line like `(90 mins)`, `[2 hours]`, `- 45m`. Converts hours (`* 60`) or takes raw minutes. Strips matched substring from title. |
| **Lesson/Module Prefix** | `/^(?:\d+[\.\-\s)]+\|lesson\s*\d+[\.\-\s)]+\|module\s*\d+[\.\-\s)]+\|topic\s*\d+[\.\-\s)]+)\s*/i` | Removes prefixes such as `1.`, `02 -`, `Lesson 3:`, `Module 4)`, `Topic 5.` to isolate pure lesson names. |
| **Punctuation Trimming** | `/^[:\-\s\+]+|[:\-\s\+]+$/g` | Strips leftover leading/trailing colons, dashes, plus signs, and whitespace. |

### 3.2 Assessment & Exam PDF Question Extraction (`CourseManageClient.jsx` & `route.js`)

| Regex Target | Pattern | Transformation / Rationale |
|---|---|---|
| **Question Number Anchor** | `/(?:^\|\n)\s*(?:Q(?:uestion)?)?\s*(\d+)\s*[\.\:\)]/gi` | Finds start of each question block (`Q1.`, `Question 2:`, `3)`). |
| **Answer Key Extraction** | `/\b(?:ans(?:wer)?\|key\|correct\|option)\b\s*[\:\-\=]?\s*([A-D])/i` | Extracts answer key letter (A, B, C, D) and converts to 0-based index `char.charCodeAt(0) - 65`. |
| **Line-by-Line Option Markers** | `/^\s*[\*\_(\[]*\s*(A\|B\|C\|D)\s*[\*\_)\]\.\-]+\s*(.*?)$/` | Matches line options (e.g. `(A) option text`, `B. option text`, `*C* option text`). |
| **Inline Multi-Column Options** | `pat.m0..m3` (`\(\s*a\s*\)`, `\(\s*b\s*\)`, `\(\s*c\s*\)`, `\(\s*d\s*\)`) | Preserves bracketed chemical formulas (e.g. `[Ni(CN)4]2-`) and math expressions by positional slicing. |
| **Explanation / Solution** | `/(?:^\|\n)\s*(?:Explanation\|Solution\|Sol\|Hint\|Derivation\|Reason)\s*[\:\-\.]\s*([\s\S]+)$/i` | Isolates detailed explanation from question stem. |

---

## 4. Complete Supabase Data Model & Schema Relationships

```
                        +--------------------------------+
                        |            courses             |
                        +--------------------------------+
                        | id (PK, UUID)                  |
                        | title (text)                   |
                        | description (text)             |
                        | price (numeric)                |
                        | original_price (numeric)       |
                        | level (foundation/mains/adv)   |
                        | instructor_id (UUID)           |
                        | instructor_name (text)         |
                        | subject (text)                 |
                        | thumbnail_url (text)           |
                        | start_date (date)              |
                        | end_date (date)                |
                        | badge (text)                   |
                        | book_kit (text)                |
                        | students_count (integer)       |
                        | created_at (timestamptz)       |
                        +---------------+----------------+
                                        |
       +--------------------------------+--------------------------------+
       | 1:N                            | 1:N                            | 1:N
       v                                v                                v
+-----------------------+     +-----------------------+     +-----------------------+
|        lessons        |     |     course_files      |     |      assessments      |
+-----------------------+     +-----------------------+     +-----------------------+
| id (PK, UUID)         |     | id (PK, UUID)         |     | id (PK, UUID)         |
| course_id (FK->course)|     | course_id (FK->course)|     | course_id (FK->course)|
| title (text)          |     | lesson_id (FK->lesson)|     | lesson_id (FK->lesson)|
| description (text)    |     | file_name (text)      |     | title (text)          |
| duration_minutes (int)|     | file_path (text)      |     | duration_minutes (int)|
| subject (text)        |     | is_premium (boolean)  |     | type (jee_mock/quiz)  |
| order_index (integer) |     | created_at (timestamp)|     | start_window (tstz)   |
| video_url (text)      |     +-----------------------+     | end_window (tstz)     |
| video_source (text)   |                                   | created_at (timestamp)|
| video_id (text, 11ch) |                                   +-----------+-----------+
| reading_material (HTML|                                               | 1:N
| assignment_title (txt)|                                               v
| assignment_url (text) |                                   +-----------------------+
| created_at (timestamp)|                                   |       questions       |
+-----------+-----------+                                   +-----------------------+
            |                                               | id (PK, UUID)         |
            | 1:N                                           | assessment_id (FK)    |
            v                                               | content (LaTeX/MD)    |
+-----------------------+                                   | options (text[])      |
|     lesson_doubts     |                                   | correct_option_index  |
+-----------------------+                                   | marks_positive (int)  |
| id (PK, UUID)         |                                   | marks_negative (int)  |
| lesson_id (FK->lesson)|                                   | explanation (text)    |
| user_id (FK->profile) |                                   | diagram_url (text)    |
| parent_id (FK->self)  |                                   | formatType (text)     |
| content (text)        |                                   +-----------------------+
| resolved (boolean)    |
| created_at (timestamp)|
+-----------------------+
```

### Table Details & Field Mapping

1. **`courses`**:
   - Primary course catalog item.
   - Insert: `title`, `description`, `price`, `level`, `start_date`, `end_date`, `instructor_id`.
   - Update: `thumbnail_url`, `price`, `level`, etc.
   - Delete: Deletes course record.

2. **`lessons` (Chapters / Video Lectures / Modules)**:
   - Contains curriculum sequence for a course.
   - Inserted in bulk via **Syllabus Importer** (`course_id`, `title`, `duration_minutes`, `description`, `order_index`).
   - Enhanced via **Syllabus Tab** in `CourseManageClient.jsx` with `video_url`, `video_source` ('youtube' | 'vimeo' | 'hls'), `video_id`, `subject` ('Physics' | 'Chemistry' | 'Mathematics'), `assignment_title`, and `assignment_url`.
   - Enhanced via **Rich Readings Tab** with `reading_material` (compiled HTML with KaTeX block/inline formulas).

3. **`course_files` (Reference Worksheets & PDF Guides)**:
   - Attached PDFs and handouts mapped to a `course_id` and optionally a specific `lesson_id`.
   - Inserted with `is_premium: true` and auto-appends `#toolbar=0` to `file_path` to restrict browser toolbar access.

4. **`assessments` (JEE Mocks & Quizzes)**:
   - CBT examinations linked to a `course_id` and optionally a chapter `lesson_id`.
   - Fields: `title`, `duration_minutes` (e.g. 180), `type` ('jee_mock' | 'quiz'), `start_window`, `end_window`.

5. **`questions` (Assessment Question Bank)**:
   - Multiple choice / integer / matrix questions linked to `assessment_id`.
   - Fields: `content` (Markdown + LaTeX), `options` (array of 4 strings), `correct_option_index` (0-3), `marks_positive` (4), `marks_negative` (1), `explanation`, `diagram_url`.

6. **`live_sessions` (Scheduled Classes & Video Rooms)**:
   - Fields: `course_id`, `title`, `meeting_url`, `scheduled_start`, `duration_minutes`, `status` ('scheduled' | 'live' | 'ended').

7. **`lesson_doubts` (Student Doubt Threads)**:
   - Nested discussion threads linked to `lesson_id` with `parent_id` hierarchy and `resolved` boolean flag.

---

## 5. Cache Invalidation & Cross-Origin Synchronization

Every mutation (course creation, update, deletion, syllabus lesson addition/deletion, exam changes) triggers the server-side cache invalidation bridge `invalidateCache(type, courseId, batchId)` located at `src/utils/invalidateCache.js`:

1. **Direct Upstash Redis Command Execution**:
   - Executes Redis `DEL` on keys:
     - `asentra:course:catalog`
     - `asentra:course:${courseId}`
     - `asentra:batch:meta:${batchId}` (if batchId provided)
2. **Secondary Webhook Dispatch**:
   - Issues a background POST to `http://localhost:3000/api/cache/invalidate` with `Authorization: Bearer <RAZORPAY_KEY_SECRET>` to purge client cache on student portals.

---

## 6. Architecture & Decomposition Opportunities for Course Management Redesign

### Current State Issues in `src/app/courses/page.js`
1. **Monolithic 913-line file**: Mixes course selection dropdown, add course modal, syllabus import modal, PDF/DOCX dynamic loader scripts, regex parsing algorithms, Supabase queries, and layout rendering.
2. **Dropdown-based empty state**: If no course is selected from dropdown, displays an empty dashed placeholder ("Blueprint Workspace Inactive").
3. **Modal-in-Page pollution**: Both Course Creation and Syllabus Auto-Importer modals are nested directly within `page.js`.

### Recommended Target Architecture
```
src/app/courses/
├── page.js                              # Lightweight orchestrator with TanStack Table + Drawer state
├── components/
│   ├── CourseGrid.jsx                   # TanStack Data Grid (Search, Filter, Sort, Status, Actions)
│   ├── CourseEditorDrawer.jsx           # Slide-out Drawer with CourseManageClient integration
│   ├── SyllabusImporterModal.jsx        # Dedicated Syllabus PDF/Word Importer Modal
│   ├── CreateCourseModal.jsx            # Create Course Blueprint Modal
│   └── CourseDeleteConfirmModal.jsx     # Safe delete confirmation dialog
└── lib/
    ├── syllabusParser.js                # Extracted extractTextWithLayout & parseSyllabusText functions
    └── documentLoaders.js               # Extracted loadPdfJs & loadMammoth script helpers
```

---

## 7. Error Handling & Edge Cases

| Scenario | System Behavior | Handled Properly? |
|---|---|---|
| **Non-PDF / Non-DOCX uploaded** | Throws error `'Only PDF (.pdf) and Word (.docx) files are supported'`. | Yes, alert displayed & file input reset. |
| **Scanned image PDF (no text layer)** | `extractedText.trim()` is empty -> Throws `'No readable text content could be extracted from this document.'` | Yes, caught & alerted. |
| **No matching syllabus lessons** | `parsed.length === 0` -> Throws `'Could not identify any modules or lessons in this syllabus.'` | Yes, caught & alerted. |
| **Missing course selection** | If `!selectedCourseId`, alerts `'No course selected'`. | Yes, early exit. |
| **Empty title / duration in review** | Required input fields in modal review table prevent empty commits. | Yes, HTML5 form validation. |
| **Client-side CDN failure** | `script.onerror` rejects promise with clear CDN error. | Yes. |
| **Unauthenticated Supabase Session** | `handleCreateCourse` checks `const { data: { user } } = await supabase.auth.getUser()`, throws if missing. | Yes. |

---

## 8. Summary of Findings for Team Integration

1. **Parser Portability**: The syllabus parser in `page.js` is completely client-side and self-contained, requiring zero server API routes. Extracting it to `src/app/courses/lib/syllabusParser.js` or `src/lib/syllabusParser.js` makes it easily reusable across both the new `SyllabusImporterModal.jsx` and any future batch/course importer.
2. **Zero-Breaking-Change Contract**: The Supabase table structure (`courses`, `lessons`, `course_files`, `assessments`, `questions`, `live_sessions`, `lesson_doubts`) and the `CourseManageClient.jsx` props contract (`initialCourse`, `initialLessons`, `initialFiles`, `initialExams`) can be maintained 100% intact when transitioning from the dropdown workspace to the TanStack Table + Drawer architecture.
