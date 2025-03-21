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

-- Student Assignments (submissions and scores)
CREATE TABLE student_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID REFERENCES assignments(id) NOT NULL,
    student_id UUID REFERENCES profiles(id) NOT NULL,
    score INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- Student Reports Table
CREATE TABLE student_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES students(profile_id) NOT NULL,
    term VARCHAR(20) NOT NULL CHECK (term IN ('Term 1', 'Term 2', 'Term 3')),
    academic_year VARCHAR(9) NOT NULL,
    total_score DECIMAL(6,2),
    overall_grade CHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, term, academic_year)
);

-- Student Grades Table
CREATE TABLE student_grades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID REFERENCES student_reports(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    score DECIMAL(5,2),
    grade CHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
