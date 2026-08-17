# Plan: Batches & Test Series Admin Dashboard Redesign

## Goal
Redesign the "Batches" and "Test Series" sections of the admin dashboard (`D:\admin dashboard`) to mirror the gold-standard architecture of the Courses section (`src/components/courses/CourseGrid.jsx`, `CourseEditorDrawer.jsx`, etc.).

## Phase 0: Survey & Scope Mapping
1. Spawn Explorer 1 to analyze the Courses gold-standard implementation:
   - Components breakdown (`CourseGrid.jsx`, `CourseEditorDrawer.jsx`, `CourseStatsHeader.jsx`, `CourseActions.jsx`, tabs, filters, hooks, Supabase queries).
   - Design tokens, Tailwind CSS classes, Framer Motion animations, TanStack Table configuration, pagination, omnibar search, filter pills, drawer state management, hydration handling.
2. Spawn Explorer 2 to analyze the Batches section:
   - Existing pages/components (`src/pages/Batches...`, `src/components/batches/...`).
   - Database schema & tables (`batches`, `batch_schedules`, enrollments, etc.), RPC functions, Supabase API calls.
   - Form fields, features, actions (create, edit, delete, publish, status change, schedule management).
3. Spawn Explorer 3 to analyze the Test Series section:
   - Existing pages/components (`src/pages/TestSeries...`, `src/components/testseries/...` or similar).
   - Database schema & tables (`test_series`, tests, question papers, syllabus, etc.).
   - Form fields, features, actions (create, edit, delete, publish, pricing, syllabus linking).

## Phase 1: Architecture Specification & PROJECT.md
- Synthesize findings into `PROJECT.md`.
- Define exact component breakdown, code layout, interface contracts, and milestone plan.

## Phase 2: Implementation & Verification Track
- Milestone 1: Batches UI Modernization (TanStack BatchGrid, BatchEditorDrawer, filters, stats, drawer tabs, Supabase mutations).
- Milestone 2: Test Series UI Modernization (TanStack TestSeriesGrid, TestSeriesEditorDrawer, filters, stats, drawer tabs, Supabase mutations).
- Milestone 3: Test Suite & Build Verification (`npm run build`, unit tests, E2E test suite, error boundary verification).
- Gate loop: Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor.

## Phase 3: Final Acceptance & Sentinel Handoff
- Verify clean build, no hydration errors, full feature parity and elevated UX.
- Write handoff.md and send final report to parent sentinel.
