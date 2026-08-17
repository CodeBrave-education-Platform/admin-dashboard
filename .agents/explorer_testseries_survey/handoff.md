# Comprehensive Architectural Survey & Gap Analysis Report: Test Series Subsystem

**Author:** Explorer Agent (`explorer_testseries_survey`)  
**Working Directory:** `D:\admin dashboard\.agents\explorer_testseries_survey`  
**Target Codebase:** `D:\admin dashboard`  
**Reference Architecture:** Courses Management Subsystem (`src/app/courses/page.js`, `src/components/courses/CourseGrid.jsx`, `CourseEditorDrawer.jsx`)  
**Date:** August 17, 2026

---

## 1. Observation

Direct empirical observations from the codebase across all files, components, routing, database tables, and queries:

### 1.1 Complete File Inventory (Test Series & Related Modules)

| File Path | Role / Purpose | Type / Tech |
|:---|:---|:---|
| `src/app/admin/test-series/page.js` | Server page entry for Test Series Dashboard. Performs SSR queries for packages, attempts, and exams. | Next.js Server Component |
| `src/app/admin/test-series/TestSeriesManageClient.jsx` (796 lines) | Monolithic client controller for test packages listing, package selection, inline exam listing, Add/Edit modal, and deletion dialogs. | Next.js Client Component, Framer Motion |
| `src/app/admin/test-series/compiler/page.js` | Dedicated page wrapper for CBT exam authoring and compilation. | Next.js Server Component |
| `src/app/admin/test-series/compiler/CompilerClient.jsx` (698 lines) | Multi-column client for question authoring (LaTeX/Markdown), question pool filtering, and exam compilation. | Next.js Client Component |
| `src/components/TestCompiler.jsx` (914 lines) | Standalone/embedded version of exam compiler rendered inline inside `TestSeriesManageClient.jsx` when expanding an exam row. | Next.js Client Component |
| `src/app/admin/test-series/monitor/[examId]/page.js` | Route wrapper verifying admin/instructor permissions and loading target exam metadata. | Next.js Server Component |
| `src/app/admin/test-series/monitor/[examId]/MonitorClient.jsx` (185 lines) | Live CBT proctoring dashboard with 5s auto-polling, Recharts score bell curve, and student submissions log. | Next.js Client Component, Recharts |
| `src/app/api/admin/test-series/telemetry/route.js` (108 lines) | API route querying Upstash Redis for active test takers (`asentra:test:active:${examId}:*`) and Supabase for score distributions. | Next.js Route Handler |
| `src/components/UniversalPdfImporterModal.jsx` (544 lines) | Dual-mode PDF exam parser (Gemini Multimodal Base64 OCR / Deterministic table parser) for batch question extraction. | Next.js Client Component, PDF.js |
| `src/app/admin/questions/QuestionBankClient.jsx` (558 lines) | Central question bank repository managing the global `questions` table. | Next.js Client Component |
| `src/app/admin/invoices/InvoiceAuditClient.jsx` (230 lines) | Financial auditor mapping orders & subscriptions across courses, books, batches, and `test_packages`. | Next.js Client Component |
| `src/components/AdminLayoutShell.jsx` (353 lines) | Global admin shell providing sidebar navigation, dynamic counts, and command palette. | Next.js Layout Shell |
| `src/components/courses/CourseGrid.jsx` (683 lines) | **Gold Standard Reference**: TanStack Data Grid with Omnibar search, level/status filters, sorting, bulk select, and action pills. | TanStack Table v9 / Framer Motion |
| `src/components/courses/CourseEditorDrawer.jsx` (874 lines) | **Gold Standard Reference**: Multi-tab slide-out drawer (Overview, Syllabus, Files, Exams, Live Doubts) with cache invalidation. | Framer Motion / Supabase |

---

### 1.2 Current UI Architecture & Interaction Patterns

1. **Page Layout (`TestSeriesManageClient.jsx` lines 276–568)**:
   - Built as an asymmetric 3-column desktop layout (`grid-cols-1 lg:grid-cols-3`):
     - **Left Columns (Col 1 & 2)**:
       - Header with "Sync Blueprints" and "New Test Package" buttons.
       - Grid of test package cards (`grid-cols-1 sm:grid-cols-2`).
       - Below the cards: An expandable "Package Console" that renders the list of `test_exams` when a package card is clicked (`selectedPackageId`).
       - Inside each exam row: A "Manage" toggle button that expands an inline `<TestCompiler />` instance inside an `AnimatePresence` accordion (lines 495–509).
     - **Right Column (Col 3)**:
       - "Recent CBT Attempts" sidebar card showing the 10 most recent submissions with score, exam title, duration, and student name.
