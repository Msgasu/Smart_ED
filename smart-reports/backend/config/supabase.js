/**
 * Smart Reports Backend - Supabase Configuration
 * Backend database connection and configuration
 */

import { createClient } from '@supabase/supabase-js'

// Supabase configuration - should match frontend configuration
const supabaseUrl = "https://sxndojgvrhjmclveyfoz.supabase.co"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmRvamd2cmhqbWNsdmV5Zm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMjc3NzksImV4cCI6MjA1NjYwMzc3OX0.0Y51JuSUVICIekt5yq0K2C6i6j2risQKz3FUSTeWHLE"

// Create Supabase client with service role key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Database connection test failed:', error)
      return false
    }

    console.log('Database connection successful')
    return true

  } catch (error) {
    console.error('Database connection error:', error)
    return false
  }
}

/**
 * Initialize database schema if needed
 * @returns {Promise<boolean>} Initialization status
 */
export const initializeSchema = async () => {
  try {
    // Check if audit_logs table exists, create if it doesn't
    const { data: auditTable, error: auditError } = await supabase
      .from('audit_logs')
      .select('id')
      .limit(1)

    if (auditError && auditError.code === 'PGRST106') {
      // Table doesn't exist, create it
      console.log('Creating audit_logs table...')
      
      // Note: In a real implementation, you'd run this SQL directly
      // This is just a placeholder to show the structure needed
      const auditTableSQL = `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES profiles(id),
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(50) NOT NULL,
          resource_id VARCHAR(100),
          details JSONB,
          ip_address INET,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      `
      
      console.log('Audit logs table SQL:', auditTableSQL)
      // You would execute this SQL in your database manually or via migration
    }

    return true

  } catch (error) {
    console.error('Schema initialization error:', error)
    return false
  }
}

/**
 * Health check for the database
 * @returns {Promise<Object>} Health status
 */
export const healthCheck = async () => {
  try {
    const startTime = Date.now()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    const endTime = Date.now()
    const responseTime = endTime - startTime

    if (error) {
      return {
        status: 'error',
        message: error.message,
        responseTime: responseTime
      }
    }

    return {
      status: 'healthy',
      message: 'Database connection is working',
      responseTime: responseTime
    }

  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      responseTime: null
    }
  }
} 