# Course Management UI Redesign — UI & Design System Mapping Analysis

> **Explorer 3 Analysis Report**  
> **Target Scope:** UI Components, Design System, Styling Conventions, Drawer/Modal Primitives, and Component Boundaries for Course Management.  
> **Project Root:** `D:\admin dashboard`  
> **Target Route:** `src/app/courses/page.js` & `src/components/courses/*`

---

## 1. Executive Summary

The Course Management UI in `src/app/courses/page.js` currently suffers from a monolithic architecture (913 lines) where course selection relies on a top dropdown menu that renders a massive blank/inactive placeholder if no course is selected. Furthermore, deep course authoring features (syllabus outline, reference worksheets, live classes, exams, doubt board, reading engine) are currently grouped into an unwieldy 3,397-line client component (`src/components/CourseManageClient.jsx`).

This analysis establishes the architectural blueprint to replace this legacy interface with a **state-of-the-art TanStack Table Data Grid** (`CourseGrid.jsx`) paired with an **animated slide-out Drawer** (`CourseEditorDrawer.jsx`), a **Drag-and-Drop Interactive Syllabus Tree Editor** (`SyllabusTreeEditor.jsx`), and a **standalone Syllabus Document Importer Modal** (`SyllabusImportModal.jsx`).

---

## 2. Codebase Inventory & Technology Stack

### 2.1 Dependencies & Libraries (`package.json` Audit)

| Dependency | Version | Role in Redesign |
|---|---|---|
| `@tanstack/react-table` | `^9.1.2` (v9.1.2) | Core headless data grid engine for `CourseGrid.jsx` (sorting, filtering, pagination, row selection). |
| `framer-motion` | `^12.40.0` | Fluid slide-out drawer transitions, modal backdrops, spring physics, and animated tab switches. |
| `lucide-react` | `^1.17.0` | Iconography (`BookOpen`, `Layers`, `GripVertical`, `Plus`, `Trash2`, `Edit`, `Search`, `Video`, etc.). |
| `@hello-pangea/dnd` | `^18.0.1` | Smooth Drag-and-Drop syllabus hierarchy and module reordering in `SyllabusTreeEditor.jsx`. |
| `tailwindcss` | `^4.0` (Tailwind v4) | Utility-first styling via CSS `@import "tailwindcss";` in `src/app/globals.css`. |
| `@supabase/ssr` / `@supabase/supabase-js` | `^0.10.3` / `^2.106.2` | Data fetching, mutations, and realtime state updates. |
| `next` / `react` | `16.2.6` / `19.2.4` | Next.js App Router (React 19 Server/Client components). |
| `katex` | `^0.18.1` | LaTeX math formatting for course descriptions and reading materials. |
| `cmdk` / `next-themes` | `^1.1.1` / `^0.4.6` | Command palette and dark/light theme switching. |

---

## 3. Design System & Styling Conventions

### 3.1 Color Palette & Token System

The design follows a clean slate/indigo theme with purpose-driven semantic colors:

```
┌─────────────────┬───────────────────────────────┬──────────────────────────────────────────┐
│ Token Category  │ Tailwind Classes              │ Usage / Context                          │
├─────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Backgrounds     │ bg-white, bg-slate-50/50,     │ Base canvas, cards, modal backdrops,     │
│                 │ bg-slate-900/60 (backdrop)    │ table rows, alternating grid states      │
├─────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Text Colors     │ text-slate-900, text-slate-700│ Primary headers, body text,              │
│                 │ text-slate-500, text-slate-400│ secondary metadata, uppercase labels     │
├─────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Primary Brand   │ bg-indigo-600, text-indigo-600│ Action buttons, active tabs, highlights, │
│ (Indigo)        │ bg-indigo-50, border-indigo-200│ key metrics, badges, focus rings        │
├─────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Status: Success │ bg-emerald-50, text-emerald-700│ Active status, completed tests, enrolled │
│ (Emerald)       │ border-emerald-200            │ students counter, live indicators        │
├─────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Status: Danger  │ bg-rose-50, text-rose-600,    │ Delete actions, destructive dialogs,     │
│ (Rose)          │ border-rose-200, bg-rose-600  │ error toasts, terminated broadcasts      │
├─────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Status: Warning │ bg-amber-50, text-amber-700,  │ Draft status, pending review,            │
│ (Amber)         │ border-amber-200              │ moderate difficulty tags                 │
├─────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Secondary Accent│ bg-teal-50, text-teal-700,    │ AI tools, PDF parsers, import buttons    │
│ (Teal / Cyan)   │ border-teal-200, bg-teal-600  │                                          │
└─────────────────┴───────────────────────────────┴──────────────────────────────────────────┘
```

