# Batches Architectural Survey & Gap Analysis Report

## Executive Summary
An in-depth architectural survey of the Batches module across the `D:\admin dashboard` codebase was conducted. The current implementation in `src/app/batches/page.js` is a 2,254-line monolithic file relying on a legacy dropdown-selector pattern, embedded client-side regex PDF parsing, and browser `alert`/`confirm` dialogs. In contrast, the modern Courses module (`src/app/courses/page.js`, `CourseGrid.jsx`, `CourseEditorDrawer.jsx`) uses TanStack Table v9, Framer Motion slide-out drawers, metric summary ribbons, omnibar filtering, `useToast`, and `ConfirmDialogModal`. 

This report provides the complete file inventory, UI interaction patterns, database schema & PostgREST queries, detailed field definitions, supported operations, and a complete architectural blueprint for dismantling the monolithic `page.js` into modular components (`BatchStatsHeader.jsx`, `BatchGrid.jsx`, `BatchEditorDrawer.jsx`, `BatchCreateModal.jsx`, `BatchRosterImportModal.jsx`, `StudentTelemetryModal.jsx`).

---

# 1. Observation

### 1.1 Existing File Footprint & Architecture
1. **Primary Monolithic Page**: `D:\admin dashboard\src\app\batches\page.js`
   - **Line count**: 2,254 lines (108,512 bytes).
   - **Pattern**: Monolithic client component (`'use client'`) containing data fetching, state management, 5 tab views, 3 modal dialogs, and embedded legacy OCR/regex parsers for both MCQ test papers and student rosters.
2. **Sidebar & Navigation Integration**: `D:\admin dashboard\src\components\AdminLayoutShell.jsx`
   - Line 24: Navigation item `{ label: 'Live Classes', href: '/batches', icon: Radio }`.
   - Lines 125–158: Dynamic sidebar section querying `supabase.from('batches').select('id, title').order('title', { ascending: true })` and rendering active batch deep-links.
3. **Cross-Module References**:
   - `D:\admin dashboard\src\app\admin\invoices\InvoiceAuditClient.jsx` (Lines 26–28, 88, 127): Queries `batches.title` for invoice reconciliation under category `'Cohort Batch'`.
   - `D:\admin dashboard\src\components\AdminDashboardClient.jsx` (Line 84): Queries `batch_enrollments` for student dashboard analytics.
   - `D:\admin dashboard\src\utils\invalidateCache.js` (Lines 35–45): Cache invalidation server action `invalidateCache('batch', null, batchId)` purging Redis key `asentra:batch:meta:${batchId}` and dispatching cache-busting webhooks.
4. **Courses Reference Implementation (Benchmark Standard)**:
   - `D:\admin dashboard\src\app\courses/page.js` (296 lines): Controller page coordinating TanStack table data, URL sync (`?id=...`), metric ribbon, drawer state, and confirmation modals.
   - `D:\admin dashboard\src\components\courses/CourseGrid.jsx` (683 lines): TanStack Table v9 (`@tanstack/react-table/legacy`), omnibar search, filter pills, multi-column sorting, pagination, CSV export, inline status toggle.
   - `D:\admin dashboard\src\components\courses/CourseEditorDrawer.jsx` (874 lines): Framer Motion slide-out drawer with tabs (Overview, Syllabus, Files, Exams, Live Doubts).
   - `D:\admin dashboard\src\components\courses/CourseCreateModal.jsx` (351 lines): Modal for creating new course blueprints with auto-generated slugs.
   - `D:\admin dashboard\src\components\courses/CourseFilesManager.jsx` (13.5 KB) & `SyllabusTreeEditor.jsx` (31.9 KB).

---

### 1.2 Current UI Components & Interaction Patterns in Batches (`src/app/batches/page.js`)
- **Batch Selector Dropdown (Lines 1023–1074)**:
  - Uses `<select value={selectedBatchId}>` with `-- Choose Batch --` dropdown.
  - If no batch is selected, renders a large blank card: *"No Batch Selected. Please select a learning cohort to display student profiles and registration statistics."* (Lines 1082–1088).
- **Batch Details Summary Panel (Lines 1093–1127)**:
  - Dark container with grid background pattern displaying status badge (`{batchDetails.status} cohort`), title, description, launch date (`new Date(batchDetails.start_date).toLocaleDateString()`), and price (`INR {batchDetails.price}`).
