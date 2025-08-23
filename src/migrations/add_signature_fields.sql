-- Migration: Add Class Teacher and House Master/Mistress signature fields
-- Date: 2024-01-XX
-- Description: Adds class_teacher_signature and house_master_signature columns to student_reports table

-- Add the new signature columns to student_reports table
ALTER TABLE public.student_reports 
ADD COLUMN class_teacher_signature text,
ADD COLUMN house_master_signature text;

-- Add comments to document the new columns
COMMENT ON COLUMN public.student_reports.class_teacher_signature IS 'Signature of the class teacher for the report';
COMMENT ON COLUMN public.student_reports.house_master_signature IS 'Signature of the house master/mistress for the report';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_reports' 
AND table_schema = 'public'
AND column_name IN ('class_teacher_signature', 'house_master_signature');
