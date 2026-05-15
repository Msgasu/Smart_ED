-- How students complete / submit work for an assignment (SmartED).
-- online: students submit in portal; teacher grades after submission.
-- paper: in-class / paper work; teacher may grade without online submission.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS submission_mode TEXT DEFAULT 'online';

UPDATE assignments SET submission_mode = 'online' WHERE submission_mode IS NULL;

ALTER TABLE assignments
  ALTER COLUMN submission_mode SET DEFAULT 'online';

ALTER TABLE assignments
  ALTER COLUMN submission_mode SET NOT NULL;

ALTER TABLE assignments
  DROP CONSTRAINT IF EXISTS assignments_submission_mode_check;

ALTER TABLE assignments
  ADD CONSTRAINT assignments_submission_mode_check
  CHECK (submission_mode IN ('online', 'paper'));

COMMENT ON COLUMN assignments.submission_mode IS 'online = portal submission required before grading; paper = teacher can grade without submission';
