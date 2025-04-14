-- Create assignment_files table
CREATE TABLE IF NOT EXISTS assignment_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Create a composite index for faster lookups by assignment and student
  CONSTRAINT assignment_files_unique UNIQUE (assignment_id, student_id, filename),
  
  -- Add triggers for updated_at
  CONSTRAINT trigger_update_timestamp BEFORE UPDATE ON assignment_files
  FOR EACH ROW EXECUTE PROCEDURE update_timestamp()
);

-- Add a comment column to student_assignments table if it doesn't exist
ALTER TABLE student_assignments ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add a feedback column to student_assignments table if it doesn't exist
ALTER TABLE student_assignments ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Add an updated_at column to student_assignments if it doesn't exist
ALTER TABLE student_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create storage policy for assignment submissions
-- Note: This would typically be done in the Supabase dashboard, but included here for reference
-- Create a bucket for assignment submissions
-- INSERT INTO storage.buckets (id, name) VALUES ('assignment-submissions', 'Assignment Submissions');

-- Allow authenticated users to upload their own files
-- CREATE POLICY "Allow users to upload their own files" 
-- ON storage.objects FOR INSERT 
-- TO authenticated
-- WITH CHECK (bucket_id = 'assignment-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read files they've uploaded
-- CREATE POLICY "Allow users to read their own files" 
-- ON storage.objects FOR SELECT 
-- TO authenticated
-- USING (bucket_id = 'assignment-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow faculty to read any files in courses they teach
-- CREATE POLICY "Allow faculty to read any files in their courses" 
-- ON storage.objects FOR SELECT 
-- TO authenticated
-- USING (
--  bucket_id = 'assignment-submissions' AND 
--  EXISTS (
--    SELECT 1 FROM faculty_courses fc
--    JOIN assignments a ON fc.course_id = a.course_id
--    WHERE fc.faculty_id = auth.uid() AND a.id::text = (storage.foldername(name))[2]
--  )
-- ); 