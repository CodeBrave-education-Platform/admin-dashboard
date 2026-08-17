## 2026-08-17T12:48:54Z

You are a Worker agent implementing Milestone M1: Batches Module Modernization for the Admin Dashboard.

Your Working Directory: `D:\admin dashboard\.agents\worker_batches_m1`
Read the following authoritative documents before starting:
- `D:\admin dashboard\.agents\ORIGINAL_REQUEST.md`
- `D:\admin dashboard\PROJECT.md`
- `D:\admin dashboard\.agents\explorer_batches_survey\handoff.md`
- `D:\admin dashboard\.agents\explorer_courses_survey\handoff.md`

# Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

# Your Exclusive File Write Ownership
- `src/app/batches/page.js`
- `src/components/batches/BatchStatsHeader.jsx`
- `src/components/batches/BatchGrid.jsx`
- `src/components/batches/BatchEditorDrawer.jsx`
- `src/components/batches/BatchCreateModal.jsx`
- `src/components/batches/BatchRosterImportModal.jsx`
- `src/components/batches/StudentTelemetryModal.jsx`
(Do NOT touch files belonging to other modules such as courses or test-series).

# Implementation Requirements
1. **Dismantle `src/app/batches/page.js`**:
   - Refactor into a clean controller page (<250 lines) wrapped in `Suspense` and `AdminLayoutShell`.
   - Implement deep-linking with URL query sync (`?id=...`), back-button navigation, and optimistic status updates.
   - Coordinate Supabase queries/mutations (`batches`, `batch_enrollments`, `live_sessions`, `course_files`, `assessments`, `profiles`).
   - Call `invalidateCache('batch', null, batchId)` on mutations.
2. **`src/components/batches/BatchStatsHeader.jsx`**:
   - 5 KPI metric cards: Total Batches, Published Cohorts, Drafts, Total Enrolled Students, Live Classes.
3. **`src/components/batches/BatchGrid.jsx`**:
   - TanStack Table React 19 API: `useLegacyTable as useReactTable` from `@tanstack/react-table/legacy` and `flexRender` from `@tanstack/react-table`.
   - Control deck with Omnibar search, Status filter pills (ALL, PUBLISHED, DRAFT), Focus/Track filter pills (ALL, JEE, NEET), and automatic `table.setPageIndex(0)` reset.
   - Multi-column sorting, pagination (10, 20, 30, 50), multi-row selection checkbox.
   - Floating bulk action bar with dynamic RFC4180 CSV export and deselect.
   - Inline status toggle pill with instant optimistic update.
   - Actions: Edit (opens drawer) and Delete (opens `ConfirmDialogModal`).
4. **`src/components/batches/BatchEditorDrawer.jsx`**:
   - Framer Motion spring transition (`type: 'spring', damping: 28, stiffness: 280`) with `bg-slate-900/60 backdrop-blur-xs` backdrop, URL sync, and `Escape` key handler.
   - 5 Sub-resource management tabs:
     - `overview`: Batch title, price, start date, status, description, target focus.
     - `students`: Students roster with search, avatars, target badge, click to open `StudentTelemetryModal`, and "Import Roster" button.
     - `materials`: Material vault (`course_files`) list, upload/add, delete with confirmation.
     - `live`: Live class sessions coordinator (`live_sessions`) with meeting links, scheduler form, delete with confirmation.
     - `exams`: Scheduled assessments (`assessments`) with live window status pills (Upcoming, Active/Open, Expired), schedule new exam form.
5. **`src/components/batches/BatchCreateModal.jsx`**:
   - Framer Motion pop-in modal for establishing new batches with form validation, start date picker, price, focus, and description.
6. **`src/components/batches/BatchRosterImportModal.jsx`**:
   - Multi-format document parser (PDF, DOCX, CSV, TXT) with review staging table and Supabase RPC `import_batch_roster`.
7. **`src/components/batches/StudentTelemetryModal.jsx`**:
   - Bento grid layout for student telemetry and profile metrics.
8. **Toast & Dialogs**:
   - Use `useToast()` from `@/components/ToastProvider` and `@/components/ConfirmDialogModal`.
   - Zero native `alert()` or `confirm()` calls.
