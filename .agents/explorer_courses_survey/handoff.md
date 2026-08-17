# Architectural Survey & Gold-Standard Blueprint: Courses Implementation
**Agent Role**: Explorer / Systems Architect  
**Scope**: In-depth architectural survey of the gold-standard Courses implementation in `D:\admin dashboard` as the definitive blueprint for redesigning the **Batches** and **Test Series** modules.  
**Date**: 2026-08-17  

---

## 1. Observation

Direct observations from examining all files within `src/components/courses/`, `src/app/courses/`, and related dashboard infrastructure:

### File Catalog & Module Responsibilities

| File Path | Lines | Primary Responsibility |
|---|---|---|
| `src/app/courses/page.js` | 296 | Controller page, `AdminLayoutShell` integration, metric ribbon, Supabase query/mutation coordination, URL sync (`?id=...`), cache invalidation. |
| `src/components/courses/CourseGrid.jsx` | 683 | TanStack Table data grid, search omnibar, level/status filter pills, sorting, pagination, multi-row selection, CSV export, inline status toggle. |
| `src/components/courses/CourseEditorDrawer.jsx` | 874 | Framer Motion slide-out drawer (spring physics), 5-tab layout (Overview, Curriculum, Worksheets, Exams, Live/Doubts), sub-resource state management. |
| `src/components/courses/CourseCreateModal.jsx` | 351 | Fast creation modal with auto-slug generator, pricing, audience level, date inputs, and cache invalidation. |
| `src/components/courses/SyllabusTreeEditor.jsx` | 716 | Interactive curriculum tree, subject filtering, inline lesson editor/creator, sequence reordering (`order_index`), YouTube ID parser, KaTeX notes. |
| `src/components/courses/CourseFilesManager.jsx` | 337 | Supabase Storage upload (`course-materials` bucket), worksheet metadata management, lesson linking, access tier toggling (Free vs Enrolled). |
| `src/components/courses/SyllabusImportModal.jsx` | 536 | Zero-backend client-side PDF/Docx parser (PDF.js + Mammoth), 2D spatial text layout extractor, staging review table, batch lesson commit. |
| `src/components/ToastProvider.jsx` | 74 | Global toast notification context (`useToast()`) supporting `success`, `error`, and `info` types. |
| `src/components/ConfirmDialogModal.jsx` | 70 | Non-blocking accessible modal dialog for destructive deletion confirmations. |
| `src/utils/invalidateCache.js` | 67 | Server action for direct Redis cache invalidation (Upstash) and backup webhook dispatch to student portal. |

---

### Component-by-Component Architectural Breakdown

#### A. Entry Controller (`src/app/courses/page.js`)
1. **Suspense & Client Component Wrapper**:
   ```javascript
   // src/app/courses/page.js:285-295
   export default function CoursesManagementPage() {
     return (
       <Suspense fallback={
         <div className="min-h-screen bg-slate-50 flex items-center justify-center">
           <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
         </div>
       }>
         <CoursesManagementContent />
       </Suspense>
     );
   }
   ```
2. **Deep-Linking & URL Synchronisation**:
   - Reads `searchParams.get('id') || searchParams.get('courseId')`.
   - On row click: `router.replace('/courses?id=' + course.id, { scroll: false })`.
   - On drawer close: `router.replace('/courses', { scroll: false })`.
   - Listens to browser back/forward navigation and auto-opens/closes the drawer accordingly.
3. **Data Fetching with Nested Relational Aggregation**:
   - Query selects `*, lessons (id), course_files (id), assessments (id)`.
   - Transforms records into enriched objects with `lessons_count`, `files_count`, `exams_count`.
   - Includes automatic graceful fallback to `.select('*')` if database foreign keys differ.
4. **Optimistic UI Updates**:
   - When toggling course active status, local state updates immediately (`setCourses(...)` & `setSelectedCourse(...)`).
   - If Supabase mutation fails, state reverts immediately with an error toast.
5. **Metric Summary Ribbon**:
   - 5 KPI cards in a responsive grid: Total Courses, Foundation count, Mains count, Advanced count, Active Candidates sum.

---

#### B. Data Grid Engine (`src/components/courses/CourseGrid.jsx`)
1. **TanStack Table Legacy API Import Pattern**:
   ```javascript
   // src/components/courses/CourseGrid.jsx:4-11
   import {
     useLegacyTable as useReactTable,
     getCoreRowModel,
     getFilteredRowModel,
     getSortedRowModel,
     getPaginationRowModel
   } from '@tanstack/react-table/legacy';
   import { flexRender } from '@tanstack/react-table';
   ```
   *Note: `@tanstack/react-table/legacy` (`useLegacyTable as useReactTable`) is required in this project for React 19 compatibility with `@tanstack/react-table` v9.*

