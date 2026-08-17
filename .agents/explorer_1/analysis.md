# Legacy Course Management UI — Architectural Deep Dive & Scope Analysis

**Date:** 2026-08-17  
**Investigator:** Explorer 1 (Course Management UI Redesign Team)  
**Target File:** `src/app/courses/page.js` (913 lines)  
**Project Root:** `D:\admin dashboard`  

---

## 1. Executive Summary

The current Course Management page (`src/app/courses/page.js`) is a **913-line monolithic Client Component** (`'use client'`). It utilizes a dropdown-based course selector that displays a blank placeholder workspace when unselected, requiring the admin to choose a course from a dropdown menu before viewing any course content or syllabus details.

The page orchestrates course creation, course deletion, curriculum/lesson fetching, course files/worksheets, linked CBT assessments, and client-side PDF/Word syllabus extraction.

This analysis maps:
1. All state hooks, effects, functions, Supabase queries, and render sections in `src/app/courses/page.js`.
2. All relevant dependencies in `package.json`.
3. Complete database schema mappings for courses, lessons, course files, assessments, and related entities.
4. Concrete component teardown and redesign architecture for the TanStack Data Grid and slide-out Drawer pattern.

---

## 2. Exhaustive Analysis of `src/app/courses/page.js`

### 2.1 File Overview & Imports
- **Directive:** `'use client'`
- **React & Next.js:** `React, { useState, useEffect, Suspense }` from `'react'`, `useSearchParams` from `'next/navigation'`
- **Supabase:** `createClient` from `'@/utils/supabase/client'`
- **Components:** `AdminLayoutShell` from `'@/components/AdminLayoutShell'`, `CourseManageClient` from `'@/components/CourseManageClient'`
- **Icons (`lucide-react`):** `BookOpen`, `Layers`, `PlusCircle`, `X`, `Plus`, `Loader2`, `Trash2`, `UploadCloud`, `FileText`
- **Animations:** `motion`, `AnimatePresence` from `'framer-motion'`
- **Utilities:** `invalidateCache` from `'@/utils/invalidateCache'`

---

### 2.2 Top-Level Helper Functions & Dynamic Parsers

| Function | Lines | Description & Technical Implementation |
|---|---|---|
| `loadPdfJs()` | 12–33 | Dynamically injects PDF.js CDN script (`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`) into `document.head` and configures `pdfjsLib.GlobalWorkerOptions.workerSrc`. Returns Promise resolving `window.pdfjsLib`. |
| `loadMammoth()` | 35–53 | Dynamically injects Mammoth.js CDN script (`https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js`) into `document.head` for client-side Word `.docx` parsing. |
| `extractTextWithLayout(page)` | 55–91 | Extracts PDF text layer using `page.getTextContent()`. Groups text items into lines based on Y-coordinate (`item.transform[5]`) with a `3.5px` threshold tolerance, sorts descending by Y, sorts each line horizontally by X (`item.transform[4]`), and joins lines with `\n`. |
| `parseSyllabusText(text)` | 93–143 | Parses raw extracted text into structured lesson units. Strips headers/footers, extracts duration via regex `/(?:[-–—(📎[]\s*)?(\d+)\s*(?:min|minute|hour|hr|h|m)s?[\)\]]?\s*$/i` (converting hours to minutes, default 60 mins), cleans prefixes (`"1."`, `"Lesson 1:"`, `"Module 2 -"`), and generates draft lesson objects. |

---

### 2.3 State Hook Inventory

`CoursesManagementContent` maintains **20 distinct state variables**:

