-- Drop existing tables if they exist
DROP TABLE IF EXISTS guardian_students CASCADE;
DROP TABLE IF EXISTS guardians CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS faculty_courses CASCADE;
DROP TABLE IF EXISTS student_courses CASCADE;
DROP TABLE IF EXISTS student_assignments CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS student_grades CASCADE;
DROP TABLE IF EXISTS student_reports CASCADE;

-- Create the profiles table (base user information)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'guardian', 'faculty', 'admin')),
    phone_number TEXT,
    date_of_birth DATE,
    address TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    
    -- Metadata fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create role-specific tables
CREATE TABLE students (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    student_id TEXT UNIQUE NOT NULL,
    class_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE faculty (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    department TEXT,
    position TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guardians (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create guardian-student relationship table
CREATE TABLE guardian_students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guardian_id UUID REFERENCES guardians(profile_id) NOT NULL,
    student_id UUID REFERENCES students(profile_id) NOT NULL,
    relation_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guardian_id, student_id)
);

-- Create the courses table
CREATE TABLE courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Student-Course assignments (junction table)
CREATE TABLE student_courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) NOT NULL,
    course_id UUID REFERENCES courses(id) NOT NULL,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(student_id, course_id)
);

-- Faculty-Course assignments (junction table)
CREATE TABLE faculty_courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    faculty_id UUID REFERENCES profiles(id) NOT NULL,
    course_id UUID REFERENCES courses(id) NOT NULL,
    assignment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(faculty_id, course_id)
);

-- Assignments table
CREATE TABLE assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('Project', 'Classwork', 'Homework', 'Exam')),
    max_score INTEGER NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Create or update student_assignments table
CREATE TABLE IF NOT EXISTS student_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID REFERENCES assignments(id) NOT NULL,
    student_id UUID REFERENCES profiles(id) NOT NULL,
    score INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
    description TEXT,
    comment TEXT,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- Create assignment_files table for file uploads
CREATE TABLE IF NOT EXISTS assignment_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id),
    student_assignment_id UUID REFERENCES student_assignments(id),
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id, filename)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignment_files_assignment_student 
    ON assignment_files(assignment_id, student_id);
    
CREATE INDEX IF NOT EXISTS idx_student_assignments_assignment 
    ON student_assignments(assignment_id);
    
CREATE INDEX IF NOT EXISTS idx_student_assignments_student 
    ON student_assignments(student_id);

-- Create function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger on student_assignments
DROP TRIGGER IF EXISTS set_updated_at_student_assignments ON student_assignments;
CREATE TRIGGER set_updated_at_student_assignments
BEFORE UPDATE ON student_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create trigger on assignment_files
DROP TRIGGER IF EXISTS set_updated_at_assignment_files ON assignment_files;
CREATE TRIGGER set_updated_at_assignment_files
BEFORE UPDATE ON assignment_files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Example RLS policies (implement in Supabase dashboard)
-- Allow students to view their own assignments
/*
CREATE POLICY "Students can view their own assignments" 
ON student_assignments 
FOR SELECT 
TO authenticated 
USING (student_id = auth.uid());

-- Allow students to update their own assignments (for submission)
CREATE POLICY "Students can update their own assignments" 
ON student_assignments 
FOR UPDATE 
TO authenticated 
USING (student_id = auth.uid());

-- Allow teachers to view assignments for their courses
CREATE POLICY "Teachers can view assignments for their courses" 
ON student_assignments 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM faculty_courses fc
    JOIN assignments a ON fc.course_id = a.course_id
    WHERE fc.faculty_id = auth.uid() AND a.id = assignment_id
  )
);

-- Allow teachers to update assignments for their courses (for grading)
CREATE POLICY "Teachers can update assignments for their courses" 
ON student_assignments 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM faculty_courses fc
    JOIN assignments a ON fc.course_id = a.course_id
    WHERE fc.faculty_id = auth.uid() AND a.id = assignment_id
  )
);
*/
-- Student Reports Table
CREATE TABLE student_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES students(profile_id) NOT NULL,
    term VARCHAR(20) NOT NULL CHECK (term IN ('Term 1', 'Term 2', 'Term 3')),
    academic_year VARCHAR(9) NOT NULL,
    class_year TEXT,
    total_score DECIMAL(6,2),
    overall_grade CHAR(2),
    conduct TEXT,
    next_class TEXT,
    reopening_date DATE,
    teacher_remarks TEXT,
    principal_signature TEXT,
    attendance TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, term, academic_year)
);

-- Student Grades Table
CREATE TABLE student_grades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID REFERENCES student_reports(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    class_score DECIMAL(5,2),
    exam_score DECIMAL(5,2),
    total_score DECIMAL(5,2),
    position INTEGER,
    grade CHAR(2),
    remark TEXT,
    teacher_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on student_reports and student_grades
ALTER TABLE student_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;

-- Allow students to view only their own reports
-- This improved policy accommodates different ways of referencing student_id
CREATE OR REPLACE POLICY "Students can view their own reports"
ON student_reports
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM students 
    SELECT 1 FROM students
    WHERE profile_id = auth.uid() AND profile_id = student_id
  )
);

-- Allow students to view only their own grades
CREATE POLICY "Students can view their own grades"
ON student_grades
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM student_reports sr
    WHERE sr.id = report_id
    AND sr.student_id = auth.uid()
  )
);