### 3.2 Typography & Spacing Hierarchy

- **Eyebrow / Sub-labels**: `text-[9px]` or `text-[10px]`, `font-black`, `uppercase`, `tracking-wider` / `tracking-widest`, `text-slate-400` / `text-slate-500`.
- **Primary Section Headings**: `text-xl` or `text-2xl`, `font-black`, `text-slate-900`, `tracking-tight`.
- **Card / Row Headings**: `text-xs` or `text-sm`, `font-bold` / `font-extrabold`, `text-slate-800` / `text-slate-900`.
- **Body & Table Cells**: `text-xs`, `font-medium` / `font-bold`, `text-slate-600` / `text-slate-700`.
- **Monospace Code/IDs**: `font-mono`, `text-[11px]`, `text-slate-400`.

### 3.3 Radii & Elevation Standards

- **Containers / Shell / Modals**: `rounded-3xl` (`24px`), `border border-slate-200`, `shadow-sm` or `shadow-2xl`.
- **Inner Panels & Toolbars**: `rounded-2xl` (`16px`), `border border-slate-200`, `shadow-xs`.
- **Buttons, Inputs & Table Cells**: `rounded-xl` (`12px`), `px-4 py-2.5`, `border border-slate-200`, `transition`.
- **Pills, Badges & Micro-tags**: `rounded-lg` (`8px`), `px-2.5 py-1`, `text-[10px] font-bold`.

### 3.4 Micro-Interactions & Animations

- **Tactile Click Feedback**: `.tactile-press` class (or `hover:scale-[1.02] active:scale-[0.98] transition select-none`).
- **Framer Motion Transitions**:
  - Drawer Slide-In: `initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }}`.
  - Backdrop Fade: `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}`.
  - Modal Scale: `initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }}`.

---

## 4. Existing UI Primitives & Reusability Audit

| Component Path | Purpose & Capabilities | Reusability in Courses Redesign |
|---|---|---|
| `src/components/AdminLayoutShell.jsx` | Main responsive layout shell with collapsible sidebar, branding, navigation, and user session profile. | **Direct Container** — Wraps `src/app/courses/page.js`. |
| `src/components/ToastProvider.jsx` | Toast notification context (`useToast() -> { showToast(message, type) }`). | **Global Toasting** — Used across all save/delete/import operations. |
| `src/components/ConfirmDialogModal.jsx` | Standalone deletion confirmation modal with danger/warning styles. | **Delete Confirmation** — For course, lesson, and exam removals. |
| `src/components/UniversalPdfImporterModal.jsx` | Multimodal AI PDF Question parser with Base64 ingestion and KaTeX review grid. | **Reference Pattern** — Used as design template for `SyllabusImportModal.jsx`. |
| `src/components/KatexRenderer.jsx` | Math equation rendering via KaTeX. | **Equation Preview** in syllabus and reading tabs. |
| `src/components/ThemeToggle.jsx` | Next-themes dark/light mode toggle. | Header utility. |

---

## 5. Architectural Teardown & New Component Boundaries

### 5.1 Component Architecture Map

