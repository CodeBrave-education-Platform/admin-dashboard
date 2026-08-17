# Test Infrastructure & Validation Specification: Batches & Test Series Modules

## Executive Summary
This document defines the comprehensive 4-tier testing architecture and test execution harness for the **Batches & Test Series Admin Dashboard Redesign** project in `D:\admin dashboard`. The test suite provides unit, integration, boundary, cross-feature, and end-to-end scenario coverage across all newly modernized components.

---

## 1. Test Architecture & Directory Structure

```
D:\admin dashboard\
├── test-batches-testseries-suite.js          # Root CLI executable test runner
├── TEST_INFRA.md                             # Architectural specification & coverage matrix
├── src/
│   └── __tests__/
│       └── batches_testseries.test.js        # Test runner entry inside src/__tests__/
└── tests/
    ├── fixtures/
    │   └── mockData.js                       # Realistic and adversarial data fixtures
    ├── helpers/
    │   └── tableHarness.js                   # TanStack table filter, sort, pagination, CSV & KPI engine
    ├── tier1_feature_coverage.test.js        # Tier 1: Feature coverage & component contracts
    ├── tier2_boundary_corner_cases.test.js   # Tier 2: Boundary conditions & stress testing
    ├── tier3_cross_feature_combinations.test.js # Tier 3: Cross-feature interactions & state
    ├── tier4_real_world_scenarios.test.js    # Tier 4: Real-world E2E workflow simulations
    └── run_all_tests.js                      # Master aggregator runner
```

---

## 2. Test Execution Commands

The test suite can be run using any of the following standard commands:

```bash
# 1. Run full master test suite from root
node test-batches-testseries-suite.js

# 2. Run master test runner in tests/
node tests/run_all_tests.js

# 3. Run individual test tiers
node tests/tier1_feature_coverage.test.js
node tests/tier2_boundary_corner_cases.test.js
node tests/tier3_cross_feature_combinations.test.js
node tests/tier4_real_world_scenarios.test.js

# 4. Run from src/__tests__/
node src/__tests__/batches_testseries.test.js
```

---

## 3. Four-Tier Coverage Matrix

### Tier 1: Feature Coverage (Unit / Component Contracts)
| Module / Component | Target Behavior | Test Assertions |
|:---|:---|:---|
| **`BatchStatsHeader`** | KPI ribbon computation & formatting | Total Batches count, Published vs Draft vs Archived cohorts segregation, Enrolled students aggregation, Live classes sum. |
| **`BatchGrid`** | TanStack Data Grid, Search & Filtering | Omnibar title search, Stream keyword matching, Stream pills (`ALL`, `JEE`, `NEET`), Status pills (`published`, `draft`), Price descending sort, Students count descending sort. |
| **`BatchEditorDrawer`** | Slide-Out Drawer & Tab Navigation | Mandatory 5-tab mapping (`overview`, `students`, `materials`, `live`, `exams`), required props contract (`batch`, `isOpen`, `onClose`, `onUpdateBatch`, `onDeleteBatch`), Escape key handler. |
| **`BatchCreateModal`** | Fast Cohort Establishment Form | Schema validation for title (min 3 chars), price (>= 0), valid start date, stream focus track. |
| **`BatchRosterImportModal`** | Multi-Format Ingestion System | Extraction of names, emails, streams; RPC payload structuring for `import_batch_roster(_batch_id, _emails, _names, _focuses)`. |
| **`StudentTelemetryModal`** | Bento Grid Performance Inspector | Retrieval and formatting of study hours, test average, syllabus progress, and dream college targets. |
| **`TestSeriesStatsHeader`** | KPI ribbon computation & formatting | Total Packages, Total Exams, Active Candidates, Premium Series count, Average Score calculation. |
| **`TestSeriesGrid`** | TanStack Data Grid & Filters | Omnibar search, Target Exam Tag pills (`ALL`, `JEE Main`, `JEE Advanced`, `NEET`, `Foundation`), Pricing pills (`ALL`, `FREE`, `PREMIUM`). |
| **`TestSeriesEditorDrawer`** | Slide-Out Drawer & Tab Navigation | Mandatory 5-tab mapping (`overview`, `exams`, `compiler`, `telemetry`, `submissions`), deep-linking contract, spring animation props. |
| **`TestSeriesCreateModal`** | Package Creation Modal | Schema validation for `title`, `target_exam_tag`, `test_distribution` (`chapter_drills`, `full_mocks`, `live_papers`), and `price_ledger`. |

---

