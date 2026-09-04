-- ============================================================================
-- ASENTRA EDUCATION PLATFORM - TEST PORTAL & QUESTION PAPER REPOSITORY MIGRATION
-- Migration: 17_test_portal_and_question_paper_documents.sql
-- Requirements: 
--   1. Standalone Exam Decoupling (test_exams.package_id NULLABLE, ON DELETE SET NULL)
--   2. Multi-Format Blueprints & Section Configs (blueprint_type, sections_config JSONB)
--   3. Question Paper PDF Repository Table (public.question_paper_documents) with RLS
--   4. Storage Bucket 'question-papers' Configuration with Public Read & Auth Write RLS
--   5. Dynamic Seed Data for Standalone Exams & Sample Question Papers
-- ============================================================================

-- Ensure required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DECOUPLE TEST_EXAMS FROM TEST_PACKAGES & ENHANCE BLUEPRINT SCHEMAS
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 Make package_id nullable so tests can exist as independent standalone entities
ALTER TABLE public.test_exams 
  ALTER COLUMN package_id DROP NOT NULL;

-- 1.2 Update foreign key constraint on package_id to ON DELETE SET NULL
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.test_exams'::regclass 
          AND contype = 'f' 
          AND confrelid = 'public.test_packages'::regclass
    ) LOOP
        EXECUTE 'ALTER TABLE public.test_exams DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.test_exams
  ADD CONSTRAINT fk_test_exams_package
  FOREIGN KEY (package_id) REFERENCES public.test_packages(id) ON DELETE SET NULL;

-- 1.3 Add sections_config (JSONB) and blueprint_type (TEXT)
ALTER TABLE public.test_exams
  ADD COLUMN IF NOT EXISTS sections_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS blueprint_type TEXT NOT NULL DEFAULT 'custom';

-- 1.4 Ensure check constraint on blueprint_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.test_exams'::regclass 
      AND conname = 'chk_test_exams_blueprint_type'
  ) THEN
    ALTER TABLE public.test_exams 
      ADD CONSTRAINT chk_test_exams_blueprint_type 
      CHECK (blueprint_type IN ('jee_main', 'jee_advanced', 'neet', 'custom'));
  END IF;
END $$;

