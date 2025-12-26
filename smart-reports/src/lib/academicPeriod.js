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
      .select('current_term, current_academic_year, updated_at, updated_by')
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

    // Upsert the current period
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 1,
        current_term: term,
        current_academic_year: academicYear,
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