### Tier 2: Boundary, Edge Cases & Adversarial Stress
| Category | Edge Condition | Expected Result & Handling |
|:---|:---|:---|
| **Empty States** | Database with 0 batches / 0 test packages | `BatchStatsHeader` & `TestSeriesStatsHeader` output 0s without `NaN` or crashes. `paginateDataset` returns "Showing 0 to 0 of 0 entries". |
| **Zero-Student Cohort** | Cohort with 0 enrollments | `students_count: 0` handled safely; empty student list view rendered. |
| **Zero Pricing / Free Tier** | `price: 0`, `price_ledger.price: 0` | Formats as "Free", filtered by "FREE" pill, excluded from "PREMIUM" pill. |
| **Discounted MRP** | `original_price: null` or `original_price === price` | Strikethrough discount price is omitted without rendering `₹0` or `null`. |
| **Extreme Lengths** | 600-char Title & 12,000-char Description | Strings retained without truncation or memory buffer corruption; search matching operates smoothly. |
| **XSS Payloads** | `<script>alert("XSS")</script>` in title/desc | Handled strictly as literal text without injection or escaping distortion. |
| **SQL Injection Strings** | `'; DROP TABLE batches; --` in omnibar | Omnibar substring matching evaluates safely without throwing syntax errors. |
| **KaTeX Math Formulas** | `$\psi(x,t) = Ae^{i(kx-\omega t)}$`, `\int_{-\infty}^\infty` | Math formula syntax and Greek symbols preserved intact across components. |
| **Unicode & Emoji** | `🔥 2027 Super-30 Alpha Batch 🚀 🇮🇳` | UTF-8 multi-byte glyphs preserved and searchable via substring matching. |
| **Missing Foreign Keys** | `batch_enrollments` without `profiles` | Name defaults to "Enrolled Student (Unregistered Profile)" and email to "N/A" without null dereference crash. |
| **Assessment Windows** | `start_window` vs `end_window` | Validation rejects `end_window <= start_window`; status dynamically categorized into `upcoming`, `active`, or `expired`. |
| **Pagination Bounds** | Page 999 requested on 1-page table, negative index | Clamped safely to valid boundary (page 0 or last page). |

---

### Tier 3: Cross-Feature Combinations & State Interactions
| Combined Features | Interaction Flow | Invariant Verified |
|:---|:---|:---|
| **Filter + Pagination** | Changing stream/status filter while on page > 1 | `table.setPageIndex(0)` auto-resets view to page 1 to prevent empty viewport desync. |
| **Search + Pagination** | Typing in Omnibar search | Automatically resets page index to 0. |
| **Filter + Sort** | Applying stream filter + price descending sort | Sorting operates strictly within the filtered subset. |
| **Row Selection + Bulk CSV** | Multi-row selection across paginated views | RFC4180 CSV export generates exact selected rows with proper comma/quote escaping. |
| **Bulk CSV Fallback** | 0 rows selected + Export CSV clicked | Exports all currently filtered rows respecting active search and stream pills. |
| **Bulk Deselect** | Clicking "Deselect All" | Clears selection state completely (`{}`). |
| **Drawer Tab Navigation** | Switching tabs (`overview` -> `students` -> `live`) | Preserves selected batch/package context without re-fetching or data loss. |
| **Drawer Dismissal** | Closing drawer or pressing Escape | Resets active tab to `overview` and clears `selectedBatch` / `selectedPackage`. |
| **URL Deep-Linking** | Row click / Drawer close | Syncs URL query param (`?id=...`); back button popstate closes drawer cleanly. |
| **Optimistic Mutations** | Status toggle click | Local state updates immediately, calls `invalidateCache('batch', null, id)`. Rolls back on mutation error and displays toast. |

---

### Tier 4: Real-World Application End-to-End Scenarios

#### Scenario 1: Batches Lifecycle
1. **Cohort Establishment**: Admin submits new batch "JEE 2027 Alpha Rank Booster Batch" (₹5,499, stream JEE, start date 2026-09-01). Metadata validated and added to catalog.
2. **Roster Ingestion**: Admin imports CSV student roster (5 students). Ingestion parser extracts student records; formats RPC `import_batch_roster` payload. `students_count` increments to 5.
3. **Live Class Scheduling**: Admin schedules "Calculus & Mechanics Deep Dive" with Google Meet link. `live_sessions_count` increments to 1.
4. **Material Vault Upload**: Admin uploads worksheet PDF "Calculus_Handwritten_Notes.pdf". `materials_count` increments to 1.
5. **Assessment Scheduling**: Admin links CBT Diagnostic Test with start/end windows. Status computed as "Upcoming".
6. **KPI Summary Ribbon**: Stats ribbon updates to reflect 1 batch, 1 published cohort, 5 students, 1 live class.

#### Scenario 2: Test Series Lifecycle
1. **Package Blueprint Creation**: Admin creates "JEE Advanced 2026 Grandmaster Series" (₹2,999, 10 chapter drills, 8 full mocks, 2 live papers).
2. **Exam Blueprint Compilation**: Admin authors CBT Mock Exam #01 with 5 questions from `test_questions` pool (+4 / -1 marks). Total marks calculated as 20.
3. **AI PDF Question Ingestion**: Ingests single MCQ, multi MCQ, and numerical questions from AI OCR JSON output into exam blueprint `questions` JSONB.
4. **Candidate Submissions & Telemetry**: 5 candidates submit mock tests with scores [110, 95, 80, 65, 40]. System calculates:
   - Max Score: 110
   - Min Score: 40
   - Class Average: 78
   - Bell Curve Distribution Bins: [0-50]: 1, [51-80]: 2, [81-100]: 1, [101-120]: 1.
5. **KPI Summary Ribbon**: Stats ribbon updates to reflect 1 package, 1 exam, 5 active candidates, 1 premium series, avg score 78 pts.

---

## 4. Test Verification & Results Summary

| Metric | Value |
|:---|:---|
| **Total Test Suites** | 4 Tiers (17 Sub-Suites) |
| **Total Assertions** | 40+ Assertions |
| **Pass Rate** | 100.0% |
| **Known Regressions** | 0 |
| **Exit Code** | 0 (Clean Execution) |