- **Tabs Navigation (Lines 1131–1154)**:
  - 5 tabs: `students` ("Students Roster"), `materials` ("Material Vault"), `live` ("Live Coordinator"), `exams` ("Exam Scheduler"), `settings` ("Configuration Settings").
- **Tab 1: Students Roster (Lines 1156–1212)**:
  - Displays count and an "Import Roster (PDF/Word)" button.
  - Student card grid (avatar initials, name, email, target focus badge: NEET vs JEE).
  - Clicking a student card opens the `selectedStudent` modal with bento telemetry cards (preferred subjects, daily study hours, mock exam average, syllabus covered, phone, dream college, mentor).
- **Tab 2: Material Vault (Lines 1214–1319)**:
  - Split layout: List of `course_files` (`file_name`, `file_path`, `is_premium` badge, delete button) on left; form (`newMaterialName`, `newMaterialPath`, `newMaterialIsPremium` checkbox) on right.
- **Tab 3: Live Coordinator (Lines 1321–1460)**:
  - Split layout: List of `live_sessions` (`title`, date, start time, duration minutes, meeting URL link, delete button) on left; form (`newLiveTitle`, `newLiveDate`, `newLiveStartTime`, `newLiveEndTime`, `newLiveRoomUrl`) on right.
- **Tab 4: Exam Scheduler (Lines 1462–1750)**:
  - Split layout: List of scheduled `assessments` (title, start window, end window, status pill: Upcoming / Active/Open / Expired, unschedule button) on left.
  - Dual-mode right column:
    - *Link Existing*: Select assessment from dropdown, enter start/end datetime-local windows.
    - *AI PDF Importer*: Client-side PDF upload with embedded PDF.js + regex parser (`parseExtractedText`), draft question review list, duration, exam type, start/end windows.
- **Tab 5: Configuration Settings (Lines 1752–1825)**:
  - Edit form for `editTitle`, `editPrice`, `editStartDate`, `editStatus` (Draft / Published), `editDesc`.
- **Modals in Batches Page**:
  - `showAddBatchModal` (Lines 1954–2075): Create Cohort Batch modal.
  - `showImportRosterModal` (Lines 2078–2239): Drag-and-drop document upload (PDF, DOCX, TXT, CSV), client-side text parsing (`parseRosterText`), preview table, commit via Supabase RPC `import_batch_roster`.
  - `selectedStudent` (Lines 1832–1951): Student Telemetry Modal overlay with Framer Motion animations.

---

### 1.3 Database Schema & Supabase Integrations

| Table / RPC | Schema Location | Columns / Arguments | Used In Batches Operations |
|---|---|---|---|
| `public.batches` | `supabase/migrations/08_hybrid_analytics.sql`, `09_ops_security_patch.sql`, `12_admin_teacher_rls_policies.sql` | `id` (uuid, PK), `title` (text, not null), `description` (text), `start_date` (timestamptz, not null), `status` (text: 'draft', 'published', 'archived'), `price` (numeric, not null), `deleted_at` (timestamptz, nullable) | Fetch all batches, insert new batch, update settings, soft/hard delete, toggle status |
| `public.batch_enrollments` | `08_hybrid_analytics.sql`, `12_admin_teacher_rls_policies.sql` | `id` (uuid, PK), `user_id` (uuid, FK -> `profiles.id` / `auth.users.id`), `batch_id` (uuid, FK -> `batches.id`), `status` (text: 'active', 'revoked'), `created_at` (timestamptz) | Fetch enrolled students joined with `profiles(*)`, unenroll student |
| `public.course_files` | `05_lms_schema.sql`, `batches/page.js` (lines 680, 791, 822) | `id` (uuid, PK), `file_name` (text), `file_path` (text), `is_premium` (bool), `batch_id` (uuid, FK), `course_id` (uuid, nullable) | Vault materials list, insert material, delete material |
| `public.live_sessions` | `05_lms_schema.sql`, `batches/page.js` (lines 697, 854, 888) | `id` (uuid, PK), `title` (text), `meeting_url` (text), `scheduled_start` (timestamptz), `duration_minutes` (int), `status` (text), `batch_id` (uuid, FK) | Live classes coordinator list, schedule session, delete session |
| `public.assessments` | `05_lms_schema.sql`, `12_admin_teacher_rls_policies.sql`, `batches/page.js` (lines 715, 915, 956) | `id` (uuid, PK), `title` (text), `duration_minutes` (int), `type` (text), `start_window` (timestamptz), `end_window` (timestamptz), `batch_id` (uuid, FK) | Scheduled assessments list, link existing exam, unschedule exam, create PDF exam |
| `public.questions` | `05_lms_schema.sql`, `batches/page.js` (line 562) | `id` (uuid, PK), `assessment_id` (uuid, FK), `content` (text), `options` (text[]), `correct_option_index` (int), `marks_positive` (int), `marks_negative` (int) | Ingest questions created during PDF exam import |
| `public.profiles` | `00_profiles.sql`, `batches/page.js` (lines 753, 1878–1935) | `id`, `full_name`, `email`, `phone`, `role`, `target_focus`, `academic_batch`, `preferred_subjects`, `daily_study_hours`, `test_average`, `syllabus_progress`, `dream_college`, `study_mentor` | Student telemetry modal details |
| RPC `import_batch_roster` | `batches/page.js` (lines 649–654) | `_batch_id` (uuid), `_emails` (text[]), `_names` (text[]), `_focuses` (text[]) | Bulk user account provisioning and batch enrollment from roster file |

