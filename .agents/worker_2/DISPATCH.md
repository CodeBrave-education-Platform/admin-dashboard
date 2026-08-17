## 2026-08-17T06:10:25Z
You are Worker 2 on the Course Management UI Redesign team.
Working directory: D:\admin dashboard\.agents\worker_2
Project root: D:\admin dashboard
Original Request reference: D:\admin dashboard\.agents\ORIGINAL_REQUEST.md
Challenger 1 findings: D:\admin dashboard\.agents\challenger_1\challenge.md
Challenger 2 findings: D:\admin dashboard\.agents\challenger_2\challenge.md
Reviewer 1 findings: D:\admin dashboard\.agents\reviewer_1\review.md

TASK OBJECTIVE:
Remediate all 15 empirical defects identified by Challengers 1 & 2 and the cache invalidation parameter order from Reviewer 1:

1. In `src/components/courses/CourseGrid.jsx`:
   - Add `created_at` column accessor so the initial sorting state `[{ id: 'created_at', desc: true }]` functions correctly.
   - Implement a custom `globalFilterFn` on the table that checks `title`, `subject`, `description`, `target_audience`, and `level` so subject searches like "Physics" succeed.
   - Automatically reset pagination (`table.setPageIndex(0)`) when changing audience level, status filter, or global search to eliminate pagination desync.
   - Add the Status filter (`ALL`, `ACTIVE`, `INACTIVE`) and an interactive `is_active` status badge/toggle column in the table, wired to `onToggleCourseStatus`.
   - Update `handleExportCSV` to fall back to `table.getFilteredRowModel().rows.map(r => r.original)` when no specific rows are selected.

2. In `src/app/courses/page.js`:
   - Implement `handleToggleCourseStatus` (optimistic state update + Supabase update to `courses.is_active` + cache invalidation) and pass `onToggleCourseStatus` to `CourseGrid`.
   - Fix browser back-navigation desync in the URL sync `useEffect`: when `urlCourseId` is null/empty, close the drawer (`setIsDrawerOpen(false)` and `setSelectedCourseId(null)`).

3. In `src/components/courses/SyllabusImportModal.jsx`:
   - Fix header exclusion logic: DO NOT discard textbook chapter lines like `"Chapter 1: Units and Measurements"` or `"Module 2: Mechanics"`. Only filter actual document boilerplate (e.g. "Table of Contents", "Page X of Y").
   - Enhance the duration parsing regex: correctly parse decimal hours (e.g., `"1.5 hours"` -> 90 minutes) and compound durations (e.g., `"2h 30m"` -> 150 minutes, `"1 hr 45 min"` -> 105 minutes) and clean the title without leaving dangling parenthesis/numbers.
   - Fix staging table sequence re-indexing on row delete and prevent duplicate `order_index` collisions when adding new rows.

4. In `src/components/courses/SyllabusTreeEditor.jsx`:
   - Fix lesson reordering in subject-filtered views: resolve the global index using `lessons.findIndex(l => l.id === lesson.id)` instead of filtered list index.
   - Wire up `newIsFreePreview` state with a toggle checkbox in the lesson creation form and include `is_free: newIsFreePreview` in the lesson creation payload and table display.
   - Normalize `invalidateCache` call signatures across components (`invalidateCache('course', null, courseId)` vs `invalidateCache('course', courseId)`).

5. Verification:
   - Run `node test-course-grid-stress.js` and verify ALL 33 tests pass.
   - Run `node test-syllabus-challenger.js` and verify ALL 25 tests pass.
   - Run `npm run build` (Turbopack) and verify exit code 0.

6. Write changes to `D:\admin dashboard\.agents\worker_2\changes.md` and handoff report to `D:\admin dashboard\.agents\worker_2\handoff.md`.
7. Send a message to the parent orchestrator when complete with test outputs and summary.
