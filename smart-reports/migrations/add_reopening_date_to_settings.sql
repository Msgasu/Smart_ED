-- Migration: Add reopening_date to system_settings
-- Allows admin to set a reopening date that applies to all students for the current term/year

-- Add reopening_date column to system_settings table
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS reopening_date DATE;

-- Add comment
COMMENT ON COLUMN system_settings.reopening_date IS 'Reopening date for the current academic period - applies to all student reports for this term/year';

