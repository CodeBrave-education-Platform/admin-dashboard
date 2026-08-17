# Adversarial Challenge & Stress Report: Syllabus Importer & Curriculum Editor

**Challenger**: Challenger 2 (Empirical Challenger)  
**Date**: 2026-08-17T06:08:00Z  
**Verdict**: **REQUEST_CHANGES ⚠️**  
**Target Codebase**:
- `src/components/courses/SyllabusImportModal.jsx` (2D Spatial Layout & Deterministic Regex Parser)
- `src/components/courses/SyllabusTreeEditor.jsx` (Curriculum Tree CRUD & Reordering)
- `src/components/courses/CourseEditorDrawer.jsx` (Slide-out Management Drawer)

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

While the modular architecture, TanStack data grid integration, and zero-cloud 2D layout parser perform exceptionally well in throughput (>120,000 lessons/sec) and ReDoS resistance, empirical stress testing surfaced **5 critical algorithmic defects and functional gaps** in the parser and editor logic:

1. **Critical Parser Drop (False-Positive Header Exclusion)**: Any syllabus formatted with standard `"Chapter X: Topic Name"` (e.g. NCERT / JEE syllabi) is completely dropped by the `/^chapter/i` header exclusion filter, causing 100% loss of parsed syllabus units.
2. **Duration Calculation & Title Corruption on Decimal Hours**: Floating-point hours (e.g. `"1.5 hours"`) capture only the integer after the decimal point (`5`), inflating duration by 3.33x (`300 minutes` instead of `90 minutes`) while corrupting the lesson title with dangling punctuation (`"Thermodynamics (1."`).
3. **Compound Duration Loss**: Compound durations (e.g. `"2h 30m"`, `"2 hours 15 mins"`) drop the hour component entirely, parsing only the trailing minutes and mangling titles.
4. **Staging Sequence De-synchronization & Duplication Risk**: Deleting rows in the staging table leaves non-contiguous sequence gaps, and subsequent manual row additions generate duplicate `order_index` sequence collisions.
5. **Missing Free Preview Feature in Curriculum Editor**: Although specified in `PROJECT.md` and initialized as state in `SyllabusTreeEditor.jsx` (`newIsFreePreview`), free-preview toggling is never wired into the create payload, edit modal, or row UI.

---

## Challenges & Empirical Vulnerability Matrix

### 🔴 [CRITICAL] Challenge 1: Legitimate "Chapter X" Syllabus Units Discarded by Header Filter

- **Assumption Challenged**: The regex assumption in `SyllabusImportModal.jsx` (line 109) assumes that any line starting with `"chapter"` is document metadata rather than an actual syllabus lesson topic.
- **Attack Scenario**: An instructor uploads an NCERT, textbook, or JEE syllabus document with chapters formatted as:
  ```text
  Chapter 1: Units and Measurements (60 mins)
  Chapter 2: Kinematics (90 mins)
  Chapter 14: Oscillations (120 mins)
  ```
- **Blast Radius**: `parseSyllabusText` returns an empty array (`[]`). The modal displays an error: `"Could not identify any modules or lessons in this syllabus document"`. The entire import fails for all standard textbook syllabi.
- **Empirical Proof**:
  - Test 2.2 in `test-syllabus-challenger.js`:
  - Input: `Chapter 1: Units and Measurements (60 mins)`
  - Output: `0` lessons parsed (100% data loss).
- **Recommended Defense**:
  Update line 109 to match standalone header lines only, and add `chapter` to the prefix stripping regex on line 130:
  ```javascript
  // Line 109: Only filter pure standalone headers
  if (/^(?:page|syllabus|table of contents|index|course overview|curriculum)\s*$/i.test(trimmed)) continue;
  if (/^\d+\s*$/i.test(trimmed)) continue;

  // Line 130: Support chapter prefix stripping
  const prefixRegex = /^(?:chapter\s*\d+[\.\-\s:]+|lesson\s*\d+[\.\-\s:]+|module\s*\d+[\.\-\s:]+|topic\s*\d+[\.\-\s:]+|\d+[\.\-\s)]+)\s*/i;
  ```

---

### 🔴 [HIGH] Challenge 2: Decimal Hours Duration Corruption & Title Truncation

- **Assumption Challenged**: The duration regex `/(?:[-–—(📎[]\s*)?(\d+)\s*(?:min|minute|hour|hr|h|m)s?[\)\]]?\s*$/i` assumes durations are always whole integers.
- **Attack Scenario**: A syllabus line specifies decimal hours:
  ```text
  Thermodynamics Lecture (1.5 hours)
  Rotational Dynamics [2.5 hrs]
  ```
- **Blast Radius**:
  1. The regex captures `5` (the digit after `.`) as `durMatch[1]`.
  2. `val = 5`, `duration = 5 * 60 = 300` minutes (intended was 90 minutes).
  3. `title.replace(durationRegex, '')` slices off `5 hours)`, leaving `"Thermodynamics Lecture (1."` in the database!
