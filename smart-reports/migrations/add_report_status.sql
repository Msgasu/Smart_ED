-- Migration: Add report status to student_reports table
-- This enables tracking of draft vs completed reports

-- Add status column to student_reports table
ALTER TABLE student_reports 
ADD COLUMN status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed'));

-- Add index for better query performance on status
CREATE INDEX IF NOT EXISTS idx_student_reports_status ON student_reports(status);

-- Add index for filtering by student and status
CREATE INDEX IF NOT EXISTS idx_student_reports_student_status ON student_reports(student_id, status);

-- Add completed_at timestamp for tracking when report was finalized
ALTER TABLE student_reports 
ADD COLUMN completed_at TIMESTAMP NULL;

-- Add completed_by field to track who completed the report
ALTER TABLE student_reports 
ADD COLUMN completed_by UUID REFERENCES profiles(id);

-- Update existing reports to 'completed' status if they have grades
-- This migration assumes existing reports with grades are considered completed
UPDATE student_reports 
SET status = 'completed', 
    completed_at = updated_at
WHERE id IN (
    SELECT DISTINCT report_id 
    FROM student_grades 
    WHERE report_id IS NOT NULL
);

-- Add comment to document the status field
COMMENT ON COLUMN student_reports.status IS 'Report status: draft (editable) or completed (locked)';
COMMENT ON COLUMN student_reports.completed_at IS 'Timestamp when report was marked as completed';
COMMENT ON COLUMN student_reports.completed_by IS 'User who marked the report as completed';

-- Create trigger to automatically set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_report_completed_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is being changed to 'completed', set completed_at
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    
    -- If status is being changed from 'completed' to 'draft', clear completed_at
    IF NEW.status = 'draft' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
        NEW.completed_by = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_report_completed_timestamp
    BEFORE UPDATE ON student_reports
    FOR EACH ROW
    EXECUTE FUNCTION set_report_completed_timestamp(); 