| State Variable | Type | Initial Value | Purpose / Lifecycle |
|---|---|---|---|
| `courses` | `Array<Course>` | `[]` | Holds all courses fetched from Supabase `courses` table. |
| `selectedCourseId` | `string` | `''` | ID of currently selected course; synced with query params `?id=` or `?courseId=`. |
| `activeCourse` | `Course \| null` | `null` | Course object corresponding to `selectedCourseId`. |
| `activeLessons` | `Array<Lesson>` | `[]` | Lessons/curriculum units belonging to `selectedCourseId`. |
| `activeFiles` | `Array<CourseFile>` | `[]` | Attached worksheets/PDFs belonging to `selectedCourseId`. |
| `activeExams` | `Array<Assessment>` | `[]` | Linked CBT assessments belonging to `selectedCourseId`. |
| `loadingCourses` | `boolean` | `true` | Loading spinner/skeleton state during initial courses fetch. |
| `loadingCurriculum` | `boolean` | `false` | Loading spinner/skeleton state while fetching curriculum for selected course. |
| `showAddCourseModal` | `boolean` | `false` | Controls visibility of Create Course Blueprint modal. |
| `newCourseTitle` | `string` | `''` | Form input: new course title. |
| `newCourseDesc` | `string` | `''` | Form input: new course description. |
| `newCoursePrice` | `string` | `'0'` | Form input: new course price in INR. |
| `newCourseLevel` | `string` | `'foundation'` | Form input: target level (`foundation`, `mains`, `advanced`). |
| `newCourseStartDate` | `string` | `''` | Form input: start date string (`YYYY-MM-DD`). |
| `newCourseEndDate` | `string` | `''` | Form input: end date string (`YYYY-MM-DD`). |
| `isCreatingCourse` | `boolean` | `false` | Submit loading state for course creation form. |
| `showImportSyllabusModal` | `boolean` | `false` | Controls visibility of Syllabus Auto-Importer modal. |
| `syllabusLoading` | `boolean` | `false` | Loading state during PDF/Docx text extraction and parsing. |
| `draftLessons` | `Array<DraftLesson>` | `[]` | Staging list of extracted lessons for review/editing before import. |
| `isImportingSyllabus` | `boolean` | `false` | Submit loading state during bulk `lessons` insertion. |

---

### 2.4 Effects & Lifecycle

1. **Initial Mount (`Lines 292–294`):**
   ```javascript
   useEffect(() => {
     fetchCourses();
   }, [supabase]);
   ```
   Queries `courses` table ordered by `created_at DESC` on component mount.

2. **Query Parameter Synchronization (`Lines 368–377`):**
   ```javascript
   useEffect(() => {
     if (courses.length > 0) {
       if (courseIdParam) {
         handleSelectCourse(courseIdParam);
       } else {
         setSelectedCourseId('');
         setActiveCourse(null);
       }
     }
   }, [courseIdParam, courses]);
   ```
   Synchronizes selection state whenever URL search params (`id` or `courseId`) or `courses` change.

---

### 2.5 Handlers & Database Operations

| Handler | Lines | Trigger | Database / API Action | Cache Invalidation |
|---|---|---|---|---|
| `fetchCourses()` | 276–290 | Mount | `supabase.from('courses').select('*').order('created_at', { ascending: false })` | None |
| `handleSelectCourse(courseId)` | 297–339 | Dropdown change / URL sync | Fetches 3 parallel tables: <br>1. `lessons`: `.select('*').eq('course_id', courseId).order('order_index', { ascending: true })`<br>2. `course_files`: `.select('*').eq('course_id', courseId)`<br>3. `assessments`: `.select('*').eq('course_id', courseId)` | None |
| `handleDeleteCourse(courseId)` | 341–365 | Delete Course button click | `supabase.from('courses').delete().eq('id', courseId)` | `invalidateCache('catalog', courseId)`<br>`invalidateCache('course', courseId)` |
| `handleCreateCourse(e)` | 380–430 | Add Course Modal Submit | 1. `supabase.auth.getUser()`<br>2. `supabase.from('courses').insert([{ title, description, price, level, start_date, end_date, instructor_id: user.id }]).select().single()` | `invalidateCache('catalog', data.id)`<br>`invalidateCache('course', data.id)` |
| `handleSyllabusFileUpload(e)` | 177–237 | File input change (.pdf/.docx) | Browser FileReader -> PDF.js / Mammoth -> `parseSyllabusText()` -> `setDraftLessons(parsed)` | None |
| `handleImportSyllabus(e)` | 239–273 | Import Syllabus Modal Submit | `supabase.from('lessons').insert(payload)` where payload maps `draftLessons` to `course_id, title, duration_minutes, description, order_index` | `invalidateCache('course', null, selectedCourseId)` |

---

### 2.6 Render Tree & UI Sections