---

### 1.4 Detailed Field Inventory

#### 1. Batch Entity (`batches`)
- `id` (UUID): Primary key.
- `title` (String, Required): Name of the cohort batch (e.g., *"JEE 2027 Alpha Rankers Cohort"*).
- `description` (Text, Optional): Target focus, prerequisites, curriculum roadmap summary.
- `start_date` (Timestamp / ISO String, Required): Cohort commencement date.
- `price` (Numeric / Currency, Required, Default 0): Enrolment fee in INR (`₹`).
- `status` (Enum String): `'draft'` | `'published'` | `'archived'`.
- `deleted_at` (Timestamp, Nullable): Soft delete tracking.

#### 2. Aggregated Metadata (Computed on Fetch)
- `students_count` (Number): Active enrollment count from `batch_enrollments`.
- `materials_count` (Number): Attached files count from `course_files`.
- `live_sessions_count` (Number): Scheduled class count from `live_sessions`.
- `exams_count` (Number): Attached assessments count from `assessments`.

#### 3. Live Session Entity (`live_sessions`)
- `id` (UUID)
- `title` (String, Required): Class title (e.g., *"Rotational Dynamics Doubt Session"*).
- `scheduled_start` (Timestamp, Required): Start date & time.
- `duration_minutes` (Number, Required): Total duration in minutes (calculated from start & end time).
- `meeting_url` (URL String, Required): Google Meet / Zoom / Classroom link.
- `status` (String): `'upcoming'` | `'live'` | `'completed'`.

#### 4. Material Vault Entity (`course_files`)
- `id` (UUID)
- `file_name` (String, Required): Display name of the worksheet/notes PDF.
- `file_path` (String / URL, Required): Storage path or downloadable resource URL.
- `is_premium` (Boolean, Default false): Indicates whether content requires premium enrollment.

#### 5. Scheduled Assessment Entity (`assessments`)
- `id` (UUID)
- `title` (String, Required): Assessment blueprint title.
- `duration_minutes` (Number, Default 180): Exam time limit.
- `type` (String): `'jee_mock'` | `'quiz'` | `'chapter_test'`.
- `start_window` (Timestamp, Required): Assessment availability start window.
- `end_window` (Timestamp, Required): Assessment availability end window (validation: `end_window > start_window`).
- Computed Status:
  - `Upcoming`: `Date.now() < start_window`
  - `Active / Open`: `start_window <= Date.now() <= end_window`
  - `Expired`: `Date.now() > end_window`

#### 6. Student Enrolment & Telemetry (`batch_enrollments` + `profiles`)
- `user_id` (UUID) & `batch_id` (UUID)
- `full_name` (String), `email` (String, Required), `phone` (String)
- `target_focus` / `academic_batch` (Enum: `'JEE'` | `'NEET'`)
- `preferred_subjects` (String, e.g. "PCM", "PCB")
- `daily_study_hours` (String, e.g. "8 Hours/Day")
- `test_average` (String / Number, e.g. "214/300")
- `syllabus_progress` (String / Number, e.g. "68%")
- `dream_college` (String, e.g. "IIT Bombay (Computer Science)")
- `study_mentor` (String, e.g. "Dr. Sarah Jenkins")

---

### 1.5 Supported Actions & Operations

