-- Create guardian_students table to link guardians with their wards
CREATE TABLE IF NOT EXISTS guardian_students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guardian_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL DEFAULT 'Parent', -- Parent, Guardian, etc.
    is_primary BOOLEAN DEFAULT false, -- Primary guardian for communications
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique guardian-student relationships
    UNIQUE(guardian_id, student_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_guardian_students_guardian_id ON guardian_students(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_students_student_id ON guardian_students(student_id);

-- Add RLS policies for guardians
ALTER TABLE guardian_students ENABLE ROW LEVEL SECURITY;

-- Policy: Guardians can only see their own ward relationships
CREATE POLICY "Guardians can view their own ward relationships" ON guardian_students
    FOR SELECT USING (auth.uid() = guardian_id);

-- Policy: Admins can manage all guardian-student relationships
CREATE POLICY "Admins can manage guardian-student relationships" ON guardian_students
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update profiles table to allow guardian role if not exists
DO $$
BEGIN
    -- Check if we need to add guardian to role enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname = 'user_role' AND e.enumlabel = 'guardian'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'guardian';
    END IF;
END$$;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guardian_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS trigger_update_guardian_students_updated_at ON guardian_students;
CREATE TRIGGER trigger_update_guardian_students_updated_at
    BEFORE UPDATE ON guardian_students
    FOR EACH ROW
    EXECUTE FUNCTION update_guardian_students_updated_at();

-- Insert sample guardian-student relationships (optional - for testing)
-- Note: This should be removed in production and handled through admin interface

-- Insert some sample data if tables are empty (for development)
INSERT INTO guardian_students (guardian_id, student_id, relationship, is_primary) 
SELECT 
    g.id as guardian_id,
    s.id as student_id,
    'Parent' as relationship,
    true as is_primary
FROM profiles g
CROSS JOIN profiles s
WHERE g.role = 'guardian' 
    AND s.role = 'student'
    AND NOT EXISTS (
        SELECT 1 FROM guardian_students gs 
        WHERE gs.guardian_id = g.id AND gs.student_id = s.id
    )
LIMIT 5; -- Limit to avoid creating too many relationships

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON guardian_students TO authenticated;
GRANT USAGE ON SEQUENCE guardian_students_id_seq TO authenticated; 