- **Empirical Proof**:
  - Test 2.3 in `test-syllabus-challenger.js`:
  - Input: `Thermodynamics Lecture (1.5 hours)`
  - Expected: `duration_minutes: 90`, `title: "Thermodynamics Lecture"`
  - Actual: `duration_minutes: 300`, `title: "Thermodynamics Lecture (1."`
- **Recommended Defense**:
  Allow decimal points in duration number matching:
  ```javascript
  const durationRegex = /(?:[-–—(📎[]\s*)?(\d+(?:\.\d+)?)\s*(?:min|minute|hour|hr|h|m)s?[\)\]]?\s*$/i;
  const durMatch = durationRegex.exec(trimmed);
  if (durMatch) {
    const val = parseFloat(durMatch[1]);
    const unit = durMatch[0].toLowerCase();
    if (unit.includes('hour') || unit.includes('hr') || unit.includes('h')) {
      duration = Math.round(val * 60);
    } else {
      duration = Math.round(val);
    }
    title = trimmed.replace(durationRegex, '').trim();
  }
  ```

---

### 🟡 [MEDIUM] Challenge 3: Compound Duration Breakdown ("2h 30m" / "2 hours 15 mins")

- **Assumption Challenged**: Durations are represented in single-unit tokens only.
- **Attack Scenario**: Syllabus specifies compound durations:
  ```text
  Optics Marathon (2h 30m)
  Calculus Bootcamp - 2 hours 15 mins
  ```
- **Blast Radius**: The single-token regex matches only the trailing `30m)` / `15 mins`. The primary hour block is ignored, reducing lesson duration from 150 mins to 30 mins, and corrupting the title to `"Optics Marathon (2h"`.
- **Empirical Proof**:
  - Test 2.7 in `test-syllabus-challenger.js`:
  - Input: `Optics Marathon (2h 30m)`
  - Expected: `duration_minutes: 150`, `title: "Optics Marathon"`
  - Actual: `duration_minutes: 30`, `title: "Optics Marathon (2h"`
- **Recommended Defense**:
  Add compound duration pattern matcher before single-token fallback:
  ```javascript
  const compoundRegex = /(?:[-–—(📎[]\s*)?(?:(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h))[\s,]+(?:(\d+)\s*(?:mins?|minutes?|m))[\)\]]?\s*$/i;
  const compMatch = compoundRegex.exec(trimmed);
  if (compMatch) {
    const h = parseFloat(compMatch[1]) || 0;
    const m = parseInt(compMatch[2]) || 0;
    duration = Math.round(h * 60 + m);
    title = trimmed.replace(compoundRegex, '').trim();
  }
  ```

---

### 🟡 [MEDIUM] Challenge 4: Staging Table Row Deletion Sequence Gaps & Order Collisions

- **Assumption Challenged**: Deleting rows from draft lessons does not affect subsequent sequence numbering or cause duplicate keys.
- **Attack Scenario**:
  1. Parser generates 3 items with `order_index: [1, 2, 3]`.
  2. User clicks delete on Row 2 (`item.id === 2`).
  3. Staging state is now `[{ id: 1, order_index: 1 }, { id: 3, order_index: 3 }]`.
  4. User clicks "Add Lesson Row" -> `newSeq = draftLessons.length + 1 = 3`.
  5. Staging state now has duplicate sequence `3` for both Unit 3 and New Lesson Unit 3!
- **Blast Radius**: Duplicate `order_index` values in the database, resulting in non-deterministic ordering in `SyllabusTreeEditor`.
- **Empirical Proof**:
  - Test 3.2 & 3.3 in `test-syllabus-challenger.js`:
  - Sequence indices after deletion: `[1, 3]`. Addition creates duplicate order index `3`.
- **Recommended Defense**:
  Re-normalize `order_index` when deleting rows in `SyllabusImportModal.jsx`:
  ```javascript
  setDraftLessons(prev => 
    prev
      .filter(item => item.id !== lesson.id)
      .map((item, idx) => ({ ...item, order_index: idx + 1 }))
  );
  ```

---

### 🔴 [HIGH] Challenge 5: Incomplete Free-Preview Toggle Contract in Curriculum Editor