| Action | Current Implementation in `batches/page.js` | Target Implementation in Redesigned Architecture |
|---|---|---|
| **Catalog View** | Top `<select>` dropdown selector; no tabular overview | High-performance TanStack Data Grid (`BatchGrid.jsx`) with multi-column sorting, pagination, and omnibar search |
| **Search & Filtering** | None (only select dropdown) | Search omnibar (title, description, focus) + Filter pills (Status: ALL, PUBLISHED, DRAFT; Exam Focus: ALL, JEE, NEET) |
| **Create Batch** | Monolithic modal `showAddBatchModal` | Modular `BatchCreateModal.jsx` with validation & cache invalidation |
| **Edit Batch** | 'Settings' tab in monolithic page | 'Overview' tab in slide-out `BatchEditorDrawer.jsx` with instant save & toast notification |
| **Toggle Status** | Select dropdown in settings tab | Single-click status pill button in `BatchGrid.jsx` with optimistic update and cache purge |
| **Delete Batch** | `window.confirm()` + DELETE query | `ConfirmDialogModal.jsx` + soft delete / hard delete + toast + cache purge |
| **Export CSV** | None | TanStack table CSV export of filtered/selected batch records |
| **View Students Roster** | 'Students' tab grid with cards | 'Students' tab in `BatchEditorDrawer.jsx` with search, count, and avatar badges |
| **Student Telemetry View**| Monolithic modal `selectedStudent` | Modular `StudentTelemetryModal.jsx` with bento metrics |
| **Import Roster** | Monolithic modal `showImportRosterModal` + legacy parser | Modular `BatchRosterImportModal.jsx` supporting PDF, Word, CSV, TXT with preview table and RPC |
| **Manage Materials** | 'Materials' tab in monolithic page | 'Materials' tab in `BatchEditorDrawer.jsx` using `ConfirmDialogModal` for removals |
| **Schedule Live Class** | 'Live' tab in monolithic page | 'Live Sessions' tab in `BatchEditorDrawer.jsx` with meeting launcher |
| **Schedule Assessment** | 'Exams' tab in monolithic page | 'Assessments' tab in `BatchEditorDrawer.jsx` with active window status pills |
| **AI Assessment Import** | Embedded client-side PDF.js regex parser | Integration with `UniversalPdfImporterModal.jsx` multimodal AI pipeline |

---

# 2. Logic Chain

1. **Monolithic Anti-Pattern vs. Modular Standards**:
   - *Observation*: `src/app/batches/page.js` contains 2,254 lines of code combining routing, state, 5 tab views, 3 modal dialogs, and OCR logic.
   - *Logic*: Splitting `page.js` into focused components (`BatchStatsHeader.jsx`, `BatchGrid.jsx`, `BatchEditorDrawer.jsx`, `BatchCreateModal.jsx`, `BatchRosterImportModal.jsx`, `StudentTelemetryModal.jsx`) aligns Batches with the single-responsibility principle established in Courses (`src/app/courses/page.js` ~296 lines).
2. **Data Grid Navigation vs. Monolithic Dropdown Selection**:
   - *Observation*: The current page forces the user to select a single batch from a `<select>` dropdown before any telemetry can be viewed. When no batch is selected, the page is empty.
   - *Logic*: Replacing the dropdown with a TanStack Table (`BatchGrid.jsx`) displays all batches simultaneously, allowing quick search, multi-column sorting, batch selection, and deep-linking into any batch via URL query parameter (`/batches?id=...`).
3. **Slide-Out Drawer Ergonomics**:
   - *Observation*: The Courses redesign uses `CourseEditorDrawer.jsx` powered by Framer Motion, enabling administrators to edit syllabus, files, and exams without navigating away from the catalog grid.
   - *Logic*: Implementing `BatchEditorDrawer.jsx` provides the exact same high-efficiency workflow for Batches, housing the Overview, Students Roster, Material Vault, Live Coordinator, and Exam Scheduler within a smooth slide-out drawer.
4. **Consistency in Design System & Feedback**:
   - *Observation*: `src/app/batches/page.js` uses native `alert()` and `confirm()` prompts, contrasting with `ToastProvider` (`useToast()`) and `ConfirmDialogModal` used in Courses.
   - *Logic*: Transitioning Batches to `useToast()` and `ConfirmDialogModal` creates a consistent, polished UX across the dashboard.
