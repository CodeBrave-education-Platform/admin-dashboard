# Challenger 1 Empirical Challenge & Stress Test Report

**Verdict**: **REQUEST_CHANGES**  
**Component Scope**: `CourseGrid.jsx`, `CourseEditorDrawer.jsx`, `src/app/courses/page.js`, `SyllabusTreeEditor.jsx`, `SyllabusImportModal.jsx`  
**Test Suite Executed**: `test-course-grid-stress.js`  
**Total Automated Tests**: 33  
**Passed**: 23 | **Failed / Confirmed Bugs**: 10 (Pass Rate: 69.7%)

---

## 1. Executive Summary

Empirical stress testing of the Course Management Data Grid and Slide-out Drawer state management revealed **10 concrete failure modes** spanning column sorting, global search filtering, pagination state synchronization, curriculum manager reordering, status management, and URL sync resilience.

While core rendering, PDF/Docx layout parsing, and basic column sorting (title, price, students) operate cleanly, several critical bugs will degrade production user experience unless addressed before merge:

1. **Initial `created_at` Sort Invalidation**: `CourseGrid` initializes table state with sorting by `created_at desc`, but `created_at` is missing from `columns`, causing TanStack Table to silently ignore sorting.
2. **Omnibar Search Subject Blindspot**: The Omnibar placeholder advertises `"Search catalog by title, subject, or keywords..."`, but searching for subjects (e.g. "Physics", "Chemistry") returns 0 results because `subject` is not in column accessors and no custom `globalFilterFn` is provided.
3. **Audience Filter + Pagination Stale State Desynchronization**: If a user is on Page 2 and switches level filter (e.g. to "Advanced" with 5 items), `pageIndex` remains at 1, rendering 0 rows ("No Course Blueprints Found") and a corrupted footer: `"Showing 11 to 5 of 5 entries"`.
4. **Curriculum Manager Cross-Subject Reorder Corruption**: When filtering lessons by subject in `SyllabusTreeEditor.jsx`, clicking "Move Up/Down" passes the filtered list index `idx` to `handleMoveLesson(idx, ...)` which operates on the unfiltered `lessons` array, corrupting the order of unrelated subjects.
5. **Missing Status Management & Dead Prop**: `PROJECT.md` mandates Status filtering (`ALL`, `ACTIVE`, `INACTIVE`) and an `is_active` status toggle. `CourseGrid.jsx` lacks a status selector, does not render an `is_active` column, and leaves `onToggleCourseStatus` unused.

---

## 2. Automated Test Execution Matrix (`test-course-grid-stress.js`)