```
src/app/courses/page.js  (Page Controller & Data Fetcher)
│
├── AdminLayoutShell
│   │
│   ├── Top Statistics / Action Bar  (Add Course Button, Total Count, Level Breakdown)
│   │
│   ├── CourseGrid.jsx  (TanStack Table Data Grid)
│   │   ├── Omnibar Search & Filter Pills (Level, Subject, Price)
│   │   ├── TanStack Table with Sortable Columns & Status Badges
│   │   ├── Row Selection & Bulk Actions Floating Bar (Export CSV, Bulk Delete)
│   │   └── Pagination Controls
│   │
│   ├── CourseEditorDrawer.jsx  (Slide-out Framer Motion Drawer)
│   │   ├── Drawer Header (Title, Level Badge, Save / Close / Delete Buttons)
│   │   ├── Tab Navigation (Overview, Syllabus, Files, Exams, Doubts/Live)
│   │   ├── Tab 1: CourseOverviewTab  (Metadata, Pricing, Dates, Thumbnail)
│   │   ├── Tab 2: SyllabusTreeEditor.jsx  (DND Lesson Reordering & Subject Outlines)
│   │   ├── Tab 3: CourseMaterialsTab  (Reference Worksheets & PDF attachments)
│   │   ├── Tab 4: CourseExamsTab  (Linked Assessments, CBT Quizzes & Gradebook)
│   │   └── Tab 5: CourseLiveDoubtsTab (Live Classes Scheduler & Doubt Resolution)
│   │
│   ├── SyllabusImportModal.jsx  (Document Ingestion Modal: PDF / Word Docx)
│   │   ├── Step 1: Dropzone File Ingestion (pdf.js / mammoth.js text extraction)
│   │   ├── Step 2: Parsed Curriculum Review Grid (Editable Rows)
│   │   └── Step 3: Batch Supabase Insert & Cache Invalidation
│   │
│   └── ConfirmDialogModal  (Permanently delete course/lesson confirmation)
```

---

## 6. Detailed Specifications for Target Components

### 6.1 `src/components/courses/CourseGrid.jsx`

#### Purpose
A high-throughput TanStack Table (v9) Data Grid replacing the legacy dropdown menu. Renders all published courses with sorting, omnibar filtering, audience level pills, and direct row-click drawer triggers.

#### Props Interface
```typescript
interface CourseGridProps {
  courses: Array<{
    id: string;
    title: string;
    description: string | null;
    price: number;
    original_price?: number;
    level: string; // 'foundation' | 'mains' | 'advanced'
    subject?: string;
    thumbnail_url?: string;
    start_date?: string;
    end_date?: string;
    students_count?: number;
    lessons_count?: number;
    files_count?: number;
    exams_count?: number;
    created_at: string;
  }>;
  loading: boolean;
  onSelectCourse: (courseId: string) => void;
  onCreateCourse: () => void;
  onDeleteCourse: (courseId: string, courseTitle: string) => void;
  onRefresh: () => Promise<void>;
}
```

#### TanStack Table Column Definitions
1. **Selection Column (`select`)**: Checkbox for row selection with master toggle header.
2. **Course Identity Column (`title`)**:
   - Course thumbnail image (or fallback `BookOpen` avatar with gradient).
   - Course title (bold, truncated with tooltip).
   - Created date & instructor subtitle.
3. **Audience Level Column (`level`)**:
   - `foundation` → Sky badge (`bg-sky-50 text-sky-700 border-sky-200`)
   - `mains` → Indigo badge (`bg-indigo-50 text-indigo-700 border-indigo-200`)
   - `advanced` → Violet/Amber badge (`bg-purple-50 text-purple-700 border-purple-200`)
4. **Pricing Column (`price`)**:
   - Monospace formatted currency: `₹{price}`.
   - Original MRP strikethrough if present (`₹{original_price}`).
5. **Curriculum Metric Column (`metrics`)**:
   - Badges showing count of lessons (`📚 X Lessons`), files (`📎 Y Files`), and exams (`🎯 Z Exams`).
6. **Enrolled Candidates Column (`students_count`)**:
   - Count pill (`bg-emerald-50 text-emerald-700 border-emerald-200 font-mono`).
7. **Actions Column (`actions`)**:
   - "Manage / Edit" button (opens `CourseEditorDrawer`).
   - "Delete" button (triggers `ConfirmDialogModal`).

#### Key Features & States
- **Omnibar Search**: Instant multi-field filtering (`title`, `level`, `description`, `instructor`).
- **Quick Filter Pills**: `ALL` | `FOUNDATION` | `MAINS` | `ADVANCED`.
- **Sorting**: Ascending/Descending sort on Title, Price, Level, Date.
- **Bulk Action Bar**: Appears dynamically when 1+ rows are checked (CSV Export, Bulk Delete).
- **Empty State**: Friendly illustration, "No courses found" message, and "Establish Course Blueprint" button.

---

### 6.2 `src/components/courses/CourseEditorDrawer.jsx`