1. **Root Wrapper (`AdminLayoutShell`):**
   - Title: `"Syllabus & Blueprint Manager"`
   - Subtitle: `"Assemble dynamic lessons, upload reference worksheets, and orchestrate live classroom telemetry"`
2. **Top Course Selection Deck (`Lines 439–506`):**
   - Loading skeleton or active card with `<select>` dropdown.
   - Action buttons: "Import Syllabus" (conditional on selected course), "Delete Course" (conditional on selected course), and "Add Course" (always visible).
3. **Dynamic Display Workspace (`Lines 509–545`):**
   - If `loadingCurriculum`: 4-column skeleton placeholder.
   - If `!selectedCourseId`: Large dashed empty-state box `"Blueprint Workspace Inactive"`.
   - If `selectedCourseId`: Renders `<CourseManageClient key={selectedCourseId} initialCourse={activeCourse} initialLessons={activeLessons} initialFiles={activeFiles} initialExams={activeExams} />`.
4. **Create Course Modal (`Lines 549–681`):**
   - Modal dialog with Framer Motion backdrop and spring entry.
   - Form inputs: Course Title, Price (INR), Audience Level (select), Start Date, End Date, Syllabus Description.
5. **Syllabus Auto-Importer Modal (`Lines 683–896`):**
   - Loading state with spinner.
   - Drag & drop zone for `.pdf` and `.docx`.
   - Interactive data table with editable fields: Sequence index, Lesson Unit Title, Duration (mins), Description, Row deletion, and "Add Row" button.
6. **Page Root Export (`Lines 902–913`):**
   - `CoursesManagementPage` wrapping `CoursesManagementContent` in `<Suspense fallback={...}>`.

---

## 3. Package & Dependency Audit

From `package.json`:

| Package | Version | Status & Capability |
|---|---|---|
| `@tanstack/react-table` | `^9.1.2` | **Installed & Ready.** Headless datagrid core for sorting, filtering, pagination, column visibility, and row selection. |
| `framer-motion` | `^12.40.0` | **Installed & Ready.** Modern animation engine for smooth slide-out drawers, layout transitions, modal popups, and tab switching. |
| `lucide-react` | `^1.17.0` | **Installed & Ready.** Comprehensive icon set for course status, actions, metrics, and editor tools. |
| `@hello-pangea/dnd` | `^18.0.1` | **Installed.** Drag-and-drop toolkit for reordering lessons/modules. |
| `clsx` & `tailwind-merge` | `^2.1.1` / `^3.6.0` | **Installed.** Class aggregation and conflict resolution utilities. |
| `cmdk` | `^1.1.1` | **Installed.** Command palette and quick search primitives. |
| `katex` | `^0.18.1` | **Installed.** High-performance LaTeX formula rendering. |
| `recharts` | `^3.8.1` | **Installed.** Data visualization for telemetry and student scores. |
| `@supabase/supabase-js` | `^2.106.2` | **Installed.** Core Supabase client for database queries and mutations. |
| `@supabase/ssr` | `^0.10.3` | **Installed.** Server-side authentication and cookie management. |
| `next` & `react` | `16.2.6` / `19.2.4` | **Installed.** Next.js App Router with React 19. |
| `tailwindcss` | `^4` | **Installed.** Tailwind CSS v4 styling. |

---

## 4. Complete Database Schema & Entity Modeling