| Suite | Test Name | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **Suite 1: Sorting** | Sort by Title Ascending | Alphabetical A-Z sort | Sorted A-Z correctly | ✅ PASS |
| **Suite 1: Sorting** | Sort by Title Descending | Alphabetical Z-A sort | Sorted Z-A correctly | ✅ PASS |
| **Suite 1: Sorting** | Sort by Price Descending | Numerical descending sort | Sorted descending correctly | ✅ PASS |
| **Suite 1: Sorting** | Sort by Students Count Descending | Numerical descending sort | Sorted descending correctly | ✅ PASS |
| **Suite 1: Sorting** | Initial Sort by `created_at` Descending | Newest courses first | TanStack Table ignores `created_at` (undeclared column) | ❌ FAIL |
| **Suite 1: Sorting** | Duration & Display Order Column Sort | Sortable duration & display order | Columns missing in table schema | ❌ FAIL |
| **Suite 2: Omnibar** | Search by Title Substring | Matches title substring | Matched correctly | ✅ PASS |
| **Suite 2: Omnibar** | Search by Partial Title | Matches partial word | Matched correctly | ✅ PASS |
| **Suite 2: Omnibar** | Search by Subject Metadata | Matches `course.subject` | Returns 0 results (missing accessor) | ❌ FAIL |
| **Suite 2: Omnibar** | Search with Special Characters (`&`) | Matches courses with `&` | Matched 4 courses | ✅ PASS |
| **Suite 2: Omnibar** | Search with Non-Matching Query | Returns empty row array | Returned 0 rows | ✅ PASS |
| **Suite 2: Omnibar** | Search with Empty String | Returns all courses | Returned all courses | ✅ PASS |
| **Suite 3: Level Filter** | Filter by FOUNDATION | Returns foundation courses | Matched 2 courses | ✅ PASS |
| **Suite 3: Level Filter** | Filter by MAINS | Returns mains courses | Matched 2 courses | ✅ PASS |
| **Suite 3: Level Filter** | Filter by ADVANCED | Returns advanced courses | Matched 1 course | ✅ PASS |
| **Suite 3: Level Filter** | Null/Undefined Level Safety | Tolerates missing fields | No runtime exception | ✅ PASS |
| **Suite 3: Level Filter** | Filter Switch with `pageIndex > 0` | Resets `pageIndex` to 0 | `pageIndex` stuck at 1 -> Empty table & "Showing 11 to 5" | ❌ FAIL |
| **Suite 4: Status** | Status Filter UI (ALL, ACTIVE, INACTIVE) | Status selector rendered | Missing in `CourseGrid.jsx` | ❌ FAIL |
| **Suite 4: Status** | `is_active` Column / Status Toggle | Status toggle in table | Missing in `CourseGrid.jsx` | ❌ FAIL |
| **Suite 4: Status** | Page Controller `onToggleCourseStatus` | Prop passed to CourseGrid | Not passed in `page.js` | ❌ FAIL |
| **Suite 5: Large Dataset** | 60 Items Pagination at pageSize: 10 | 6 Pages, 10 items/page | 6 Pages rendered correctly | ✅ PASS |
| **Suite 5: Large Dataset** | Last Page Navigation (Page 6/6) | Page 6 active, canNext=false | Page 6 active, canNext=false | ✅ PASS |
| **Suite 5: Large Dataset** | Page Size Switch (50 items) | 2 Pages (50 + 10 items) | 2 Pages rendered correctly | ✅ PASS |
| **Suite 5: Large Dataset** | Empty Dataset (0 items) | Page count = 0, safe state | Page count = 0, safe state | ✅ PASS |
| **Suite 5: CSV Export** | CSV Export with Active Filters | Exports filtered rows | Exports unfiltered raw `courses` | ❌ FAIL |
| **Suite 6: URL Sync** | Match Valid Course ID (`?id=...`) | Opens drawer for matched ID | Matched & opened | ✅ PASS |
| **Suite 6: URL Sync** | Invalid Course ID in URL | Safe undefined, no crash | Safe undefined | ✅ PASS |
| **Suite 6: URL Sync** | Malicious URL Input (SQLi/XSS) | Safe undefined, no crash | Safe undefined | ✅ PASS |
| **Suite 6: URL Sync** | Browser Back (`?id=123` -> `/courses`) | Closes drawer on null ID | Drawer remains open (no else branch) | ❌ FAIL |
| **Suite 7: Curriculum** | Reorder Lessons with Subject Filter | Reorders filtered items safely | Corrupts order of other subjects (index mismatch) | ❌ FAIL |
| **Suite 8: Syllabus** | Complex Duration Patterns | Parses mins, hours, [2 hrs] | Parsed 5 formats accurately | ✅ PASS |
| **Suite 8: Syllabus** | Document Noise Filtering | Skips page numbers, index | Filtered noise cleanly | ✅ PASS |
| **Suite 8: Syllabus** | Empty/Null/Whitespace Text | Safe empty array | Returned empty array | ✅ PASS |

---

## 3. Detailed Failure Mode Analysis & Mitigations

### 🔴 Challenge 1: TanStack Table Initial Sorting Desync on `created_at`
- **Location**: `src/components/courses/CourseGrid.jsx:31` & `lines 41-259`
- **Observation**:
  `CourseGrid.jsx` defines initial state:
  ```javascript
  const [sorting, setSorting] = useState([{ id: 'created_at', desc: true }]);
  ```
  However, in `columns`, no column has `id: 'created_at'` or `accessorKey: 'created_at'`.
