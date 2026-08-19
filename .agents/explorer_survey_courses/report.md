# Comprehensive Courses Administration Survey & Bento Grid Architecture Report

**Document Version**: 1.0.0  
**Author**: Explorer 2 (Survey: Courses)  
**Target Subsystem**: Courses Management & Blueprint Command Center  
**Repository**: `D:\admin dashboard`  
**Date**: 2026-08-19  

---

## 1. Executive Summary

Courses Administration is a core academic module within the ASENTRA Admin Dashboard. The system manages comprehensive course catalog mappings, hierarchical syllabi/curricula, bundled physical textbook kits, worksheets/reference files, proctored CBT assessments, live class scheduling, and student doubt resolution.

Currently, courses are presented via a TanStack data table (`src/components/courses/CourseGrid.jsx`) on `/courses` (routed via `src/app/courses/page.js`) and an alternate drag-and-drop table (`src/app/admin/courses/CourseStudioClient.jsx`) on `/admin/courses`.

This survey details the entire Courses architecture—including routing, component tree, state management, full data models, all admin actions (edit, delete, status toggle, import), thumbnail rendering limitations, hydration concerns, and concrete recommendations for a high-end, responsive **Bento Grid UI layout**.

---

## 2. Page Hierarchy & Component Structure

### 2.1 File Map & Locations

| Component / File Path | Role & Description | Line Count | Key Dependencies |
|-----------------------|-------------------|------------|------------------|
| `src/app/courses/page.js` | **Primary Admin Page Controller** — Fetches courses + relational counts, manages drawer/modal state, URL deep-linking (`?id=`), and cache purging | 296 lines | `AdminLayoutShell`, `CourseGrid`, `CourseEditorDrawer`, `CourseCreateModal`, `SyllabusImportModal`, `ConfirmDialogModal` |
| `src/app/admin/courses/page.js` | **Admin Route Proxy** — Server component authenticating admin session and rendering `CourseStudioClient` | 19 lines | `createClient` (server), `CourseStudioClient` |
| `src/app/admin/courses/CourseStudioClient.jsx` | **Studio Table View** — Reorderable drag-and-drop table, inline course creation modal, and PDF importer trigger | 442 lines | `@hello-pangea/dnd`, `UniversalPdfImporterModal`, `ConfirmDialogModal` |
| `src/components/courses/CourseGrid.jsx` | **TanStack Data Table** — 10-column data grid with global search, level filter pills, status filter pills, multi-column sorting, pagination, CSV export, and bulk selection | 683 lines | `@tanstack/react-table/legacy`, `lucide-react` |
| `src/components/courses/CourseEditorDrawer.jsx` | **Course Management Slide-out Drawer** — 5-tab editor: Overview, Curriculum/Syllabus tree, Worksheets/Files, CBT Exams, Live Sessions & Doubts | 874 lines | `framer-motion`, `SyllabusTreeEditor`, `CourseFilesManager`, `ToastProvider` |
| `src/components/courses/CourseCreateModal.jsx` | **Fast Course Creation Modal** — Modal dialog capturing title, slug, level, subject, price, MRP, start/end dates, thumbnail URL, and badge | 351 lines | `framer-motion`, `ToastProvider`, `invalidateCache` |
| `src/components/courses/SyllabusImportModal.jsx` | **Universal Document Syllabus Importer** — Zero-cloud client-side parser using `pdfjs-dist` and `mammoth` (Word .docx) with interactive staging review table | 572 lines | `pdfjs-dist`, `mammoth`, `framer-motion` |
| `src/components/courses/SyllabusTreeEditor.jsx` | **Curriculum Hierarchy Manager** — Module creator/editor, drag/arrow reordering, YouTube video embed extractor, worksheet link, and KaTeX notes | 716 lines | `lucide-react`, `ToastProvider`, `invalidateCache` |
| `src/components/courses/CourseFilesManager.jsx` | **Reference Document & Worksheet Manager** — Direct Supabase Storage uploader or external URL linker with premium/free permissions | 337 lines | `lucide-react`, `ToastProvider` |
| `src/components/AdminLayoutShell.jsx` | **Global Admin Shell** — Persistent collapsible sidebar, header with breadcrumb and ThemeToggle, dynamic sub-navigation for active courses | 352 lines | `lucide-react`, `CommandPalette`, `ThemeToggle` |
| `src/components/CommandPalette.jsx` | **Global Command Omnibar** (Cmd+K / Ctrl+K) — Global search and navigation jump to `/courses` | 147 lines | `cmdk`, `lucide-react` |

