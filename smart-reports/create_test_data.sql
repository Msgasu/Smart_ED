-- Create Test Data for Admin Controls Demo
-- Run this in your Supabase SQL editor

-- 1. Make sure you're an admin (replace with your actual email)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- 2. Create sample reports with different statuses
-- First, create a completed report
INSERT INTO student_reports (
  student_id, 
  term, 
  academic_year, 
  class_year, 
  status,
  total_score,
  overall_grade,
  teacher_remarks,
  conduct,
  attendance,
  completed_at,
  created_at,
  updated_at
) 
SELECT 
  p.id as student_id,
  'Term 1' as term,
  '2024' as academic_year,
  'Form 1 Loyalty' as class_year,
  'completed' as status,
  85.5 as total_score,
  'A' as overall_grade,
  'Excellent performance throughout the term.' as teacher_remarks,
  'Excellent' as conduct,
  '95%' as attendance,
  NOW() as completed_at,
  NOW() as created_at,
  NOW() as updated_at
FROM profiles p
JOIN students s ON p.id = s.profile_id
WHERE s.class_year = 'Form 1 Loyalty'
LIMIT 1;

-- Get the ID of the completed report for adding grades
DO $$
DECLARE
    report_id_var UUID;
    student_id_var UUID;
BEGIN
    -- Get the report we just created
    SELECT id, student_id INTO report_id_var, student_id_var
    FROM student_reports 
    WHERE status = 'completed' AND term = 'Term 1' AND academic_year = '2024'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Add sample grades to the completed report
    INSERT INTO student_grades (
        report_id, 
        student_id, 
        course_id, 
        class_score, 
        exam_score, 
        total_score, 
        grade, 
        position, 
        remark
    ) VALUES
    (report_id_var, student_id_var, (SELECT id FROM courses LIMIT 1 OFFSET 0), 40, 45, 85, 'A', 2, 'Excellent'),
    (report_id_var, student_id_var, (SELECT id FROM courses LIMIT 1 OFFSET 1), 38, 42, 80, 'B', 3, 'Good'),
    (report_id_var, student_id_var, (SELECT id FROM courses LIMIT 1 OFFSET 2), 42, 48, 90, 'A', 1, 'Outstanding'),
    (report_id_var, student_id_var, (SELECT id FROM courses LIMIT 1 OFFSET 3), 35, 40, 75, 'B', 4, 'Good');
END $$;

-- 3. Create a draft report with grades (ready to be completed)
INSERT INTO student_reports (
  student_id, 
  term, 
  academic_year, 
  class_year, 
  status,
  total_score,
  overall_grade,
  teacher_remarks,
  conduct,
  attendance,
  created_at,
  updated_at
) 
SELECT 
  p.id as student_id,
  'Term 1' as term,
  '2024' as academic_year,
  'Form 1 Loyalty' as class_year,
  'draft' as status,
  78.0 as total_score,
  'B' as overall_grade,
  'Good performance, needs improvement in mathematics.' as teacher_remarks,
  'Good' as conduct,
  '88%' as attendance,
  NOW() as created_at,
  NOW() as updated_at
FROM profiles p
JOIN students s ON p.id = s.profile_id
WHERE s.class_year = 'Form 1 Loyalty'
AND p.id NOT IN (
  SELECT student_id FROM student_reports 
  WHERE term = 'Term 1' AND academic_year = '2024'
)
LIMIT 1;

-- Add grades to the draft report
DO $$
DECLARE
    report_id_var UUID;
    student_id_var UUID;
BEGIN
    -- Get the draft report we just created
    SELECT id, student_id INTO report_id_var, student_id_var
    FROM student_reports 
    WHERE status = 'draft' AND term = 'Term 1' AND academic_year = '2024'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Add sample grades to the draft report
    INSERT INTO student_grades (
        report_id, 
        student_id, 
        course_id, 
        class_score, 
        exam_score, 
        total_score, 
        grade, 
        position, 
        remark
    ) VALUES
    (report_id_var, student_id_var, (SELECT id FROM courses LIMIT 1 OFFSET 0), 35, 40, 75, 'B', 5, 'Good'),
    (report_id_var, student_id_var, (SELECT id FROM courses LIMIT 1 OFFSET 1), 38, 42, 80, 'B', 3, 'Good'),
    (report_id_var, student_id_var, (SELECT id FROM courses LIMIT 1 OFFSET 2), 30, 35, 65, 'C', 8, 'Fair'),
    (report_id_var, student_id_var, (SELECT id FROM courses LIMIT 1 OFFSET 3), 42, 48, 90, 'A', 1, 'Excellent');
END $$;

-- 4. Create a draft report without grades (cannot be completed)
INSERT INTO student_reports (
  student_id, 
  term, 
  academic_year, 
  class_year, 
  status,
  teacher_remarks,
  conduct,
  attendance,
  created_at,
  updated_at
) 
SELECT 
  p.id as student_id,
  'Term 2' as term,
  '2024' as academic_year,
  'Form 1 Loyalty' as class_year,
  'draft' as status,
  'Report in progress...' as teacher_remarks,
  'Good' as conduct,
  '92%' as attendance,
  NOW() as created_at,
  NOW() as updated_at
FROM profiles p
JOIN students s ON p.id = s.profile_id
WHERE s.class_year = 'Form 1 Loyalty'
LIMIT 1;

-- 5. Verify the test data
SELECT 
  'Test Data Created' as status,
  sr.id,
  sr.status,
  sr.term,
  sr.academic_year,
  p.first_name || ' ' || p.last_name as student_name,
  COUNT(sg.id) as grade_count,
  CASE 
    WHEN sr.status = 'completed' THEN '✅ Completed (should show View/Print/Revert)'
    WHEN sr.status = 'draft' AND COUNT(sg.id) > 0 THEN '⏰ Draft with grades (should show Complete button)'
    WHEN sr.status = 'draft' AND COUNT(sg.id) = 0 THEN '⏰ Draft without grades (no Complete button)'
  END as expected_ui
FROM student_reports sr
JOIN profiles p ON sr.student_id = p.id
LEFT JOIN student_grades sg ON sr.id = sg.report_id
WHERE sr.created_at >= NOW() - INTERVAL '1 hour'
GROUP BY sr.id, sr.status, sr.term, sr.academic_year, p.first_name, p.last_name
ORDER BY sr.created_at DESC; 