- **Blast Radius**: TanStack Table discards the sorting rule. The table is rendered in raw insertion order rather than newest-first order.
- **Recommended Mitigation**:
  Add an explicit hidden or visible accessor column for `created_at`, or provide `accessorKey: 'created_at'` in the title column:
  ```javascript
  {
    accessorKey: 'created_at',
    id: 'created_at',
    header: 'Date Created',
    enableHiding: true,
  }
  ```

---

### 🔴 Challenge 2: Omnibar Global Text Search Subject Blindspot
- **Location**: `src/components/courses/CourseGrid.jsx:324-330`
- **Observation**:
  The Omnibar search input claims:
  `placeholder="Search catalog by title, subject, or keywords..."`
  However, TanStack Table's default `globalFilterFn` only searches columns that have defined `accessorKey`s (`title`, `level`, `price`, `students_count`). `subject` is not an accessor column. Searching for "Physics" or "Chemistry" fails when the term is not in the course title.
- **Blast Radius**: Instructors cannot find courses by subject using the global search bar.
- **Recommended Mitigation**:
  Add a custom `globalFilterFn` to `useReactTable`:
  ```javascript
  globalFilterFn: (row, columnId, filterValue) => {
    const search = String(filterValue || '').toLowerCase();
    const course = row.original;
    const matchTitle = (course.title || '').toLowerCase().includes(search);
    const matchSubject = (course.subject || '').toLowerCase().includes(search);
    const matchLevel = (course.level || '').toLowerCase().includes(search);
    return matchTitle || matchSubject || matchLevel;
  }
  ```

---

### 🔴 Challenge 3: Audience Level Filter + Pagination Stale State Desynchronization
- **Location**: `src/components/courses/CourseGrid.jsx:35-38` & `lines 476-478`
- **Observation**:
  When a user is on Page 2 (`pageIndex = 1`) and clicks the "Advanced" filter pill (which has fewer than 10 courses), `pageIndex` is not reset to `0`. TanStack Table looks for rows at offset 10-19, finding 0 rows.
  - The UI displays: `"No Course Blueprints Found"` despite 5 matching courses.
  - The footer displays: `"Showing 11 to 5 of 5 entries"`.
- **Blast Radius**: Filter switching on paginated views creates false empty states and broken pagination counters.
- **Recommended Mitigation**:
  Reset table pagination index whenever `levelFilter` changes:
  ```javascript
  const handleLevelFilterChange = (level) => {
    setLevelFilter(level);
    table.setPageIndex(0);
  };
  ```
  Or enable `autoResetPageIndex: true` in `useReactTable` configuration.

---

### 🔴 Challenge 4: Curriculum Manager Cross-Subject Reorder Corruption
- **Location**: `src/components/courses/SyllabusTreeEditor.jsx:202-232` & `lines 537, 551`
- **Observation**:
  `filteredLessons = lessons.filter(...)` creates a filtered view of lessons. In JSX, `filteredLessons.map((lesson, idx) => ...)` passes `idx` to `handleMoveLesson(idx, 'up' | 'down')`.
  `handleMoveLesson` uses `newLessons[index]` assuming `index` corresponds to `lessons`, not `filteredLessons`.
  If `lessons` is `[Physics 1, Chemistry 1, Physics 2]` and the user filters by "Physics":
  - Clicking "Move Up" on Physics 2 (`idx = 1` in filtered list) swaps `lessons[1]` (Chemistry 1) and `lessons[0]` (Physics 1), corrupting the ordering of Chemistry without moving Physics 2.
- **Blast Radius**: Silent database corruption of curriculum sequence when instructors reorder lessons within subject-filtered tabs.
- **Recommended Mitigation**:
  Pass the actual lesson ID or find its real index in `lessons`:
  ```javascript
  const handleMoveLessonById = async (lessonId, direction) => {
    const currentIndex = lessons.findIndex(l => l.id === lessonId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;
    
    const newLessons = [...lessons];
    const temp = newLessons[currentIndex];
    newLessons[currentIndex] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;
    // ...
  };
  ```

---