---

## 3. Database Schema & Data Models

### 3.1 `public.courses` Table Schema

| Column Name | Postgres Type | Nullable | Default | Description / UI Usage |
|-------------|---------------|----------|---------|------------------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `title` | `TEXT` | No | — | Course display title (e.g., "JEE Advanced Mechanics Masterclass") |
| `description` | `TEXT` | Yes | `NULL` | Detailed course overview and syllabus summary |
| `price` | `NUMERIC` | No | `0` | Course enrollment fee in INR (₹) |
| `original_price` | `NUMERIC` | Yes | `NULL` | Strike-through MRP in INR (₹) |
| `level` | `TEXT` | Yes | `'foundation'` | Audience tier: `'foundation'`, `'mains'`, `'advanced'` |
| `subject` | `TEXT` | Yes | `'General'` | Academic subject: `'Physics'`, `'Chemistry'`, `'Mathematics'`, `'General'` |
| `instructor_name` | `TEXT` | Yes | `NULL` | Lead instructor / faculty attribution |
| `instructor_id` | `UUID` | Yes | `NULL` | Foreign Key referencing `auth.users(id)` |
| `students_count` | `INT` | Yes | `0` | Active enrolled student count |
| `badge` | `TEXT` | Yes | `NULL` | Marketing badge (e.g., "⚡ New Release", "Bestseller") |
| `book_kit` | `TEXT` | Yes | `NULL` | Included physical book kit description |
| `thumbnail_url` | `TEXT` | Yes | `NULL` | Media image URL for grid cards and catalog |
| `start_date` | `TIMESTAMPTZ` | Yes | `NULL` | Cohort commencement date |
| `end_date` | `TIMESTAMPTZ` | Yes | `NULL` | Cohort completion date |
| `is_active` | `BOOLEAN` | Yes | `true` | Publication status (Active = listed, Inactive = unlisted) |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Timestamp of creation |

### 3.2 Relational Tables Linked to Courses

1. **`public.lessons`**:
   - `id`, `course_id` (FK ON DELETE CASCADE), `title`, `duration_minutes`, `subject`, `order_index`, `description`, `video_url`, `video_source`, `video_id`, `assignment_title`, `assignment_url`, `reading_material`, `is_free_preview`, `is_free`, `created_at`.
2. **`public.course_files`**:
   - `id`, `course_id` (FK ON DELETE CASCADE), `batch_id`, `lesson_id`, `file_name`, `file_path`, `is_premium`, `created_at`.
3. **`public.assessments`**:
   - `id`, `course_id` (FK ON DELETE CASCADE), `batch_id`, `title`, `type` (`'jee_mock'` / `'quiz'`), `duration_minutes`, `total_marks`, `start_window`, `end_window`, `created_at`.
4. **`public.live_sessions`**:
   - `id`, `course_id` (FK ON DELETE CASCADE), `batch_id`, `title`, `meeting_url`, `scheduled_start`, `duration_minutes`, `status` (`'upcoming'`, `'live'`, `'ended'`), `created_at`.
5. **`public.lesson_doubts`**:
   - `id`, `lesson_id` (FK ON DELETE CASCADE), `user_id`, `content`, `resolved` (Boolean), `created_at`.
6. **`public.enrollments`**:
   - `id`, `user_id`, `profile_id`, `course_id` (FK ON DELETE CASCADE), `status`, `created_at`.
7. **`public.invoices`**:
   - `id`, `user_id`, `course_id` (FK ON DELETE SET NULL), `amount_paid`, `status`, `razorpay_payment_id`, `invoice_date`.

### 3.3 Query Ingestion & Relation Joining

In `src/app/courses/page.js:37-65`, data is fetched with Supabase relational joins:
```javascript
const { data, error } = await supabase
  .from('courses')
  .select(`
    *,
    lessons (id),
    course_files (id),
    assessments (id)
  `)
  .order('created_at', { ascending: false });

const enriched = (data || []).map(c => ({
  ...c,
  lessons_count: c.lessons?.length ?? 0,
  files_count: c.course_files?.length ?? 0,
  exams_count: c.assessments?.length ?? 0
}));
```