#### Purpose
A slide-out drawer docked on the right side of the screen. Activated when a course is clicked in the `CourseGrid` or when the URL contains `?id=<courseId>`. Eliminates page reloading and provides a unified tabbed command center for all course parameters.

#### Props Interface
```typescript
interface CourseEditorDrawerProps {
  courseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCourseUpdated: (updatedCourse: any) => void;
  onCourseDeleted: (courseId: string) => void;
  onOpenSyllabusImport: (courseId: string) => void;
}
```

#### Internal Architecture & Tab Layout
- **Drawer Dimensions**: `w-full max-w-3xl lg:max-w-4xl` (responsive full-screen on mobile, wide drawer on desktop).
- **Animation**: Framer Motion `motion.div` with spring physics and backdrop click-to-dismiss.
- **Tabbed Structure**:
  1. **Tab 1: Overview (`overview`)**:
     - Form fields: Title, description, price, audience level, start date, end date, thumbnail URL.
     - Live thumbnail image preview card.
     - Supabase update handler with optimistic state and toast notification.
  2. **Tab 2: Syllabus & Videos (`syllabus`)**:
     - Renders `SyllabusTreeEditor.jsx` with lesson reordering, subject divisions, video IDs, and durations.
     - Direct button to launch `SyllabusImportModal.jsx`.
  3. **Tab 3: Study Sheets & PDFs (`materials`)**:
     - Form to attach worksheet / reference PDF to a specific lesson or course root.
     - List of attached PDFs with secure URL links and delete triggers.
  4. **Tab 4: Linked Exams & Tests (`exams`)**:
     - Link JEE Mock exams, launch question builder, and view student test telemetry.
  5. **Tab 5: Doubts & Live Classes (`live_doubts`)**:
     - Live class scheduling (date, time, Meet/Zoom room URL).
     - Classroom poll broadcast telemetry and student doubt threads.

---

### 6.3 `src/components/courses/SyllabusTreeEditor.jsx`

#### Purpose
An interactive curriculum outline editor that allows instructors and admins to organize lessons, reorder modules via Drag-and-Drop, assign video sources, and link worksheets.

#### Props Interface
```typescript
interface SyllabusTreeEditorProps {
  courseId: string;
  initialLessons: Array<{
    id: string;
    course_id: string;
    title: string;
    duration_minutes: number;
    subject: string; // 'Physics' | 'Chemistry' | 'Mathematics' | 'General'
    order_index: number;
    video_url?: string;
    video_source?: string; // 'youtube' | 'vimeo' | 'hls'
    video_id?: string;
    assignment_title?: string;
    assignment_url?: string;
    reading_material?: string;
  }>;
  onLessonsChange: (lessons: any[]) => void;
  onOpenImportModal: () => void;
}
```

#### Key Capabilities
- **Drag-and-Drop (`@hello-pangea/dnd`)**:
  - `DragDropContext` and `Droppable` list with `Draggable` lesson rows.
  - `GripVertical` icon handle with tactile cursor feedback (`cursor-grab` / `active:cursor-grabbing`).
  - Auto-updates `order_index` in Supabase upon drop.
- **Subject Filtering / Tabs**: Toggle between `Physics`, `Chemistry`, `Mathematics`, and `All`.
- **Inline Lesson Authoring**:
  - Quick-add lesson form (Title, Video URL / YouTube ID, Duration in minutes, Worksheet Title & Link).
  - Auto-extraction of 11-char YouTube ID from full URLs.
- **Expandable Lesson Card**:
  - Expand to view or edit rich reading material (Markdown + LaTeX preview).
  - Quick delete button with instant removal and database sync.

---

### 6.4 `src/components/courses/SyllabusImportModal.jsx`

#### Purpose
A modularized, browser-side parser that extracts curriculum outlines and lessons from uploaded PDF or Word (`.docx`) files without backend server dependencies.

#### Props Interface
```typescript
interface SyllabusImportModalProps {
  isOpen: boolean;
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}
```

#### Parsing & Ingestion Workflow
1. **Document Loading Engine**:
   - PDF: Dynamic loader for `pdf.js` (`3.11.174`) from CDN with coordinate-aware layout text extraction (`extractTextWithLayout`).
   - Word (`.docx`): Dynamic loader for `mammoth.js` (`1.6.0`) with `extractRawText`.
