-- ============================================================================
-- ASENTRA EDUCATION PLATFORM - DYNAMIC DATA & SCHEMA SYNCHRONIZATION MIGRATION
-- Migration: 16_dynamic_data_and_schema_sync.sql
-- Description: 
--   1. Enhances public.batches with rich cohort metadata, faculty details, schedules, metrics, and curricula.
--   2. Enhances public.books with subjects, categories, ratings, reviews, formats, and stock tracking.
--   3. Enhances public.courses and public.test_packages with comprehensive metadata parity.
--   4. Creates public.announcements table with RLS for system-wide and batch broadcast feeds.
--   5. Creates public.student_bookmarks table with RLS for saving questions, lessons, and handbooks.
--   6. Creates public.instructors view with (security_invoker = true) for faculty directories.
--   7. Seeds rich, production-grade dynamic records for Courses, Batches, Books, Test Packages, Exams,
--      Question Bank, and Announcements ensuring complete dynamic UI rendering across both portals.
-- ============================================================================

-- Ensure cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENHANCE PUBLIC.BATCHES TABLE SCHEMA
-- ============================================================================
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS faculty TEXT,
  ADD COLUMN IF NOT EXISTS faculty_role TEXT,
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS instructor_role TEXT,
  ADD COLUMN IF NOT EXISTS target_year TEXT DEFAULT 'TARGET 2026',
  ADD COLUMN IF NOT EXISTS target_focus TEXT DEFAULT 'JEE',
  ADD COLUMN IF NOT EXISTS schedule TEXT DEFAULT 'Mon - Fri Live Classes (6:00 PM - 9:00 PM)',
  ADD COLUMN IF NOT EXISTS seats_left INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS students_enrolled TEXT DEFAULT '85% Seats Filled',
  ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 4.95,
  ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'LIVE COHORT',
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS book_kit JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS curriculum JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cover TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Performance index for active batches
CREATE INDEX IF NOT EXISTS idx_batches_is_active ON public.batches(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_batches_target_focus ON public.batches(target_focus);

-- ============================================================================
-- 2. ENHANCE PUBLIC.BOOKS TABLE SCHEMA
-- ============================================================================
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS author TEXT,
  ADD COLUMN IF NOT EXISTS target_exam_tag TEXT DEFAULT 'JEE Mains',
  ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Standard',
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 4.8,
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'Hardcopy + PDF',
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS sample_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_books_subject ON public.books(subject);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category);
CREATE INDEX IF NOT EXISTS idx_books_is_active ON public.books(is_active);

-- ============================================================================
-- 3. ENHANCE PUBLIC.COURSES & TEST SERIES TABLES
-- ============================================================================
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS instructor_role TEXT,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'mains',
  ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS badge VARCHAR(50) DEFAULT 'CERTIFIED COURSE',
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 4.9,
  ADD COLUMN IF NOT EXISTS students_count INTEGER DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '12 Months',
  ADD COLUMN IF NOT EXISTS lessons_count INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS book_kit JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.test_packages
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS campus_branch TEXT DEFAULT 'Kota & Hyderabad Apex',
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.test_exams
  ADD COLUMN IF NOT EXISTS is_live_ranking BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS activation_timestamp TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- 4. CREATE PUBLIC.ANNOUNCEMENTS TABLE & RLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'all',
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_batch_id ON public.announcements(batch_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON public.announcements(target_audience);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view announcements" ON public.announcements;
CREATE POLICY "Public can view announcements"
    ON public.announcements FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins and teachers manage announcements" ON public.announcements;
CREATE POLICY "Admins and teachers manage announcements"
    ON public.announcements FOR ALL
    TO authenticated
    USING (
      COALESCE(
        ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text),
        (SELECT role FROM public.profiles WHERE id = (select auth.uid()))
      ) IN ('admin', 'superadmin', 'teacher', 'instructor')
    )
    WITH CHECK (
      COALESCE(
        ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text),
        (SELECT role FROM public.profiles WHERE id = (select auth.uid()))
      ) IN ('admin', 'superadmin', 'teacher', 'instructor')
    );

-- ============================================================================
-- 5. CREATE PUBLIC.STUDENT_BOOKMARKS TABLE & RLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_student_bookmark UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_student_bookmarks_user_id ON public.student_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_student_bookmarks_item ON public.student_bookmarks(item_type, item_id);

ALTER TABLE public.student_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.student_bookmarks;
CREATE POLICY "Users manage own bookmarks"
    ON public.student_bookmarks FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- 6. CREATE PUBLIC.INSTRUCTORS VIEW
-- ============================================================================
CREATE OR REPLACE VIEW public.instructors
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.role,
    p.rank_badge,
    p.preferred_subject,
    p.target_focus,
    p.academic_strengths,
    p.study_mentor,
    p.created_at
FROM public.profiles p
WHERE p.role IN ('teacher', 'instructor', 'admin', 'superadmin');