```
+------------------------------------------------------------------------+
|                                courses                                 |
+------------------------------------------------------------------------+
| id (UUID, PK)                                                          |
| title (TEXT)                                                           |
| description (TEXT, Nullable)                                           |
| price (NUMERIC)                                                        |
| original_price (NUMERIC, Nullable)                                     |
| level (TEXT: 'foundation' | 'mains' | 'advanced')                      |
| start_date (DATE / TIMESTAMP, Nullable)                                |
| end_date (DATE / TIMESTAMP, Nullable)                                  |
| instructor_id (UUID -> auth.users)                                     |
| instructor_name (TEXT, Nullable)                                       |
| subject (TEXT, Nullable)                                               |
| students_count (INTEGER, Default 0)                                    |
| thumbnail_url (TEXT, Nullable)                                         |
| badge (TEXT, Nullable)                                                 |
| created_at (TIMESTAMP)                                                 |
+------------------------------------------------------------------------+
       |                           |                          |
       | 1:N                       | 1:N                      | 1:N
       v                           v                          v
+-----------------------+  +-----------------------+  +-----------------------+
|        lessons        |  |     course_files      |  |      assessments      |
+-----------------------+  +-----------------------+  +-----------------------+
| id (UUID, PK)         |  | id (UUID, PK)         |  | id (UUID, PK)         |
| course_id (UUID -> FK)|  | course_id (UUID -> FK)|  | course_id (UUID -> FK)|
| title (TEXT)          |  | lesson_id (UUID -> FK)|  | lesson_id (UUID, Null)|
| duration_minutes (INT)|  | file_name (TEXT)      |  | title (TEXT)          |
| description (TEXT)    |  | file_path (TEXT / URL)|  | duration_minutes (INT)|
| order_index (INT)     |  | is_premium (BOOLEAN)  |  | type (TEXT)           |
| subject (TEXT)        |  | created_at (TIMESTAMP)|  | start_window (TS)     |
| video_url (TEXT)      |  +-----------------------+  | end_window (TS)       |
| video_source (TEXT)   |                             | created_at (TIMESTAMP)|
| video_id (TEXT)       |                             +-----------------------+
| reading_material (HTM)|                                         |
| assignment_title(TEXT)|                                         | 1:N
| assignment_url (TEXT) |                                         v
| created_at (TIMESTAMP)|                             +-----------------------+
+-----------------------+                             |       questions       |
       |                                              +-----------------------+
       | 1:N                                          | id (UUID, PK)         |
       v                                              | assessment_id (FK)    |
+-----------------------+                             | content (TEXT)        |
|     lesson_doubts     |                             | options (JSON / ARRAY)|
+-----------------------+                             | correct_option_idx(INT|
| id (UUID, PK)         |                             | marks_positive (INT)  |
| lesson_id (UUID -> FK)|                             | marks_negative (INT)  |
| user_id (UUID -> FK)  |                             +-----------------------+
| parent_id (UUID, Null)|                                         |
| content (TEXT)        |                                         | 1:N
| resolved (BOOLEAN)    |                                         v
| created_at (TIMESTAMP)|                             +-----------------------+
+-----------------------+                             |  assessment_attempts  |
                                                      +-----------------------+
                                                      | id (UUID, PK)         |
                                                      | assessment_id (FK)    |
                                                      | user_id (UUID -> FK)  |
                                                      | score (NUMERIC)       |
                                                      | started_at / subm_at  |
                                                      | answers_payload (JSON)|
                                                      +-----------------------+
```

---

## 5. Architectural Pain Points & Redesign Opportunity

### 5.1 Legacy Architecture Flaws
1. **Monolithic Bloat:** 913 lines in a single file combining page routing, layout, file parsing scripts, 20 state hooks, modals, and tables.
2. **Poor Empty State UX:** Selecting a course from a dropdown creates an empty blank screen on entry, forcing unnecessary cognitive friction.
3. **No Quick Overview:** Admins cannot see course catalog metrics (number of lessons, price, level, date, duration) at a glance without selecting each one individually.
4. **Disjointed Modals:** The syllabus import and course creation logic are trapped inside `page.js`.

### 5.2 Target Component Architecture

```
src/app/courses/
├── page.js                       # Lightweight orchestrator (~80 lines)
├── components/
│   ├── CourseGrid.jsx            # TanStack Data Grid with search, sorting, stats & actions
│   ├── CourseEditorDrawer.jsx    # Slide-out Framer Motion drawer for editing course, syllabus, files, exams
│   ├── CourseCreateModal.jsx     # Course blueprint creation modal dialog
│   ├── SyllabusImportModal.jsx   # Encapsulated PDF/Docx parser and editable preview table
│   └── CourseStatusBadge.jsx     # Reusable level / status indicator badges
```

---

## 6. Verification and Inspection Checklist

- [x] Analyzed all 913 lines of `src/app/courses/page.js`.
- [x] Verified all package dependencies in `package.json`.
- [x] Traced all Supabase queries, table schemas, mutations, and cache invalidation hooks.
- [x] Identified all UI sections, state variables, and handlers.
- [x] Prepared component teardown specification for the redesign team.
