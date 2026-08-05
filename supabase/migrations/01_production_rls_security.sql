-- Production Row Level Security (RLS) & Schema Hardening Script
-- CodeBrave Education Platform & ASENTRA Admin

-- Enable RLS on core tables
ALTER TABLE IF EXISTS test_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS test_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;

-- 1. TEST PACKAGES POLICIES
DROP POLICY IF EXISTS "Public read active test packages" ON test_packages;
CREATE POLICY "Public read active test packages" ON test_packages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write test packages" ON test_packages;
CREATE POLICY "Admin write test packages" ON test_packages
  FOR ALL USING (auth.role() = 'authenticated');

-- 2. TEST EXAMS POLICIES
DROP POLICY IF EXISTS "Public read test exams" ON test_exams;
CREATE POLICY "Public read test exams" ON test_exams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write test exams" ON test_exams;
CREATE POLICY "Admin write test exams" ON test_exams
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. TEST QUESTIONS POLICIES
DROP POLICY IF EXISTS "Public read test questions" ON test_questions;
CREATE POLICY "Public read test questions" ON test_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write test questions" ON test_questions;
CREATE POLICY "Admin write test questions" ON test_questions
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. COURSES POLICIES
DROP POLICY IF EXISTS "Public read active courses" ON courses;
CREATE POLICY "Public read active courses" ON courses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write courses" ON courses;
CREATE POLICY "Admin write courses" ON courses
  FOR ALL USING (auth.role() = 'authenticated');

-- 5. INVOICES POLICIES
DROP POLICY IF EXISTS "Student read own invoices" ON invoices;
CREATE POLICY "Student read own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin write invoices" ON invoices;
CREATE POLICY "Admin write invoices" ON invoices
  FOR ALL USING (auth.role() = 'authenticated');
