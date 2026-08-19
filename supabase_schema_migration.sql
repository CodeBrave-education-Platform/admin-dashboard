-- ==============================================================================
-- ASENTRA EDUCATION PLATFORM - SUPABASE SCHEMA SYNCHRONIZATION MIGRATION
-- Generated: 2026-08-17
-- Description: Unifies database schemas with admin dashboard UI expectations.
--              Adds missing columns, relational foreign keys, indexes, and RPCs.
-- ==============================================================================

-- 1. PROFILES TABLE ENHANCEMENTS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT DEFAULT 'student',
    last_active_date TEXT,
    target_focus TEXT DEFAULT 'JEE',
    target_year TEXT,
    academic_batch TEXT,
    preferred_subject TEXT,
    preferred_subjects TEXT,
    daily_study_hours TEXT,
    syllabus_progress TEXT,
    test_average TEXT,
    academic_strengths TEXT,
    weekly_tests_attempted TEXT,
    dream_college TEXT,
    study_hours_slept TEXT,
    study_mentor TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Relax auth.users FK constraint to allow roster pre-registration
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_focus TEXT DEFAULT 'JEE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_year TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academic_batch TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_subject TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_subjects TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_study_hours TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS syllabus_progress TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS test_average TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academic_strengths TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_tests_attempted TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dream_college TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS study_hours_slept TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS study_mentor TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 2. TEST PACKAGES & TEST SERIES TABLES
CREATE TABLE IF NOT EXISTS public.test_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    target_exam_tag TEXT NOT NULL DEFAULT 'JEE Main',
    total_tests_count INT NOT NULL DEFAULT 0,
    test_distribution JSONB NOT NULL DEFAULT '{"chapter_drills": 0, "full_mocks": 0, "live_papers": 0}'::jsonb,
    price_ledger JSONB NOT NULL DEFAULT '{"status": "free", "price": 0}'::jsonb,
    thumbnail_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.test_packages ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.test_packages ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.test_packages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.test_packages ADD COLUMN IF NOT EXISTS target_exam_tag TEXT DEFAULT 'JEE Main';
ALTER TABLE public.test_packages ADD COLUMN IF NOT EXISTS total_tests_count INT DEFAULT 0;
ALTER TABLE public.test_packages ADD COLUMN IF NOT EXISTS test_distribution JSONB DEFAULT '{"chapter_drills": 0, "full_mocks": 0, "live_papers": 0}'::jsonb;
ALTER TABLE public.test_packages ADD COLUMN IF NOT EXISTS price_ledger JSONB DEFAULT '{"status": "free", "price": 0}'::jsonb;

-- 3. TEST EXAMS BLUEPRINTS TABLE
CREATE TABLE IF NOT EXISTS public.test_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.test_packages(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 180,
    total_questions INT NOT NULL DEFAULT 0,
    marks_scheme JSONB NOT NULL DEFAULT '{"positive": 4, "negative": -1}'::jsonb,
    is_live_ranking BOOLEAN NOT NULL DEFAULT true,
    activation_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.test_exams ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.test_packages(id) ON DELETE CASCADE;
ALTER TABLE public.test_exams ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 180;
ALTER TABLE public.test_exams ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 0;
ALTER TABLE public.test_exams ADD COLUMN IF NOT EXISTS marks_scheme JSONB DEFAULT '{"positive": 4, "negative": -1}'::jsonb;
ALTER TABLE public.test_exams ADD COLUMN IF NOT EXISTS is_live_ranking BOOLEAN DEFAULT true;
ALTER TABLE public.test_exams ADD COLUMN IF NOT EXISTS activation_timestamp TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.test_exams ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;

-- 4. TEST QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    sub_topic TEXT,
    difficulty TEXT DEFAULT 'MEDIUM',
    content TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_option_index INT NOT NULL DEFAULT 0,
    section TEXT DEFAULT 'Section A',
    question_type TEXT DEFAULT 'single',
    marks_positive INT DEFAULT 4,
    marks_negative INT DEFAULT -1,
    diagram_url TEXT,
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'Section A';
ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'single';
ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS marks_positive INT DEFAULT 4;
ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS marks_negative INT DEFAULT -1;
ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS diagram_url TEXT;
ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'MEDIUM';
ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS sub_topic TEXT;

-- 5. TEST ATTEMPTS & SCORECARDS TABLE
CREATE TABLE IF NOT EXISTS public.test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.test_exams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL DEFAULT 0,
    total_duration_seconds INT NOT NULL DEFAULT 0,
    answers_payload JSONB DEFAULT '{}'::jsonb,
    correct_count INT DEFAULT 0,
    incorrect_count INT DEFAULT 0,
    unattempted_count INT DEFAULT 0,
    unanswered_count INT DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS correct_count INT DEFAULT 0;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS incorrect_count INT DEFAULT 0;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS unattempted_count INT DEFAULT 0;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS unanswered_count INT DEFAULT 0;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS answers_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.test_attempts DROP CONSTRAINT IF EXISTS test_attempts_user_id_fkey;
ALTER TABLE public.test_attempts DROP CONSTRAINT IF EXISTS fk_test_attempts_user_profiles;
ALTER TABLE public.test_attempts ADD CONSTRAINT fk_test_attempts_user_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. COHORT BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT DEFAULT 'published',
    price NUMERIC NOT NULL DEFAULT 0,
    target_focus TEXT DEFAULT 'JEE',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS target_focus TEXT DEFAULT 'JEE';
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';

-- 7. BATCH ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.batch_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(batch_id, user_id)
);

