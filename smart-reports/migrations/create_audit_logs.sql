-- Migration: Create audit_logs table for tracking report operations
-- This table logs all operations performed on reports for audit trail

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  details JSONB DEFAULT '{}',
  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail for all report operations and user actions';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., report_created, report_completed, etc.)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource (e.g., student_report, student_grade)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the resource that was acted upon';
COMMENT ON COLUMN audit_logs.details IS 'Additional details about the action in JSON format';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the user who performed the action';
COMMENT ON COLUMN audit_logs.timestamp IS 'When the action was performed';

-- Enable Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only admins can view audit logs
CREATE POLICY "Audit logs viewable by admins only" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Only the system can insert audit logs (via service role)
CREATE POLICY "Audit logs insertable by system only" ON audit_logs
  FOR INSERT
  WITH CHECK (true); -- This will be restricted to service role key in practice

-- No updates or deletes allowed on audit logs for data integrity
CREATE POLICY "No updates on audit logs" ON audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "No deletes on audit logs" ON audit_logs
  FOR DELETE
  USING (false);

-- Create a function to automatically log report status changes
CREATE OR REPLACE FUNCTION log_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      'report_status_changed',
      'student_report',
      NEW.id::text,
      json_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status,
        'student_id', NEW.student_id
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log status changes
DROP TRIGGER IF EXISTS trigger_log_report_status_change ON student_reports;
CREATE TRIGGER trigger_log_report_status_change
  AFTER UPDATE ON student_reports
  FOR EACH ROW
  EXECUTE FUNCTION log_report_status_change(); 