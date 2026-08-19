# Comprehensive Database & API QA Survey Report
**Project:** ASENTRA Education Platform — Admin Dashboard  
**Working Directory:** D:\admin dashboard  
**Date:** 2026-08-19  
**Auditor:** Explorer 3 (Admin Database & API Connections QA)

---

## Executive Summary

A comprehensive architectural and code-level audit was conducted across all database connections, Supabase client/server calls, Next.js API route handlers, foreign key relationships, cascade deletion pathways, error boundaries, authentication boundaries, and build requirements.

### Key Metrics:
- **API Routes Audited:** 5 routes (/api/admin/ai/parse-pdf, /api/admin/ai/parse-pdf-page, /api/admin/test-series/telemetry, /api/live/poll, /auth/callback)
- **Admin & Core Pages Audited:** 12 pages (/admin/courses, /courses, /admin/test-series, /admin/test-series/compiler, /admin/test-series/monitor/[examId], /admin/books, /admin/books/orders, /admin/invoices, /admin/questions, /admin/students, /batches, /gradebook, /dashboard)
- **Components & Drawers Audited:** 30+ components across src/components/
- **Build Status:** 
pm run build executed with **0 errors** on Next.js 16.2.6 (Turbopack).
- **Automated Test Suites:** 103/103 assertions passed across Tier 1-5 test harnesses.

---

## 1. Database Connections & Supabase Architecture Audit

### 1.1 Supabase Client Configurations
| Client File | Implementation Type | Status / Health | Key Observations |
|---|---|---|---|
| src/utils/supabase/client.js | @supabase/ssr createBrowserClient | ✅ Healthy | Implements client-side singleton rowserClient pattern; supports .institute.com shared cookie domain; autoRefreshToken enabled. |
| src/utils/supabase/server.js | @supabase/ssr createServerClient | ✅ Healthy | Correctly uses wait cookies() and wait headers() compatible with Next.js 15/16 async request API. |
| src/utils/supabase/middleware.js | @supabase/ssr createServerClient | ✅ Healthy | Route protection middleware refreshes auth tokens via supabase.auth.getUser(), validates JWT pp_metadata.role (admin/teacher/instructor), and applies Upstash Redis rate limiting to POST /login. |
| src/utils/auth-server.js | @supabase/ssr createServerClient | ⚠️ **Bug Detected** | cookies() is called synchronously without wait on line 9 (const cookieStore = cookies()). In Next.js 16, cookies() returns a Promise, causing cookieStore.getAll() to fail if equireAdmin() is invoked. |

---

## 2. API Routes Audit (src/app/api/)

### 2.1 Route Analysis Matrix
| Route Path | HTTP Methods | Auth & Access Control | DB / Redis Interactions | Error Handling & Boundary Resilience |
|---|---|---|---|---|
| src/app/api/admin/ai/parse-pdf/route.js | POST | Server environment (API keys) | Google GenAI SDK (@google/genai), fallback regex engine | ✅ 5MB payload limit check; handles 5 fallback Gemini models (gemini-3.7-flash down to 2.5-flash); sanitizes raw LaTeX backslashes; graceful fallback to deterministic regex parser on missing API key or 503 errors. |
| src/app/api/admin/ai/parse-pdf-page/route.js | POST | Server environment (API keys) | Google GenAI SDK (@google/genai) | ✅ 5MB payload limit; chunked single-page image parsing; regex sanitization and question format normalizer. |
| src/app/api/admin/test-series/telemetry/route.js | GET | Supabase uth.getUser() + profiles.role | Upstash Redis REST API (sentra:test:active::*) + Supabase 	est_attempts join with 	est_exams | ⚠️ Marks scheme key inconsistency: Line 83 accesses marks_scheme?.positive_marks || 4, whereas SQL migration default uses { positive: 4, negative: -1 }. Fallback to 4 works, but custom non-4 positive marks could default to 4 if stored under positive. |
| src/app/api/live/poll/route.js | GET, POST, OPTIONS | Supabase uth.getUser() + profiles.role (checkAdminAuth) | Upstash Redis REST API (sentra:live:poll*) | ✅ Whitelisted CORS verification (ALLOWED_CORS_ORIGINS); input validation on question and options array; Redis TTL expiry management. |
| src/app/auth/callback/route.js | GET | OAuth exchange + profiles.role verification | Supabase uth.exchangeCodeForSession + profiles role lookup | ✅ Open redirect sanitization via getSafeRedirectUrl(); auto-signout and error redirect if profile not found or role lacks admin permissions. |

---

## 3. Database Schema, Relations & Cascade Deletion Audit

### 3.1 Relational Schema & Foreign Key Map
`
test_packages (PK id)
  ├── test_exams (FK package_id -> ON DELETE CASCADE)
  │     └── test_attempts (FK exam_id -> ON DELETE CASCADE)
  └── invoices (FK package_id -> ON DELETE SET NULL)

courses (PK id)
  ├── lessons (FK course_id -> ON DELETE CASCADE)
  ├── course_files (FK course_id -> ON DELETE CASCADE)
  ├── live_sessions (FK course_id -> ON DELETE CASCADE)
  ├── assessments (FK course_id -> ON DELETE CASCADE)
  │     ├── questions (FK assessment_id -> ON DELETE CASCADE)
  │     └── assessment_attempts (FK assessment_id -> ON DELETE CASCADE)
  ├── enrollments (FK course_id -> ON DELETE CASCADE)
  └── invoices (FK course_id -> ON DELETE SET NULL)

batches (PK id)
  ├── batch_enrollments (FK batch_id -> ON DELETE CASCADE)
  ├── course_files (FK batch_id -> ON DELETE CASCADE)
  ├── live_sessions (FK batch_id -> ON DELETE CASCADE)
  ├── assessments (FK batch_id -> ON DELETE CASCADE)
  └── invoices (FK batch_id -> ON DELETE SET NULL)

books (PK id)
  ├── book_orders (FK book_id -> ON DELETE SET NULL)
  └── invoices (FK book_id -> ON DELETE SET NULL)

profiles (PK id)
  ├── test_attempts (FK user_id -> ON DELETE CASCADE)
  ├── batch_enrollments (FK user_id -> ON DELETE CASCADE)
  ├── enrollments (FK user_id / profile_id -> ON DELETE CASCADE)
  ├── assessment_attempts (FK user_id / profile_id -> ON DELETE CASCADE)
  ├── book_orders (FK user_id -> ON DELETE CASCADE)
  └── invoices (FK user_id -> ON DELETE CASCADE)
`