ALTER TABLE public.batch_enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.batch_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.batch_enrollments DROP CONSTRAINT IF EXISTS batch_enrollments_user_id_fkey;
ALTER TABLE public.batch_enrollments ADD CONSTRAINT batch_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 8. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    original_price NUMERIC,
    level TEXT DEFAULT 'foundation',
    subject TEXT DEFAULT 'General',
    instructor_name TEXT,
    instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    students_count INT DEFAULT 0,
    badge TEXT,
    book_kit TEXT,
    thumbnail_url TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relax restrictive level constraint if present
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_level_check;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS original_price NUMERIC;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'General';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_name TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS students_count INT DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS book_kit TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 9. LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration_minutes INT DEFAULT 60,
    subject TEXT DEFAULT 'General',
    order_index INT NOT NULL DEFAULT 1,
    description TEXT,
    video_url TEXT,
    video_source TEXT DEFAULT 'youtube',
    video_id TEXT,
    assignment_title TEXT,
    assignment_url TEXT,
    reading_material TEXT,
    is_free_preview BOOLEAN DEFAULT false,
    is_free BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'General';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_source TEXT DEFAULT 'youtube';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_id TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS assignment_title TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS assignment_url TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS reading_material TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

-- 10. LESSON DOUBTS & Q&A THREADS TABLE
CREATE TABLE IF NOT EXISTS public.lesson_doubts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.lesson_doubts(id) ON DELETE CASCADE,
    content TEXT,
    question_text TEXT,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_doubts ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_doubts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_doubts ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.lesson_doubts(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_doubts ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.lesson_doubts ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE public.lesson_doubts ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false;
ALTER TABLE public.lesson_doubts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.lesson_doubts DROP CONSTRAINT IF EXISTS lesson_doubts_user_id_fkey;
ALTER TABLE public.lesson_doubts DROP CONSTRAINT IF EXISTS fk_lesson_doubts_user_profiles;
ALTER TABLE public.lesson_doubts ADD CONSTRAINT fk_lesson_doubts_user_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 11. COURSE FILES / WORKSHEETS TABLE (Relates to both Courses and Batches)
CREATE TABLE IF NOT EXISTS public.course_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.course_files ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE;
ALTER TABLE public.course_files ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;
ALTER TABLE public.course_files ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.course_files ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.course_files ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE public.course_files ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 11. LIVE SESSIONS TABLE (Relates to both Courses and Batches)
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    meeting_url TEXT,
    scheduled_start TIMESTAMPTZ NOT NULL,
    duration_minutes INT DEFAULT 60,
    status TEXT DEFAULT 'upcoming',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE;
ALTER TABLE public.live_sessions ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming';
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 60;
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 12. ASSESSMENTS TABLE (Relates to Courses and Batches)
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'jee_mock',
    duration_minutes INT DEFAULT 180,
    total_marks INT DEFAULT 300,
    start_window TIMESTAMPTZ,
    end_window TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE;
ALTER TABLE public.assessments ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS start_window TIMESTAMPTZ;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS end_window TIMESTAMPTZ;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS total_marks INT DEFAULT 300;

-- 13. QUESTION BANK TABLE (Standalone and Assessment Questions)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    subject TEXT,
    topic TEXT,
    sub_topic TEXT,
    format_type TEXT DEFAULT 'single_mcq',
    "formatType" TEXT DEFAULT 'single_mcq',
    difficulty TEXT DEFAULT 'MEDIUM',
    content TEXT,
    question_text TEXT,
    "questionText" TEXT,
    diagram_url TEXT,
    "diagramUrl" TEXT,
    options JSONB DEFAULT '[]'::jsonb,
    correct_option_index INT DEFAULT 0,
    correct_answer TEXT,
    "correctAnswer" TEXT,
    marks_positive INT DEFAULT 4,
    marks_negative INT DEFAULT -1,
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ALTER COLUMN assessment_id DROP NOT NULL;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS sub_topic TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS format_type TEXT DEFAULT 'single_mcq';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS "formatType" TEXT DEFAULT 'single_mcq';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'MEDIUM';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS "questionText" TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS diagram_url TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS "diagramUrl" TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS "correctAnswer" TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 14. BOOKS INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    author TEXT DEFAULT 'Asentra Academic Board',
    target_exam_tag TEXT DEFAULT 'JEE MAINS',
    price NUMERIC NOT NULL DEFAULT 0,
    original_price NUMERIC,
    stock_quantity INT DEFAULT 50,
    cover_url TEXT,
    sample_pdf_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'Asentra Academic Board';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS target_exam_tag TEXT DEFAULT 'JEE MAINS';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS original_price NUMERIC;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 50;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS sample_pdf_url TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 15. BOOK ORDERS / FULFILLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.book_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'placed',
    courier_partner TEXT,
    tracking_id TEXT,
    tracking_url TEXT,
    shipping_address JSONB DEFAULT '{}'::jsonb,
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

ALTER TABLE public.book_orders ADD COLUMN IF NOT EXISTS courier_partner TEXT;
ALTER TABLE public.book_orders ADD COLUMN IF NOT EXISTS tracking_id TEXT;
ALTER TABLE public.book_orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE public.book_orders ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.book_orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE public.book_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 16. COURSE ENROLLMENTS TABLE (Direct course enrollments)
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 17. COURSE ASSESSMENT ATTEMPTS TABLE (Assessment Telemetry)
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    answers_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_attempts ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_attempts ADD COLUMN IF NOT EXISTS answers_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.assessment_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.assessment_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now();

-- 18. INVOICES & MONETIZATION TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    package_id UUID REFERENCES public.test_packages(id) ON DELETE SET NULL,
    book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    razorpay_payment_id TEXT,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'captured',
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.test_packages(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS book_id UUID REFERENCES public.books(id) ON DELETE SET NULL;

-- 19. RPC STORED PROCEDURES

-- RPC: import_batch_roster
-- Enrolls students into a batch given arrays of emails, names, and academic focuses.
DROP FUNCTION IF EXISTS public.import_batch_roster(uuid, text[], text[], text[]);

CREATE OR REPLACE FUNCTION public.import_batch_roster(
    _batch_id UUID,
    _emails TEXT[],
    _names TEXT[],
    _focuses TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB := '[]'::jsonb;
    i INT;
    curr_email TEXT;
    curr_name TEXT;
    curr_focus TEXT;
    found_user_id UUID;
    existing_enrollment UUID;
BEGIN
    FOR i IN 1..cardinality(_emails) LOOP
        curr_email := lower(trim(_emails[i]));
        curr_name := trim(_names[i]);
        curr_focus := coalesce(_focuses[i], 'JEE');

        IF curr_email IS NOT NULL AND curr_email <> '' THEN
            -- Check if user profile already exists
            SELECT id INTO found_user_id FROM public.profiles WHERE lower(email) = curr_email LIMIT 1;

            -- If user doesn't exist, create a profile entry
            IF found_user_id IS NULL THEN
                found_user_id := gen_random_uuid();
                INSERT INTO public.profiles (
                    id, email, full_name, role, target_focus, academic_batch, created_at
                ) VALUES (
                    found_user_id, curr_email, curr_name, 'student', curr_focus, curr_focus, now()
                )
                ON CONFLICT (id) DO NOTHING;
            END IF;

            -- Check if already enrolled in this specific batch
            SELECT id INTO existing_enrollment 
            FROM public.batch_enrollments 
            WHERE batch_id = _batch_id AND user_id = found_user_id 
            LIMIT 1;

            IF existing_enrollment IS NULL THEN
                INSERT INTO public.batch_enrollments (batch_id, user_id, status, created_at)
                VALUES (_batch_id, found_user_id, 'active', now())
                ON CONFLICT (batch_id, user_id) DO NOTHING;

                result := result || jsonb_build_object(
                    'email', curr_email,
                    'status', 'success',
                    'user_id', found_user_id
                );
            ELSE
                result := result || jsonb_build_object(
                    'email', curr_email,
                    'status', 'skipped',
                    'reason', 'Already enrolled'
                );
            END IF;
        END IF;
    END LOOP;

    RETURN result;
END;
$$;

-- 20. PERFORMANCE & FOREIGN KEY INDEXES
CREATE INDEX IF NOT EXISTS idx_test_packages_created_at ON public.test_packages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_exams_package_id ON public.test_exams(package_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_exam_id ON public.test_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON public.batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_enrollments_batch_id ON public.batch_enrollments(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_enrollments_user_id ON public.batch_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_files_batch_id ON public.course_files(batch_id);
CREATE INDEX IF NOT EXISTS idx_course_files_course_id ON public.course_files(course_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_batch_id ON public.live_sessions(batch_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_course_id ON public.live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_batch_id ON public.assessments(batch_id);
CREATE INDEX IF NOT EXISTS idx_assessments_course_id ON public.assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_package_id ON public.invoices(package_id);
CREATE INDEX IF NOT EXISTS idx_invoices_batch_id ON public.invoices(batch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_book_id ON public.invoices(book_id);
CREATE INDEX IF NOT EXISTS idx_questions_assessment_id ON public.questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_orders_user_id ON public.book_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_book_orders_book_id ON public.book_orders(book_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment_id ON public.assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_id ON public.assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_doubts_lesson_id ON public.lesson_doubts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_doubts_user_id ON public.lesson_doubts(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_doubts_parent_id ON public.lesson_doubts(parent_id);
CREATE INDEX IF NOT EXISTS idx_lesson_doubts_created_at ON public.lesson_doubts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_doubts_resolved ON public.lesson_doubts(resolved);