-- Allow teachers to view reports for students in their courses
CREATE POLICY "Teachers can view reports for their courses' students"
ON student_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM faculty_courses fc
    JOIN student_courses sc ON fc.course_id = sc.course_id
    WHERE fc.faculty_id = auth.uid()
    AND sc.student_id = student_id
  ) 
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Allow teachers to view and update grades for courses they teach
CREATE POLICY "Teachers can view grades for courses they teach"
ON student_grades
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM faculty_courses fc
    WHERE fc.faculty_id = auth.uid()
    AND fc.course_id = subject_id
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Teachers can update grades for courses they teach"
ON student_grades
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM faculty_courses fc
    WHERE fc.faculty_id = auth.uid()
    AND fc.course_id = subject_id
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Allow teachers to insert grades for courses they teach
CREATE POLICY "Teachers can insert grades for courses they teach"
ON student_grades
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM faculty_courses fc
    WHERE fc.faculty_id = auth.uid()
    AND fc.course_id = subject_id
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Insert sample courses
INSERT INTO courses (code, name, description, created_at, updated_at) VALUES
('BIO101', 'Biology', 'Study of living organisms', NOW(), NOW()),
('CHE101', 'Chemistry', 'Study of matter and its interactions', NOW(), NOW()),
('PHY101', 'Physics', 'Study of matter, energy, and the forces of nature', NOW(), NOW()),
('MAT101', 'Elective Mathematics', 'Advanced mathematical concepts', NOW(), NOW()),
('MAT102', 'Core Mathematics', 'Foundation of mathematical principles', NOW(), NOW()),
('ENG101', 'English', 'English language and literature', NOW(), NOW()),
('SOC101', 'Social Studies', 'Study of society and human relationships', NOW(), NOW()),
('PEH101', 'Physical Education and Health', 'Study of fitness and wellness', NOW(), NOW()),
('ROB101', 'Robotics', 'Introduction to robotics and automation', NOW(), NOW()),
('CSC101', 'Computer Science', 'Introduction to computer science', NOW(), NOW()),
('ICT101', 'ICT', 'Information and Communication Technology', NOW(), NOW()),
('GEO101', 'Geography', 'Study of the Earth and its features', NOW(), NOW()),
('BUS101', 'Business Management', 'Principles of business management', NOW(), NOW()),
('FRE101', 'French', 'Introduction to the French language', NOW(), NOW()),
('LIT101', 'Literature in English', 'Study of English literature', NOW(), NOW()),
('LIT102', 'Literature in Geography', 'Study of geographical literature', NOW(), NOW()),
('GOV101', 'Government', 'Study of government systems', NOW(), NOW()),
('CRS101', 'Christian Religious Studies', 'Study of Christian beliefs', NOW(), NOW()),
('ECO101', 'Economics I', 'Introduction to economics', NOW(), NOW()),
('HIS101', 'History', 'Study of historical events', NOW(), NOW()),
('ACC101', 'Accounting', 'Principles of accounting', NOW(), NOW()),
('ECO102', 'Economics II', 'Advanced economic theories', NOW(), NOW());
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    phone_number,
    status,
    created_at,
    updated_at
) VALUES (
    '26e47c01-6790-4d81-a207-5b308c8c8913',  -- Replace with an actual UUID from auth.users
    'admin@gmail.com',          
    'System',
    'Administrator',
    'admin',
    '1234567890',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Create the notifications table for the Smart ED platform
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for the notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- Allow users to create notifications if they are authenticated
CREATE POLICY "Users can create notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Allow users to update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS notifications_recipient_id_idx ON public.notifications (recipient_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (created_at DESC);

-- Update the public.profiles table to include a notification count
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unread_notifications INTEGER DEFAULT 0;

-- Function to update unread notification count when a new notification is added
CREATE OR REPLACE FUNCTION public.update_unread_notification_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET unread_notifications = (
    SELECT COUNT(*)
    FROM public.notifications
    WHERE recipient_id = NEW.recipient_id AND is_read = FALSE
  )
  WHERE id = NEW.recipient_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update unread notification count on insert or update
DROP TRIGGER IF EXISTS update_notification_count ON public.notifications;
CREATE TRIGGER update_notification_count
AFTER INSERT OR UPDATE OF is_read ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_unread_notification_count();

-- Create or update course_syllabi table for storing syllabus files
CREATE TABLE IF NOT EXISTS course_syllabi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    faculty_id UUID REFERENCES profiles(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    term VARCHAR(50) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, term, academic_year)
);

-- Create or update course_todos table for weekly to-dos
CREATE TABLE IF NOT EXISTS course_todos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    faculty_id UUID REFERENCES profiles(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    week_number INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_course_syllabi_course_id 
    ON course_syllabi(course_id);
    
CREATE INDEX IF NOT EXISTS idx_course_todos_course_id 
    ON course_todos(course_id);
    
CREATE INDEX IF NOT EXISTS idx_course_todos_week_number 
    ON course_todos(week_number);

-- Create triggers to update the updated_at column
DROP TRIGGER IF EXISTS set_updated_at_course_syllabi ON course_syllabi;
CREATE TRIGGER set_updated_at_course_syllabi
BEFORE UPDATE ON course_syllabi
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_course_todos ON course_todos;
CREATE TRIGGER set_updated_at_course_todos
BEFORE UPDATE ON course_todos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();