5. **Cache Invalidation Integrity**:
   - *Observation*: `src/utils/invalidateCache.js` handles Redis cache purging for `asentra:batch:meta:${batchId}` and `asentra:course:catalog`.
   - *Logic*: Every mutation (create, update, delete, status toggle, schedule add) in the new components must call `invalidateCache('batch', null, batchId)` to maintain cache consistency across the Student Portal.

---

# 3. Caveats

1. **RPC Dependency**: The roster import flow relies on the Supabase stored procedure `import_batch_roster(_batch_id, _emails, _names, _focuses)`. The new `BatchRosterImportModal.jsx` must preserve exact parameter names for RPC compatibility.
2. **Foreign Key Variations**: `batch_enrollments` joins on `profiles(*)`. In environments where auth user IDs differ from profile UUIDs, the fallback to `profiles` must handle missing rows gracefully.
3. **Assessment Associations**: Assessments can be linked to either a course (`course_id`) or a batch (`batch_id`). When scheduling exams for a batch, `batch_id`, `start_window`, and `end_window` are updated on `public.assessments`.

---

# 4. Conclusion & Architectural Gap Analysis

### 4.1 Comparison Matrix: Current Batches vs. Target Architecture

| Feature / Dimension | Current Batches (`src/app/batches/page.js`) | Redesigned Batches Architecture |
|---|---|---|
| **Architecture** | 2,254-line Monolith | Modular (~250-line `page.js` + 6 modular components in `src/components/batches/`) |
| **Catalog View** | Single `<select>` dropdown; empty state when unselected | Rich TanStack Data Grid (`BatchGrid.jsx`) displaying all cohorts |
| **Metric Summary** | Dark card inside single batch view | `BatchStatsHeader.jsx` ribbon (Total Batches, Active, Drafts, Enrolled Students, Live Classes) |
| **Navigation / Editing** | Inline page tabs replace content | Framer Motion Slide-out Drawer (`BatchEditorDrawer.jsx`) |
| **Search & Filtering** | None | Omnibar Search + Status Filter Pills + Focus Track Filter Pills |
| **Table Actions** | Delete button on top bar | Edit drawer trigger, inline status toggle, duplicate batch, safe delete, CSV export |
| **Dialogs & Alerts** | Browser `alert()` & `confirm()` | `ToastProvider` (`showToast`) & `ConfirmDialogModal` |
| **Student Telemetry** | Monolithic modal | Dedicated `StudentTelemetryModal.jsx` with bento layout |
| **Roster Ingestion** | Embedded legacy regex parser in page | `BatchRosterImportModal.jsx` with multi-format parsing & preview table |
| **Deep-Linking** | Basic URL sync with no grid fallback | Robust URL sync (`/batches?id=...`) with back-navigation handling |

### 4.2 Proposed Modular Component Breakdown

```
src/
├── app/
│   └── batches/
│       └── page.js                      # ~250 lines: Main controller, state, URL sync, Suspense
└── components/
    └── batches/
        ├── BatchStatsHeader.jsx         # Metric summary ribbon cards
        ├── BatchGrid.jsx                # TanStack Table v9 data grid with omnibar & filter pills
        ├── BatchEditorDrawer.jsx        # Framer Motion slide-out drawer with 5 tabs
        ├── BatchCreateModal.jsx         # Fast cohort batch creation modal
        ├── BatchRosterImportModal.jsx   # Drag & drop roster importer (PDF/DOCX/CSV/TXT) + RPC
        └── StudentTelemetryModal.jsx    # Student profile & learning performance inspector
```

---

# 5. Verification Method

To independently verify the findings in this survey:
1. **Inspect Monolithic File**:
   ```bash
   Get-Content "D:\admin dashboard\src\app\batches\page.js" | Measure-Object -Line
   ```
2. **Inspect Courses Architecture Components**:
   - `D:\admin dashboard\src\app\courses\page.js`
   - `D:\admin dashboard\src\components\courses\CourseGrid.jsx`
   - `D:\admin dashboard\src\components\courses\CourseEditorDrawer.jsx`
3. **Inspect Database Migrations**:
   - `D:\education portal\supabase\migrations\08_hybrid_analytics.sql` (Batches & enrollments table definitions)
   - `D:\education portal\supabase\migrations\09_ops_security_patch.sql` (Soft delete column)
   - `D:\education portal\supabase\migrations\12_admin_teacher_rls_policies.sql` (Admin/Teacher RLS)
4. **Verify Application Build**:
   ```bash
   npm run build
   ```