---

## 4. Current TanStack Table & State Management Analysis

### 4.1 TanStack Table Implementation Details (`src/components/courses/CourseGrid.jsx`)

- **Library**: `@tanstack/react-table/legacy` (`useLegacyTable as useReactTable`) for React 19 compatibility.
- **State Hooks**:
  - `globalFilter`: Free-text search term.
  - `levelFilter`: `'ALL' | 'FOUNDATION' | 'MAINS' | 'ADVANCED'`.
  - `statusFilter`: `'ALL' | 'ACTIVE' | 'INACTIVE'`.
  - `sorting`: Array of `{ id, desc }` initialized to `[{ id: 'created_at', desc: true }]`.
  - `rowSelection`: Object map `{ [rowId]: true }` for multi-row checkbox selection.
  - `pagination`: Managed internally via table model, initialized to `pageSize: 10`.

### 4.2 Filtering & Search Strategy

- **Two-tier filtering**:
  1. Primary `useMemo` filter handles Level and Status:
     ```javascript
     const filteredData = useMemo(() => {
       return courses.filter(c => {
         if (levelFilter !== 'ALL' && (c.level || '').toLowerCase() !== levelFilter.toLowerCase()) return false;
         if (statusFilter !== 'ALL') {
           const isActive = c.is_active !== false;
           if (statusFilter === 'ACTIVE' && !isActive) return false;
           if (statusFilter === 'INACTIVE' && isActive) return false;
         }
         return true;
       });
     }, [courses, levelFilter, statusFilter]);
     ```
  2. Custom `globalFilterFn` searches across `title`, `subject`, `description`, `target_audience`/`badge`, and `level`.
- **Filter Reset Discipline**:
  When changing level, status, or search query, `table.setPageIndex(0)` is invoked immediately to avoid ghost page indices (e.g., showing 0 entries on page 3 when filter narrows results).

### 4.3 Existing Data Columns

1. **Select** (`select`): Row selection checkbox for bulk actions.
2. **Created Date** (`created_at`): Hidden column providing sortability by creation timestamp.
3. **Duration** (`duration`) & **Display Order** (`display_order`): Hidden metadata columns.
4. **Course Identity** (`title`): Shows thumbnail (40x40px), title, badge tag, subject, and formatted created date.
5. **Audience Level** (`level`): Color-coded badges (Foundation = Sky, Mains = Indigo, Advanced = Purple).
6. **Curriculum Metrics** (`metrics`): 3 micro-badges showing count of Units, Files, and CBT Exams.
7. **Status** (`status` / `is_active`): Clickable interactive status toggle pill (Active [Emerald] vs Inactive [Slate]).
8. **Pricing** (`price`): Rupee symbol with strike-through original MRP.
9. **Enrolled** (`students_count`): Total student enrollment count with Users icon.
10. **Actions** (`actions`): Edit button (triggers drawer) and Trash button (triggers confirmation dialog).

---

## 5. Existing Admin Actions & Workflows

### 5.1 Admin Action Matrix

