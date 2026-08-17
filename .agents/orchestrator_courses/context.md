# Context — Course Management UI Redesign

## Task Overview
The goal is to redesign the Course Management UI (`src/app/courses/page.js`) in `D:\admin dashboard`.
Replace the legacy 900+ line monolithic dropdown interface with a modern TanStack Table Data Grid and slide-out Drawer pattern (`CourseEditorDrawer.jsx`).

## Key Constraints & Acceptance Criteria
1. The courses page loads without React hydration or runtime errors.
2. A Data Grid correctly displays existing courses from Supabase.
3. Clicking a course opens a slide-out drawer containing syllabus details.
4. The 900+ line `page.js` is successfully split into at least 3 distinct modular component files.
5. Visual design uses harmonious colors, precise padding, and responsive layout.
6. Maintain existing PDF/Docx syllabus import logic cleanly.
