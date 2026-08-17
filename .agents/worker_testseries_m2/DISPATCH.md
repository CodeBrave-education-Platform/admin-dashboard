# DISPATCH — 2026-08-17T07:18:54Z

## Task Assignment
Milestone M2: Test Series Module Modernization for the Admin Dashboard.

## Exclusive File Write Ownership
- `src/app/admin/test-series/page.js`
- `src/app/admin/test-series/TestSeriesManageClient.jsx` (if maintaining as a clean client coordinator or replacing with page.js + components)
- `src/components/test-series/TestSeriesStatsHeader.jsx`
- `src/components/test-series/TestSeriesGrid.jsx`
- `src/components/test-series/TestSeriesEditorDrawer.jsx`
- `src/components/test-series/TestSeriesCreateModal.jsx`
- Any sub-components in `src/components/test-series/` (e.g. drawer tabs)

## Key Deliverables
1. Lean controller in `src/app/admin/test-series/page.js` (<250 lines) with `Suspense` and `AdminLayoutShell`. Deep-linking URL query sync (`?id=...`), back-button navigation, optimistic status updates, Supabase queries/mutations for `test_packages`, `test_exams`, `test_questions`, `test_attempts`, and `invalidateCache`.
2. `TestSeriesStatsHeader.jsx` with 5 KPI metric cards: Total Packages, Total Exams, Active Candidates, Premium Packages, Avg Score.
3. `TestSeriesGrid.jsx` with TanStack Table React 19 API (`useLegacyTable as useReactTable` from `@tanstack/react-table/legacy`), omnibar search, tag filter pills (ALL, JEE Main, JEE Advanced, NEET, Foundation), pricing filter pills (ALL, Free, Premium), `table.setPageIndex(0)` reset, multi-column sorting, pagination, multi-row selection checkbox, floating bulk action bar with RFC4180 CSV export and deselect, inline status toggle pill with instant optimistic update, actions (Edit & Delete).
4. `TestSeriesEditorDrawer.jsx` with Framer Motion spring transition, backdrop, URL sync, Escape key handler, 5 tabs: `overview`, `exams`, `compiler`, `telemetry`, `submissions`.
5. `TestSeriesCreateModal.jsx` Framer Motion pop-in modal for creating test packages.
6. Toast & Dialogs with `useToast()` and `ConfirmDialogModal`.
