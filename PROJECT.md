# Project: Course Management UI Redesign

## Architecture
Modernized Next.js client-side course management dashboard decomposing the legacy 913-line `src/app/courses/page.js` monolith into a modular, high-performance TanStack Table Data Grid and Framer Motion slide-out drawer architecture.

### Core Data Flow & State Architecture
1. **`src/app/courses/page.js` (Page Controller)**:
   - Fetches courses list from Supabase with nested counts for `lessons`, `assessments`, `course_files`.
   - Manages global state: selected course for drawer, search/filter criteria, active modals (`CourseCreateModal`, `SyllabusImportModal`).
   - Syncs selected course ID bidirectionally with URL search params (`?id=<course_id>`), handling browser back/forward navigation.
   - Handles optimistic status updates and Redis cache invalidation (`invalidateCache('catalog', courseId)` and `invalidateCache('course', courseId)`).
2. **`src/components/courses/CourseGrid.jsx` (TanStack Table Data Grid)**:
   - Implements `@tanstack/react-table` for multi-column sorting (including `created_at`, `duration`, `display_order`), multi-field omnibar filtering (`title`, `subject`, `description`, `level`), audience level filter pills (`ALL`, `FOUNDATION`, `MAINS`, `ADVANCED`), and status filter pills (`ALL`, `ACTIVE`, `INACTIVE`).
   - Rich column schema: Thumbnail & Title, Target Audience Tag, Lessons & Duration metrics, Assessments count, Status toggle pill (`is_active`), Quick actions (Open Drawer, Toggle Active, Delete).
   - Filtered row model fallback for CSV export and automatic pagination index reset on filter switches.
3. **`src/components/courses/CourseEditorDrawer.jsx` (Slide-out Management Drawer)**:
   - AnimatePresence & Framer Motion right slide-out panel with smooth spring physics.
   - Tabbed panels:
     - **Overview / Details**: Course metadata, slug, audience, status, thumbnail URL, description.
     - **Syllabus / Curriculum**: Tree/List lesson manager with reordering via global index lookup, inline editing, duration, and free preview toggle (`SyllabusTreeEditor.jsx`).
     - **Files & Resources**: Document & PDF resource uploader to Supabase storage with file list (`CourseFilesManager.jsx`).
     - **Exams & Assessments**: Linked assessments and quiz management.
     - **Doubts & Live Sessions**: Doubt resolution view & live scheduling.
4. **`src/components/courses/CourseCreateModal.jsx` (Course Blueprint Modal)**:
   - Modal for creating new course blueprints with auto-slug generation and instant save.
5. **`src/components/courses/SyllabusImportModal.jsx` (Universal Syllabus Importer)**:
   - Dynamic client-side CDN loaders for `pdfjs-dist` and `mammoth.js`.
   - Spatial 2D layout parser and enhanced regex extractor handling compound (`2h 30m`) and decimal (`1.5 hours`) durations while preserving textbook chapter headers.
   - Interactive staging grid for verifying, reordering, and editing parsed topics before batch commit.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | TanStack Table Data Grid | Modern table showing all courses with sorting, search, and audience filtering | M1 | Survey | DONE |
| 2 | Component Teardown & Modularity | Split monolithic `page.js` into 6 modular component files | M1 | Survey | DONE |
| 3 | Slide-out Course Editor Drawer | Smooth Framer Motion drawer for editing course details and sub-resources | M2 | Survey | DONE |
| 4 | Interactive Curriculum & Lesson Manager | Inline lesson CRUD, reordering, duration tracking, and free preview toggle | M2 | Survey | DONE |
| 5 | Course Creation Modal | Fast blueprint creation modal with validation and auto-slug | M1 | Survey | DONE |
| 6 | Syllabus Document Importer Modal | PDF/Docx spatial extraction with editable staging review grid | M2 | Survey | DONE |
| 7 | Course Files & Resources Manager | Storage upload and management for reference files | M2 | Survey | DONE |
| 8 | Assessments & Doubts Integration | Tabbed panels for exams and student doubt metrics | M2 | Survey | DONE |
| 9 | URL Search Param State Sync | URL query `?id=...` synchronization for direct navigation and drawer persistence | M1 | Survey | DONE |
| 10 | Cache Invalidation & Data Integrity | Redis cache invalidation and Supabase transaction integrity | M2 | Survey | DONE |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Architecture & Data Grid | Create `CourseGrid.jsx`, `CourseCreateModal.jsx`, refactor `src/app/courses/page.js` to TanStack Data Grid layout with search/filtering | none | DONE |
| M2 | Course Editor Drawer & Import Subsystem | Create `CourseEditorDrawer.jsx`, `SyllabusTreeEditor.jsx`, `SyllabusImportModal.jsx`, and course resource tabs | M1 | DONE |
| M3 | Comprehensive Verification & Gate Check | End-to-end testing, review by reviewers, challenger verification, forensic integrity audit | M2 | DONE |

---

## Code Layout
```
src/
├── app/
│   └── courses/
│       └── page.js                          # Lean orchestrator page controller (< 300 lines)
└── components/
    └── courses/
        ├── CourseGrid.jsx                   # TanStack Data Grid with search/filters/badges
        ├── CourseEditorDrawer.jsx           # Slide-out Drawer with tabbed management panels
        ├── CourseCreateModal.jsx            # Modal for new course blueprint creation
        ├── SyllabusTreeEditor.jsx           # Interactive curriculum & lesson manager
        ├── SyllabusImportModal.jsx          # PDF / DOCX parser & staging grid
        └── CourseFilesManager.jsx           # Course reference files & storage uploader
```