### 🟡 Challenge 5: Missing Status Filter & Unused Status Toggle
- **Location**: `src/components/courses/CourseGrid.jsx:26` & `src/app/courses/page.js:191-205`
- **Observation**:
  `PROJECT.md` specifies a Status filter (`ALL`, `ACTIVE`, `INACTIVE`) and an `is_active` status toggle.
  `CourseGrid.jsx` declares `onToggleCourseStatus` in its prop signature but never renders an `is_active` column or toggle button. `src/app/courses/page.js` never passes `onToggleCourseStatus` to `<CourseGrid />`.
- **Blast Radius**: Admin users cannot filter or toggle course publication status directly from the data grid.
- **Recommended Mitigation**:
  Implement the status selector tabs in `CourseGrid.jsx`, render an `is_active` toggle pill in the table columns, and pass `onToggleCourseStatus` from `page.js`.

---

### 🟡 Challenge 6: CSV Export Ignoring Active Filters
- **Location**: `src/components/courses/CourseGrid.jsx:285-290`
- **Observation**:
  In `handleExportCSV`:
  ```javascript
  const exportData = selectedRows.length > 0
    ? selectedRows.map(r => r.original)
    : courses; // Falls back to raw unfiltered courses
  ```
  If a user has filtered the table to "Advanced Physics" and clicks "Export CSV" without manually selecting checkboxes, it exports all courses in the catalog.
- **Blast Radius**: Exported CSV contains unfiltered data contrary to user intent.
- **Recommended Mitigation**:
  Fallback to `filteredData` or `table.getFilteredRowModel().rows.map(r => r.original)`:
  ```javascript
  const exportData = selectedRows.length > 0
    ? selectedRows.map(r => r.original)
    : table.getFilteredRowModel().rows.map(r => r.original);
  ```

---

### 🟡 Challenge 7: Browser Back Navigation Desynchronization in URL Sync
- **Location**: `src/app/courses/page.js:79-87`
- **Observation**:
  The URL sync `useEffect` only listens for truthy `urlCourseId`:
  ```javascript
  useEffect(() => {
    if (courses.length > 0 && urlCourseId) {
      const match = courses.find(c => c.id === urlCourseId);
      if (match) {
        setSelectedCourse(match);
        setIsDrawerOpen(true);
      }
    }
  }, [urlCourseId, courses]);
  ```
  When the user presses the browser's "Back" button, the URL changes from `/courses?id=123` to `/courses` (`urlCourseId = null`). Because there is no `else` block, `isDrawerOpen` remains `true`, leaving the drawer open despite URL clearing.
- **Blast Radius**: Inconsistent browser history navigation and back-button behavior.
- **Recommended Mitigation**:
  Add an `else` branch or synchronization check:
  ```javascript
  useEffect(() => {
    if (courses.length > 0) {
      if (urlCourseId) {
        const match = courses.find(c => c.id === urlCourseId);
        if (match) {
          setSelectedCourse(match);
          setIsDrawerOpen(true);
        }
      } else if (isDrawerOpen) {
        setIsDrawerOpen(false);
        setSelectedCourse(null);
      }
    }
  }, [urlCourseId, courses]);
  ```

---

## 4. Verdict & Recommendations

### Final Verdict: **REQUEST_CHANGES**

**Required Actions for Workers**:
1. Fix TanStack Table column definitions in `CourseGrid.jsx` to include `created_at` accessor and custom `globalFilterFn` for `subject` search.
2. Add pagination auto-reset on `levelFilter` change in `CourseGrid.jsx`.
3. Refactor `handleMoveLesson` in `SyllabusTreeEditor.jsx` to identify lessons by ID rather than filtered array index.
4. Add status selector filter and `is_active` status toggle in `CourseGrid.jsx`, connecting `onToggleCourseStatus` in `page.js`.
5. Update CSV export fallback to use `table.getFilteredRowModel().rows`.
6. Update URL sync effect in `page.js` to close drawer when `urlCourseId` clears.

**Independent Verification**:
Run the automated validation suite:
```powershell
node test-course-grid-stress.js
```
