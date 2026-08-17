# Handoff Report — Challenger 1

**Role**: Challenger 1 (critic, specialist)  
**Target**: CourseGrid & Slide-Out Drawer State Management  
**Working Directory**: `D:\admin dashboard\.agents\challenger_1`  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct empirical observations and execution results:

1. **Automated Stress Test Suite Execution**:
   - Command: `node test-course-grid-stress.js`
   - Result: 33 tests executed, 23 passed, 10 failed/confirmed failure modes (69.7% pass rate).
2. **TanStack Table Sorting (`src/components/courses/CourseGrid.jsx:31, 41-259`)**:
   - `CourseGrid.jsx` initializes `sorting` state with `[{ id: 'created_at', desc: true }]` (line 31).
   - In `columns` array (lines 41-259), no column has `id: 'created_at'` or `accessorKey: 'created_at'`.
   - Empirically observed that TanStack Table ignores `created_at` sorting, outputting rows in raw array order.
3. **Omnibar Global Text Search (`src/components/courses/CourseGrid.jsx:324-330`)**:
   - Omnibar placeholder: `"Search catalog by title, subject, or keywords..."`.
   - TanStack Table default `globalFilterFn` only scans accessor columns (`title`, `level`, `price`, `students_count`).
   - Empirically observed that searching for `"Physics"` on a course whose title is `"Kinematics and Newton Laws of Motion"` and `subject === "Physics"` yields 0 results.
4. **Audience Level Filter + Pagination Desync (`src/components/courses/CourseGrid.jsx:35-38, 476-478`)**:
   - When user is on page 2 (`pageIndex = 1`) and filters to a level with 5 courses, `pageIndex` remains 1.
   - TanStack Table renders 0 rows, showing `"No Course Blueprints Found"`, while the pagination footer displays: `"Showing 11 to 5 of 5 entries"`.
5. **Curriculum Manager Reordering (`src/components/courses/SyllabusTreeEditor.jsx:202-232, 537, 551`)**:
   - `filteredLessons.map((lesson, idx) => ...)` passes filtered array index `idx` to `handleMoveLesson(idx, direction)`.
   - `handleMoveLesson` uses `newLessons[index]` on the unfiltered array.
   - When filtering by subject (e.g. "Physics"), clicking "Move Up" on Physics Lesson 2 (idx 1 in filtered list) swaps Chemistry Lesson 1 with Physics Lesson 1 in the full array, leaving Physics Lesson 2 unchanged.
6. **Missing Status Filter & Dead Prop (`src/components/courses/CourseGrid.jsx:26`, `src/app/courses/page.js:191-205`)**:
   - `CourseGrid.jsx` does not implement a status filter (ALL, ACTIVE, INACTIVE) or render an `is_active` status column.
   - `page.js` does not pass `onToggleCourseStatus` to `<CourseGrid />`.
7. **CSV Export Fallback (`src/components/courses/CourseGrid.jsx:285-290`)**:
   - `handleExportCSV` falls back to unfiltered `courses` prop when no rows are selected, exporting the entire catalog even when active search or level filters are applied.
8. **Browser Back URL Sync (`src/app/courses/page.js:79-87`)**:
   - The URL sync `useEffect` only listens for truthy `urlCourseId` and has no `else` block to close the drawer when navigating Back to `/courses`.
9. **Next.js Production Build (`npm run build`)**:
   - Command: `npm run build`
   - Result: Compiled successfully in 10.5s with Turbopack, 0 build/type errors.

---

## 2. Logic Chain

1. **Sorting Invalidation**:
   - Observation: Initial sorting state specifies `id: 'created_at'`, but `columns` lacks any matching accessor.
   - Logic: TanStack Table relies on column definitions to resolve values for sorting. Without an accessor, `getSortedRowModel()` cannot extract `created_at` timestamps from rows.
   - Invariant Violated: Initial catalog view must display newest courses first.
2. **Search Omission**:
   - Observation: `subject` is only rendered inside custom JSX in the `title` column cell, not declared as a column accessor.
   - Logic: Default TanStack global filtering inspects `row.getValue(colId)`. Because `subject` has no column ID and no custom `globalFilterFn` is registered, queries matching subject metadata return empty sets.
   - Invariant Violated: Omnibar must search by title, subject, and keywords as advertised.
3. **Pagination State Desynchronization**:
   - Observation: `levelFilter` state changes in parent component do not reset table `pageIndex`.
   - Logic: When `filteredData.length` decreases below the active page offset (`pageIndex * pageSize`), the table attempts to slice non-existent elements, resulting in an empty row model and mathematical artifact in footer string interpolation (`"Showing 11 to 5"`).
   - Invariant Violated: Filter state changes must always display valid matching results starting from page 1.
4. **Curriculum Sequence Corruption**:
   - Observation: `handleMoveLesson` assumes argument `index` refers to index in `lessons` array, but caller provides `idx` from `filteredLessons`.
   - Logic: In any filtered view where `filteredLessons.length < lessons.length`, `idx` maps to an arbitrary unrelated lesson in `lessons`, swapping the wrong records in the database.
   - Invariant Violated: Reordering within a filtered subject view must only affect lessons within that subject or adjust their absolute sequence deterministically.

---

## 3. Caveats

1. The automated tests were run against mock datasets and the actual React/TanStack table components in a Node.js v24 environment with Turbopack build verification.
2. Database interactions in `test-course-grid-stress.js` were simulated using pure data-layer transforms matching Supabase schemas.
3. Edge cases involving client-side browser file uploads (PDF.js / Mammoth DOM context) were verified via string layout parsers (`parseSyllabusText`), while DOM CDN loading requires a browser runtime.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

The Course Management UI redesign possesses high visual potential and solid component decoupling, but contains **5 high/critical logic flaws** in state management, sorting, filtering, and curriculum reordering. 

The implementation should NOT be approved for merge until the workers address:
1. `created_at` column accessor in `CourseGrid.jsx`.
2. Custom `globalFilterFn` covering `title`, `subject`, and `level` in `CourseGrid.jsx`.
3. Auto-reset of `pageIndex` on `levelFilter` / `statusFilter` change in `CourseGrid.jsx`.
4. `handleMoveLessonById` refactor in `SyllabusTreeEditor.jsx` to prevent cross-subject sequence corruption.
5. Status filter UI and `is_active` toggle integration across `CourseGrid.jsx` and `page.js`.

---

## 5. Verification Method

To independently verify all findings and reproduce test failures:

```powershell
# 1. Run the empirical stress test suite
node test-course-grid-stress.js

# 2. Verify Next.js build clean state
npm run build
```

Expected output of `node test-course-grid-stress.js`:
- Total Tests: 33
- Passed: 23
- Failed: 10 (matching the failure modes documented in `challenge.md`)
