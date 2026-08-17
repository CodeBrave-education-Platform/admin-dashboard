## 2026-08-17T14:37:24Z

You are the SWE Light Orchestrator for this project.

Working Directory: D:\admin dashboard
Agent Directory: D:\admin dashboard\.agents\swe_light
Original User Request: D:\admin dashboard\.agents\ORIGINAL_REQUEST.md

Task Summary:
Audit the admin dashboard UI code against the actual Supabase database schemas to fix UI crashes. Remove or map missing columns (like thumbnail_url in test_packages), fix the "Failed to load cohort batches registry" error, and resolve the remaining fatal crash on the /admin/students page.

Requirements:
1. R1. Frontend UI Resilience: Audit frontend queries for profiles, test_packages, and cohort_batches (or equivalent). Modify UI components to safely handle missing columns (like thumbnail_url or is_active) and missing relational data, preventing fatal React errors on the pages.
2. R2. SQL Migration Script: Generate a single SQL migration file `supabase_schema_migration.sql` at the root of the project containing all necessary ALTER TABLE statements to add missing columns that the UI expects to the Supabase database.
3. R3. Fix Batch Registry: Identify why the cohort batches registry fails to load and fix the data fetching or state logic so the page renders without the error toast.

Acceptance Criteria:
- `npm run build` completes successfully with no build errors.
- A `supabase_schema_migration.sql` file is created at the root of the project containing valid SQL statements.
- The UI components for the affected pages (`/admin/students`, `/admin/test-series`, `/admin/batches` or equivalent) do not rely on missing Supabase columns that would cause a runtime crash.

Execute the SWE Light protocol (implementer -> reviewer verification loop) and report back when finished with a structured completion handoff.
