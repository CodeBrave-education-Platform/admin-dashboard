# Dispatch: Worker 2 (Courses Bento Grid UI Implementation)

## 2026-08-19T17:47:00Z

Working Directory: D:\admin dashboard\.agents\worker_m2_courses
Original Request: D:\admin dashboard\.agents\ORIGINAL_REQUEST.md
Project Spec: D:\admin dashboard\.agents\PROJECT.md
Survey Report: D:\admin dashboard\.agents\explorer_survey_courses\report.md

Write Ownership: `src/components/courses/CourseGrid.jsx`, `src/app/courses/page.js`, and `src/app/admin/courses/CourseStudioClient.jsx`.

Tasks:
1. Replace the TanStack table in `src/components/courses/CourseGrid.jsx` with a world-class, premium, asymmetric Bento Grid layout.
2. Prominently display course thumbnails with 16:9/16:10 aspect ratio, smooth hover-zoom (`group-hover:scale-105 transition-transform duration-500`), and dark gradient scrims for text clarity.
3. Add dynamic subject-specific gradient fallbacks with Lucide icons (Physics: Atom, Chemistry: FlaskConical, Math: Pi, General: BookOpen) when `thumbnail_url` is missing or fails to load.
4. Add glassmorphic floating badges over cover images (Audience Level pill, Active/Inactive status switch, Price/MRP pill, Enrolled students count).
5. Add curriculum density chips ({lessons_count} Units, {files_count} Worksheets, {exams_count} CBTs).
6. Embed intuitive admin controls:
   - Primary card click / "Edit Course" button triggers `onSelectCourse(course)` (opening `CourseEditorDrawer` and setting `?id=`).
   - Inline active/inactive toggle with instant tactile feedback and cache purging.
   - Fast Syllabus Import button triggering `SyllabusImportModal`.
   - Delete button with `ConfirmDialogModal` confirmation.
7. Retain the top control bar: Search omnibar, Level filter pills, Status filter pills, Sort dropdown, and Bulk CSV export.
8. Ensure `/admin/courses` and `/courses` work seamlessly with the new Bento Grid.
9. Ensure zero hydration warnings (`suppressHydrationWarning` on formatted dates) and fully responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`).
10. Run build and tests to verify zero errors.
11. Write your handoff report to `D:\admin dashboard\.agents\worker_m2_courses\handoff.md` and send completion message back.
