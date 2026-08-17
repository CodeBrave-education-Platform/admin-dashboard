# Project: Batches & Test Series Admin Dashboard Redesign

## Architecture
The Asentra Admin Dashboard (`D:\admin dashboard`) is being modernized to adopt a unified, high-performance architecture modeled after the Courses module (`src/app/courses/page.js`, `src/components/courses/CourseGrid.jsx`, `CourseEditorDrawer.jsx`).

### Key Architectural Invariants
1. **Controller Pattern**: Next.js App Router server/client page wrapped in `Suspense` and `AdminLayoutShell` (<250 lines), handling SSR data fetching, client state, URL query deep-linking (`?id=...`), and cache invalidation.
2. **TanStack Table React 19 Engine**: Using `useLegacyTable as useReactTable` from `@tanstack/react-table/legacy` and `flexRender` from `@tanstack/react-table` for zero hook-lifecycle conflicts.
3. **Omnibar & Control Deck**: Instant client-side search across all entity fields, filter pills with automatic `table.setPageIndex(0)` reset, multi-column sorting, row selection, and floating bulk action bars with RFC4180 CSV export.
4. **Framer Motion Slide-Out Drawer**: Spring animation (`type: 'spring', damping: 28, stiffness: 280`) with `bg-slate-900/60 backdrop-blur-xs` backdrop, URL deep-linking, `Escape` key dismissal, and isolated sub-resource management tabs.
5. **Standardized Dialogs & Feedback**: Replaces native browser `alert()` and `confirm()` with `useToast()` from `@/components/ToastProvider` and `@/components/ConfirmDialogModal`.
6. **Cache & State Discipline**: Optimistic UI updates on state/status mutations, followed by Supabase mutations and Upstash Redis cache invalidation (`invalidateCache`).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Batches Controller & URL Deep-Linking | Next.js controller with Suspense, URL query synchronization (`/batches?id=...`), back-button navigation, and layout shell integration. | M1 | Survey |
| 2 | Batches Metric Summary Ribbon | 5 dynamic KPI cards (Total Batches, Published Cohorts, Drafts, Total Enrolled Students, Live Classes) in `BatchStatsHeader.jsx`. | M1 | Survey |
| 3 | Batches TanStack Data Grid | Rich TanStack table with column sorting, pagination (10/20/30/50), omnibar search, filter pills (Status, Stream/Focus), row select, floating CSV export, inline status toggle in `BatchGrid.jsx`. | M1 | Survey |
| 4 | Batches Slide-Out Editor Drawer | Framer Motion spring drawer (`BatchEditorDrawer.jsx`) with 5 tabs: Overview, Students Roster, Material Vault, Live Coordinator, Exam Scheduler. | M1 | Survey |
| 5 | Batches Fast Creation Modal | Quick cohort establishment modal with title, price, start date, stream/target focus, and description in `BatchCreateModal.jsx`. | M1 | Survey |
| 6 | Batches Roster Ingestion System | Multi-format roster importer (PDF, DOCX, CSV, TXT) with 2D/regex parsing, review staging table, and Supabase RPC `import_batch_roster` in `BatchRosterImportModal.jsx`. | M1 | Survey |
| 7 | Student Telemetry Inspector | Bento grid student performance metrics inspector in `StudentTelemetryModal.jsx`. | M1 | Survey |
| 8 | Batches Cache Invalidation & Feedback | Optimistic updates, `invalidateCache('batch', null, batchId)` integration, and `useToast()` notifications. | M1 | Survey |
| 9 | Test Series Controller & URL Deep-Linking | Next.js controller with Suspense, URL query synchronization (`/admin/test-series?id=...`), back-button navigation, and layout shell integration. | M2 | Survey |
| 10 | Test Series Metric Summary Ribbon | 5 dynamic KPI cards (Total Packages, Total Exams, Active Candidates, Premium Packages, Avg Score) in `TestSeriesStatsHeader.jsx`. | M2 | Survey |
| 11 | Test Series TanStack Data Grid | Rich TanStack table with column sorting, pagination, omnibar search, filter pills (Exam Tag: JEE Main, Advanced, NEET, Foundation; Price: All, Free, Premium), row select, floating CSV export, inline status toggle in `TestSeriesGrid.jsx`. | M2 | Survey |
| 12 | Test Series Slide-Out Editor Drawer | Framer Motion spring drawer (`TestSeriesEditorDrawer.jsx`) with 5 tabs: Overview & Commercials, Exam Blueprints, Exam Compiler & Question Pool, Live Telemetry & Proctoring Cockpit, Submissions Gradebook. | M2 | Survey |
| 13 | Test Series Creation Modal | Fast package blueprint creation modal with title, target tag, thumbnail, description, distribution, pricing in `TestSeriesCreateModal.jsx`. | M2 | Survey |
| 14 | Integrated Exam Compiler & AI Question Ingestion | Author questions (LaTeX/Markdown math stems), search/select from `test_questions`, or import from PDF into `test_exams.questions` JSONB inside drawer. | M2 | Survey |
| 15 | Live Telemetry & Proctoring Cockpit | Real-time concurrent stats, Redis telemetry integration, Recharts score bell curve, and student submissions log inside drawer. | M2 | Survey |
| 16 | Test Series Cache Invalidation & Feedback | Optimistic updates, `invalidateCache` integration, `ConfirmDialogModal`, and `useToast()` notifications. | M2 | Survey |
| 17 | Test Infrastructure & E2E Validation | Unit and E2E test suites for Batches & Test Series verifying grid rendering, filter operations, drawer interactions, and form submissions. | M3 | Requirement |
| 18 | Static Compilation & Hydration Verification | `npm run build` compilation with 0 errors, 0 hydration warnings, and Forensic Integrity Audit. | M3 | Requirement |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Batches Module Redesign | Dismantle `src/app/batches/page.js` (<250 lines), create `BatchStatsHeader.jsx`, `BatchGrid.jsx`, `BatchEditorDrawer.jsx` (5 tabs), `BatchCreateModal.jsx`, `BatchRosterImportModal.jsx`, `StudentTelemetryModal.jsx`. | None | DONE |
| M2 | Test Series Module Redesign | Dismantle `src/app/admin/test-series/` monolithic client, create `TestSeriesStatsHeader.jsx`, `TestSeriesGrid.jsx`, `TestSeriesEditorDrawer.jsx` (5 tabs), `TestSeriesCreateModal.jsx`. | None | DONE |
| M3 | E2E Testing, Build Verification & Audit | E2E test suites, unit tests, `npm run build` static verification, zero hydration warnings, forensic integrity audit. | M1, M2 | DONE |