2. **Multi-Layer Filtering Pipeline**:
   - **Layer 1 (State Filter)**: `filteredData` useMemo filters courses by `levelFilter` (`ALL`, `FOUNDATION`, `MAINS`, `ADVANCED`) and `statusFilter` (`ALL`, `ACTIVE`, `INACTIVE`).
   - **Layer 2 (Omnibar Global Filter)**: Custom `globalFilterFn` searches across `title`, `subject`, `description`, `target_audience`, `badge`, and `level`.
   - Any filter change automatically resets the table page index (`table.setPageIndex(0)`).

3. **Column Model & Renderers**:
   - **Selection Checkbox**: `size: 40`, `getIsAllPageRowsSelectedHandler()`, `getToggleSelectedHandler()`, stops click propagation.
   - **Course Identity**: Thumbnail `img` (with fallback icon), title (with hover transition), badge pill, subject, and formatted created date.
   - **Audience Level**: Strict color coding:
     - `foundation` → `bg-sky-50 text-sky-700 border-sky-200` ("JEE Foundation")
     - `mains` → `bg-indigo-50 text-indigo-700 border-indigo-200` ("JEE Mains")
     - `advanced` → `bg-purple-50 text-purple-700 border-purple-200` ("JEE Advanced")
   - **Curriculum Metrics**: Compact badge group displaying Lesson Units (`Layers`), Files (`FileText`), and CBT Exams (`ClipboardList`).
   - **Status Toggle**: Interactive pill with dot indicator (`w-1.5 h-1.5 rounded-full bg-emerald-500` vs `bg-slate-400`). Stops row click propagation.
   - **Pricing**: Formatted with `₹` and `Number(price).toLocaleString('en-IN')`, plus crossed-out original price if discounted.
   - **Enrolled Count**: Mono-spaced candidate count with `Users` icon.
   - **Actions Column**: `Edit` button (opens drawer) and `Trash2` icon button (triggers confirmation dialog).

4. **Bulk Action Floating Bar**:
   - Displayed conditionally when `Object.keys(rowSelection).length > 0`.
   - Features `Export CSV` (generating a dynamic RFC4180 CSV blob download) and `Deselect All`.

5. **Data Grid Pagination Footer**:
   - Displays "Showing X to Y of Z entries".
   - Page size dropdown selector: `[10, 20, 30, 50]`.
   - 4 pagination controls: First (`ChevronsLeft`), Previous (`ChevronLeft`), Current Page Indicator (`Page X of Y`), Next (`ChevronRight`), Last (`ChevronsRight`).

---

#### C. Slide-Out Editor Drawer (`src/components/courses/CourseEditorDrawer.jsx`)
1. **Framer Motion Animation Contract**:
   ```javascript
   // Backdrop
   <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     exit={{ opacity: 0 }}
     onClick={onClose}
     className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer transition-opacity"
   />
   // Drawer Panel
   <motion.div
     initial={{ x: '100%' }}
     animate={{ x: 0 }}
     exit={{ x: '100%' }}
     transition={{ type: 'spring', damping: 28, stiffness: 280 }}
     className="relative w-full max-w-3xl lg:max-w-4xl bg-white shadow-2xl z-10 flex flex-col h-full overflow-hidden text-slate-800"
   >
   ```
2. **Tabbed Architecture (5 Sub-Resource Tabs)**:
   - `overview`: Course title, slug, audience level, primary subject, price/MRP, start/end dates, thumbnail URL, badge tag, description.
   - `syllabus`: `<SyllabusTreeEditor>` with lessons count badge.
   - `files`: `<CourseFilesManager>` with files count badge.
   - `exams`: CBT exam linkages, mock test registrations, direct deep-link to `/admin/test-series?courseId=...`.
   - `live_doubts`: Live class broadcast scheduling (Zoom/Meet URL, date-time picker) + Student doubts queue with resolved/unresolved toggles.
3. **Keyboard & Event Ergonomics**:
   - `Escape` key listener closes the drawer.
   - Sticky header and sticky tab navigation; body content is isolated in `overflow-y-auto`.

---

