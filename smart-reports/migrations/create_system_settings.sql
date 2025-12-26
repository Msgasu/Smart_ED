-- Migration: Create system_settings table for academic period management
-- Admin can configure the current term and academic year for report filtering

-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    current_term VARCHAR(20) NOT NULL DEFAULT 'Term 1',
    current_academic_year VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_id ON system_settings(id);

-- Insert default row if table is empty
INSERT INTO system_settings (id, current_term, current_academic_year)
SELECT 1, 'Term 1', 
       CONCAT(EXTRACT(YEAR FROM NOW()), '-', EXTRACT(YEAR FROM NOW()) + 1)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE id = 1);

-- Add comments
COMMENT ON TABLE system_settings IS 'Stores system-wide settings including current academic period configured by admin';
COMMENT ON COLUMN system_settings.current_term IS 'Current academic term (Term 1, Term 2, Term 3) - set by admin';
COMMENT ON COLUMN system_settings.current_academic_year IS 'Current academic year (e.g., 2024-2025) - set by admin';
COMMENT ON COLUMN system_settings.updated_by IS 'Admin user who last updated the settings';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_settings_timestamp
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_timestamp();