| Action | Trigger UI | Function / Handler | API / Supabase Operation | Cache Invalidation |
|--------|------------|-------------------|--------------------------|---------------------|
| **View / Select Course** | Click card / row / "Edit" button | `onSelectCourse(course)` in `src/app/courses/page.js:94` | URL update `?id=${course.id}` -> Opens `CourseEditorDrawer` | None |
| **Toggle Status (Active/Inactive)** | Click status badge / switch | `handleToggleCourseStatus` in `src/app/courses/page.js:106` | Optimistic update -> `supabase.from('courses').update({ is_active }).eq('id', courseId)` | `invalidateCache('catalog', id)`, `invalidateCache('course', id)` |
| **Delete Course** | Click trash icon on card / drawer | `handleConfirmDelete` in `src/app/courses/page.js:148` | `supabase.from('courses').delete().eq('id', id)` (Cascades lessons/files/assessments) | `invalidateCache('catalog', id)`, `invalidateCache('course', id)` |
| **Create Course Blueprint** | "Create Course" button | `handleCourseCreated` in `src/app/courses/page.js:131` | `supabase.from('courses').insert([...])` -> Opens drawer for new course | `invalidateCache('catalog', id)`, `invalidateCache('course', id)` |
| **Edit Course Overview** | "Save Course Details" button in drawer | `handleSaveOverview` in `CourseEditorDrawer.jsx:157` | `supabase.from('courses').update(updates).eq('id', id)` | `invalidateCache('catalog', id)`, `invalidateCache('course', id)` |
| **Manage Curriculum / Lessons** | Tab 2 in drawer (`SyllabusTreeEditor`) | Add/Edit/Delete/Reorder in `SyllabusTreeEditor.jsx` | `supabase.from('lessons').insert/update/delete` | `invalidateCache('course', courseId)` |
| **Manage Reference Files** | Tab 3 in drawer (`CourseFilesManager`) | Upload/Link in `CourseFilesManager.jsx` | `supabase.storage.from('course-materials').upload` + `supabase.from('course_files').insert` | `invalidateCache('course', courseId)` |
| **Link CBT Exams** | Tab 4 in drawer (`CourseEditorDrawer`) | Add exam form in `CourseEditorDrawer.jsx:236` | `supabase.from('assessments').insert` | `invalidateCache('course', courseId)` |
| **Schedule Live Class** | Tab 5 in drawer (`CourseEditorDrawer`) | Broadcast form in `CourseEditorDrawer.jsx:284` | `supabase.from('live_sessions').insert` | `invalidateCache('course', courseId)` |
| **Resolve Student Doubts** | Tab 5 in drawer (`CourseEditorDrawer`) | Status button in `CourseEditorDrawer.jsx:320` | `supabase.from('lesson_doubts').update({ resolved })` | None |
| **Bulk Export CSV** | Checkbox selection -> "Export CSV" | `handleExportCSV` in `CourseGrid.jsx:391` | Client-side CSV generation & download blob | None |
| **Import Syllabus from Doc** | "Import Syllabus" button | `handleCommitImport` in `SyllabusImportModal.jsx:281` | Batch insert into `lessons` table | `invalidateCache('course', courseId)`, `invalidateCache('catalog', courseId)` |

---

## 6. Thumbnail Display & Bento Grid Layout Architecture

### 6.1 Current Thumbnail Rendering Deficiencies

In the legacy table view:
1. Thumbnails are rendered as tiny 40x40px (`w-10 h-10`) square boxes inside table cells (`CourseGrid.jsx:134-142`).
2. There is no visual hierarchy, aspect ratio control, or imagery prominence.
3. If `thumbnail_url` is invalid, standard broken-image behavior occurs unless a generic placeholder icon replaces it.

### 6.2 Bento Grid Visual Architecture Blueprint

To fulfill the **Premium Bento Grid UI** requirements, the new layout should replace the TanStack table with an asymmetrical, high-density Bento Grid with the following specifications:

```
+---------------------------------------------------------------------------------------------------+
|  [Omnibar Search & Filter Pills: All Levels | Foundation | Mains | Advanced | Active | Inactive]  |
+---------------------------------------------------------------------------------------------------+
|  BENTO GRID CONTAINER (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5)           |
|                                                                                                   |
|  +---------------------------------------+  +---------------------------------------------------+ |
|  | FEATURED HERO BENTO CARD (Span 2 cols)|  | STANDARD BENTO CARD (Span 1 col)                  | |
|  | +-----------------------------------+ |  | +-----------------------------------------------+ | |
|  | | [HERO 16:9 THUMBNAIL WITH GRADIENT| |  | | [16:10 THUMBNAIL WITH FLOATING BADGES]       | | |
|  | |  OVERLAY & FLOATING LEVEL PILL]   | |  | |  [Level: Mains]          [Status: Active Dot] | | |
|  | +-----------------------------------+ |  | +-----------------------------------------------+ | |
|  | | [Title: JEE Advanced Mechanics]   | |  | | [Title: Coordination Chemistry]               | | |
|  | | [Subject & Instructor Attribution]| |  | | [Subject: Chemistry • MRP: ₹3,499]           | | |
|  | | [Curriculum Metrics Bar:          | |  | | [Metrics Pills: 22 Units • 8 Files • 4 Exams]  | | |
|  | |   22 Units | 8 Files | 4 Exams]   | |  | | [Enrolled: 480 Students]                      | | |
|  | | [Enrolled: 850 Students | ₹4,999] | |  | | [Interactive Admin Dock:                      | | |
|  | | [Admin Action Bar: Edit, Status,  | |  | |   Status Toggle | Quick Edit | Delete]        | | |
|  | |   Import, Delete]                 | |  +---------------------------------------------------+ | |
|  +---------------------------------------+                                                        |
+---------------------------------------------------------------------------------------------------+
```