2. **Current Interaction & State Flow**:
   - Creating a package triggers `showAddPackageModal` (lines 570–783), which opens a centered popup modal containing a 3-step vertical form:
     - 1. Basic Details (Title, Competitive Tag, Campus Branch)
     - 2. Marketing Details (Thumbnail URL + preview, Description)
     - 3. Commercials & Access (Chapter Drills, Full Mocks, Live Papers, Premium toggle, Selling Price, Original Price).
   - Authoring an exam requires either:
     - Navigating away to `/admin/test-series/compiler?packageId=...`, OR
     - Expanding an exam row inline within the dashboard, which mounts `TestCompiler.jsx` (a heavy 914-line component) inside the card container.
   - Proctoring an exam redirects the browser to a completely separate subpage (`/admin/test-series/monitor/[examId]`).
3. **Current Interaction Flaws & UX Deficiencies**:
   - **Monolithic & Fragmented**: Test Series is split across 3 separate page routes (`/admin/test-series`, `/admin/test-series/compiler`, `/admin/test-series/monitor/[examId]`) with duplicate code between `TestCompiler.jsx` and `CompilerClient.jsx`.
   - **No Data Grid**: Package listing is rendered as large, clunky card tiles with no column sorting, no pagination, no multi-select, and no omnibar search.
   - **No Slide-Out Drawer**: Detailed configuration, exam compilation, question banking, and live telemetry are not unified into a modern slide-out drawer workspace like Courses.
   - **Inconsistent Modals & Confirmations**: Package deletion uses `ConfirmDialogModal` (lines 185–201), but exam deletion uses raw `window.confirm` (lines 206–208) and `alert()`.
   - **Hydration Warning Risks**: Dates are formatted with custom helpers without `suppressHydrationWarning` on some elements.

---

### 1.3 Supabase Database Schema & Query Inventory

The Test Series subsystem interacts with 5 primary tables:

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│          test_packages          │           │           test_exams            │
├─────────────────────────────────┤           ├─────────────────────────────────┤
│ id (uuid/text) PK               │ 1       * │ id (uuid) PK                    │
│ title (text)                    │──────────<│ package_id (uuid) FK            │
│ target_exam_tag (text)          │           │ title (text)                    │
│ description (text)              │           │ duration_minutes (int4)         │
│ thumbnail_url (text)            │           │ total_questions (int4)          │
│ test_distribution (jsonb)       │           │ marks_scheme (jsonb)            │
│ price_ledger (jsonb)            │           │ is_live_ranking (bool)          │
│ total_tests_count (int4)        │           │ activation_timestamp (tstz)     │
│ created_at (tstz)               │           │ questions (jsonb)               │
└─────────────────────────────────┘           │ created_at (tstz)               │
                 ▲                            └─────────────────────────────────┘
                 │ 1                                           ▲ 1
                 │                                             │
                 │ *                                           │ *
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│            invoices             │           │          test_attempts          │
├─────────────────────────────────┤           ├─────────────────────────────────┤
│ id (uuid) PK                    │           │ id (uuid) PK                    │
│ package_id (uuid) FK            │           │ exam_id (uuid) FK               │
│ user_id (uuid) FK -> profiles   │           │ user_id (uuid) FK -> profiles   │
│ amount_paid (numeric)           │           │ score (int4/numeric)            │
│ status (text)                   │           │ total_duration_seconds (int4)   │
│ invoice_date (tstz)             │           │ started_at (tstz)               │
│ razorpay_payment_id (text)      │           │ completed_at (tstz)             │
└─────────────────────────────────┘           └─────────────────────────────────┘

