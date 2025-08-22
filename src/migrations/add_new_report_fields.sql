-- Add new fields to student_reports table for headmaster remarks, house report, position held, and interest
-- Note: Gender field already exists in the profiles table as 'sex' field

ALTER TABLE public.student_reports 
ADD COLUMN IF NOT EXISTS headmaster_remarks TEXT,
ADD COLUMN IF NOT EXISTS house_report TEXT,
ADD COLUMN IF NOT EXISTS position_held TEXT,
ADD COLUMN IF NOT EXISTS interest TEXT;

-- Add comment to document the migration
COMMENT ON COLUMN public.student_reports.headmaster_remarks IS 'Head master remarks for the student report';
COMMENT ON COLUMN public.student_reports.house_report IS 'House report comments for the student';
COMMENT ON COLUMN public.student_reports.position_held IS 'Position held by the student in school';
COMMENT ON COLUMN public.student_reports.interest IS 'Student interests and hobbies';

-- Note: Gender information is available in the profiles.sex field and students.sex field
-- The reports should fetch gender from these existing fields rather than storing it separately

