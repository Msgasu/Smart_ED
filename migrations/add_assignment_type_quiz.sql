-- UI uses "Quiz"; original constraint only allowed Project, Classwork, Homework, Exam.

ALTER TABLE assignments
  DROP CONSTRAINT IF EXISTS assignments_type_check;

ALTER TABLE assignments
  ADD CONSTRAINT assignments_type_check
  CHECK (type IN ('Project', 'Classwork', 'Homework', 'Exam', 'Quiz'));

COMMENT ON COLUMN assignments.type IS 'Assignment category: Homework, Quiz, Exam, Project, Classwork';
