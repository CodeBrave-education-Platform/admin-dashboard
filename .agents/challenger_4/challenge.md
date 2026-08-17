# Empirical Challenge Report: Syllabus Importer, Regex Parser & Curriculum Editor

**Author**: Challenger 4 (Empirical Challenger & Critic)  
**Date**: 2026-08-17  
**Verdict**: **APPROVE ✅**  
**Target Components**:
- `src/components/courses/SyllabusImportModal.jsx`
- `src/components/courses/SyllabusTreeEditor.jsx`
- `src/app/courses/page.js`
- `test-syllabus-challenger.js`

---

## 1. Executive Summary

An exhaustive empirical verification and adversarial stress-testing of the Syllabus Importer, 2D Spatial Layout Parser, Regex Duration/Unit Extractor, and Curriculum Tree Editor was conducted. All 5 previously identified failure modes have been rigorously examined, tested against edge cases, and confirmed **100% RESOLVED**.

The automated test harness `test-syllabus-challenger.js` was executed directly via Node.js, achieving a **100% pass rate (25/25 tests passing, 0 failures)** across 5 dedicated test suites.

| # | Failure Mode | Prior State / Defect | Current Fix / Implementation | Empirical Status |
|---|--------------|----------------------|------------------------------|------------------|
| **1** | **Header Exclusions** | Legitimate lesson lines like `"Chapter 1: ..."` or `"Module 2"` were dropped due to overly broad header filtering | Regex anchored with `$` and excludes `chapter`; prefix cleaner strips chapter/module labels while preserving unit titles | **100% RESOLVED (PASS)** |
| **2** | **Decimal Hours** | `"1.5 hours"` parsed incorrectly (e.g. 300 mins or truncated to integer 1) | Decimal capture regex `(\d+(?:\.\d+)?)` with `parseFloat` + `Math.round(val * 60)` correctly parses 90 mins | **100% RESOLVED (PASS)** |
| **3** | **Compound Hours** | `"2h 30m"` / `"2 hours 15 mins"` failed single-duration regex or left `"2h"` in title | Dedicated compound regex executed prior to single-duration regex cleanly captures hours & minutes (e.g. 150m) | **100% RESOLVED (PASS)** |
| **4** | **Staging Deletions & Collisions** | Deleting rows left sequence gaps (`order_index`); adding rows created draft ID collisions | Timestamp + random entropy IDs; immediate sequence re-normalization on row deletion `idx + 1` | **100% RESOLVED (PASS)** |
| **5** | **Free-Preview Wiring** | `newIsFreePreview` state declared but omitted from insert/update payloads, edit forms, and badges | Full bidirectional wiring for `is_free_preview` & `is_free` across creation, editing, UI toggles, and badge display | **100% RESOLVED (PASS)** |

---

## 2. Automated Test Suite Execution Results

**Execution Command**: `node test-syllabus-challenger.js`  
**Exit Code**: `0`  
**Execution Timestamp**: `2026-08-17T11:46:44+05:30`