### 3.2 Cascade Deletion Safety Analysis
1. **Course Deletion (courses):**
   - Deleting a course cleanly cascades to all child lessons, course_files, live_sessions, ssessments (and their nested questions & ssessment_attempts), and direct enrollments.
   - Financial ledger integrity is preserved because invoices.course_id is configured with ON DELETE SET NULL.
2. **Test Package Deletion (	est_packages):**
   - Deleting a test package cascades to all child 	est_exams and their corresponding student 	est_attempts.
   - invoices.package_id sets to NULL, preserving revenue records.
3. **Batch Deletion (atches):**
   - Deleting a batch cascades to atch_enrollments, course_files, live_sessions, and ssessments.
   - invoices.batch_id sets to NULL.

---

## 4. Discovered Flaws & Remediation Recommendations

### 🚨 Critical & High Priority Items

#### 1. Un-awaited cookies() in src/utils/auth-server.js
- **Location:** src/utils/auth-server.js:9
- **Issue:** const cookieStore = cookies() is executed without wait. In Next.js 16 (
ext: 16.2.6), cookies() is an asynchronous function returning a Promise.
- **Risk:** Any Server Action or API Route invoking equireAdmin() will throw TypeError: cookieStore.getAll is not a function.
- **Remediation:**
  `javascript
  // Before:
  const cookieStore = cookies()
  // After:
  const cookieStore = await cookies()
  `

#### 2. Unsafe Email String Split in MonitorClient.jsx
- **Location:** src/app/admin/test-series/monitor/[examId]/MonitorClient.jsx:159
- **Issue:** Expression {att.profiles?.full_name || att.profiles?.email.split('@')[0]} calls .split('@') directly on tt.profiles?.email without optional chaining.
- **Risk:** If a student profile has a 
ull or missing email, the entire proctoring monitor page throws an unhandled TypeError and crashes.
- **Remediation:**
  `javascript
  // Before:
  {att.profiles?.full_name || att.profiles?.email.split('@')[0]}
  // After:
  {att.profiles?.full_name || att.profiles?.email?.split('@')[0] || 'Anonymous Candidate'}
  `

#### 3. Marks Scheme Positive Marks Key Inconsistency in Telemetry API
- **Location:** src/app/api/admin/test-series/telemetry/route.js:83
- **Issue:** Accesses irstAttempt.test_exams?.marks_scheme?.positive_marks || 4, whereas default schema records { positive: 4, negative: -1 }.
- **Remediation:**
  `javascript
  const posMarks = firstAttempt.test_exams?.marks_scheme?.positive_marks 
    ?? firstAttempt.test_exams?.marks_scheme?.positive 
    ?? 4;
  `

#### 4. Missing Migration DDL for lesson_doubts Table
- **Location:** src/components/courses/CourseEditorDrawer.jsx:142 & src/components/CourseManageClient.jsx:1339
- **Issue:** Frontend queries lesson_doubts table which is not declared in supabase_schema_migration.sql.
- **Remediation:** Add DDL table definition in migration SQL:
  `sql
  CREATE TABLE IF NOT EXISTS public.lesson_doubts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      resolved BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
  );
  `

---

## 5. UI Overhaul Target Survey (Bento Grid Replacement for Tables)

### Current Implementation State:
- **Test Packages:** Rendered via TanStack table in src/components/test-series/TestSeriesGrid.jsx (and referenced in src/app/admin/test-series/page.js).
- **Courses:** Rendered via TanStack table in src/components/courses/CourseGrid.jsx (and referenced in src/app/courses/page.js and src/app/admin/courses/CourseStudioClient.jsx).

### Bento Grid Requirements for Downstream Implementers:
1. **Asymmetrical Card Layout:** Replace table rows with rich, visually distinct Bento cards featuring high-impact badges, metrics ribbons, and prominent uncropped thumbnails (	humbnail_url).
2. **Integrated Admin Action Controls:**
   - Click card to open Slide-out Management Drawer (CourseEditorDrawer / TestSeriesEditorDrawer).
   - Quick Status Toggle (Active / Inactive) with optimistic UI updates and Redis cache invalidation.
   - Edit & Delete buttons with ConfirmDialogModal guards.
   - Live metrics display: total tests count, distribution (drills, mocks, live), enrolled students count, and pricing tags.
3. **Hydration & Responsive Robustness:**
   - Use suppressHydrationWarning on dynamic date formatters.
   - Clean empty states with intuitive Call-to-Actions (Create Course / Create Test Package).

---

## 6. Build & Dependency Verification

- **Next.js Version:** 16.2.6 (Turbopack)
- **React Version:** 19.2.4
- **Supabase SSR:** @supabase/ssr: ^0.10.3, @supabase/supabase-js: ^2.106.2
- **Build Status:** Verified passing with   compilation errors and   static generation failures across all 23 app routes.
