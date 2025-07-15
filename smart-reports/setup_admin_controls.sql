-- SmartED Admin Controls Setup Script
-- Run these commands in your Supabase SQL editor

-- 1. First, check if the status column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'student_reports' 
AND column_name IN ('status', 'completed_at', 'completed_by');

-- 2. If status column doesn't exist, add it:
ALTER TABLE student_reports 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed'));

ALTER TABLE student_reports 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

ALTER TABLE student_reports 
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES profiles(id);

-- 3. Update existing reports to have proper status
-- Reports with grades = completed, reports without grades = draft
UPDATE student_reports 
SET status = 'completed', completed_at = updated_at
WHERE id IN (
    SELECT DISTINCT report_id 
    FROM student_grades 
    WHERE report_id IS NOT NULL
) AND status IS NULL;

UPDATE student_reports 
SET status = 'draft'
WHERE status IS NULL;

-- 4. Make sure you have admin user
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- 5. Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  details JSONB DEFAULT '{}',
  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for audit_logs
DROP POLICY IF EXISTS "Audit logs viewable by admins only" ON audit_logs;
CREATE POLICY "Audit logs viewable by admins only" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 8. Check your setup
SELECT 
  'User Setup' as check_type,
  email,
  role,
  CASE WHEN role = 'admin' THEN '✅ Admin' ELSE '❌ Not Admin' END as status
FROM profiles 
WHERE email = 'your-email@example.com';

SELECT 
  'Reports Setup' as check_type,
  status,
  COUNT(*) as count
FROM student_reports 
GROUP BY status;

SELECT 
  'Grades Setup' as check_type,
  COUNT(DISTINCT sr.id) as reports_with_grades
FROM student_reports sr
JOIN student_grades sg ON sr.id = sg.report_id;

-- 9. Create sample draft and completed reports for testing (optional)
-- This will help you see the difference between draft and completed states

-- Create a sample draft report
INSERT INTO student_reports (
  student_id, 
  term, 
  academic_year, 
  class_year, 
  status,
  created_at,
  updated_at
) 
SELECT 
  id as student_id,
  'Term 1' as term,
  '2024' as academic_year,
  'Form 1 Loyalty' as class_year,
  'draft' as status,
  NOW() as created_at,
  NOW() as updated_at
FROM profiles 
WHERE role = 'student' 
LIMIT 1;

-- Get the ID of the draft report we just created
-- You'll need this to add grades to it 