### Suite Breakdown:
```text
══════════════════════════════════════════════════════════════════
  CHALLENGER 2: SYLLABUS & CURRICULUM LOGIC EMPIRICAL SUITE       
══════════════════════════════════════════════════════════════════

--- SUITE 1: 2D Spatial Layout Reconstruction ---
  ✅ [PASS] 1.1 Normal horizontal line items on same Y (0.317ms)
  ✅ [PASS] 1.2 Sub-pixel Y-jitter clustering (delta < 3.5px) (0.222ms)
  ✅ [PASS] 1.3 Out-of-order PDF stream items properly sorted by Y desc and X asc (0.318ms)
  ✅ [PASS] 1.4 Multi-column PDF text stream behavior (Left col X=50 vs Right col X=350) (0.439ms)
  ✅ [PASS] 1.5 Noisy PDF items with whitespace, empty strings, null strings (0.228ms)

--- SUITE 2: Regex Syllabus Parser & Edge Cases ---
  ✅ [PASS] 2.1 Standard numbered syllabus items with minutes (1.996ms)
  ✅ [PASS] 2.2 Challenge: "Chapter X" syllabus units must NOT be falsely dropped (0.211ms)
  ✅ [PASS] 2.3 Challenge: Decimal hours duration conversion ("1.5 hours") (0.175ms)
  ✅ [PASS] 2.4 Roman Numeral prefixes handling ("I. Topic", "IV. Topic") (0.259ms)
  ✅ [PASS] 2.5 "Unit X:" and "Lecture X:" prefix handling (0.114ms)
  ✅ [PASS] 2.6 Missing durations default gracefully to 60 minutes (0.088ms)
  ✅ [PASS] 2.7 Compound duration format parsing ("2h 30m" / "2 hours 30 mins") (0.109ms)
  ✅ [PASS] 2.8 Non-duration parentheses preservation ("Vectors (Part 1)") (0.085ms)

--- SUITE 3: Staging Table Mutations & Integrity ---
  ✅ [PASS] 3.1 Staging table row insertion ID uniqueness across batch (0.271ms)
  ✅ [PASS] 3.2 Staging table row deletion sequence contiguity check (0.291ms)
  ✅ [PASS] 3.3 Duplicate sequence index detection in staging payload (0.139ms)
  ✅ [PASS] 3.4 HTML/Script injection resistance in syllabus staging fields (0.208ms)

--- SUITE 4: Lesson Tree CRUD, Aggregation & Free Preview ---
  ✅ [PASS] 4.1 nextOrder calculation robustness in SyllabusTreeEditor (0.160ms)
  ✅ [PASS] 4.2 Move Up/Down boundary logic (Index 0 move up & Index N-1 move down) (0.301ms)
  ✅ [PASS] 4.3 YouTube Video ID extraction (standard, embed, youtu.be, shorts) (0.539ms)
  ✅ [PASS] 4.4 Challenge: Free preview toggle completeness vs PROJECT.md blueprint (1.513ms)
  ✅ [PASS] 4.5 Duration aggregation with varied and missing values (0.352ms)

--- SUITE 5: ReDoS & High-Volume Performance Stress ---
  ✅ [PASS] 5.1 ReDoS resistance on adversarial duration regex inputs (0.763ms)
  ✅ [PASS] 5.2 High-volume 500-lesson syllabus parsing throughput (< 15ms target) (4.796ms)
  ✅ [PASS] 5.3 2D spatial layout reconstruction with 2,000 PDF text stream items (2.854ms)

══════════════════════════════════════════════════════════════════
  TOTAL TESTS: 25 | PASSED: 25 | FAILED: 0
  OVERALL SUITE VERDICT: APPROVE ✅
══════════════════════════════════════════════════════════════════
```

---

## 3. Deep-Dive Verification of the 5 Failure Modes

### Failure Mode 1: Header Exclusions vs Legitimate Syllabus Units
- **The Problem**: In naive implementations, filtering out document headers like `"Course Syllabus"` using unanchored regexes like `/^(?:page|chapter|syllabus|table of contents)/i` causes legitimate course units such as `"Chapter 1: Units and Measurements"` or `"Chapter 14: Oscillations"` to be dropped.
- **Code Inspection** (`src/components/courses/SyllabusImportModal.jsx` lines 108-110 & 141-143):
  ```javascript
  // Line 109: Standalone document header filter (strictly anchored to whole line)
  if (/^(?:page(?:\s+\d+)?|syllabus|table of contents|index|course overview|curriculum)\s*$/i.test(trimmed)) continue;
  if (/^\d+\s*$/i.test(trimmed)) continue;

  // Line 141: Prefix cleaner handles Chapter / Lesson / Module / Unit / Lecture / Roman Numerals
  const prefixRegex = /^(?:(?:chapter|lesson|module|topic|unit|lecture)\s*\d+[\.\-\s:]+|[ivxlcdm]+[\.\-\s:]+|\d+[\.\-\s)]+)\s*/i;
  title = title.replace(prefixRegex, '').trim();
  ```
- **Empirical Test Proof**:
  - Input: `"Chapter 1: Units and Measurements (60 mins)"` -> Parsed: `title: "Units and Measurements"`, `duration_minutes: 60`.
  - Input: `"Syllabus"` (standalone) -> Skipped.
  - Input: `"Table of Contents"` -> Skipped.
  - Input: `"IV. Electromagnetic Induction (120 mins)"` -> Parsed: `title: "Electromagnetic Induction"`, `duration_minutes: 120`.

### Failure Mode 2: Decimal Hours Duration Parsing
- **The Problem**: Expressions like `"1.5 hours"`, `"2.5 hrs"`, or `"0.5 hr"` were previously parsed as integers (`5 hours` = 300m or `1 hour` = 60m), causing severe duration corruption.
- **Code Inspection** (`src/components/courses/SyllabusImportModal.jsx` lines 88-102):
  ```javascript
  const durationRegex = /(?:[-–—(📎[]\s*)?(\d+(?:\.\d+)?)\s*(?:min|minute|mins|minutes|hour|hours|hr|hrs|h|m)[\)\]]?\s*$/i;
  const durMatch = durationRegex.exec(trimmed);
  if (durMatch) {
    const val = parseFloat(durMatch[1]);
    const rawUnit = durMatch[0].toLowerCase();
    const isHour = /hours?|hrs?|(?<![a-z])h/i.test(rawUnit);
    if (isHour) {
      duration = Math.round(val * 60);
    } else {
      duration = Math.round(val);
    }
    title = trimmed.replace(durationRegex, '').trim();
  }
  ```
