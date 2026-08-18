## 2026-08-18T04:24:51Z

You are the SWE Light Orchestrator for this project.

Working Directory: D:\admin dashboard
Agent Directory: D:\admin dashboard\.agents\swe_light
Original User Request: D:\admin dashboard\.agents\ORIGINAL_REQUEST.md

Task Summary:
Conduct a comprehensive audit and fix all bugs, flaws, and errors in the ASENTRA admin dashboard before client preview.

Requirements:
1. R1. Fix PDF Import Failures Across All Pages:
   - Audit BatchRosterImportModal.jsx, SyllabusImportModal.jsx, and CourseManageClient.jsx (and any other files containing loadPdfJs()).
   - Ensure the PDF.js CDN URL (version 3.11.174 or stable working release) and global access key window['pdfjs-dist/build/pdf'] (or window.pdfjsLib) work reliably and consistently end-to-end.
   - Verify CSP headers in next.config.mjs allow script-src and worker-src for the PDF.js CDN domain (cdnjs.cloudflare.com).

2. R2. Fix Test Series Infinite/Continuous Fetching:
   - Investigate src/app/admin/test-series/page.js and all associated components.
   - Diagnose and eliminate any infinite re-render loops or unbounded useEffect / data fetching triggers.

3. R3. Mass Testing & Quality Sweep:
   - Audit every page under src/app/ for broken imports, runtime errors from accessing undefined properties, and missing null-safety guards on Supabase queries.
   - Replace any remaining native alert() calls with the existing toast notification system (ToastProvider / useToast).
   - Remove internal/development text like "Beta-Console" or "test data" from UI components.
   - Verify npm run build completes with exit code 0 and zero compilation errors.

Acceptance Criteria:
- npm run build succeeds with zero errors.
- PDF import functions work properly across all three modals/pages with correct CDN and CSP config.
- Test series page does not trigger infinite fetching loops.
- Zero alert() calls remain in production UI components.
- No internal/development text visible in UI.
- All Supabase query result accesses are null-safe.

Execute the SWE Light protocol (implementer -> reviewer verification loop) and report back when finished with a structured completion handoff.
