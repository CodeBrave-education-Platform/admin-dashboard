# BRIEFING — 2026-08-17T12:51:30Z

## Mission
Modernize the Batches Module (Milestone M1) by dismantling the 2,255-line monolithic `src/app/batches/page.js` and creating a modular TanStack Data Grid, Framer Motion slide-out drawer, metric ribbon, creation modal, multi-format roster import modal, and student telemetry modal with zero native alerts and complete cache invalidation.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: D:\admin dashboard\.agents\worker_batches_m1
- Original parent: f0ca5e05-c04e-4035-9dad-fec78411d1a7
- Milestone: M1 — Batches Module Redesign

## 🔒 Key Constraints
- Exclusive file write ownership:
  - `src/app/batches/page.js` (<250 lines)
  - `src/components/batches/BatchStatsHeader.jsx`
  - `src/components/batches/BatchGrid.jsx`
  - `src/components/batches/BatchEditorDrawer.jsx`
  - `src/components/batches/BatchCreateModal.jsx`
  - `src/components/batches/BatchRosterImportModal.jsx`
  - `src/components/batches/StudentTelemetryModal.jsx`
- Do NOT touch files belonging to other modules (courses, test-series).
- TanStack Table React 19 API: `useLegacyTable as useReactTable` from `@tanstack/react-table/legacy` and `flexRender` from `@tanstack/react-table`.
- Zero native `alert()` or `confirm()` calls — use `useToast()` and `ConfirmDialogModal`.
- Framer Motion drawer spring physics: `{ type: 'spring', damping: 28, stiffness: 280 }` with `bg-slate-900/60 backdrop-blur-xs`.
- Cache invalidation: `invalidateCache('batch', null, batchId)` on all mutations.

## Current Parent
- Conversation ID: f0ca5e05-c04e-4035-9dad-fec78411d1a7
- Updated: 2026-08-17T12:51:30Z

## Task Summary
- **What to build**: Complete modernization of Batches module into 1 lean controller and 6 modular components.
- **Success criteria**:
  - `src/app/batches/page.js` is <250 lines with Suspense, AdminLayoutShell, URL deep linking (?id=...), optimistic status toggling, and cache invalidation.
  - `BatchStatsHeader.jsx` displays 5 KPI metric cards.
  - `BatchGrid.jsx` provides TanStack table with Omnibar search, Status & Focus filter pills, multi-column sorting, pagination, row selection, CSV export, inline status toggle, and edit/delete actions.
  - `BatchEditorDrawer.jsx` provides 5 tabs (Overview, Students Roster, Material Vault, Live Coordinator, Exam Scheduler).
  - `BatchCreateModal.jsx` provides fast cohort establishment.
  - `BatchRosterImportModal.jsx` provides PDF/DOCX/CSV/TXT drag-and-drop parsing, preview staging table, and `import_batch_roster` RPC.
  - `StudentTelemetryModal.jsx` displays bento grid student performance and profile metrics.
- **Interface contracts**: `D:\admin dashboard\PROJECT.md` § Batches Components Contract
- **Code layout**: `src/app/batches/page.js` and `src/components/batches/*`

## Key Decisions Made
- Use React 19 legacy table wrapper `@tanstack/react-table/legacy` to avoid hook lifecycle errors.
- Support deep linking with back-forward navigation sync for `?id=...`.
- Replicate standard styling from `src/components/courses/CourseGrid.jsx` and `CourseEditorDrawer.jsx` for 100% visual and structural consistency.

## Artifact Index
- `D:\admin dashboard\src\app\batches\page.js` — Controller page (<250 lines)
- `D:\admin dashboard\src\components\batches\BatchStatsHeader.jsx` — KPI ribbon
- `D:\admin dashboard\src\components\batches\BatchGrid.jsx` — TanStack Data Grid
- `D:\admin dashboard\src\components\batches\BatchEditorDrawer.jsx` — Slide-out drawer
- `D:\admin dashboard\src\components\batches\BatchCreateModal.jsx` — Cohort creation modal
- `D:\admin dashboard\src\components\batches\BatchRosterImportModal.jsx` — Multi-format roster importer
- `D:\admin dashboard\src\components\batches\StudentTelemetryModal.jsx` — Student telemetry modal
- `D:\admin dashboard\.agents\worker_batches_m1\handoff.md` — Final completion report