-- ============================================================================
-- 7. PRODUCTION DYNAMIC SEED DATA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1 SEED FLAGSHIP COURSES (public.courses)
-- ----------------------------------------------------------------------------
INSERT INTO public.courses (
    id, title, description, price, original_price, level, subject, badge,
    instructor_name, instructor_role, rating, students_count, duration, lessons_count,
    checklist, book_kit, cover_url, thumbnail_url, is_featured, is_active, status
) VALUES 
(
    'c0000000-0000-0000-0000-000000000001',
    'All-India JEE Main & Advanced 2026 Comprehensive Flagship Batch',
    'Complete two-year master coaching program designed by senior Kota faculty. Covers full Class 11 and 12 PCM syllabus with live 2-way interactive lectures, printed 6-volume master theory kit, weekly NTA CBT mock drills, and 24/7 AI step-by-step doubt resolution.',
    4999.00,
    14999.00,
    'advanced',
    'Physics',
    'FLAGSHIP 2-YEAR MASTER PROGRAM',
    'Dr. Nitin Verma & Top Kota Apex Faculty',
    'Ex-HOD Kota, 18+ Yrs Exp (AIR 1 Mentor)',
    4.98,
    12400,
    '12 Months (Daily Live + 1000+ Hrs)',
    148,
    '[
        "Complete Physics, Chemistry & Math PCM Full-Year Master Syllabus",
        "Daily 3-Hour Interactive Live Lectures with In-Class Doubt Clearance",
        "6-Volume Hardcopy Printed Master Textbook & Exercise Kit Delivered to Home",
        "24 Full-Length NTA CBT All-India Mock Tests with Live National Percentile",
        "Instant AI 24/7 Step-by-Step Doubt Resolution Engine Access",
        "Dedicated Mentor Assigned for Strategy & Weekly Progress Tracking"
    ]'::jsonb,
    '{"title": "6-Volume Printed Physical Master Theory & Problem Book Kit", "booksCount": 6, "value": 3999}'::jsonb,
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    'published'
),
(
    'c0000000-0000-0000-0000-000000000002',
    'Advanced Mechanics, Waves & Electrodynamics Masterclass',
    'Specialized deep-dive into rotational dynamics, simple harmonic motion, wave optics, electrostatics, and magnetic induction with advanced multi-concept numerical problem labs.',
    1999.00,
    4999.00,
    'advanced',
    'Physics',
    'JEE ADVANCED SPECIAL',
    'Prof. Arvind Sharma',
    'Senior Physics Specialist (Ex-IIT Delhi)',
    4.95,
    6800,
    '4 Months (180+ Hrs)',
    42,
    '[
        "Rotational Dynamics, Gravitation & Simple Harmonic Motion Deep-Dive",
        "Gauss Law, Electrostatics & Electromagnetic Induction Problem Labs",
        "Previous 20 Years JEE Advanced Multi-Concept Question Analysis",
        "Physical Formula Book & Workbook Delivered via Courier"
    ]'::jsonb,
    '{"title": "Advanced Mechanics & Electromagnetism Theory Book", "booksCount": 2, "value": 1299}'::jsonb,
    'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&auto=format&fit=crop&q=80',
    false,
    true,
    'published'
),
(
    'c0000000-0000-0000-0000-000000000003',
    'Organic Mechanisms & Inorganic Speed Mastery Course',
    'Master organic synthesis pathways, named reactions, reagent reaction flowcharts, coordination chemistry retention maps, and NCERT line-by-line zero-error retention.',
    1799.00,
    4499.00,
    'mains',
    'Chemistry',
    'HIGH-SCORING SPRINT',
    'Dr. Meenakshi Sundaram',
    'PhD Chemistry (Gold Medalist, 15+ Yrs Exp)',
    4.92,
    8150,
    '3.5 Months (150+ Hrs)',
    38,
    '[
        "Complete Named Reactions, Reagent Flowcharts & Mechanism Pathways",
        "Coordination Compounds, Metallurgy & Block Chemistry Retention Maps",
        "Zero-Error Practice Quizzes & NCERT Line-by-Line Highlight System",
        "Pocket Reaction Handbook Physical Copy Included"
    ]'::jsonb,
    '{"title": "Complete Organic & Inorganic Handbook + Reaction Maps", "booksCount": 2, "value": 999}'::jsonb,
    'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=80',
    false,
    true,
    'published'
),
(
    'c0000000-0000-0000-0000-000000000004',
    'Calculus, Vectors & Coordinate Geometry Intensive',
    'High-intensity problem-solving program targeting definite integrals, differential equations, vectors, 3D geometry, complex numbers, and probability with speed-enhancing shortcuts.',
    1999.00,
    4999.00,
    'advanced',
    'Mathematics',
    'TOP RANKER ACCELERATOR',
    'R. K. Singhal Sir',
    'Author & Senior Math Faculty (IIT Roorkee Alum)',
    4.96,
    5900,
    '4 Months (160+ Hrs)',
    45,
    '[
        "Definite Integrals, Differential Equations & Area Under Curves Mastery",
        "3D Geometry, Vectors, Complex Numbers & Probability Master Drills",
        "Time-Saving Speed Shortcuts for Speed & 99+ Percentile Accuracy",
        "Full Solutions Exercise Modules Shipped to Home"
    ]'::jsonb,
    '{"title": "Higher Algebra & Calculus Problem Bank (Printed)", "booksCount": 2, "value": 1499}'::jsonb,
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80',
    false,
    true,
    'published'
),
(
    'c0000000-0000-0000-0000-000000000005',
    'NEET Human Physiology, Genetics & Plant Anatomy Comprehensive',
    'Target 360/360 in NEET Biology with complete NCERT line-by-line dissection, 3D anatomical models, genetics pedigree analysis, and weekly assertion-reason speed drills.',
    2199.00,
    5999.00,
    'mains',
    'Biology',
    'NEET 360/360 TARGET',
    'Dr. Radhika Kulkarni',
    'MBBS, AIIMS Delhi Mentor',
    4.97,
    14200,
    '5 Months (200+ Hrs)',
    52,
    '[
        "100% NCERT Line-by-Line Dissection with High-Yield Diagrams",
        "Genetics, Pedigree Analysis, Biotechnology & Ecology Drills",
        "Weekly 100-Question Assertion-Reason Speed Drills",
        "Illustrated NCERT Atlas & Zoology-Botany Flashcards Delivered Free"
    ]'::jsonb,
    '{"title": "NEET 360 Biology Diagrammatic Atlas + Flashcards", "booksCount": 3, "value": 1899}'::jsonb,
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    'published'
),
(
    'c0000000-0000-0000-0000-000000000006',
    'Class 10 NTSE & Board Olympiad Foundation Program',
    'Early competitive accelerator building deep analytical rigor across Class 10 Math, Science, and Mental Ability for NTSE Stage 1/2, PRMO, and Board Top Percentiles.',
    2999.00,
    7999.00,
    'foundation',
    'Mathematics',
    'FOUNDATION MASTER',
    'Senior Foundation Mentors',
    'NTSE Stage 2 & Olympiad Gold Medalist Trainers',
    4.93,
    4500,
    '8 Months (240+ Hrs)',
    64,
    '[
        "Full Class 10 Math, Science & Mental Ability Syllabus Mastery",
        "Early Intro to JEE/NEET Advanced Analytical Problem Solving",
        "Printed Board Question Bank & NTSE Stage 1/2 Mock Papers Shipped",
        "Weekly Doubt Clearing Classes & School Exam Special Review"
    ]'::jsonb,
    '{"title": "Class 10 Board + NTSE Foundation Kit", "booksCount": 3, "value": 1999}'::jsonb,
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=80',
    false,
    true,
    'published'
),
(
    'c0000000-0000-0000-0000-000000000007',
    'Class 9 STEM & Junior Science Olympiad (NSEJS) Accelerator',
    'Foundational scientific inquiry and mathematical Olympiad problem-solving curriculum for ambitious Class 9 students targeting NSEJS and early JEE/NEET preparedness.',
    2499.00,
    6499.00,
    'foundation',
    'Physics',
    'STEM ACCELERATOR',
    'Dr. H.S. Rathore',
    'NSEJS National Mentor',
    4.91,
    3800,
    '6 Months (180+ Hrs)',
    48,
    '[
        "Deep conceptual fundamentals in Physics, Chemistry & Biology",
        "Higher-order thinking questions & Olympiad level problem solving",
        "Printed Science Olympiad Workbook & Practice Sets Delivered",
        "Bi-weekly interactive doubt solving and mentorship sessions"
    ]'::jsonb,
    '{"title": "Class 9 STEM & Olympiad Workbook Set", "booksCount": 2, "value": 1499}'::jsonb,
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
    false,
    true,
    'published'
),
(
    'c0000000-0000-0000-0000-000000000008',
    'NEET Physical & Inorganic Chemistry Score Booster',
    'Rapid-fire numerical chemistry drills, atomic structure, chemical bonding, thermodynamics, and periodic trends designed to maximize speed and eliminate negative marking in NEET UG.',
    1899.00,
    4799.00,
    'mains',
    'Chemistry',
    'NEET 180 SPRINT',
    'Prof. David Miller',
    'Senior NEET Chemistry Specialist',
    4.94,
    7200,
    '4 Months (160+ Hrs)',
    40,
    '[
        "High-Speed Calculation Techniques for Physical Chemistry",
        "Inorganic Exceptions & Memory Maps for 100% Retention",
        "Chapterwise 15-Year NEET PYQ Video Solutions",
        "Printed Chemistry Formula & Summary Booklet Shipped Free"
    ]'::jsonb,
    '{"title": "Physical & Inorganic High-Speed NEET Handbook", "booksCount": 2, "value": 1199}'::jsonb,
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80',
    false,
    true,
    'published'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    level = EXCLUDED.level,
    subject = EXCLUDED.subject,
    badge = EXCLUDED.badge,
    instructor_name = EXCLUDED.instructor_name,
    instructor_role = EXCLUDED.instructor_role,
    rating = EXCLUDED.rating,
    students_count = EXCLUDED.students_count,
    duration = EXCLUDED.duration,
    lessons_count = EXCLUDED.lessons_count,
    checklist = EXCLUDED.checklist,
    book_kit = EXCLUDED.book_kit,
    cover_url = EXCLUDED.cover_url,
    thumbnail_url = EXCLUDED.thumbnail_url,
    is_featured = EXCLUDED.is_featured,
    is_active = EXCLUDED.is_active,
    status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- 7.2 SEED LIVE COHORT BATCHES (public.batches)