---

## Interface Contracts

### Batches Components Contract
- **`src/app/batches/page.js`**:
  - State: `batches` (array), `selectedBatch` (object/null), `loading` (bool), `showCreateModal` (bool), `showRosterModal` (bool), `selectedStudent` (object/null).
  - URL Sync: Reads `?id=` from searchParams, pushes `?id=${batch.id}` on select, pushes `/batches` on close.
  - Mutations: `handleCreateBatch(payload)`, `handleUpdateBatch(id, updates)`, `handleDeleteBatch(id)`, `handleToggleStatus(id, currentStatus)`. All mutations call `invalidateCache('batch', null, id)` and `showToast(...)`.
- **`src/components/batches/BatchGrid.jsx`**:
  - Props: `{ batches, onSelectBatch, onToggleStatus, onDeleteBatch, onOpenCreateModal, loading }`.
  - Exports: Default React component using `@tanstack/react-table/legacy`.
- **`src/components/batches/BatchEditorDrawer.jsx`**:
  - Props: `{ batch, isOpen, onClose, onUpdateBatch, onDeleteBatch, onOpenRosterModal, onInspectStudent }`.
  - Tabs: `overview`, `students`, `materials`, `live`, `exams`.
- **`src/components/batches/BatchCreateModal.jsx`**:
  - Props: `{ isOpen, onClose, onSubmit }`.
- **`src/components/batches/BatchRosterImportModal.jsx`**:
  - Props: `{ isOpen, onClose, batchId, onImportSuccess }`.
- **`src/components/batches/StudentTelemetryModal.jsx`**:
  - Props: `{ student, isOpen, onClose }`.

### Test Series Components Contract
- **`src/app/admin/test-series/page.js`**:
  - State: `packages` (array), `selectedPackage` (object/null), `loading` (bool), `showCreateModal` (bool).
  - URL Sync: Reads `?id=` from searchParams, pushes `?id=${pkg.id}` on select, pushes `/admin/test-series` on close.
  - Mutations: `handleCreatePackage(payload)`, `handleUpdatePackage(id, updates)`, `handleDeletePackage(id)`, `handleToggleStatus(id, currentStatus)`. All mutations call `invalidateCache` and `showToast(...)`.
- **`src/components/test-series/TestSeriesGrid.jsx`**:
  - Props: `{ packages, onSelectPackage, onToggleStatus, onDeletePackage, onOpenCreateModal, loading }`.
  - Exports: Default React component using `@tanstack/react-table/legacy`.
- **`src/components/test-series/TestSeriesEditorDrawer.jsx`**:
  - Props: `{ packageData, isOpen, onClose, onUpdatePackage, onDeletePackage }`.
  - Tabs: `overview`, `exams`, `compiler`, `telemetry`, `submissions`.
- **`src/components/test-series/TestSeriesCreateModal.jsx`**:
  - Props: `{ isOpen, onClose, onSubmit }`.

---

## Code Layout
```
src/
├── app/
│   ├── batches/
│   │   └── page.js                     # Main controller (<250 lines) with Suspense & AdminLayoutShell
│   └── admin/
│       └── test-series/
│           └── page.js                 # Main controller (<250 lines) with Suspense & AdminLayoutShell
└── components/
    ├── batches/
    │   ├── BatchStatsHeader.jsx         # Metric summary ribbon cards
    │   ├── BatchGrid.jsx                # TanStack Table v9 Data Grid with omnibar, sorting, filter pills
    │   ├── BatchEditorDrawer.jsx        # Framer Motion slide-out drawer with 5 tab managers
    │   ├── BatchCreateModal.jsx         # Cohort batch creation modal
    │   ├── BatchRosterImportModal.jsx   # Multi-format roster importer (PDF/DOCX/CSV/TXT) + RPC
    │   └── StudentTelemetryModal.jsx    # Student profile & performance inspector
    └── test-series/
        ├── TestSeriesStatsHeader.jsx    # Metric summary ribbon cards
        ├── TestSeriesGrid.jsx           # TanStack Table v9 Data Grid with omnibar, sorting, filter pills
        ├── TestSeriesEditorDrawer.jsx   # Framer Motion slide-out drawer with 5 tab managers
        └── TestSeriesCreateModal.jsx    # Test package creation modal
```
