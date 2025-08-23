-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.assignment_files (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assignment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_assignment_id uuid,
  filename text NOT NULL,
  path text NOT NULL,
  file_type text,
  file_size integer,
  url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT assignment_files_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_files_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id),
  CONSTRAINT assignment_files_student_assignment_id_fkey FOREIGN KEY (student_assignment_id) REFERENCES public.student_assignments(id),
  CONSTRAINT assignment_files_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid NOT NULL,
  title character varying NOT NULL,
  type character varying CHECK (type::text = ANY (ARRAY['Project'::character varying::text, 'Classwork'::character varying::text, 'Homework'::character varying::text, 'Exam'::character varying::text])),
  max_score integer NOT NULL,
  due_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.course_syllabi (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid NOT NULL,
  faculty_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  term character varying NOT NULL,
  academic_year character varying NOT NULL,
  filename text NOT NULL,
  path text NOT NULL,
  file_type text,
  file_size integer,
  url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT course_syllabi_pkey PRIMARY KEY (id)
);
CREATE TABLE public.course_todos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid NOT NULL,
  faculty_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  week_number integer NOT NULL,
  start_date date,
  end_date date,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'completed'::character varying::text, 'archived'::character varying::text])),
  priority character varying DEFAULT 'medium'::character varying CHECK (priority::text = ANY (ARRAY['low'::character varying::text, 'medium'::character varying::text, 'high'::character varying::text])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT course_todos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT courses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.faculty (
  profile_id uuid NOT NULL,
  department text,
  position text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT faculty_pkey PRIMARY KEY (profile_id),
  CONSTRAINT faculty_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.faculty_courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  faculty_id uuid NOT NULL,
  course_id uuid NOT NULL,
  assignment_date timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'inactive'::character varying::text])),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT faculty_courses_pkey PRIMARY KEY (id),
  CONSTRAINT faculty_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT faculty_courses_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.guardian_students (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  guardian_id uuid NOT NULL,
  student_id uuid NOT NULL,
  relation_type text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT guardian_students_pkey PRIMARY KEY (id),
  CONSTRAINT guardian_students_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES public.guardians(profile_id),
  CONSTRAINT guardian_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(profile_id)
);
CREATE TABLE public.guardians (
  profile_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT guardians_pkey PRIMARY KEY (profile_id),
  CONSTRAINT guardians_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sender_id uuid,
  recipient_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['student'::text, 'guardian'::text, 'faculty'::text, 'admin'::text])),
  phone_number text,
  date_of_birth date,
  address text,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  last_login timestamp with time zone,
  unread_notifications integer DEFAULT 0,
  unique_code text UNIQUE,
  program text CHECK (program = ANY (ARRAY['science'::text, 'business'::text, 'general-arts'::text])),
  sex text CHECK (sex = ANY (ARRAY['male'::text, 'female'::text])),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.student_assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assignment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  score integer,
  submitted_at timestamp with time zone,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'submitted'::character varying::text, 'graded'::character varying::text])),
  description text,
  comment text,
  feedback text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT student_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT student_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id),
  CONSTRAINT student_assignments_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id)
);
CREATE TABLE public.student_courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  enrollment_date timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status character varying DEFAULT 'enrolled'::character varying CHECK (status::text = ANY (ARRAY['enrolled'::character varying::text, 'completed'::character varying::text, 'dropped'::character varying::text])),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT student_courses_pkey PRIMARY KEY (id),
  CONSTRAINT student_courses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id),
  CONSTRAINT student_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.student_grades (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  report_id uuid,
  subject_id uuid,
  class_score numeric,
  exam_score numeric,
  total_score numeric,
  position text,
  grade character,
  remark text,
  teacher_signature text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT student_grades_pkey PRIMARY KEY (id),
  CONSTRAINT student_grades_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.student_reports(id),
  CONSTRAINT student_grades_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.courses(id)
);
CREATE TABLE public.student_reports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  term character varying NOT NULL CHECK (term::text = ANY (ARRAY['Term 1'::character varying::text, 'Term 2'::character varying::text, 'Term 3'::character varying::text])),
  academic_year character varying NOT NULL,
  class_year text,
  total_score numeric,
  overall_grade character,
  conduct text,
  next_class text,
  reopening_date date,
  teacher_remarks text,
  principal_signature text,
  class_teacher_signature text,
  house_master_signature text,
  attendance text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  status character varying DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying::text, 'completed'::character varying::text])),
  completed_at timestamp without time zone,
  completed_by uuid,
  CONSTRAINT student_reports_pkey PRIMARY KEY (id),
  CONSTRAINT student_reports_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.profiles(id),
  CONSTRAINT student_reports_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(profile_id)
);
CREATE TABLE public.students (
  profile_id uuid NOT NULL,
  student_id text NOT NULL UNIQUE,
  class_year text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  program text CHECK (program = ANY (ARRAY['science'::text, 'business'::text, 'general-arts'::text])),
  sex text CHECK (sex = ANY (ARRAY['male'::text, 'female'::text])),
  unique_code text,
  CONSTRAINT students_pkey PRIMARY KEY (profile_id),
  CONSTRAINT students_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);