- **Assumption Challenged**: `SyllabusTreeEditor.jsx` implements the full feature contract defined in `PROJECT.md` (Features #4 & Section 1.3: "Tree/List lesson manager with reordering, inline editing, duration, and free preview toggle").
- **Attack Scenario**:
  - `const [newIsFreePreview, setNewIsFreePreview] = useState(false);` exists on line 43 of `SyllabusTreeEditor.jsx`.
  - However, `newIsFreePreview` is NEVER referenced anywhere in:
    1. `handleCreateLesson` insert payload (lines 73-86).
    2. `startEditing` / `handleSaveEdit` edit forms (lines 120-133, 140-151).
    3. Add Lesson form JSX (lines 280-413).
    4. Edit Lesson form JSX (lines 447-523).
    5. Lesson list card items (lines 527-660).
- **Blast Radius**: Instructors cannot configure trial/free preview lessons for potential students. Marketing/conversion funnel for free preview lectures is completely non-functional.
- **Empirical Proof**:
  - Test 4.4 in `test-syllabus-challenger.js`:
  - Verified static AST & regex scans: `newIsFreePreview` is orphaned on line 43 with 0 consumers.
- **Recommended Defense**:
  1. Add `is_free_preview: newIsFreePreview` to `payload` in `handleCreateLesson`.
  2. Add `is_free_preview` checkbox input in Add Lesson form and Edit Lesson form.
  3. Display a Free Preview pill badge (`<Eye className="w-3 h-3 text-emerald-600" /> Free Preview`) in lesson row item cards.

---

## Stress Test Results Summary

| Suite | Category | Tests Executed | Passed | Failed | Status |
|---|---|---|---|---|---|
| **Suite 1** | 2D Spatial Layout Reconstruction | 5 | 5 | 0 | **PASSED** ✅ |
| **Suite 2** | Regex Syllabus Parsing & Edge Cases | 8 | 5 | 3 | **FAILED** ❌ |
| **Suite 3** | Staging Table Mutations & Integrity | 4 | 3 | 1 | **FAILED** ❌ |
| **Suite 4** | Lesson Tree CRUD & Free Preview | 5 | 4 | 1 | **FAILED** ❌ |
| **Suite 5** | ReDoS & High-Volume Stress | 3 | 3 | 0 | **PASSED** ✅ |
| **TOTAL** | **Full Challenger Suite** | **25** | **20** | **5** | **REQUEST_CHANGES** ⚠️ |

### Detailed Execution Trace:
- `1.1 Normal horizontal line items on same Y` → **PASS** (0.348ms)
- `1.2 Sub-pixel Y-jitter clustering (delta < 3.5px)` → **PASS** (0.137ms)
- `1.3 Out-of-order PDF stream items properly sorted by Y desc and X asc` → **PASS** (0.165ms)
- `1.4 Multi-column PDF text stream behavior` → **PASS** (0.192ms)
- `1.5 Noisy PDF items with whitespace, empty strings, null strings` → **PASS** (0.166ms)
- `2.1 Standard numbered syllabus items with minutes` → **PASS** (1.355ms)
- `2.2 Challenge: "Chapter X" syllabus units must NOT be falsely dropped` → **FAIL** (0.122ms)
- `2.3 Challenge: Decimal hours duration conversion ("1.5 hours")` → **FAIL** (0.158ms)
- `2.4 Roman Numeral prefixes handling ("I. Topic", "IV. Topic")` → **PASS** (0.191ms)
- `2.5 "Unit X:" and "Lecture X:" prefix handling` → **PASS** (0.102ms)
- `2.6 Missing durations default gracefully to 60 minutes` → **PASS** (0.094ms)
- `2.7 Compound duration format parsing ("2h 30m")` → **FAIL** (0.105ms)
- `2.8 Non-duration parentheses preservation ("Vectors (Part 1)")` → **PASS** (0.086ms)
- `3.1 Staging table row insertion ID uniqueness across batch` → **PASS** (0.245ms)
- `3.2 Staging table row deletion sequence contiguity check` → **FAIL** (0.187ms)
- `3.3 Duplicate sequence index detection in staging payload` → **PASS** (0.183ms)
- `3.4 HTML/Script injection resistance in syllabus staging fields` → **PASS** (0.155ms)
- `4.1 nextOrder calculation robustness in SyllabusTreeEditor` → **PASS** (0.137ms)
- `4.2 Move Up/Down boundary logic (Index 0 move up & Index N-1 move down)` → **PASS** (0.290ms)
- `4.3 YouTube Video ID extraction (standard, embed, youtu.be, shorts)` → **PASS** (0.394ms)
- `4.4 Challenge: Free preview toggle completeness vs PROJECT.md blueprint` → **FAIL** (1.378ms)
- `4.5 Duration aggregation with varied and missing values` → **PASS** (0.269ms)
- `5.1 ReDoS resistance on adversarial duration regex inputs` → **PASS** (0.669ms)
- `5.2 High-volume 500-lesson syllabus parsing throughput (< 15ms target)` → **PASS** (4.708ms, 123,378 lessons/sec)
- `5.3 2D spatial layout reconstruction with 2,000 PDF text stream items` → **PASS** (2.378ms)

---

## Unchallenged Areas

- **CDN Worker Script Loading (`pdfjs-dist` & `mammoth.js`)**: CDN fetch network latency depends on external connectivity in browser environment. The dynamic script injection logic was verified structurally.
- **Supabase Realtime RLS Policies**: Authenticated user permissions and DB foreign key cascades were evaluated via schema types, not live DB mutation.
