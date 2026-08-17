# Execution Plan — Course Management UI Redesign

## Phase 0: Parallel Codebase Survey
- Spawn 3 Explorer subagents in parallel to inspect:
  1. Explorer 1: Legacy `src/app/courses/page.js`, data structures, state management, Supabase queries, and existing dependencies (TanStack table, lucide icons, etc.).
  2. Explorer 2: Syllabus import logic (PDF/Docx parsers, file upload logic, exam/module structures, API endpoints).
  3. Explorer 3: Design system, UI components (drawers, modal/sheet primitives, Tailwind styling, theme tokens, existing shared components).

## Phase 1: Synthesize Findings & Plan Decomposition
- Synthesize explorer reports into `PROJECT.md`.
- Formulate milestones (M1: Data Grid & Core Page Breakdown, M2: Course Editor Drawer & Import Logic, M3: Visual Polish & Verification).

## Phase 2: Implementation & Verification Loop
- Dispatch Worker to implement modular component architecture (`CourseGrid.jsx`, `CourseEditorDrawer.jsx`, `SyllabusManager.jsx` etc.).
- Dispatch Reviewers (2) to review architecture, code quality, and functionality.
- Dispatch Challengers (2) for runtime verification, edge cases, and stress testing.
- Dispatch Forensic Auditor for integrity verification.
- Gate check and evaluate.

## Phase 3: Final Verification & Sentinel Handoff
- Full E2E & lint/build check.
- Complete `handoff.md`.
- Report completion to Sentinel.