### 6.3 Bento Card Design Elements

1. **Card Aspect Ratio & Geometry**:
   - Rounded corners: `rounded-3xl` (24px) with subtle borders (`border border-slate-200/80 dark:border-slate-800`).
   - Backdrop blur & elevation: `bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1`.
2. **Prominent Media Header (Thumbnail)**:
   - Fixed aspect ratio banner (`aspect-video` / 16:9 or 16:10) at the top of each card.
   - Smooth hover micro-interaction: `overflow-hidden relative group` with `group-hover:scale-105 transition-transform duration-500`.
   - Subtle bottom gradient scrim (`bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent`) overlaying title and floating status tags.
   - Fallback system: If `thumbnail_url` is missing or fails to load (`onError`), render a glowing subject-specific mesh gradient with centered Lucide icon (`Atom` for Physics, `FlaskConical` for Chemistry, `Pi` for Math, `BookOpen` for General).
3. **Integrated Admin Action Deck**:
   - Floating quick-action dock on hover or pinned at card footer:
     - **Status Toggle Switch / Dot**: One-click active/inactive toggle without opening drawer.
     - **Edit Blueprint Button**: Slides open `CourseEditorDrawer`.
     - **Import Syllabus Button**: Triggers `SyllabusImportModal` pre-targeted to this course.
     - **Delete Button**: Triggers `ConfirmDialogModal`.
4. **Key Metric Ribbon on Card**:
   - Enrolled Candidates tally (`Users` icon).
   - Curriculum density badge (`{lessons_count} Units`, `{files_count} Worksheets`, `{exams_count} CBTs`).
   - Price tag in INR font-mono with strike-through MRP.

---

## 7. React Hydration, Styling & Cross-Platform Reliability

### 7.1 Hydration Pitfalls & Fixes

1. **Date Formatting SSR/CSR Desync**:
   - `new Date(created_at).toLocaleDateString()` produces different strings depending on server vs client locale/timezone.
   - **Fix**: Add `suppressHydrationWarning` on all formatted date elements or use standard ISO dates / client-only mounting state.
2. **Random/UUID Key Generation in Loops**:
   - Always key lists by stable database UUIDs (`course.id`, `lesson.id`) rather than array indices to avoid React 19 reconcile bugs.
3. **Controlled Input Defaults**:
   - Use `value={field ?? ''}` to ensure inputs never switch from uncontrolled to controlled.

### 7.2 Styling & Component Framework

- **Tailwind CSS v4**: Utilizes modern utility classes (`bg-slate-50`, `rounded-3xl`, `shadow-2xs`, `backdrop-blur-md`).
- **Icons**: `lucide-react` (v1.17.0) — all icons are tree-shakeable SVG components.
- **Motion & Animations**: `framer-motion` (v12.40.0) — used for drawer slide-overs, modal spring animations, and card hover physics.
- **Theme Consistency**: Supports light/dark mode via `next-themes` and `ThemeProvider`.

---

## 8. Recommendations for Implementation & QA Strategy

1. **Implement Bento Grid Layout in `src/components/courses/CourseGrid.jsx`**:
   - Replace the table rendering block (`<table>...</table>`) with a responsive Bento Grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`).
   - Preserve all filtering, search omnibar, level pills, status pills, and pagination controls.
   - Support view switching (optional Bento Grid / Compact Table toggle if desired, defaulting to Bento Grid).
2. **Unify `/admin/courses` and `/courses`**:
   - Ensure `/admin/courses` seamlessly redirects to or renders the unified Bento Grid command center.
3. **Audit Supabase Foreign Keys and Caches**:
   - Ensure all cascade deletes (`lessons`, `course_files`, `assessments`, `live_sessions`, `lesson_doubts`) delete cleanly without orphaned records.
   - Ensure `invalidateCache('catalog', id)` and `invalidateCache('course', id)` purge Upstash Redis properly.

---

## 9. Conclusion

The Courses administration codebase is structured, modular, and ready for the Bento Grid transformation. All data connections, relational counts, modals, drawer tabs, and action handlers are intact and can be seamlessly embedded into the new Bento Grid cards.