#### D. Sub-Components & Tooling
1. **`CourseCreateModal.jsx`**:
   - Framer Motion pop-in: `scale: 0.95, opacity: 0, y: 15` → `scale: 1, opacity: 1, y: 0`.
   - Slug auto-generation on title keystrokes (`title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')`).
   - Retrieves `instructor_id` from `supabase.auth.getUser()`.
   - Calls `invalidateCache('catalog', data.id)` and `invalidateCache('course', data.id)`.

2. **`SyllabusTreeEditor.jsx`**:
   - Filter pills for subject division (`All`, `Physics`, `Chemistry`, `Mathematics`, `General`).
   - Inline lesson unit creator and inline editor (no context loss).
   - Up/Down sequence movement (`handleMoveLesson`) updating `order_index` in state and Supabase batch updates.
   - Smart YouTube URL regex parser extracting the 11-character video ID.
   - Free Trial preview toggle (`is_free_preview`) for prospective student lead generation.
   - KaTeX math outline textarea for formula rendering.

3. **`CourseFilesManager.jsx`**:
   - Direct upload to Supabase storage bucket `course-materials` via `supabase.storage.from('course-materials').upload(...)`.
   - Public URL resolution via `supabase.storage.from(...).getPublicUrl(...)`.
   - Option to link reference material to a specific lesson unit or general course.
   - Premium lock toggle (`is_premium: true/false`).

4. **`SyllabusImportModal.jsx`**:
   - 100% client-side document layout extraction using dynamic CDN scripts (`pdfjsLib` and `mammoth.browser.js`).
   - 2D spatial coordinate line clustering (`extractTextWithLayout`) grouping PDF glyphs by `item.transform[5]` Y-axis and sorting X-axis `item.transform[4]`.
   - Regex duration parser extracting compound formats: `(2h 30m)`, `90 mins`, `[1.5 hours]`.
   - Interactive staging review table allowing educators to adjust sequences, edit titles, modify durations, and add/remove rows before committing to database.

---

## 2. Logic Chain

1. **Monolithic Failure Mode Observed in Legacy Pages**:
   - `src/app/batches/page.js` is currently **2,255 lines**, containing mixed-in PDF parsing, roster parsing, modal states, inline tables, live session scheduling, and material management in a single component.
   - `src/app/admin/test-series/TestSeriesManageClient.jsx` is **796 lines** with inline exam lists, package forms, attempt logs, and modal overlays.
   - This causes state thrashing, difficult maintenance, poor responsiveness, and hydration risks.

2. **Courses Redesign Proof-of-Pattern**:
   - The Courses section dismantled a 900+ line monolithic file into clean, isolated modules:
     - Page controller: `src/app/courses/page.js` (296 lines)
     - Data grid: `CourseGrid.jsx` (683 lines)
     - Slide-out drawer: `CourseEditorDrawer.jsx` (874 lines)
     - Modal dialogues: `CourseCreateModal.jsx`, `SyllabusImportModal.jsx`
     - Sub-resource managers: `SyllabusTreeEditor.jsx`, `CourseFilesManager.jsx`
   - This separation resulted in zero hydration errors, fast rendering, deep-link shareability, and a unified design system.

3. **Design System & UX Invariants**:
   - **Control Deck Pattern**: Top container containing Search Omnibar (left), Filter Pills (center), and Primary Action Buttons (right).
   - **Floating Bulk Actions**: Indigo pill (`bg-indigo-900 text-white`) appearing above the table when rows are selected.
   - **Data Grid Density**: Slate borders (`border-slate-200`), rounded corners (`rounded-3xl`), font weights (`font-black`, `font-extrabold`), uppercase tracking headers (`text-[10px] tracking-wider text-slate-500`).
   - **Drawer Transition**: Spring physics (`damping: 28, stiffness: 280`) with `fixed inset-0 z-50` and `bg-slate-900/60 backdrop-blur-xs`.
   - **Cache Discipline**: Every mutation calls `invalidateCache(type, courseId, batchId)` to maintain instant parity with student-facing portal.

