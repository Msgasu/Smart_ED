/**
 * Academic Period Management Utility
 * Handles getting and setting the current academic period configured by admin
 */

import { supabase } from './supabase'

/**
 * Get current academic period from system settings
 * @returns {Promise<Object>} Current term and academic year
 */
export const getCurrentAcademicPeriod = async () => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('current_term, current_academic_year, reopening_date, updated_at, updated_by')
      .eq('id', 1)
      .single()

    if (error) {
      // If table doesn't exist or no data, return default
      if (error.code === 'PGRST116') {
        const currentYear = new Date().getFullYear()
        const nextYear = currentYear + 1
        return {
          term: 'Term 1',
          academicYear: `${currentYear}-${nextYear}`,
          updated_at: null,
          updated_by: null
        }
      }
      throw error
    }

    if (data) {
      return {
        term: data.current_term || 'Term 1',
        academicYear: data.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        reopening_date: data.reopening_date || null,
        updated_at: data.updated_at,
        updated_by: data.updated_by
      }
    }

    // Fallback to default
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1
    return {
      term: 'Term 1',
      academicYear: `${currentYear}-${nextYear}`,
      updated_at: null,
      updated_by: null
    }
  } catch (error) {
    console.error('Error getting current academic period:', error)
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1
    return {
      term: 'Term 1',
      academicYear: `${currentYear}-${nextYear}`,
      updated_at: null,
      updated_by: null
    }
  }
}

/**
 * Set current academic period (admin only)
 * @param {string} term - Term (Term 1, Term 2, Term 3)
 * @param {string} academicYear - Academic year (e.g., 2024-2025)
 * @param {string} userId - Admin user ID
 * @returns {Promise<Object>} Success status
 */
export const setCurrentAcademicPeriod = async (term, academicYear, userId) => {
  try {
    if (!term || !academicYear) {
      return { success: false, error: 'Term and academic year are required' }
    }

    // Validate term
    if (!['Term 1', 'Term 2', 'Term 3'].includes(term)) {
      return { success: false, error: 'Invalid term. Must be Term 1, Term 2, or Term 3' }
    }

    // Validate academic year format (e.g., 2024-2025)
    if (!/^\d{4}-\d{4}$/.test(academicYear)) {
      return { success: false, error: 'Invalid academic year format. Use format: YYYY-YYYY (e.g., 2024-2025)' }
    }

    // Get existing settings to preserve reopening_date
    const { data: existing } = await supabase
      .from('system_settings')
      .select('reopening_date')
      .eq('id', 1)
      .single()

    // Upsert the current period (preserve reopening_date if it exists)
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 1,
        current_term: term,
        current_academic_year: academicYear,
        reopening_date: existing?.reopening_date || null,
        updated_by: userId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (error) {
      // If table doesn't exist, return error
      if (error.code === '42P01') {
        return { 
          success: false, 
          error: 'System settings table does not exist. Please run the migration first.' 
        }
      }
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error setting current academic period:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get reopening date for current academic period
 * @returns {Promise<Object>} Reopening date or null
 */
export const getReopeningDate = async () => {
  try {
    const period = await getCurrentAcademicPeriod()
    return { success: true, data: period.reopening_date || null }
  } catch (error) {
    console.error('Error getting reopening date:', error)
    return { success: false, error: error.message, data: null }
  }
}

/**
 * Set reopening date for current academic period (admin only)
 * @param {string} reopeningDate - Reopening date (YYYY-MM-DD format)
 * @param {string} userId - Admin user ID
 * @returns {Promise<Object>} Success status
 */
export const setReopeningDate = async (reopeningDate, userId) => {
  try {
    // Validate date format if provided
    if (reopeningDate && !/^\d{4}-\d{2}-\d{2}$/.test(reopeningDate)) {
      return { success: false, error: 'Invalid date format. Use YYYY-MM-DD format' }
    }

    // First, get existing settings to preserve required fields
    const { data: existing, error: fetchError } = await supabase
      .from('system_settings')
      .select('current_term, current_academic_year')
      .eq('id', 1)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // If table doesn't exist or other error
      if (fetchError.code === '42P01' || fetchError.code === 'PGRST116') {
        return { 
          success: false, 
          error: 'System settings table does not exist. Please run the migration first.' 
        }
      }
      throw fetchError
    }

    // If no existing record, we need to create one with defaults
    if (!existing) {
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      const defaultYear = `${currentYear}-${nextYear}`
      
      const { data, error } = await supabase
        .from('system_settings')
        .insert({
          id: 1,
          current_term: 'Term 1',
          current_academic_year: defaultYear,
          reopening_date: reopeningDate || null,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    // Update existing record, preserving required fields
    const { data, error } = await supabase
      .from('system_settings')
      .update({
        reopening_date: reopeningDate || null,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error setting reopening date:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all available academic years from reports
 * @returns {Promise<Array>} Array of academic years
 */
export const getAvailableAcademicYears = async () => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .select('academic_year')
      .order('academic_year', { ascending: false })

    if (error) throw error

    // Get unique academic years
    const uniqueYears = [...new Set((data || []).map(r => r.academic_year))].filter(Boolean)
    
    return { success: true, data: uniqueYears }
  } catch (error) {
    console.error('Error getting available academic years:', error)
    return { success: false, error: error.message, data: [] }
  }
}
