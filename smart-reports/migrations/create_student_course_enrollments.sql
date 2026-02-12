-- Migration: Create term-versioned student course enrollment tracking
-- Purpose: Store course enrollments per term so historical records are immutable
-- The existing student_courses table remains for "current active enrollments" (global view),
-- while this table tracks the per-term enrollment state for Smart Reports.

-- 1. Create the term-versioned enrollment table
CREATE TABLE IF NOT EXISTS public.student_course_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  term character varying NOT NULL CHECK (term::text = ANY (ARRAY['Term 1'::text, 'Term 2'::text, 'Term 3'::text])),
  academic_year character varying NOT NULL,
  status character varying DEFAULT 'enrolled'::character varying CHECK (status::text = ANY (ARRAY['enrolled'::text, 'dropped'::text, 'completed'::text])),
  enrolled_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  dropped_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT student_course_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT student_course_enrollments_unique UNIQUE (student_id, course_id, term, academic_year),
  CONSTRAINT student_course_enrollments_student_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id),
  CONSTRAINT student_course_enrollments_course_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- 2. Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sce_student_term ON public.student_course_enrollments(student_id, term, academic_year);
CREATE INDEX IF NOT EXISTS idx_sce_course_term ON public.student_course_enrollments(course_id, term, academic_year);
CREATE INDEX IF NOT EXISTS idx_sce_status ON public.student_course_enrollments(status);

-- 3. Seed existing enrollments into the new table from student_courses + student_reports
-- This backfills term-versioned records from existing data so historical reports are preserved.
INSERT INTO public.student_course_enrollments (student_id, course_id, term, academic_year, status, enrolled_at)
SELECT DISTINCT
  sg.student_id_resolved,
  sg.subject_id,
  sr.term,
  sr.academic_year,
  'enrolled',
  COALESCE(sc.enrollment_date, sr.created_at)
FROM (
  SELECT 
    sg_inner.report_id,
    sg_inner.subject_id,
    sr_inner.student_id AS student_id_resolved
  FROM public.student_grades sg_inner
  JOIN public.student_reports sr_inner ON sr_inner.id = sg_inner.report_id
) sg
JOIN public.student_reports sr ON sr.id = sg.report_id
LEFT JOIN public.student_courses sc ON sc.student_id = sg.student_id_resolved AND sc.course_id = sg.subject_id
WHERE sg.subject_id IS NOT NULL
ON CONFLICT (student_id, course_id, term, academic_year) DO NOTHING;

-- 4. Enable RLS (Row Level Security) on the new table
ALTER TABLE public.student_course_enrollments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Admin/Faculty can read all enrollments
CREATE POLICY "Admin and faculty can view all enrollments"
  ON public.student_course_enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'faculty')
    )
  );

-- Students can view their own enrollments
CREATE POLICY "Students can view own enrollments"
  ON public.student_course_enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- Admin can insert/update/delete enrollments
CREATE POLICY "Admin can manage enrollments"
  ON public.student_course_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Faculty can insert enrollments (assigning courses)
CREATE POLICY "Faculty can insert enrollments"
  ON public.student_course_enrollments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'faculty'
    )
  );