2. **Text Normalization & Rule-based NLP Parser (`parseSyllabusText`)**:
   - Identifies duration patterns: `(120 mins)`, `[2 hours]`, `- 90 minutes`.
   - Cleans prefixes: `1. `, `Lesson 1:`, `Module 2 -`, `Topic 3:`.
   - Filters document noise: headers, page numbers, table of contents.
3. **Interactive Review Grid**:
   - Editable table before committing: Sequence, Lesson Unit Title, Duration (mins), Description, Delete row, Add row.
4. **Batch Insertion & Cache Invalidation**:
   - Prepares batch payload with `course_id`, `title`, `duration_minutes`, `order_index`.
   - Executes `supabase.from('lessons').insert(payload)`.
   - Invokes `invalidateCache('course', null, courseId)` and `invalidateCache('catalog', courseId)`.
   - Shows success toast and reloads the course drawer curriculum.

---

## 7. Data Flow, Cache Invalidation & Route Sync

### 7.1 Supabase Schema & Queries

```
┌──────────────┐       1:N        ┌──────────────┐
│   courses    │ ───────────────< │   lessons    │
└──────────────┘                  └──────────────┘
       │ 1:N                             │ 1:N
       │                                 │
       ├───────────────< ┌──────────────┐│
       │                 │ course_files │<┘
       │                 └──────────────┘
       │ 1:N
       ├───────────────< ┌──────────────┐
       │                 │ assessments  │
       │                 └──────────────┘
       │ 1:N
       └───────────────< ┌──────────────┐
                         │live_sessions │
                         └──────────────┘
```

### 7.2 Cache Invalidation Protocol
All course mutations must invoke `invalidateCache`:
```javascript
import { invalidateCache } from '@/utils/invalidateCache';

// After Course Edit or Creation:
await invalidateCache('catalog', courseId);
await invalidateCache('course', courseId);

// After Lesson Ingestion / Deletion:
await invalidateCache('course', null, courseId);
```

### 7.3 URL Parameter Synchronization
To support bookmarking, deep links, and browser back/forward navigation:
- Opening drawer for course `c123` updates URL query to `/courses?id=c123` (using `router.replace` without full page refresh).
- Closing drawer clears query params back to `/courses`.
- Deep linking to `/courses?id=c123` on initial load automatically opens the drawer for that course.

---

## 8. Accessibility, Performance & Edge Cases

1. **Next.js Hydration Safety**: All client components must feature `'use client'` directive and wrap query parameters with `<Suspense>` boundary to prevent Next.js 16 hydration mismatches.
2. **Debounced Rendering**: LaTeX preview and omnibar search must use 150ms debounce timers to prevent UI lag on high keystroke velocity.
3. **Escape & Click-Outside Handlers**: Drawer and modals must listen for `Escape` keypress and clicks outside the dialog boundary to ensure keyboard accessibility.
4. **Memory Management in PDF/Mammoth Parsers**: Dynamically injected CDN scripts must be cached on `window` (`window.pdfjsLib`, `window.mammoth`) to avoid duplicate script injection.

---

## 9. Implementation Roadmap & File Layout Plan

```
src/
├── app/
│   └── courses/
│       └── page.js                     # Root controller (< 120 lines)
│
└── components/
    └── courses/
        ├── CourseGrid.jsx              # TanStack Table Data Grid
        ├── CourseEditorDrawer.jsx      # Slide-out Drawer with tabbed panels
        ├── SyllabusTreeEditor.jsx      # DND Syllabus Tree & Lesson authoring
        ├── SyllabusImportModal.jsx     # Document parser (PDF/Docx)
        ├── CourseOverviewTab.jsx       # Metadata & Pricing tab
        ├── CourseMaterialsTab.jsx      # Worksheets & PDF attachments tab
        ├── CourseExamsTab.jsx          # Assessments & CBT linkages tab
        └── CourseLiveDoubtsTab.jsx     # Doubt board & live sessions tab
```

---

## 10. Conclusion & Next Steps

This UI and design system specification provides a rock-solid foundation for the redesign. The separation of `src/app/courses/page.js` into focused, dedicated components in `src/components/courses/` solves the monolithic codebase problem, eliminates the blank state dropdown UX, and delivers a modern, high-speed experience for course administrators.
