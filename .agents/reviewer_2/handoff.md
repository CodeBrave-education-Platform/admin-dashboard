# Quality & Adversarial Review Report: Database, Auth & API Architecture (Reviewer 2)

## 1. Observation
1. **Next.js 16 Async Cookies & Auth (`src/utils/auth-server.js:9`, `src/utils/supabase/server.js:7-8`)**:
   - `src/utils/auth-server.js` properly awaits `cookies()`: `const cookieStore = await cookies()`.
   - Utilizes `@supabase/ssr` `createServerClient` with `getAll()` and wrapped `setAll()` to safely handle Server Components without crashing on read-only headers.
   - Executes `await supabase.auth.getUser()` to guard against spoofed tokens, followed by an edge role check (`user?.app_metadata?.role || 'student'`) with whitelist `['admin', 'teacher', 'instructor']`.
   - `src/utils/supabase/server.js` also awaits `cookies()` and `headers()`: `const cookieStore = await cookies(); const headersList = await headers()`.
2. **Monitor Client Null Safety (`src/app/admin/test-series/monitor/[examId]/MonitorClient.jsx:159`)**:
   - Safely derives candidate display name with optional chaining:
     `{att.profiles?.full_name || att.profiles?.email?.split('@')[0] || 'Candidate'}`
   - If `att.profiles` is null or `att.profiles.email` is null / undefined / empty, the optional chaining short-circuits to `'Candidate'`, preventing `TypeError: Cannot read properties of undefined (reading 'split')`.
   - Proper lifecycle cleanup in `useEffect` hook (`return () => clearInterval(interval)` on line 60) prevents memory leaks during proctoring telemetry polling.
3. **Telemetry Marks Scheme Normalization (`src/app/api/admin/test-series/telemetry/route.js:83-85`)**:
   - Standardizes mark retrieval across legacy and updated exam blueprints using nullish coalescing:
     `posMarks = firstAttempt.test_exams?.marks_scheme?.positive_marks ?? firstAttempt.test_exams?.marks_scheme?.positive ?? 4;`
   - Incorporates zero-division guard for percentage scoring: `percent = maxScore > 0 ? (att.score / maxScore) * 100 : 0`.
   - Accurately distributes attempts into 5 percentage buckets for the bell curve (`0-20%`, `21-40%`, `41-60%`, `61-80%`, `81-100%`).
4. **Database DDL, Foreign Key Cascades & Performance Indexes (`supabase_schema_migration.sql`)**:
   - `lesson_doubts` DDL defined with recursive cascade: `lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE`, `user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`, and `parent_id UUID REFERENCES public.lesson_doubts(id) ON DELETE CASCADE`.
   - Performance indexes created: `idx_lesson_doubts_lesson_id`, `idx_lesson_doubts_user_id`, `idx_lesson_doubts_parent_id`, `idx_lesson_doubts_created_at`, `idx_lesson_doubts_resolved`.
   - Foreign key cascading is properly partitioned:
     - Blueprint cascading: `test_exams`, `test_attempts`, `lessons`, `course_files`, `assessments`, `questions`, and `enrollments` are set to `ON DELETE CASCADE`.
     - Financial ledger preservation: `invoices` foreign keys (`package_id`, `course_id`, `batch_id`, `book_id`) are set to `ON DELETE SET NULL`, ensuring billing histories are never pruned when catalog items are removed.
5. **Upstash Redis Cache Invalidation (`src/utils/invalidateCache.js`)**:
   - Directly executes REST API `DEL` commands via `Promise.allSettled` for `asentra:course:catalog`, `asentra:course:${courseId}`, and `asentra:batch:meta:${batchId}`.
   - Provides secondary webhook fallback to `http://localhost:3000/api/cache/invalidate` signed with `RAZORPAY_KEY_SECRET`.
6. **Verification & Build Execution**:
   - `node tests/e2e/run_e2e_tests.js`: 87/87 tests passed across all 5 tiers (0 failures, 56ms).
   - `node tests/run_all_tests.js`: 119/119 tests passed (0 failures, 119ms).
   - `npm run build`: Next.js 16.2.6 production build succeeded with exit code 0 (16/16 static pages generated in 952ms).

## 2. Logic Chain
1. In Next.js 15 and 16, `cookies()` and `headers()` from `next/headers` were converted from synchronous accessors to asynchronous functions returning Promises. Without `await cookies()`, `createServerClient` fails at runtime with `Error: cookies() must be awaited`. Both `auth-server.js` and `supabase/server.js` correctly `await` these calls, establishing safe SSR operations.
2. Proctoring monitor screens often encounter incomplete profile rows when students register via external auth or haven't configured a full name. The optional chaining `att.profiles?.email?.split('@')[0]` eliminates runtime crashes, guaranteeing seamless rendering of real-time submission logs.
3. In earlier schema versions, the test blueprint marks scheme used `{ positive: 4, negative: -1 }`, while modern versions use `{ positive_marks: 4, negative_marks: -1 }`. The fallback chain `positive_marks ?? positive ?? 4` guarantees that telemetry analytics work for both legacy and newly compiled exams without throwing NaN or breaking the bell curve distribution.
4. Schema cascades guarantee that deleting test packages or courses does not leave orphaned records or encounter foreign key violation errors (Postgres error 23503). Setting invoice foreign keys to `ON DELETE SET NULL` preserves revenue audit trails while unlinking deleted courses or packages.
5. Integrity audit confirmed: No hardcoded test stubs, mock facades, or bypassed security routines exist in production paths.

## 3. Caveats
- Direct Redis REST cache invalidation requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production environments; in local development without Redis credentials, the helper gracefully logs a warning without throwing uncaught exceptions.
- Webhook invalidation target (`http://localhost:3000/api/cache/invalidate`) expects the student portal to be running locally on port 3000; when offline, the catch block absorbs connection refused errors.

## 4. Conclusion
**Verdict**: **APPROVE**  
The backend, authentication layer, telemetry calculation, Supabase SSR integration, Upstash Redis caching, and PostgreSQL schema migrations are robust, secure, null-safe, and fully compliant with Next.js 16 App Router standards.

## 5. Verification Method
- Master E2E Suite: `node tests/e2e/run_e2e_tests.js` (87 assertions, 0 errors)
- Full Project Regression Suite: `node tests/run_all_tests.js` (119 assertions, 0 errors)
- Production Build: `npm run build` (Next.js 16.2.6, exit code 0)