┌─────────────────────────────────┐
│         test_questions          │ (Global Pool for Test Series Compiler)
├─────────────────────────────────┤
│ id (uuid/text) PK               │
│ subject (text)                  │  Physics | Chemistry | Mathematics | Biology
│ sub_topic (text)                │  e.g. "Rotational Dynamics", "Electrostatics"
│ difficulty (text)               │  easy | medium | hard | HARD
│ section (text)                  │  Section A | Section B | PYQ
│ question_type (text)            │  single | multiple | integer | match | blanks
│ content (text)                  │  Markdown question stem + LaTeX equations
│ options (jsonb/text[])          │  Array of 4 option strings or match items
│ correct_option_index (int4/any) │  Index of correct choice (or text/array)
│ marks_positive (int4)           │  Default: 4
│ marks_negative (int4)           │  Default: -1
│ created_at (tstz)               │
└─────────────────────────────────┘
```

#### Supabase Queries & Mutation Signatures Observed in Code:

1. **Fetch Packages with Exams Count / Details**:
   ```javascript
   // src/app/admin/test-series/page.js:17-21
   const { data: dbPackages } = await supabase
     .from('test_packages')
     .select('*, test_exams(*)')
     .order('created_at', { ascending: false });
   ```
2. **Fetch Recent Attempts with Student Profiles**:
   ```javascript
   // src/app/admin/test-series/page.js:27-32
   const { data: dbAttempts } = await supabase
     .from('test_attempts')
     .select('*, test_exams(title), profiles(full_name, email)')
     .order('started_at', { ascending: false })
     .limit(10);
   ```
3. **Insert / Update Test Package**:
   ```javascript
   // src/app/admin/test-series/TestSeriesManageClient.jsx:154-172
   // Update:
   const { data, error } = await supabase
     .from('test_packages')
     .update({
       title, target_exam_tag, description, thumbnail_url,
       test_distribution: { chapter_drills, full_mocks, live_papers },
       price_ledger: { status, price, original_price }
     })
     .eq('id', editingPackage.id)
     .select().single();

   // Insert:
   const { data, error } = await supabase
     .from('test_packages')
     .insert([{ ...payload, total_tests_count: 0 }])
     .select().single();
   ```
4. **Delete Test Package**:
   ```javascript
   // src/app/admin/test-series/TestSeriesManageClient.jsx:192
   await supabase.from('test_packages').delete().eq('id', pkgId);
   ```
5. **Compile Exam Blueprint (Insert with Embedded Questions JSONB)**:
   ```javascript
   // src/components/TestCompiler.jsx:315-331
   const { data: newExam, error: examErr } = await supabase
     .from('test_exams')
     .insert([{
       package_id: targetPackageId,
       title: examTitle.trim(),
       duration_minutes: parseInt(examDuration) || 180,
       total_questions: selectedQuestions.length,
       marks_scheme: { positive_marks: 4, negative_marks: -1 },
       is_live_ranking: isLiveRanking,
       activation_timestamp: new Date(activationTimestamp).toISOString(),
       questions: selectedQuestions // Embedded JSONB array
     }])
     .select().single();
   ```
6. **Fetch Question Pool with Filters**:
   ```javascript
   // src/components/TestCompiler.jsx:134-146
   let query = supabase.from('test_questions').select('*');
   if (poolSubject !== 'All') query = query.eq('subject', poolSubject);
   if (poolDifficulty !== 'All') query = query.eq('difficulty', poolDifficulty);
   if (poolSearch) query = query.ilike('content', `%${poolSearch}%`);
   const { data, error } = await query.order('created_at', { ascending: false });
   ```
7. **Fetch Live Telemetry Submissions for Proctoring**:
   ```javascript
   // src/app/admin/test-series/monitor/[examId]/MonitorClient.jsx:41-45
   const { data: dbAttempts } = await supabase
     .from('test_attempts')
     .select('*, profiles(full_name, email)')
     .eq('exam_id', exam.id)
     .order('completed_at', { ascending: false });
   ```

---

### 1.4 Detailed Field Inventory & Data Schema Specifications

| Entity | Field Name | Data Type | Validation Rules | Description / Enums |
|:---|:---|:---|:---|:---|
| `test_packages` | `id` | `UUID` / `TEXT` | Primary Key, Non-null | Unique identifier |
| `test_packages` | `title` | `TEXT` | `required`, `trim()`, min 3 chars | e.g. "JEE Main High-Yield Mock Series 2026" |
| `test_packages` | `target_exam_tag`| `TEXT` | `required`, enum | `'JEE Main'`, `'JEE Advanced'`, `'NEET'`, `'KVPY'`, `'Foundation'` |
| `test_packages` | `description` | `TEXT` | `optional`, multiline text | Package highlights and proctoring info |
| `test_packages` | `thumbnail_url` | `TEXT` | URL string or placeholder | Banner image preview |
| `test_packages` | `total_tests_count`| `INTEGER` | `>= 0`, default `0` | Calculated or maintained sum of compiled exams |
| `test_packages` | `test_distribution`| `JSONB` | Valid JSON object | `{ chapter_drills: int, full_mocks: int, live_papers: int }` |
| `test_packages` | `price_ledger` | `JSONB` | Valid JSON object | `{ status: 'free' \| 'premium', price: number, original_price: number }` |
| `test_packages` | `created_at` | `TIMESTAMPTZ` | Auto-generated timestamp | Record creation timestamp |
| `test_exams` | `id` | `UUID` | Primary Key, Non-null | Unique exam blueprint ID |
| `test_exams` | `package_id` | `UUID` / `TEXT` | FK references `test_packages.id` | Associated test package |
| `test_exams` | `title` | `TEXT` | `required`, min 3 chars | e.g. "JEE Main Full Mock Test #01 (NTA Pattern)" |
| `test_exams` | `duration_minutes`| `INTEGER` | `required`, `> 0`, default `180` | Exam timer in minutes |
| `test_exams` | `total_questions`| `INTEGER` | `>= 0`, matches `questions.length`| Total question count in paper |
| `test_exams` | `marks_scheme` | `JSONB` | Valid JSON object | `{ positive_marks: int, negative_marks: int }` (e.g. `+4 / -1`) |
| `test_exams` | `is_live_ranking`| `BOOLEAN` | Default `true` | Enables real-time leaderboard computation |
| `test_exams` | `activation_timestamp`| `TIMESTAMPTZ` | `required`, ISO-8601 | Scheduled test opening time |
| `test_exams` | `questions` | `JSONB` | JSON array of question objects | Compiled serialized exam questions |
| `test_questions` | `id` | `UUID` / `TEXT` | Primary Key, Non-null | Unique question ID |
| `test_questions` | `subject` | `TEXT` | `required`, enum | `'Physics'`, `'Chemistry'`, `'Mathematics'`, `'Biology'` |
| `test_questions` | `sub_topic` | `TEXT` | `required`, string | Chapter / Concept name |
| `test_questions` | `difficulty` | `TEXT` | enum | `'easy'`, `'medium'`, `'hard'`, `'HARD'` |
| `test_questions` | `section` | `TEXT` | string | `'Section A'`, `'Section B'`, `'PYQ'` |
| `test_questions` | `question_type` | `TEXT` | enum | `'single'`, `'multiple'`, `'integer'`, `'match'`, `'blanks'` |
| `test_questions` | `content` | `TEXT` | `required`, LaTeX / Markdown | Question stem text and formulas |
| `test_questions` | `options` | `JSONB` / `TEXT[]`| 4 elements for single/multiple | Option strings `[A, B, C, D]` |
| `test_questions` | `correct_option_index` | `INT` / `ANY` | 0-3 or key value | Correct answer key |
| `test_questions` | `marks_positive`| `INTEGER` | Default `4` | Marks awarded for correct answer |
| `test_questions` | `marks_negative`| `INTEGER` | Default `-1` | Negative marking penalty |
| `test_attempts` | `id` | `UUID` | Primary Key | Unique attempt instance |
| `test_attempts` | `exam_id` | `UUID` | FK references `test_exams.id` | Target exam |
| `test_attempts` | `user_id` | `UUID` | FK references `profiles.id` | Student ID |
| `test_attempts` | `score` | `INTEGER` / `NUMERIC` | Score points earned | Student final score |
| `test_attempts` | `total_duration_seconds` | `INTEGER` | Time taken in seconds | Total attempt time |
| `test_attempts` | `started_at` | `TIMESTAMPTZ` | ISO timestamp | Session start timestamp |
| `test_attempts` | `completed_at` | `TIMESTAMPTZ` | ISO timestamp | Session completion timestamp |

---

### 1.5 Exhaustive Supported Actions Catalog

| Action | Caller Component | Database Mutation / Endpoint | Cache Invalidation / Feedback |
|:---|:---|:---|:---|
| **Create Package** | `TestSeriesManageClient` | `INSERT INTO test_packages` | Optimistic state prepend, modal close |
| **Update Package** | `TestSeriesManageClient` | `UPDATE test_packages WHERE id = ...` | Local state mapping, modal close |
| **Delete Package** | `TestSeriesManageClient` | `DELETE FROM test_packages WHERE id = ...` | `ConfirmDialogModal`, selection reset |
| **Compile/Publish Exam** | `TestCompiler` / `CompilerClient` | `INSERT INTO test_exams` & `UPDATE test_packages.total_tests_count` | Alert notification, blueprint reset |
| **Update Exam Blueprint**| `TestCompiler` | `UPDATE test_exams SET questions = ... WHERE id = ...` | Alert notification |
| **Delete Exam** | `TestSeriesManageClient` | `DELETE FROM test_exams WHERE id = ...` & decrement package count | `window.confirm`, local exam filter |
| **Save Question to Pool**| `TestCompiler` / `CompilerClient` | `INSERT INTO test_questions` | Form reset, question pool re-fetch |
| **AI Question Ingestion**| `UniversalPdfImporterModal` | `POST /api/admin/ai/parse-pdf` -> Local state | Ingests into blueprint & question pool |
| **Fetch Live Telemetry** | `MonitorClient` | `GET /api/admin/test-series/telemetry?examId=...` & `SELECT test_attempts` | 5-second polling loop, bell curve update |
| **Invoice / Purchase Sync**| `InvoiceAuditClient` | `SELECT FROM invoices WHERE package_id IS NOT NULL` | Financial summary tally |

---

## 2. Logic Chain

From the direct observations above, we deduce the following architectural facts and design requirements:

1. **Observation**: In `src/app/courses/page.js`, the Courses dashboard is unified into a single clean route with a top Metric Summary Ribbon, a responsive TanStack Data Grid (`CourseGrid.jsx`), and a slide-out drawer (`CourseEditorDrawer.jsx`) containing multi-tab subresource management (Overview, Syllabus Tree, Files, Exams, Doubts).
2. **Observation**: Test Series in `src/app/admin/test-series/` currently suffers from high UI fragmentation across separate pages (`/admin/test-series`, `/admin/test-series/compiler`, `/admin/test-series/monitor/[examId]`) and monolithic 800+ line files with clunky card-based listing.
3. **Logic**: The Test Series user experience can be dramatically streamlined and elevated by adopting the exact same pattern established in Courses:
   - Root page `src/app/admin/test-series/page.js` hosting a Metric Summary Ribbon (`TestSeriesStatsHeader.jsx`), TanStack Table Grid (`TestSeriesGrid.jsx`), and Slide-Out Drawer (`TestSeriesEditorDrawer.jsx`).
   - The Slide-Out Drawer can encapsulate all sub-operations into 5 tabs:
     - **Tab 1: Overview & Commercials** (Title, Tag, Thumbnail, Description, Drills/Mocks/Live distribution, Pricing Ledger).
     - **Tab 2: Exam Blueprints** (List of compiled `test_exams`, status tags [Scheduled/Live], question count, duration, action buttons).
     - **Tab 3: Exam Compiler & Question Pool** (Integrated authoring form, AI PDF question importer, search & select from `test_questions`, mark allocation).
     - **Tab 4: Live Telemetry & Proctoring Cockpit** (Embedded live stats, Redis concurrent users, score bell curve, Recharts visualization).
     - **Tab 5: Candidate Submissions & Gradebook** (Student attempt logs, scores, duration, timestamp).
4. **Logic**: Eliminating duplicate components (`TestCompiler.jsx` vs `CompilerClient.jsx`) into modular drawer tabs reduces code maintenance overhead while providing a zero-context-switch admin experience.
5. **Logic**: Introducing URL deep linking (`/admin/test-series?id=[packageId]&tab=[tabName]`) enables bookmarking, direct navigation from sidebar, and seamless browser history support.

---

## 3. Caveats & Edge Cases

1. **Dual Question Models**: The codebase contains two distinct question tables: `test_questions` (used for CBT test series with sections and LaTeX/Markdown math stems) and `questions` (used for course assessments and central question bank). The redesign should preserve `test_questions` and `test_exams.questions` JSONB structure without breaking legacy CBT runners.
2. **Redis Telemetry Dependency**: The Live Proctoring monitor relies on Upstash Redis keys formatted as `asentra:test:active:${examId}:*`. If Redis credentials are absent or fail, the telemetry route gracefully falls back to Supabase `test_attempts` without crashing.
3. **Hydration Protection**: Date formatting helpers (`formatDate`) must use client-safe mounting or `suppressHydrationWarning` to prevent Next.js SSR/CSR timestamp mismatch warnings.
4. **Toast Notification Consistency**: Replace all legacy `window.confirm` and `alert()` calls with `ConfirmDialogModal` and the application's `useToast()` hook.
5. **Scope Boundary**: As an Explorer agent, this report provides the authoritative specification and architectural survey; no production code modifications have been made.

---

## 4. Conclusion & Target Architecture Blueprint

### 4.1 Proposed Component Architecture

The redesigned Test Series module will consist of the following focused component hierarchy:

```
src/
├── app/
│   └── admin/
│       └── test-series/
│           └── page.js                     # High-performance Page Controller (SSR + Deep Linking)
└── components/
    └── test-series/
        ├── TestSeriesStatsHeader.jsx       # Ribbon with 5 dynamic metrics (Total Packages, Total Exams, Active Candidates, Premium Packages, Avg Score)
        ├── TestSeriesGrid.jsx              # TanStack Table v9 Data Grid with Omnibar, tag/price filters, sorting, bulk select
        ├── TestSeriesEditorDrawer.jsx      # Framer Motion slide-out drawer with 5 tabs
        │   ├── tabs/
        │   │   ├── PackageOverviewTab.jsx  # Basic info, distribution numbers, marketing, pricing ledger
        │   │   ├── PackageExamsTab.jsx     # Exam blueprints list with status badges & compiler trigger
        │   │   ├── ExamCompilerTab.jsx     # Integrated question authoring, AI PDF importer, pool search & selection
        │   │   ├── LiveTelemetryTab.jsx    # Real-time concurrent stats, Recharts score bell curve
        │   │   └── SubmissionsTab.jsx      # Student attempt logs with duration & scorecard drilldown
        ├── TestSeriesCreateModal.jsx       # Fast modal for establishing new test package blueprints
        └── TestSeriesFilters.jsx           # Omnibar search + Exam Tag & Price status pill filters