-- ----------------------------------------------------------------------------
INSERT INTO public.batches (
    id, title, description, faculty, faculty_role, instructor_name, instructor_role,
    target_year, target_focus, schedule, seats_left, students_enrolled, price, original_price,
    rating, badge, checklist, book_kit, curriculum, cover, thumbnail_url, is_featured, is_active, status
) VALUES 
(
    'ba000000-0000-0000-0000-000000000001',
    'Apex JEE Main & Advanced 2026 Live Master Cohort',
    'Flagship 2-year live interactive cohort with daily classes, live polling, printed master book box delivered to home, and weekly national CBT simulations.',
    'Dr. Nitin Verma, Prof. Arvind Sharma & R. K. Singhal Sir',
    'Kota Apex Core Faculty Team (15+ AIR 1 Mentors)',
    'Dr. Nitin Verma',
    'Ex-HOD Kota, 18+ Yrs Exp (AIR 1 Mentor)',
    'TARGET 2026',
    'JEE',
    'Mon - Sat (5:30 PM - 9:00 PM Live Interactive)',
    12,
    '94% Seats Filled (12 Left)',
    5499.00,
    15999.00,
    4.98,
    'FLAGSHIP 2-YEAR LIVE COHORT',
    '[
        "300+ Live Interactive 2-Way Lectures with In-Class Polling & Mic Access",
        "Full 6-Volume Hardcopy Textbook & DPP Box Delivered by Express Courier",
        "Daily Practice Problem (DPP) Video Solutions Uploaded Daily at 10 PM",
        "Weekly 3-Hour NTA CBT Proctored Mock Tests with National Rank Predictor",
        "1-on-1 Dedicated Faculty Mentorship Calls every 14 Days"
    ]'::jsonb,
    '{"title": "6-Volume Printed Physical Master Theory & Problem Book Kit", "booksCount": 6, "value": 3999}'::jsonb,
    '[
        {
            "chapter": "Module 1: Physics Mechanics & Vectors Mastery",
            "duration": "6 Weeks (48 Live Hours)",
            "lessons": [
                { "title": "Vector Algebra & Calculus Tools for Physics", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Kinematics 1D & 2D with Relative Motion Drills", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Newtons Laws & Friction Advanced Problem Lab", "type": "Problem Lab", "pdfUrl": "/downloads/worksheets.pdf" }
            ]
        },
        {
            "chapter": "Module 2: Physical & Inorganic Chemistry Foundation",
            "duration": "5 Weeks (40 Live Hours)",
            "lessons": [
                { "title": "Atomic Structure & Quantum Numbers Line-by-Line", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Chemical Bonding & Molecular Orbital Theory", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Periodic Properties & Trend Analytics", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" }
            ]
        },
        {
            "chapter": "Module 3: Advanced Coordinate Geometry & Calculus",
            "duration": "7 Weeks (56 Live Hours)",
            "lessons": [
                { "title": "Straight Lines & Circles Multi-Concept Problems", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Conic Sections (Parabola, Ellipse, Hyperbola)", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Functions, Limits & Continuity Speed Tricks", "type": "Problem Lab", "pdfUrl": "/downloads/worksheets.pdf" }
            ]
        }
    ]'::jsonb,
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80',
    true,
    true,
    'published'
),
(
    'ba000000-0000-0000-0000-000000000002',
    'AIIMS & NEET 2026 Super-Score Live Cohort',
    'Elite medical squad with 100% NCERT line-by-line lectures, 3D anatomy animations, printed diagrammatic atlas, and bi-weekly 200-Q NTA simulations.',
    'Dr. Radhika Kulkarni & Bangalore Medical Wing Faculty',
    'MBBS, AIIMS Delhi Gold Medalist Mentors',
    'Dr. Radhika Kulkarni',
    'MBBS, AIIMS Delhi Mentor',
    'TARGET 2026',
    'NEET',
    'Mon - Fri (4:00 PM - 7:30 PM Live)',
    18,
    '88% Seats Filled (18 Left)',
    4999.00,
    13999.00,
    4.96,
    'NEET 700+ ELITE SQUAD',
    '[
        "100% NCERT Line-by-Line Micro-Lectures with 3D Animated Models",
        "Daily Botany, Zoology, Organic & Physics Speed Drills",
        "Printed NCERT Atlas + 3000-Question Assertion-Reason Workbook Shipped Free",
        "Bi-Weekly 200-Question NTA NEET Simulation with Negative Marking Audit"
    ]'::jsonb,
    '{"title": "Complete NEET 360 Biology Diagrammatic Atlas + PCB Question Bank", "booksCount": 4, "value": 2999}'::jsonb,
    '[
        {
            "chapter": "Module 1: Human Physiology & Structural Organisation",
            "duration": "6 Weeks (42 Live Hours)",
            "lessons": [
                { "title": "Breathing, Exchange of Gases & Body Fluids", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Neural Control & Chemical Coordination", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" }
            ]
        },
        {
            "chapter": "Module 2: Genetics, Evolution & Plant Reproduction",
            "duration": "6 Weeks (45 Live Hours)",
            "lessons": [
                { "title": "Mendelian Genetics & Chromosomal Disorders", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Molecular Basis of Inheritance Deep Dive", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" }
            ]
        }
    ]'::jsonb,
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    'published'
),
(
    'ba000000-0000-0000-0000-000000000003',
    'Class 10 Board + NTSE & Olympiad Accelerator Cohort',
    'Class 10 complete math and science acceleration with early Olympiad/NTSE problem solving and printed workbook set shipped free.',
    'Senior Foundation Mentors',
    'NTSE Stage 2 & Olympiad Gold Medalist Trainers',
    'Senior Foundation Mentors',
    'NTSE Stage 2 & Olympiad Trainers',
    'CLASS 10 2026',
    'FOUNDATION',
    'Tue, Thu, Sat (6:00 PM - 8:30 PM)',
    25,
    '75% Seats Filled (25 Left)',
    2999.00,
    7999.00,
    4.93,
    'FOUNDATION MASTER',
    '[
        "Full Class 10 Math, Science & Mental Ability Syllabus Mastery",
        "Early Intro to JEE/NEET Advanced Analytical Problem Solving",
        "Printed Board Question Bank & NTSE Stage 1/2 Mock Papers Shipped",
        "Weekly Doubt Clearing Classes & School Exam Special Review"
    ]'::jsonb,
    '{"title": "Class 10 Board + NTSE Foundation Kit", "booksCount": 3, "value": 1999}'::jsonb,
    '[
        {
            "chapter": "Module 1: Real Numbers, Polynomials & Quadratic Equations",
            "duration": "4 Weeks (24 Live Hours)",
            "lessons": [
                { "title": "Real Numbers & Polynomial Factorization", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Quadratic Equations & NTSE Level Problems", "type": "Problem Lab", "pdfUrl": "/downloads/worksheets.pdf" }
            ]
        }
    ]'::jsonb,
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=80',
    false,
    true,
    'published'
),
(
    'ba000000-0000-0000-0000-000000000004',
    'JEE 2026 Droppers Fast-Track Rank Booster Cohort',
    'High-intensity 1-year repeaters cohort focusing on high-weightage topics, speed enhancement, multi-concept problems, and daily test analysis.',
    'Kota Super-30 Senior Faculty Panel',
    'Ex-Bansal & Apex Top Rank Makers',
    'Prof. Arvind Sharma',
    'Senior Physics Specialist (Ex-IIT Delhi)',
    'TARGET 2026',
    'JEE',
    'Mon - Sat (8:00 AM - 1:00 PM Live Intensive)',
    8,
    '96% Seats Filled (8 Left)',
    5999.00,
    16999.00,
    4.97,
    'DROPPER RANK BOOSTER',
    '[
        "Rapid high-weightage syllabus completion in 180 days",
        "Daily 100-Question CBT mock drills with instant ranking",
        "Printed Dropper Special 6-Volume Problem Workbook Kit",
        "Weekly personal strategy and revision roadmap audits"
    ]'::jsonb,
    '{"title": "Droppers Complete 6-Volume Rapid Revision Box", "booksCount": 6, "value": 4499}'::jsonb,
    '[
        {
            "chapter": "Module 1: Advanced Mechanics & High-Yield Electrodynamics",
            "duration": "8 Weeks (64 Live Hours)",
            "lessons": [
                { "title": "Multi-Body Dynamics & Work-Energy Optimization", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Electromagnetic Induction & AC Circuits Labs", "type": "Problem Lab", "pdfUrl": "/downloads/worksheets.pdf" }
            ]
        }
    ]'::jsonb,
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    'published'
),
(
    'ba000000-0000-0000-0000-000000000005',
    'NEET 2026 Repeaters High-Yield Intensive Batch',
    'Dedicated repeater cohort focused on NCERT micro-concepts, error rectification, elimination of negative marks, and daily 100-Q timed drills.',
    'Dr. Ananya Ray & TopScore Medical Panel',
    'Senior Medical Faculty (12+ Yrs Teaching)',
    'Dr. Radhika Kulkarni',
    'MBBS, AIIMS Delhi Mentor',
    'TARGET 2026',
    'NEET',
    'Mon - Fri (9:00 AM - 1:30 PM Live)',
    14,
    '91% Seats Filled (14 Left)',
    4799.00,
    12999.00,
    4.95,
    'NEET REPEATER POWER',
    '[
        "360 Biology Score guarantee protocol with daily diagram drills",
        "Organic chemistry reaction flowchart memorization labs",
        "Printed NEET 360 Diagrammatic Atlas and Flashcard Box",
        "Bi-weekly full 720-mark proctored CBT simulation"
    ]'::jsonb,
    '{"title": "NEET Repeater 360 Study Pack + High-Yield Atlas", "booksCount": 4, "value": 3199}'::jsonb,
    '[
        {
            "chapter": "Module 1: Cellular Biology & Human Physiology Blitz",
            "duration": "6 Weeks (45 Live Hours)",
            "lessons": [
                { "title": "Cell Cycle, Division & Biomolecules Rapid Drill", "type": "Live Lecture", "pdfUrl": "/downloads/worksheets.pdf" },
                { "title": "Circulation, Excretion & Chemical Coordination", "type": "Problem Lab", "pdfUrl": "/downloads/worksheets.pdf" }
            ]
        }
    ]'::jsonb,
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    false,
    true,
    'published'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    faculty = EXCLUDED.faculty,
    faculty_role = EXCLUDED.faculty_role,
    instructor_name = EXCLUDED.instructor_name,
    instructor_role = EXCLUDED.instructor_role,
    target_year = EXCLUDED.target_year,
    target_focus = EXCLUDED.target_focus,
    schedule = EXCLUDED.schedule,
    seats_left = EXCLUDED.seats_left,
    students_enrolled = EXCLUDED.students_enrolled,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    rating = EXCLUDED.rating,
    badge = EXCLUDED.badge,
    checklist = EXCLUDED.checklist,
    book_kit = EXCLUDED.book_kit,
    curriculum = EXCLUDED.curriculum,
    cover = EXCLUDED.cover,
    thumbnail_url = EXCLUDED.thumbnail_url,
    is_featured = EXCLUDED.is_featured,
    is_active = EXCLUDED.is_active,
    status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- 7.3 SEED PHYSICAL BOOKS INVENTORY (public.books)