-- 1.5 Indexes for test_exams performance
CREATE INDEX IF NOT EXISTS idx_test_exams_package_id ON public.test_exams(package_id);
CREATE INDEX IF NOT EXISTS idx_test_exams_blueprint_type ON public.test_exams(blueprint_type);
CREATE INDEX IF NOT EXISTS idx_test_exams_activation ON public.test_exams(activation_timestamp DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CREATE PUBLIC.QUESTION_PAPER_DOCUMENTS TABLE & INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.question_paper_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    subject TEXT NOT NULL DEFAULT 'Full Syllabus',
    target_exam TEXT NOT NULL DEFAULT 'JEE Main',
    status TEXT NOT NULL DEFAULT 'ready_to_compile'
        CHECK (status IN ('uploading', 'ready_to_compile', 'compiled', 'failed')),
    compiled_exam_id UUID REFERENCES public.test_exams(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    parsed_payload JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_qpd_status ON public.question_paper_documents(status);
CREATE INDEX IF NOT EXISTS idx_qpd_target_exam ON public.question_paper_documents(target_exam);
CREATE INDEX IF NOT EXISTS idx_qpd_subject ON public.question_paper_documents(subject);
CREATE INDEX IF NOT EXISTS idx_qpd_compiled_exam_id ON public.question_paper_documents(compiled_exam_id);
CREATE INDEX IF NOT EXISTS idx_qpd_uploaded_by ON public.question_paper_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_qpd_created_at ON public.question_paper_documents(created_at DESC);

-- Attach updated_at trigger if update_updated_at_column function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trg_qpd_updated_at ON public.question_paper_documents;
    CREATE TRIGGER trg_qpd_updated_at
      BEFORE UPDATE ON public.question_paper_documents
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS) & GRANTS ON QUESTION_PAPER_DOCUMENTS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.question_paper_documents ENABLE ROW LEVEL SECURITY;

-- Grants for Data API access
GRANT ALL ON public.question_paper_documents TO authenticated, service_role;
GRANT SELECT ON public.question_paper_documents TO anon;

-- 3.1 Allow read for all authenticated users and anon students
DROP POLICY IF EXISTS "Anyone can view question paper documents" ON public.question_paper_documents;
CREATE POLICY "Anyone can view question paper documents"
    ON public.question_paper_documents FOR SELECT
    TO anon, authenticated
    USING (true);

-- 3.2 Allow insert, update, delete for authenticated staff (admin/teacher/instructor/superadmin)
DROP POLICY IF EXISTS "Staff manage question paper documents" ON public.question_paper_documents;
CREATE POLICY "Staff manage question paper documents"
    ON public.question_paper_documents FOR ALL
    TO authenticated
    USING (
      COALESCE(
        ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text),
        (SELECT role FROM public.profiles WHERE id = (select auth.uid())),
        'admin'
      ) IN ('admin', 'teacher', 'instructor', 'superadmin')
    )
    WITH CHECK (
      COALESCE(
        ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text),
        (SELECT role FROM public.profiles WHERE id = (select auth.uid())),
        'admin'
      ) IN ('admin', 'teacher', 'instructor', 'superadmin')
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CONFIGURE STORAGE BUCKET: QUESTION-PAPERS & STORAGE RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Create or update bucket configuration in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-papers',
  'question-papers',
  true,
  52428800, -- 50 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4.1 SELECT: Public download and viewing of PDF documents and extracted diagrams
DROP POLICY IF EXISTS "Public view question-papers bucket" ON storage.objects;
CREATE POLICY "Public view question-papers bucket"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'question-papers');

-- 4.2 INSERT: Authenticated users can upload PDFs and diagrams
DROP POLICY IF EXISTS "Authenticated upload to question-papers bucket" ON storage.objects;
CREATE POLICY "Authenticated upload to question-papers bucket"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'question-papers');

-- 4.3 UPDATE: Authenticated users can update/upsert files
DROP POLICY IF EXISTS "Authenticated update in question-papers bucket" ON storage.objects;
CREATE POLICY "Authenticated update in question-papers bucket"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'question-papers')
    WITH CHECK (bucket_id = 'question-papers');

-- 4.4 DELETE: Authenticated users can delete files
DROP POLICY IF EXISTS "Authenticated delete in question-papers bucket" ON storage.objects;
CREATE POLICY "Authenticated delete in question-papers bucket"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'question-papers');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DYNAMIC SEED DATA: STANDALONE EXAMS, BLUEPRINTS & QUESTION PAPERS
-- ─────────────────────────────────────────────────────────────────────────────

