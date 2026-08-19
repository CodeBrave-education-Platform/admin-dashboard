# Project: Admin Dashboard Bento Grid & Zero-Defect Database QA

## Architecture
- **Framework**: Next.js 16.2.6 (App Router, Turbopack), React 19.2.4, Tailwind CSS v4, Lucide Icons, Framer Motion
- **Backend & Database**: Supabase (PostgreSQL with RLS), Upstash Redis (Caching & Telemetry)
- **Subsystems**:
  - Test Packages (Test Series) Administration Studio (`/admin/test-series`)
  - Courses Administration Command Center (`/courses` and `/admin/courses`)
  - Shared Admin Layout, Navigation, and Auth Boundaries (`/admin/*`, `src/utils/supabase/*`, `src/utils/auth-server.js`)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Test Packages Bento Grid UI | Replace table in `TestSeriesGrid.jsx` with asymmetric Bento Grid, prominent uncropped thumbnails, gradient fallbacks, floating status/tag badges, test distribution chips, price pill, and candidate count | M1 | Survey E1 |
| 2 | Test Packages Admin Actions | Retain all admin controls on Bento cards: inline active/inactive toggle with cache invalidation, slide-out drawer trigger (`?id=`), delete modal guard, search omnibar, tag/price filters, sort, and CSV export | M1 | Survey E1 |
| 3 | Courses Bento Grid UI | Replace table in `CourseGrid.jsx` with asymmetric Bento Grid, prominent uncropped thumbnails, subject-specific gradient fallbacks, curriculum density chips (units, files, exams), price pill, and enrolled count | M2 | Survey E2 |
| 4 | Courses Admin Actions | Retain all admin controls on Bento cards: inline active/inactive toggle, slide-out drawer trigger (`?id=`), delete modal guard, fast syllabus import trigger, search omnibar, level/status filters, and CSV export | M2 | Survey E2 |
| 5 | Auth Server Async Cookies Fix | Fix `src/utils/auth-server.js:9` to use `await cookies()` for Next.js 16 async cookies compatibility | M3 | Survey E3 |
| 6 | Monitor Client Crash Prevention | Fix `src/app/admin/test-series/monitor/[examId]/MonitorClient.jsx:159` to use optional chaining on email splitting | M3 | Survey E3 |
| 7 | Telemetry Marks Scheme Consistency | Fix `src/app/api/admin/test-series/telemetry/route.js:83` to handle both `positive_marks` and `positive` | M3 | Survey E3 |
| 8 | Database Schema & Cascade Deletions | Verify cascading deletion paths for courses, test packages, and batches while protecting invoices ledger with `SET NULL` | M3 | Survey E3 |
| 9 | Full System Verification & Build Gate | Execute comprehensive E2E tests, review code quality, verify React hydration safety, and confirm `npm run build` succeeds with zero errors | M4 | Survey E1, E2, E3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Test Packages Bento Grid UI | `src/components/test-series/TestSeriesGrid.jsx`, `src/app/admin/test-series/page.js` | none | DONE |
| M2 | Courses Bento Grid UI | `src/components/courses/CourseGrid.jsx`, `src/app/courses/page.js`, `src/app/admin/courses/CourseStudioClient.jsx` | none | DONE |
| M3 | Database QA & API Remediation | `src/utils/auth-server.js`, `src/app/admin/test-series/monitor/[examId]/MonitorClient.jsx`, `src/app/api/admin/test-series/telemetry/route.js`, schema migrations | none | DONE |
| M4 | Full System Verification & Build Gate | E2E Testing, Adversarial Verification, Forensic Audit, `npm run build` | M1, M2, M3 | DONE |

## Code Layout
- `src/components/test-series/TestSeriesGrid.jsx`: Test Packages Bento Grid UI component
- `src/components/courses/CourseGrid.jsx`: Courses Bento Grid UI component
- `src/app/admin/test-series/page.js`: Test series admin page controller
- `src/app/courses/page.js`: Courses admin page controller
- `src/app/admin/courses/CourseStudioClient.jsx`: Courses studio admin page
- `src/utils/auth-server.js`: Server auth helper with async `cookies()`
- `src/app/admin/test-series/monitor/[examId]/MonitorClient.jsx`: CBT Proctoring Monitor client
- `src/app/api/admin/test-series/telemetry/route.js`: Telemetry API handler
- `supabase_schema_migration.sql`: Postgres migrations with DDL & cascade rules
- `tests/e2e/`: E2E test suites and runner (87 tests, 5 tiers)

## Interface Contracts
### Test Packages Grid Component
```ts
interface TestSeriesGridProps {
  packages: TestPackage[];
  packageEnrollments: Record<string, number>;
  selectedPackage: TestPackage | null;
  onSelectPackage: (pkg: TestPackage) => void;
  onTogglePackageStatus: (pkg: TestPackage) => Promise<void>;
  onDeletePackage: (pkg: TestPackage) => void;
  onCreatePackageClick: () => void;
  isInitialLoading?: boolean;
}
```

### Courses Grid Component
```ts
interface CourseGridProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onToggleCourseStatus: (course: Course) => Promise<void>;
  onDeleteCourse: (course: Course) => void;
  onCreateCourse: () => void;
  onImportSyllabus: () => void;
  isLoading?: boolean;
}
```