4. **Direct Translation for Batches & Test Series**:
   - **Batches Module**:
     - `src/app/batches/page.js` (Controller)
     - `src/components/batches/BatchGrid.jsx` (TanStack Table: title, stream/target, start date, students count, price, status toggle)
     - `src/components/batches/BatchEditorDrawer.jsx` (Drawer: Overview, Students Roster, Live Classes, Material Vault, Exam Schedule)
     - `src/components/batches/BatchCreateModal.jsx` (Creation modal)
     - `src/components/batches/BatchRosterImportModal.jsx` (Modularized roster PDF/Word importer)
   - **Test Series Module**:
     - `src/app/admin/test-series/page.js` (Controller)
     - `src/components/test-series/TestSeriesGrid.jsx` (TanStack Table: package title, target tag, drills/mocks/live count, price, enrolled candidates, status)
     - `src/components/test-series/TestSeriesEditorDrawer.jsx` (Drawer: Overview, Linked Exams & Blueprints, Question Weightage, Live Ranking Telemetry, Student Attempts)
     - `src/components/test-series/TestSeriesCreateModal.jsx` (Package creator)

---

## 3. Caveats

1. **React 19 TanStack Table Compatibility**:
   - Must import from `@tanstack/react-table/legacy` with `useLegacyTable as useReactTable`. Standard `useReactTable` from `@tanstack/react-table` will throw hook lifecycle errors with React 19.
2. **Supabase Schema Relations**:
   - Foreign key names may vary (`batch_enrollments`, `test_exams`, `test_packages`, `assessments`). Always include fallback queries (e.g. basic `.select('*')` if relational joins return errors) to avoid blank screens.
3. **Client-Side PDF Libraries**:
   - Dynamic CDN loaders (`loadPdfJs`, `loadMammoth`) must check `typeof window !== 'undefined'` to avoid Next.js SSR build errors.
4. **Cache Invalidation Credentials**:
   - `invalidateCache` requires Upstash Redis REST tokens; if missing in local dev, it logs a warning gracefully without throwing runtime errors.

---

## 4. Conclusion & Architectural Contract

The Courses redesign establishes the authoritative gold standard for the Asentra Admin Dashboard. 

### Architectural Blueprint Contract for Batches & Test Series:

```
src/
├── app/
│   ├── batches/
│   │   └── page.js                     # Lean controller (<250 lines) with Suspense & AdminLayoutShell
│   └── admin/
│       └── test-series/
│           └── page.js                 # Lean controller (<250 lines) with Suspense & AdminLayoutShell
└── components/
    ├── batches/
    │   ├── BatchGrid.jsx               # TanStack Table, Omnibar, Stream pills, Bulk actions, Status toggle
    │   ├── BatchEditorDrawer.jsx       # Framer Motion spring drawer with 5 tabbed sub-resource managers
    │   ├── BatchCreateModal.jsx        # Fast modal for establishing batch cohorts
    │   ├── BatchRosterManager.jsx      # Enrolled student table, manual enrollment, student inspector
    │   ├── BatchRosterImportModal.jsx  # PDF/Word roster parser with staging review
    │   ├── BatchLiveSessionManager.jsx # Class scheduler, Zoom/Meet room links, broadcast status
    │   └── BatchVaultManager.jsx       # Course files & worksheets storage manager
    └── test-series/
        ├── TestSeriesGrid.jsx          # TanStack Table, Omnibar, Exam type pills, CSV export, Status toggle
        ├── TestSeriesEditorDrawer.jsx  # Framer Motion drawer: Overview, CBT Exams, Questions, Telemetry
        ├── TestSeriesCreateModal.jsx   # Test package creation modal
        └── TestPackageExamsManager.jsx # Link exams, configure durations, total questions, marks
```

---

## 5. Verification Method

To verify the architecture and ensure all downstream implementations comply with this blueprint:

1. **Build & Hydration Verification**:
   ```bash
   npm run build
   ```
   *Expected: All routes compile without React 19 hydration or dynamic searchParams SSR warnings.*

2. **Component File Structure Audit**:
   - Verify `src/app/batches/page.js` is reduced from 2,255 lines to under 300 lines.
   - Verify all sub-components reside inside `src/components/batches/` and `src/components/test-series/`.
   - Verify `.agents/` contains only metadata (no application source code).

3. **TanStack Table Contract Inspection**:
   - Check that `useLegacyTable as useReactTable` from `@tanstack/react-table/legacy` is used in all grids.
   - Check that sorting, pagination, and multi-row selection functions operate smoothly without page reload.

4. **Framer Motion Animation Test**:
   - Verify drawer uses `damping: 28, stiffness: 280` spring transition and `bg-slate-900/60 backdrop-blur-xs` backdrop.
   - Verify URL query parameter synchronization (`?id=...`) and `Escape` key drawer dismissal.

5. **Supabase & Cache Invalidation Test**:
   - Verify every mutation (create, update, delete, status toggle) triggers `invalidateCache(...)` and `showToast(...)`.