-- 5.1 Standard JEE Main sections config JSONB definition
DO $$
DECLARE
  v_jee_main_sections JSONB := '[
    {
      "id": "sec_phy_a",
      "subject": "Physics",
      "name": "Section A",
      "section_name": "Section A",
      "question_type": "single_mcq",
      "description": "20 Multiple Choice Questions with single correct option (+4/-1)",
      "total_questions": 20,
      "max_attempts": 20,
      "positive_marks": 4,
      "negative_marks": -1,
      "marks_positive": 4,
      "marks_negative": -1,
      "allow_partial_marking": false
    },
    {
      "id": "sec_phy_b",
      "subject": "Physics",
      "name": "Section B",
      "section_name": "Section B",
      "question_type": "numerical",
      "description": "10 Numerical Value Questions (Attempt any 5, +4/0)",
      "total_questions": 10,
      "max_attempts": 5,
      "positive_marks": 4,
      "negative_marks": 0,
      "marks_positive": 4,
      "marks_negative": 0,
      "allow_partial_marking": false
    },
    {
      "id": "sec_chem_a",
      "subject": "Chemistry",
      "name": "Section A",
      "section_name": "Section A",
      "question_type": "single_mcq",
      "description": "20 Multiple Choice Questions with single correct option (+4/-1)",
      "total_questions": 20,
      "max_attempts": 20,
      "positive_marks": 4,
      "negative_marks": -1,
      "marks_positive": 4,
      "marks_negative": -1,
      "allow_partial_marking": false
    },
    {
      "id": "sec_chem_b",
      "subject": "Chemistry",
      "name": "Section B",
      "section_name": "Section B",
      "question_type": "numerical",
      "description": "10 Numerical Value Questions (Attempt any 5, +4/0)",
      "total_questions": 10,
      "max_attempts": 5,
      "positive_marks": 4,
      "negative_marks": 0,
      "marks_positive": 4,
      "marks_negative": 0,
      "allow_partial_marking": false
    },
    {
      "id": "sec_math_a",
      "subject": "Mathematics",
      "name": "Section A",
      "section_name": "Section A",
      "question_type": "single_mcq",
      "description": "20 Multiple Choice Questions with single correct option (+4/-1)",
      "total_questions": 20,
      "max_attempts": 20,
      "positive_marks": 4,
      "negative_marks": -1,
      "marks_positive": 4,
      "marks_negative": -1,
      "allow_partial_marking": false
    },
    {
      "id": "sec_math_b",
      "subject": "Mathematics",
      "name": "Section B",
      "section_name": "Section B",
      "question_type": "numerical",
      "description": "10 Numerical Value Questions (Attempt any 5, +4/0)",
      "total_questions": 10,
      "max_attempts": 5,
      "positive_marks": 4,
      "negative_marks": 0,
      "marks_positive": 4,
      "marks_negative": 0,
      "allow_partial_marking": false
    }
  ]'::jsonb;

  v_jee_adv_sections JSONB := '[
    {
      "id": "sec_phy_s1",
      "subject": "Physics",
      "name": "Section 1: Single MCQ",
      "section_name": "Section 1",
      "question_type": "single_mcq",
      "description": "6 Single Choice MCQs (+3/-1)",
      "total_questions": 6,
      "max_attempts": 6,
      "positive_marks": 3,
      "negative_marks": -1,
      "marks_positive": 3,
      "marks_negative": -1,
      "allow_partial_marking": false
    },
    {
      "id": "sec_phy_s2",
      "subject": "Physics",
      "name": "Section 2: Multi MSQ",
      "section_name": "Section 2",
      "question_type": "multi_mcq",
      "description": "6 Multiple Choice MSQs with Partial Marking (+4/-2)",
      "total_questions": 6,
      "max_attempts": 6,
      "positive_marks": 4,
      "negative_marks": -2,
      "marks_positive": 4,
      "marks_negative": -2,
      "allow_partial_marking": true
    },
    {
      "id": "sec_phy_s3",
      "subject": "Physics",
      "name": "Section 3: Numerical",
      "section_name": "Section 3",
      "question_type": "numerical",
      "description": "6 Numerical Decimal/Integer Questions (+4/0)",
      "total_questions": 6,
      "max_attempts": 6,
      "positive_marks": 4,
      "negative_marks": 0,
      "marks_positive": 4,
      "marks_negative": 0,
      "allow_partial_marking": false
    },
    {
      "id": "sec_chem_s1",
      "subject": "Chemistry",
      "name": "Section 1: Single MCQ",
      "section_name": "Section 1",
      "question_type": "single_mcq",
      "total_questions": 6,
      "max_attempts": 6,
      "positive_marks": 3,
      "negative_marks": -1,
      "marks_positive": 3,
      "marks_negative": -1,
      "allow_partial_marking": false
    },
    {
      "id": "sec_chem_s2",
      "subject": "Chemistry",
      "name": "Section 2: Multi MSQ",
      "section_name": "Section 2",
      "question_type": "multi_mcq",
      "total_questions": 6,
      "max_attempts": 6,
      "positive_marks": 4,
      "negative_marks": -2,
      "marks_positive": 4,
      "marks_negative": -2,
      "allow_partial_marking": true
    },
    {
      "id": "sec_chem_s3",
      "subject": "Chemistry",
      "name": "Section 3: Numerical",
      "section_name": "Section 3",
      "question_type": "numerical",
      "total_questions": 6,
      "max_attempts": 6,
      "positive_marks": 4,
      "negative_marks": 0,
      "marks_positive": 4,
      "marks_negative": 0,
      "allow_partial_marking": false
    },
    {
      "id": "sec_math_s1",
      "subject": "Mathematics",
      "name": "Section 1: Single MCQ",
      "section_name": "Section 1",
      "question_type": "single_mcq",
      "total_questions": 6,
      "max_attempts": 6,
      "positive_marks": 3,
      "negative_marks": -1,
      "marks_positive": 3,
      "marks_negative": -1,
      "allow_partial_marking": false
    },
    {
      "id": "sec_math_s2",
      "subject": "Mathematics",
      "name": "Section 2: Multi MSQ",
      "section_name": "Section 2",
      "question_type": "multi_mcq",
      "total_questions": 6,
      "max_attempts": 6,
      "positive_marks": 4,
      "negative_marks": -2,
      "marks_positive": 4,
      "marks_negative": -2,
      "allow_partial_marking": true
    },
    {
      "id": "sec_math_s3",
      "subject": "Mathematics",
      "name": "Section 3: Numerical",
      "section_name": "Section 3",
      "question_type": "numerical",
      "total_questions": 6,
      "max_attempts": 6,
      "positive_marks": 4,
      "negative_marks": 0,
      "marks_positive": 4,
      "marks_negative": 0,
      "allow_partial_marking": false
    }
  ]'::jsonb;
