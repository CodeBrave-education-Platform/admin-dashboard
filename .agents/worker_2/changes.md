# Worker 2: Empirical Changes Documentation

**Date**: 2026-08-17  
**Scope**: Course Management UI Redesign — Defect Remediation & Hardening  

---

## Summary of Changes

### 1. `src/components/courses/CourseGrid.jsx`
- **Initial Sort Accessor**: Added `created_at`, `duration`, and `display_order` column accessors in TanStack Table schema so `[{ id: 'created_at', desc: true }]` sorts chronologically descending on load.
- **Custom Global Filter**: Implemented `globalFilterFn` checking `title`, `subject`, `description`, `target_audience`/`badge`, and `level` (case-insensitive substring search).
- **Pagination Desync Elimination**: Added `handleLevelFilterChange`, `handleStatusFilterChange`, and `handleGlobalFilterChange` that trigger `table.setPageIndex(0)`, plus configured `autoResetPageIndex: true` in `useReactTable`.
- **Status Filtering & Toggle Column**:
  - Added `statusFilter` state (`'ALL'`, `'ACTIVE'`, `'INACTIVE'`) with UI toggle pills in the control deck.
  - Added interactive `is_active` (`status`) badge column with optimistic click handler wired to `onToggleCourseStatus`.
- **CSV Export Fallback**: Updated `handleExportCSV` to fall back to `table.getFilteredRowModel().rows.map(r => r.original)` rather than raw unfiltered courses.

### 2. `src/app/courses/page.js`
- **Course Status Handler**: Implemented `handleToggleCourseStatus(courseId, nextStatus)` with optimistic React state update, Supabase DB update (`courses.is_active`), dual Redis cache invalidation (`catalog` and `course`), and error rollback.
- **Wired Prop**: Passed `onToggleCourseStatus={handleToggleCourseStatus}` to `<CourseGrid />`.
- **Back-Navigation History Sync**: Updated URL sync `useEffect` to close the drawer (`setIsDrawerOpen(false)` and `setSelectedCourse(null)`) when `urlCourseId` is empty or null after browser back-navigation.

### 3. `src/components/courses/SyllabusImportModal.jsx`
- **Header Exclusion Logic**: Replaced `/^chapter/i` filter with standalone boilerplate matching (`/^(?:page(?:\s+\d+)?|syllabus|table of contents|index|course overview|curriculum)\s*$/i`), preventing false-positive dropping of legitimate textbook chapters like `"Chapter 1: Units and Measurements"`.
- **Enhanced Duration Parser**:
  - Compound durations: Support `2h 30m` / `2 hours 15 mins` / `[1 hr 45 min]` -> converts to combined minutes (e.g. 150m, 135m, 105m).
  - Decimal hours: Support `1.5 hours` -> 90m, `[2.5 hrs]` -> 150m without capturing trailing decimals into titles.
  - Title cleanup: Strips prefix tags (`Chapter X:`, `Lesson X:`, `Module X:`, `Unit X:`, `Lecture X:`, Roman numerals `I.`, `IV.`) without mangling non-duration parentheses.
- **Contiguous Sequence Re-Indexing**: On draft row deletion, re-indexed `order_index: idx + 1`; on row addition, allocated `draftLessons.length + 1` with unique timestamped UUID.
- **Cache Invalidation Normalization**: Updated line 265 from `invalidateCache('course', null, targetCourseId)` to `invalidateCache('course', targetCourseId)`.

### 4. `src/components/courses/SyllabusTreeEditor.jsx`
- **Safe Lesson Reordering**: Resolved lesson indices via `lessons.findIndex(l => l.id === lesson.id)` rather than using the filtered view's local index `idx`, eliminating cross-subject curriculum corruption.
- **Free Preview Toggle**:
  - Added toggle checkbox in Add Lesson form and Edit Lesson form.
  - Included `is_free_preview: newIsFreePreview` and `is_free: newIsFreePreview` in insert and update payloads.
  - Displayed Free Preview pill badge in lesson cards.
- **Normalized InvalidateCache**: Changed all `await invalidateCache('course', null, courseId)` calls to `await invalidateCache('course', courseId)`.

### 5. `src/components/courses/CourseFilesManager.jsx`
- **Normalized InvalidateCache**: Changed `await invalidateCache('course', null, courseId)` to `await invalidateCache('course', courseId)` across file upload and file delete handlers.

### 6. Automated Validation Harnesses
- `test-course-grid-stress.js`: 33/33 tests passing (100.0%).
- `test-syllabus-challenger.js`: 25/25 tests passing (100.0%).
- `npm run build`: Next.js 16 Turbopack build succeeded with exit code 0.