```

### 4.2 State Transition & Flow Specification

```
[User Lands on /admin/test-series]
       │
       ▼
[Fetch Packages, Exams, Attempts, Invoices via Supabase]
       │
       ▼
[Render TestSeriesStatsHeader & TestSeriesGrid]
       │
       ├─► [Click "New Test Package"] ────► Opens TestSeriesCreateModal ──► Optimistic insert & open Drawer
       │
       ├─► [Filter Omnibar / Tag Pills] ──► Filter TanStack rows (JEE Main, Advanced, NEET, Free, Premium)
       │
       ├─► [Toggle Package Active/Status] ► Optimistic toggle + Supabase update + Toast
       │
       └─► [Click Any Package Row] ───────► router.replace('?id=pkg-id')
                                                   │
                                                   ▼
                                     [TestSeriesEditorDrawer slides out]
                                                   │
                                ┌──────────────────┼──────────────────┬──────────────────┐
                                ▼                  ▼                  ▼                  ▼
                         [Overview Tab]      [Exams Tab]       [Telemetry Tab]    [Submissions]
                                                   │
                                                   ▼
                                         [Launch Exam Compiler]
                                                   │
                                                   ▼
                                    [Author / Select Questions / AI PDF Ingest]
                                                   │
                                                   ▼
                                      [Compile & Save Blueprint]
```

---

## 5. Verification Method

To independently verify the survey findings and validate future implementations:

1. **Verify Files & Routes**:
   ```bash
   # Inspect existing route files
   ls -la "src/app/admin/test-series"
   ls -la "src/app/admin/test-series/compiler"
   ls -la "src/app/admin/test-series/monitor/[examId]"
   ```
2. **Verify Database Schema Queries**:
   - Check `supabase/migrations/01_production_rls_security.sql` lines 5–38 to confirm RLS policies for `test_packages`, `test_exams`, and `test_questions`.
   - Verify table column definitions in `TestSeriesManageClient.jsx` (lines 136–172) and `TestCompiler.jsx` (lines 315–331).
3. **Verify Reference Architecture Integrity**:
   - Compare `src/app/courses/page.js` lines 1–296 against `src/components/courses/CourseGrid.jsx` to verify TanStack Table setup, column definitions, and drawer props.
4. **Automated Verification Command**:
   ```powershell
   # Run project build to confirm no compilation or syntax errors
   npm run build
   ```

---
*Report generated and self-verified by Teamwork Explorer Agent.*