BEGIN
  -- Backfill blueprint_type and sections_config on existing legacy exams if empty
  UPDATE public.test_exams
  SET 
    blueprint_type = CASE 
      WHEN id = 'e1000000-0000-0000-0000-000000000004' THEN 'jee_advanced'
      WHEN id = 'e1000000-0000-0000-0000-000000000005' THEN 'neet'
      ELSE 'jee_main'
    END,
    sections_config = CASE 
      WHEN id = 'e1000000-0000-0000-0000-000000000004' THEN v_jee_adv_sections
      ELSE v_jee_main_sections
    END
  WHERE sections_config = '[]'::jsonb OR sections_config IS NULL;

  -- 5.2 Insert Standalone JEE Main and JEE Advanced Tests (package_id IS NULL)
  INSERT INTO public.test_exams (
      id, package_id, title, duration_minutes, total_questions,
      marks_scheme, is_live_ranking, activation_timestamp,
      blueprint_type, sections_config
  ) VALUES 
  (
      'e1000000-0000-0000-0000-000000000010',
      NULL, -- Independent Standalone Mock Exam
      'NTA JEE Main 2026 Standalone Full Mock Exam 01',
      180,
      90,
      '{"positive_marks": 4, "negative_marks": -1}'::jsonb,
      true,
      now(),
      'jee_main',
      v_jee_main_sections
  ),
  (
      'e1000000-0000-0000-0000-000000000011',
      NULL, -- Independent Standalone Mock Exam
      'JEE Advanced 2026 Comprehensive Master Mock Paper 1',
      180,
      54,
      '{"positive_marks": 4, "negative_marks": -2}'::jsonb,
      true,
      now() - interval '1 day',
      'jee_advanced',
      v_jee_adv_sections
  ),
  (
      'e1000000-0000-0000-0000-000000000012',
      NULL, -- Independent Standalone Mock Exam
      'JEE Main 2026 Speed & Accuracy Diagnostic Drill',
      90,
      45,
      '{"positive_marks": 4, "negative_marks": -1}'::jsonb,
      false,
      now() - interval '2 days',
      'jee_main',
      v_jee_main_sections
  )
  ON CONFLICT (id) DO UPDATE SET
      package_id = EXCLUDED.package_id,
      title = EXCLUDED.title,
      duration_minutes = EXCLUDED.duration_minutes,
      total_questions = EXCLUDED.total_questions,
      marks_scheme = EXCLUDED.marks_scheme,
      is_live_ranking = EXCLUDED.is_live_ranking,
      activation_timestamp = EXCLUDED.activation_timestamp,
      blueprint_type = EXCLUDED.blueprint_type,
      sections_config = EXCLUDED.sections_config;

  -- 5.3 Insert Realistic Sample Rows into public.question_paper_documents
  INSERT INTO public.question_paper_documents (
      id, title, file_url, file_name, file_size_bytes, subject,
      target_exam, status, compiled_exam_id, parsed_payload, metadata
  ) VALUES
  (
      'qpd00000-0000-0000-0000-000000000001',
      'NTA JEE Main 2026 Official Model Question Paper (PCM)',
      'https://sample-bucket.supabase.co/storage/v1/object/public/question-papers/sample_papers/jee_main_2026_model_01.pdf',
      'jee_main_2026_model_01.pdf',
      3145728,
      'Full Syllabus',
      'JEE Main',
      'ready_to_compile',
      NULL,
      '{"detected_subjects": ["Physics", "Chemistry", "Mathematics"], "detected_questions_count": 90, "has_answer_key": true, "answer_key_page": 16}'::jsonb,
      '{"source": "NTA Official Practice", "academic_year": "2026", "difficulty": "Moderate"}'::jsonb
  ),
  (
      'qpd00000-0000-0000-0000-000000000002',
      'JEE Main 2026 All-India Grand Mock Test 01 (Compiled)',
      'https://sample-bucket.supabase.co/storage/v1/object/public/question-papers/sample_papers/jee_main_2026_grand_mock_01.pdf',
      'jee_main_2026_grand_mock_01.pdf',
      4259840,
      'Full Syllabus',
      'JEE Main',
      'compiled',
      'e1000000-0000-0000-0000-000000000010',
      '{"detected_subjects": ["Physics", "Chemistry", "Mathematics"], "detected_questions_count": 90, "has_answer_key": true, "answer_key_page": 18, "diagrams_extracted_count": 12}'::jsonb,
      '{"source": "Apex Kota National Series", "academic_year": "2026", "compiled_at": "2026-09-04T10:00:00Z"}'::jsonb
  ),
  (
      'qpd00000-0000-0000-0000-000000000003',
      'JEE Advanced 2026 Physics Intensive Workshop Paper',
      'https://sample-bucket.supabase.co/storage/v1/object/public/question-papers/sample_papers/jee_adv_2026_physics_intensive.pdf',
      'jee_adv_2026_physics_intensive.pdf',
      2097152,
      'Physics',
      'JEE Advanced',
      'ready_to_compile',
      NULL,
      '{"detected_subjects": ["Physics"], "detected_questions_count": 18, "has_answer_key": true, "answer_key_page": 8, "diagrams_extracted_count": 7}'::jsonb,
      '{"source": "Advanced Physics Masterclass", "academic_year": "2026", "difficulty": "Challenging"}'::jsonb
  ),
  (
      'qpd00000-0000-0000-0000-000000000004',
      'NEET 2026 Biology Rapid Sprint Test 01',
      'https://sample-bucket.supabase.co/storage/v1/object/public/question-papers/sample_papers/neet_2026_biology_sprint.pdf',
      'neet_2026_biology_sprint.pdf',
      1845200,
      'Biology',
      'NEET',
      'ready_to_compile',
      NULL,
      '{"detected_subjects": ["Botany", "Zoology"], "detected_questions_count": 100, "has_answer_key": true, "answer_key_page": 12}'::jsonb,
      '{"source": "Apex Medical Academy", "academic_year": "2026", "difficulty": "Standard NTA"}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      file_url = EXCLUDED.file_url,
      file_name = EXCLUDED.file_name,
      file_size_bytes = EXCLUDED.file_size_bytes,
      subject = EXCLUDED.subject,
      target_exam = EXCLUDED.target_exam,
      status = EXCLUDED.status,
      compiled_exam_id = EXCLUDED.compiled_exam_id,
      parsed_payload = EXCLUDED.parsed_payload,
      metadata = EXCLUDED.metadata;

END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SEED REALISTIC QUESTIONS FOR STANDALONE EXAM & QUESTION BANK
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.question_bank (
    id, content, format_type, type, subject, topic, sub_topic, difficulty,
    section, options, correct_option_index, correct_answer, explanation,
    marks_positive, marks_negative, tags, is_active
) VALUES 
(
    'd1000000-0000-0000-0000-000000000011',
    'A particle is projected from the origin with an initial velocity $\vec{v}_0 = 20\hat{i} + 20\hat{j}\text{ m/s}$ from horizontal ground. Assuming $g = 10\text{ m/s}^2$, find the horizontal range $R$ of the projectile.',
    'single_mcq',
    'mcq',
    'Physics',
    'Kinematics',
    'Projectile Motion',
    'EASY',
    'Section A',
    '["40 m", "80 m", "20 m", "60 m"]'::jsonb,
    1,
    '80 m',
    'Horizontal velocity $u_x = 20\text{ m/s}$, vertical velocity $u_y = 20\text{ m/s}$. Time of flight $T = \frac{2u_y}{g} = \frac{2 \times 20}{10} = 4\text{ s}$. Horizontal range $R = u_x \times T = 20 \times 4 = 80\text{ m}$. Therefore, the correct option is 80 m.',
    4.00,
    -1.00,
    ARRAY['Physics', 'Kinematics', 'JEE Main'],
    true
),
(
    'd1000000-0000-0000-0000-000000000012',
    'A force $F = (3x^2 + 2x)\text{ N}$ acts on a body of mass $m = 1\text{ kg}$ displacing it along the $x$-axis from $x = 0\text{ m}$ to $x = 2\text{ m}$. What is the total work done by this force in Joules? (Enter integer value)',
    'numerical',
    'numerical',
    'Physics',
    'Work Power Energy',
    'Work Energy Theorem',
    'MEDIUM',
    'Section B',
    '[]'::jsonb,
    0,
    '12',
    'Work done $W = \int_{0}^{2} (3x^2 + 2x)\,dx = \left[x^3 + x^2\right]_0^2 = (2^3 + 2^2) - 0 = 8 + 4 = 12\text{ J}$.',
    4.00,
    0.00,
    ARRAY['Physics', 'Work Power Energy', 'JEE Main Numerical'],
    true
),
(
    'd1000000-0000-0000-0000-000000000013',
    'According to VSEPR theory, what is the geometric shape and hybridisation of the central Xenon atom in $\text{XeF}_4$?',
    'single_mcq',
    'mcq',
    'Chemistry',
    'Chemical Bonding',
    'VSEPR Theory',
    'EASY',
    'Section A',
    '["Tetrahedral, sp3", "Square planar, sp3d2", "See-saw, sp3d", "Square pyramidal, sp3d2"]'::jsonb,
    1,
    'Square planar, sp3d2',
    '$\text{XeF}_4$ has 8 valence electrons from Xe + 4 from F. 4 bond pairs and 2 lone pairs give steric number 6, corresponding to $sp^3d^2$ hybridisation and square planar geometry.',
    4.00,
    -1.00,
    ARRAY['Chemistry', 'Chemical Bonding', 'JEE Main'],
    true
),
(
    'd1000000-0000-0000-0000-000000000014',
    'Calculate the $\text{pH}$ of a solution formed by mixing $100\text{ mL}$ of $0.1\text{ M } \text{CH}_3\text{COOH}$ with $100\text{ mL}$ of $0.1\text{ M } \text{CH}_3\text{COONa}$. Given $\text{p}K_a(\text{CH}_3\text{COOH}) = 4.76$. Round to nearest integer.',
    'numerical',
    'numerical',
    'Chemistry',
    'Ionic Equilibrium',
    'Buffer Solutions',
    'MEDIUM',
    'Section B',
    '[]'::jsonb,
    0,
    '5',
    'By the Henderson-Hasselbalch equation: $\text{pH} = \text{p}K_a + \log\left(\frac{[\text{Salt}]}{[\text{Acid}]}\right) = 4.76 + \log(1) = 4.76 \approx 5$.',
    4.00,
    0.00,
    ARRAY['Chemistry', 'Ionic Equilibrium', 'JEE Main Numerical'],
    true
),
(
    'd1000000-0000-0000-0000-000000000015',
    'Evaluate the definite integral: $I = \int_{-\pi/2}^{\pi/2} (\sin^3 x + x\cos x + \cos x)\,dx$.',
    'single_mcq',
    'mcq',
    'Mathematics',
    'Calculus',
    'Definite Integrals',
    'MEDIUM',
    'Section A',
    '["0", "1", "2", "4"]'::jsonb,
    2,
    '2',
    '$\sin^3 x$ and $x\cos x$ are odd functions, so their integrals over $[-\pi/2, \pi/2]$ evaluate to 0. $\cos x$ is even, so $I = 2\int_0^{\pi/2}\cos x\,dx = 2[\sin x]_0^{\pi/2} = 2(1 - 0) = 2$.',
    4.00,
    -1.00,
    ARRAY['Mathematics', 'Calculus', 'JEE Main'],
    true
),
(
    'd1000000-0000-0000-0000-000000000016',
    'If the matrix $A = \begin{pmatrix} 2 & 1 \\ 3 & 4 \end{pmatrix}$, find the value of $\det(\text{adj}(A))$. (Enter integer value)',
    'numerical',
    'numerical',
    'Mathematics',
    'Algebra',
    'Matrices & Determinants',
    'MEDIUM',
    'Section B',
    '[]'::jsonb,
    0,
    '5',
    'For an $n \times n$ matrix, $\det(\text{adj}(A)) = (\det A)^{n-1}$. Here $n = 2$, so $\det(\text{adj}(A)) = \det A$. $\det A = (2)(4) - (1)(3) = 8 - 3 = 5$.',
    4.00,
    0.00,
    ARRAY['Mathematics', 'Matrices', 'JEE Main Numerical'],
    true
)
ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content,
    format_type = EXCLUDED.format_type,
    type = EXCLUDED.type,
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

-- 6.1 Link questions to standalone exam e1000000-0000-0000-0000-000000000010
INSERT INTO public.exam_questions (
    exam_id, question_id, order_index, section, marks_positive, marks_negative
) VALUES
('e1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000011', 1, 'Section A', 4.00, -1.00),
('e1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000012', 2, 'Section B', 4.00, 0.00),
('e1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000013', 3, 'Section A', 4.00, -1.00),
('e1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000014', 4, 'Section B', 4.00, 0.00),
('e1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000015', 5, 'Section A', 4.00, -1.00),
('e1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000016', 6, 'Section B', 4.00, 0.00)
ON CONFLICT (exam_id, question_id) DO UPDATE SET
    order_index = EXCLUDED.order_index,
    section = EXCLUDED.section,
    marks_positive = EXCLUDED.marks_positive,
    marks_negative = EXCLUDED.marks_negative;

-- 6.2 Pre-cache questions JSON in test_exams.questions for instantaneous client loads
UPDATE public.test_exams
SET questions = '[
  {
    "id": "d1000000-0000-0000-0000-000000000011",
    "subject": "Physics",
    "section": "Section A",
    "format_type": "single_mcq",
    "content": "A particle is projected from the origin with an initial velocity $\\\\vec{v}_0 = 20\\\\hat{i} + 20\\\\hat{j}\\\\text{ m/s}$ from horizontal ground. Assuming $g = 10\\\\text{ m/s}^2$, find the horizontal range $R$ of the projectile.",
    "options": ["40 m", "80 m", "20 m", "60 m"],
    "correct_option_index": 1,
    "correct_answer": "80 m",
    "marks_positive": 4,
    "marks_negative": -1
  },
  {
    "id": "d1000000-0000-0000-0000-000000000012",
    "subject": "Physics",
    "section": "Section B",
    "format_type": "numerical",
    "content": "A force $F = (3x^2 + 2x)\\\\text{ N}$ acts on a body of mass $m = 1\\\\text{ kg}$ displacing it along the $x$-axis from $x = 0\\\\text{ m}$ to $x = 2\\\\text{ m}$. What is the total work done by this force in Joules? (Enter integer value)",
    "options": [],
    "correct_answer": "12",
    "marks_positive": 4,
    "marks_negative": 0
  },
  {
    "id": "d1000000-0000-0000-0000-000000000013",
    "subject": "Chemistry",
    "section": "Section A",
    "format_type": "single_mcq",
    "content": "According to VSEPR theory, what is the geometric shape and hybridisation of the central Xenon atom in $\\\\text{XeF}_4$?",
    "options": ["Tetrahedral, sp3", "Square planar, sp3d2", "See-saw, sp3d", "Square pyramidal, sp3d2"],
    "correct_option_index": 1,
    "correct_answer": "Square planar, sp3d2",
    "marks_positive": 4,
    "marks_negative": -1
  },
  {
    "id": "d1000000-0000-0000-0000-000000000014",
    "subject": "Chemistry",
    "section": "Section B",
    "format_type": "numerical",
    "content": "Calculate the $\\\\text{pH}$ of a solution formed by mixing $100\\\\text{ mL}$ of $0.1\\\\text{ M } \\\\text{CH}_3\\\\text{COOH}$ with $100\\\\text{ mL}$ of $0.1\\\\text{ M } \\\\text{CH}_3\\\\text{COONa}$. Given $\\\\text{p}K_a(\\\\text{CH}_3\\\\text{COOH}) = 4.76$. Round to nearest integer.",
    "options": [],
    "correct_answer": "5",
    "marks_positive": 4,
    "marks_negative": 0
  },
  {
    "id": "d1000000-0000-0000-0000-000000000015",
    "subject": "Mathematics",
    "section": "Section A",
    "format_type": "single_mcq",
    "content": "Evaluate the definite integral: $I = \\\\int_{-\\\\pi/2}^{\\\\pi/2} (\\\\sin^3 x + x\\\\cos x + \\\\cos x)\\\\,dx$.",
    "options": ["0", "1", "2", "4"],
    "correct_option_index": 2,
    "correct_answer": "2",
    "marks_positive": 4,
    "marks_negative": -1
  },
  {
    "id": "d1000000-0000-0000-0000-000000000016",
    "subject": "Mathematics",
    "section": "Section B",
    "format_type": "numerical",
    "content": "If the matrix $A = \\\\begin{pmatrix} 2 & 1 \\\\\\\\ 3 & 4 \\\\end{pmatrix}$, find the value of $\\\\det(\\\\text{adj}(A))$. (Enter integer value)",
    "options": [],
    "correct_answer": "5",
    "marks_positive": 4,
    "marks_negative": 0
  }
]'::jsonb
WHERE id = 'e1000000-0000-0000-0000-000000000010';