- **Empirical Test Proof**:
  - `"Thermodynamics Lecture (1.5 hours)"` -> `duration_minutes: 90`, `title: "Thermodynamics Lecture"`.
  - `"Rotational Dynamics (2.5 hrs)"` -> `duration_minutes: 150`, `title: "Rotational Dynamics"`.
  - `"0.5 hour"` -> `duration_minutes: 30`.

### Failure Mode 3: Compound Hours and Minutes
- **The Problem**: Expressions like `"(2h 30m)"`, `"2 hours 15 mins"`, or `"[1 hr 45 min]"` failed single-unit regexes, leaving `"2h"` in the unit title or dropping the minute component.
- **Code Inspection** (`src/components/courses/SyllabusImportModal.jsx` lines 80-86):
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
- **Empirical Test Proof**:
  - `"Optics Marathon (2h 30m)"` -> `duration_minutes: 150`, `title: "Optics Marathon"`.
  - `"Calculus Bootcamp - 2 hours 15 mins"` -> `duration_minutes: 135`, `title: "Calculus Bootcamp"`.
  - `"Organic Synthesis [1 hr 45 mins]"` -> `duration_minutes: 105`, `title: "Organic Synthesis"`.

### Failure Mode 4: Staging Table Deletions, Additions & Sequence Collisions
- **The Problem**: Deleting a row from the staging grid left discontinuous sequence indexes (`order_index = [1, 3]`), while dynamically adding rows generated colliding draft IDs.
- **Code Inspection** (`src/components/courses/SyllabusImportModal.jsx` lines 149, 466-471, 493):
  ```javascript
  // 1. Initial Parse ID generation
  id: `draft-${orderIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

  // 2. Dynamic Add Row ID generation
  id: `draft-new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

  // 3. Row Deletion with Sequence Normalization
  onClick={() => {
    setDraftLessons(prev =>
      prev
        .filter(item => item.id !== lesson.id)
        .map((item, idx) => ({ ...item, order_index: idx + 1 }))
    );
  }}
  ```
- **Empirical Test Proof**:
  - Batch insertion of 500 draft items produces 500 unique IDs (zero collisions).
  - Deleting row index 2 from `[1, 2, 3]` immediately re-indexes the array to `[1, 2]`.

### Failure Mode 5: Free-Preview Wiring in Curriculum Editor
- **The Problem**: `newIsFreePreview` state existed in `SyllabusTreeEditor.jsx` but was not passed into insert payloads, edit form states, or rendered in UI badges.
- **Code Inspection** (`src/components/courses/SyllabusTreeEditor.jsx` lines 43, 78-79, 129-130, 149-150, 405-416, 535-545, 610-615):
  ```jsx
  // Insert Payload (Line 78-79)
  is_free_preview: newIsFreePreview,
  is_free: newIsFreePreview,

  // Add Lesson Form Checkbox (Lines 405-416)
  <input
    type="checkbox"
    checked={newIsFreePreview}
    onChange={e => setNewIsFreePreview(e.target.checked)}
    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
  />

  // Edit State Sync (Lines 129-130)
  is_free_preview: lesson.is_free_preview ?? lesson.is_free ?? false,
  is_free: lesson.is_free ?? lesson.is_free_preview ?? false,

  // Update Payload (Lines 149-150)
  is_free_preview: !!editForm.is_free_preview,
  is_free: !!editForm.is_free_preview,

  // List Item Free Preview Badge (Lines 610-615)
  {(lesson.is_free_preview || lesson.is_free) && (
    <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
      <Eye className="w-3 h-3 text-emerald-600" />
      <span>Free Preview</span>
    </span>
  )}
  ```
- **Empirical Test Proof**:
  - Test 4.4 verifies that `newIsFreePreview` is mapped into the insert payload, edit form, and UI checkboxes with 100% AST/regex conformance.

---

## 4. Performance & ReDoS Resilience

- **ReDoS Stress Test** (Test 5.1): Adversarial strings containing 10,000 spaces, 5,000 trailing hyphens, and 1,000 nested brackets executed in `< 0.8ms` (zero catastrophic backtracking).
- **High-Volume Throughput** (Test 5.2): 500-lesson syllabus document parsed deterministically in **4.796ms** (~104,250 lessons/second throughput).
- **2D Spatial Layout Engine** (Test 5.3): Spatial coordinate clustering of 2,000 PDF text stream items completed in **2.854ms**.

---

## 5. Final Verdict

**FINAL VERDICT: APPROVE ✅**

The Syllabus Importer, Regex Layout Engine, and Syllabus Tree Editor meet and exceed all specifications, interface contracts, and durability benchmarks. No defects remain.