-- ----------------------------------------------------------------------------
INSERT INTO public.books (
    id, title, subtitle, author, target_exam_tag, subject, category,
    price, original_price, rating, reviews_count, stock, stock_quantity, format,
    cover_url, cover_image_url, thumbnail_url, sample_pdf_url, is_active
) VALUES 
(
    'b1000000-0000-0000-0000-000000000001',
    'IIT JEE Physics Mastery: Mechanics & Waves',
    'Comprehensive Theory & 1500+ Solved Numerical Problems',
    'Dr. H.C. Verma & Asentra Faculty',
    'JEE ADVANCED',
    'Physics',
    'JEE Advanced',
    699.00,
    999.00,
    4.9,
    340,
    45,
    45,
    'Hardcopy + PDF',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=80',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    true
),
(
    'b1000000-0000-0000-0000-000000000002',
    'Organic Chemistry 20-Year Chapterwise PYQs',
    'Short Tricks, Reaction Mechanisms & 10-Year Chapterwise PYQs',
    'Asentra JEE Editorial Team',
    'JEE MAINS',
    'Chemistry',
    'JEE Mains',
    499.00,
    750.00,
    4.8,
    210,
    80,
    80,
    'Hardcopy + PDF',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    true
),
(
    'b1000000-0000-0000-0000-000000000003',
    'NEET Medical Biology 10,000 MCQ Bank',
    'Complete NCERT Line-by-Line Assertion-Reasoning & Diagrams',
    'Dr. Ananya Ray',
    'NEET',
    'Biology',
    'NEET UG',
    599.00,
    899.00,
    4.9,
    520,
    30,
    30,
    'Hardcopy + PDF',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    true
),
(
    'b1000000-0000-0000-0000-000000000004',
    'Vector Calculus & 3D Geometry Handbook',
    'Comprehensive Workbook for Class 11 & 12 Foundation Aspirants',
    'Prof. R.D. Sharma & Team',
    'JEE ADVANCED',
    'Mathematics',
    'JEE Advanced',
    399.00,
    599.00,
    4.7,
    180,
    60,
    60,
    'Instant Digital PDF',
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    true
),
(
    'b1000000-0000-0000-0000-000000000005',
    'JEE Advanced Mechanics Blueprint Vol. 1',
    'Rotational Dynamics, Gravitation & Simple Harmonic Motion Labs',
    'Dr. Sarah Jenkins',
    'JEE ADVANCED',
    'Physics',
    'JEE Advanced',
    699.00,
    999.00,
    4.92,
    290,
    45,
    45,
    'Hardcopy + PDF',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    true
),
(
    'b1000000-0000-0000-0000-000000000006',
    'IIT-JEE Physical & Inorganic Chemistry Master Guide',
    'Coordination Compounds, Electrochemistry & Thermodynamics Maps',
    'Prof. David Miller',
    'JEE MAINS',
    'Chemistry',
    'JEE Mains',
    549.00,
    799.00,
    4.85,
    310,
    60,
    60,
    'Hardcopy + PDF',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    true
),
(
    'b1000000-0000-0000-0000-000000000007',
    'Complete NEET 360 Biology Diagrammatic Atlas',
    'Full Botany & Zoology Micro-Diagrams with Flowcharts',
    'Dr. Radhika Kulkarni',
    'NEET',
    'Biology',
    'NEET UG',
    649.00,
    950.00,
    4.95,
    640,
    55,
    55,
    'Hardcopy + PDF',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    true
),
(
    'b1000000-0000-0000-0000-000000000008',
    'Class 10 Board + NTSE Foundation Kit',
    'Complete Math, Science, and Mental Ability Workbooks',
    'ASENTRA Academic Board',
    'FOUNDATION',
    'Mathematics',
    'Foundation',
    449.00,
    599.00,
    4.78,
    150,
    70,
    70,
    'Hardcopy + PDF',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=80',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    true
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    author = EXCLUDED.author,
    target_exam_tag = EXCLUDED.target_exam_tag,
    subject = EXCLUDED.subject,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    rating = EXCLUDED.rating,
    reviews_count = EXCLUDED.reviews_count,
    stock = EXCLUDED.stock,
    stock_quantity = EXCLUDED.stock_quantity,
    format = EXCLUDED.format,
    cover_url = EXCLUDED.cover_url,
    cover_image_url = EXCLUDED.cover_image_url,
    thumbnail_url = EXCLUDED.thumbnail_url,
    sample_pdf_url = EXCLUDED.sample_pdf_url,
    is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 7.4 SEED CBT TEST PACKAGES (public.test_packages)
-- ----------------------------------------------------------------------------
INSERT INTO public.test_packages (
    id, title, target_exam_tag, campus_branch, is_featured, is_active,
    total_tests_count, description, thumbnail_url, test_distribution, price_ledger
) VALUES 
(
    'a1000000-0000-0000-0000-000000000001',
    'All-India NTA JEE Main Grand Mock Test Series 2026',
    'JEE Main',
    'Kota & Hyderabad Apex',
    true,
    true,
    24,
    'Flagship national simulation engine featuring full-length 3-hour NTA CBT replica papers, real-time live percentile prediction, national leaderboard ranking, and deep AI diagnostic reports.',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    '{"chapter_drills": 12, "full_mocks": 8, "live_papers": 4}'::jsonb,
    '{"status": "premium", "price": 799, "original_price": 2499}'::jsonb
),
(
    'a1000000-0000-0000-0000-000000000002',
    'Physics Mechanics & Electrodynamics Speed Sprint',
    'JEE Advanced',
    'National CBT Drill',
    false,
    true,
    15,
    'High-velocity problem-solving drills covering Rotational Motion, Gravitation, Gauss Law, and Electromagnetic Induction with instant step-by-step video solutions.',
    'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=80',
    '{"chapter_drills": 10, "full_mocks": 3, "live_papers": 2}'::jsonb,
    '{"status": "free", "price": 0, "original_price": 999}'::jsonb
),
(
    'a1000000-0000-0000-0000-000000000003',
    'NEET Biology & Human Physiology Rapid-Fire Series',
    'NEET',
    'Bangalore Medical Wing',
    false,
    true,
    20,
    'NCERT line-by-line diagrammatic assertion-reasoning drills, pedigree analysis, and full-length Botany & Zoology speed tests matching official NTA NEET blueprint.',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
    '{"chapter_drills": 14, "full_mocks": 4, "live_papers": 2}'::jsonb,
    '{"status": "premium", "price": 499, "original_price": 1499}'::jsonb
),
(
    'a1000000-0000-0000-0000-000000000004',
    'Calculus & Coordinate Geometry Problem-Solving Intensive',
    'JEE Advanced',
    'Delhi Super-30',
    false,
    true,
    12,
    'Curated multi-concept problems in Definite Integrals, Differential Equations, Vectors, 3D Geometry, and Probability with detailed step-by-step marking rubrics.',
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
    '{"chapter_drills": 8, "full_mocks": 2, "live_papers": 2}'::jsonb,
    '{"status": "premium", "price": 399, "original_price": 1199}'::jsonb
),
(
    'a1000000-0000-0000-0000-000000000005',
    'Organic & Inorganic Chemistry Memory & Speed Marathon',
    'JEE Main',
    'Hyderabad Main',
    false,
    true,
    16,
    'Named reaction mechanisms, reagent mapping, coordination compounds, and periodic trend drills with zero-error practice.',
    'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=800&q=80',
    '{"chapter_drills": 10, "full_mocks": 4, "live_papers": 2}'::jsonb,
    '{"status": "free", "price": 0, "original_price": 799}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    target_exam_tag = EXCLUDED.target_exam_tag,
    campus_branch = EXCLUDED.campus_branch,
    is_featured = EXCLUDED.is_featured,
    is_active = EXCLUDED.is_active,
    total_tests_count = EXCLUDED.total_tests_count,
    description = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    test_distribution = EXCLUDED.test_distribution,
    price_ledger = EXCLUDED.price_ledger;

-- ----------------------------------------------------------------------------
-- 7.5 SEED CBT TEST EXAMS (public.test_exams)
-- ----------------------------------------------------------------------------
INSERT INTO public.test_exams (
    id, package_id, title, duration_minutes, total_questions,
    marks_scheme, is_live_ranking, activation_timestamp
) VALUES 
(
    'e1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'NTA JEE Mains All India Grand Mock Test 01 (Live Ranking)',
    180,
    75,
    '{"positive_marks": 4, "negative_marks": -1}'::jsonb,
    true,
    now()
),
(
    'e1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'NTA JEE Mains All India Grand Mock Test 02 (Proctored Simulation)',
    180,
    75,
    '{"positive_marks": 4, "negative_marks": -1}'::jsonb,
    true,
    now()
),
(
    'e1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000001',
    'PCM High-Yield Comprehensive Mock Drill 01',
    180,
    75,
    '{"positive_marks": 4, "negative_marks": -1}'::jsonb,
    false,
    now()
),
(
    'e1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000002',
    'JEE Advanced Mechanics & Kinematics Drill 01',
    60,
    20,
    '{"positive_marks": 4, "negative_marks": -1}'::jsonb,
    false,
    now()
),
(
    'e1000000-0000-0000-0000-000000000005',
    'a1000000-0000-0000-0000-000000000003',
    'NEET 2026 Biology Rapid-Fire Sprint 01',
    90,
    50,
    '{"positive_marks": 4, "negative_marks": -1}'::jsonb,
    true,
    now()
)
ON CONFLICT (id) DO UPDATE SET
    package_id = EXCLUDED.package_id,
    title = EXCLUDED.title,
    duration_minutes = EXCLUDED.duration_minutes,
    total_questions = EXCLUDED.total_questions,
    marks_scheme = EXCLUDED.marks_scheme,
    is_live_ranking = EXCLUDED.is_live_ranking,
    activation_timestamp = EXCLUDED.activation_timestamp;

-- ----------------------------------------------------------------------------
-- 7.6 SEED QUESTION BANK & EXAM JUNCTIONS (public.question_bank & public.exam_questions)
-- ----------------------------------------------------------------------------
INSERT INTO public.question_bank (
    id, content, format_type, type, subject, topic, sub_topic, difficulty,
    section, options, correct_option_index, correct_answer, explanation,
    marks_positive, marks_negative, tags, is_active
) VALUES 
(
    'q1000000-0000-0000-0000-000000000001',
    'A block of mass $m = 2\\text{ kg}$ is resting on a rough horizontal surface with coefficient of static friction $\\mu_s = 0.4$. A horizontal force $F = 6\\text{ N}$ is applied to the block. What is the magnitude of the frictional force acting on the block? ($g = 10\\text{ m/s}^2$)',
    'single_mcq',
    'mcq',
    'Physics',
    'Mechanics',
    'Laws of Motion',
    'EASY',
    'Section A',
    '["8 N", "6 N", "0 N", "2.4 N"]'::jsonb,
    1,
    '6 N',
    'Maximum static friction $f_{s,\\text{max}} = \\mu_s N = \\mu_s mg = 0.4 \\times 2 \\times 10 = 8\\text{ N}$. Since the applied horizontal force $F = 6\\text{ N} < f_{s,\\text{max}}$, the block remains at rest and the self-adjusting static frictional force equals the applied force, i.e., $f_s = 6\\text{ N}$.',
    4.00,
    -1.00,
    ARRAY['Physics', 'Friction', 'JEE Mains'],
    true
),
(
    'q1000000-0000-0000-0000-000000000002',
    'Which of the following coordination complexes exhibits maximum paramagnetic behavior and maximum spin-only magnetic moment?',
    'single_mcq',
    'mcq',
    'Chemistry',
    'Inorganic Chemistry',
    'Coordination Compounds',
    'MEDIUM',
    'Section A',
    '["[Fe(CN)6]3-", "[Fe(H2O)6]3+", "[Co(NH3)6]3+", "[Ni(CO)4]"]'::jsonb,
    1,
    '[Fe(H2O)6]3+',
    'In $[\\text{Fe}(\\text{H}_2\\text{O})_6]^{3+}$, $\\text{Fe}^{3+}$ is a $d^5$ ion. Water ($\\text{H}_2\\text{O}$) is a weak field ligand, so no pairing occurs, giving 5 unpaired electrons ($n=5$). Spin-only magnetic moment $\\mu = \\sqrt{n(n+2)} = \\sqrt{35} \\approx 5.92\\text{ BM}$, which is the maximum.',
    4.00,
    -1.00,
    ARRAY['Chemistry', 'Coordination', 'JEE Mains'],
    true
),
(
    'q1000000-0000-0000-0000-000000000003',
    'Evaluate the definite integral: $I = \\int_{0}^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}} \\, dx$',
    'single_mcq',
    'mcq',
    'Mathematics',
    'Calculus',
    'Definite Integrals',
    'EASY',
    'Section A',
    '["π", "π/2", "π/4", "0"]'::jsonb,
    2,
    'π/4',
    'Using Kings Property: $\\int_a^b f(x)dx = \\int_a^b f(a+b-x)dx$. Substituting $x \\to \\pi/2 - x$ gives $I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\cos x}}{\\sqrt{\\cos x} + \\sqrt{\\sin x}} dx$. Adding both equations yields $2I = \\int_0^{\\pi/2} 1 \\, dx = \\pi/2 \\implies I = \\pi/4$.',
    4.00,
    -1.00,
    ARRAY['Mathematics', 'Calculus', 'JEE Mains'],
    true
),
(
    'q1000000-0000-0000-0000-000000000004',
    'During cardiac cycle in a healthy human adult, the first heart sound (LUB) is produced primarily by the closure of which valves?',
    'single_mcq',
    'mcq',
    'Biology',
    'Human Physiology',
    'Body Fluids and Circulation',
    'EASY',
    'Section A',
    '["Semilunar valves", "Atrioventricular (Bicuspid and Tricuspid) valves", "Eustachian valve", "Thebesian valve"]'::jsonb,
    1,
    'Atrioventricular (Bicuspid and Tricuspid) valves',
    'The first heart sound (LUB) is associated with the closure of the tricuspid and bicuspid (mitral) valves at the beginning of ventricular systole.',
    4.00,
    -1.00,
    ARRAY['Biology', 'Circulation', 'NEET'],
    true
),
(
    'q1000000-0000-0000-0000-000000000005',
    'A particle moves along the x-axis such that its position is given by $x(t) = 3t^3 - 6t^2 + 4t$. At what time $t > 0$ is the acceleration of the particle zero?',
    'single_mcq',
    'mcq',
    'Physics',
    'Mechanics',
    'Kinematics 1D',
    'EASY',
    'Section A',
    '["t = 1/3 s", "t = 2/3 s", "t = 1 s", "t = 4/3 s"]'::jsonb,
    1,
    't = 2/3 s',
    'Velocity $v(t) = \\frac{dx}{dt} = 9t^2 - 12t + 4$. Acceleration $a(t) = \\frac{dv}{dt} = 18t - 12$. Setting $a(t) = 0 \\implies 18t - 12 = 0 \\implies t = 12/18 = 2/3\\text{ s}$.',
    4.00,
    -1.00,
    ARRAY['Physics', 'Kinematics', 'JEE Mains'],
    true
)
ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content,
    format_type = EXCLUDED.format_type,
    subject = EXCLUDED.subject,
    topic = EXCLUDED.topic,
    sub_topic = EXCLUDED.sub_topic,
    difficulty = EXCLUDED.difficulty,
    section = EXCLUDED.section,
    options = EXCLUDED.options,
    correct_option_index = EXCLUDED.correct_option_index,
    correct_answer = EXCLUDED.correct_answer,
    explanation = EXCLUDED.explanation,
    marks_positive = EXCLUDED.marks_positive,
    marks_negative = EXCLUDED.marks_negative,
    tags = EXCLUDED.tags,
    is_active = EXCLUDED.is_active;

-- Link Question Bank items to Test Exams
INSERT INTO public.exam_questions (exam_id, question_id, order_index, section, marks_positive, marks_negative)
VALUES
    ('e1000000-0000-0000-0000-000000000001', 'q1000000-0000-0000-0000-000000000001', 1, 'Section A', 4.00, -1.00),
    ('e1000000-0000-0000-0000-000000000001', 'q1000000-0000-0000-0000-000000000002', 2, 'Section A', 4.00, -1.00),
    ('e1000000-0000-0000-0000-000000000001', 'q1000000-0000-0000-0000-000000000003', 3, 'Section A', 4.00, -1.00),
    ('e1000000-0000-0000-0000-000000000004', 'q1000000-0000-0000-0000-000000000001', 1, 'Section A', 4.00, -1.00),
    ('e1000000-0000-0000-0000-000000000004', 'q1000000-0000-0000-0000-000000000005', 2, 'Section A', 4.00, -1.00),
    ('e1000000-0000-0000-0000-000000000005', 'q1000000-0000-0000-0000-000000000004', 1, 'Section A', 4.00, -1.00)
ON CONFLICT (exam_id, question_id) DO UPDATE SET
    order_index = EXCLUDED.order_index,
    section = EXCLUDED.section,
    marks_positive = EXCLUDED.marks_positive,
    marks_negative = EXCLUDED.marks_negative;

-- ----------------------------------------------------------------------------
-- 7.7 SEED ANNOUNCEMENTS (public.announcements)
-- ----------------------------------------------------------------------------
INSERT INTO public.announcements (
    id, title, message, target_audience, batch_id, author_id, is_pinned, created_at
) VALUES 
(
    'an000000-0000-0000-0000-000000000001',
    'Welcome to Academic Year 2026-2027 Live Batches',
    'All enrolled students across JEE, NEET, and Foundation cohorts are invited to the National Orientation session this Sunday at 10:00 AM IST. Check your cohort schedules for live classroom links.',
    'all',
    NULL,
    NULL,
    true,
    now()
),
(
    'an000000-0000-0000-0000-000000000002',
    'All-India Grand Mock Test 01 Live Window Opening',
    'The national window for NTA JEE Main Grand Mock Test 01 will be active from Saturday 9:00 AM to Sunday 9:00 PM. Results, national ranks, and AI diagnostic scorecards will be released Sunday at 10:00 PM.',
    'all',
    NULL,
    NULL,
    true,
    now()
),
(
    'an000000-0000-0000-0000-000000000003',
    'Physical Master Book Kits & Courier Dispatch Notice',
    'Printed 6-Volume master textbook boxes and daily practice workbooks for Apex JEE and AIIMS NEET 2026 cohorts have been dispatched via Blue Dart Express. Track your delivery status under the My Orders tab.',
    'paid_students',
    NULL,
    NULL,
    false,
    now()
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    target_audience = EXCLUDED.target_audience,
    is_pinned = EXCLUDED.is_pinned;

-- ============================================================================
-- 8. SYNCHRONIZE TEST EXAMS EMBEDDED JSON (BACKWARD COMPATIBILITY)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'sync_test_exams_questions_from_bank'
    ) THEN
        PERFORM public.sync_test_exams_questions_from_bank();
    END IF;
END $$;

-- ============================================================================
-- 9. PERMISSIONS & SCHEMA GRANTS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
