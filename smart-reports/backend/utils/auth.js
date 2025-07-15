/**
 * Smart Reports Backend - Authentication Utilities
 * Handles user validation and permission checking
 */

import { supabase } from '../config/supabase.js'

/**
 * Role-based permissions mapping
 */
const PERMISSIONS = {
  admin: [
    'view_reports',
    'edit_reports', 
    'manage_reports',
    'complete_reports',
    'revert_reports',
    'view_all_students',
    'manage_users',
    'view_analytics'
  ],
  faculty: [
    'view_reports',
    'edit_reports',
    'view_assigned_students',
    'create_reports'
  ],
  student: [
    'view_own_reports'
  ],
  guardian: [
    'view_child_reports'
  ]
}

/**
 * Validate user and fetch profile information
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User profile or null
 */
export const validateUser = async (userId) => {
  try {
    if (!userId) {
      return null
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !user) {
      console.error('User validation failed:', error)
      return null
    }

    // Check if user is active
    if (user.status !== 'active') {
      console.warn('Inactive user attempted access:', userId)
      return null
    }

    return user

  } catch (error) {
    console.error('Error validating user:', error)
    return null
  }
}

/**
 * Check if user has specific permission
 * @param {Object} user - User profile object
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether user has permission
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) {
    return false
  }

  const rolePermissions = PERMISSIONS[user.role] || []
  return rolePermissions.includes(permission)
}

/**
 * Check if user can access student data
 * @param {Object} user - User profile object
 * @param {string} studentId - Student ID to check access for
 * @returns {Promise<boolean>} Whether user can access student data
 */
export const canAccessStudent = async (user, studentId) => {
  try {
    if (!user || !studentId) {
      return false
    }

    // Admin can access all students
    if (user.role === 'admin') {
      return true
    }

    // Students can only access their own data
    if (user.role === 'student') {
      return user.id === studentId
    }

    // Faculty can access students in their assigned courses
    if (user.role === 'faculty') {
      const { data: assignments, error } = await supabase
        .from('faculty_courses')
        .select(`
          course_id,
          student_courses!inner (
            student_id
          )
        `)
        .eq('faculty_id', user.id)
        .eq('student_courses.student_id', studentId)

      if (error) {
        console.error('Error checking faculty access:', error)
        return false
      }

      return assignments && assignments.length > 0
    }

    // Guardians can access their children's data
    if (user.role === 'guardian') {
      const { data: guardianships, error } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', user.id)
        .eq('student_id', studentId)

      if (error) {
        console.error('Error checking guardian access:', error)
        return false
      }

      return guardianships && guardianships.length > 0
    }

    return false

  } catch (error) {
    console.error('Error checking student access:', error)
    return false
  }
}

/**
 * Get user's accessible student IDs
 * @param {Object} user - User profile object
 * @returns {Promise<Array>} Array of accessible student IDs
 */
export const getAccessibleStudents = async (user) => {
  try {
    if (!user) {
      return []
    }

    // Admin can access all students
    if (user.role === 'admin') {
      const { data: students, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student')

      if (error) throw error
      return students.map(s => s.id)
    }

    // Students can only access themselves
    if (user.role === 'student') {
      return [user.id]
    }

    // Faculty can access students in their courses
    if (user.role === 'faculty') {
      const { data: assignments, error } = await supabase
        .from('faculty_courses')
        .select(`
          student_courses (
            student_id
          )
        `)
        .eq('faculty_id', user.id)

      if (error) throw error
      
      const studentIds = new Set()
      assignments.forEach(assignment => {
        assignment.student_courses.forEach(sc => {
          studentIds.add(sc.student_id)
        })
      })
      
      return Array.from(studentIds)
    }

    // Guardians can access their children
    if (user.role === 'guardian') {
      const { data: guardianships, error } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', user.id)

      if (error) throw error
      return guardianships.map(g => g.student_id)
    }

    return []

  } catch (error) {
    console.error('Error getting accessible students:', error)
    return []
  }
}

/**
 * Validate API request with user authentication
 * @param {string} userId - User ID from request
 * @param {string} requiredPermission - Required permission for the action
 * @returns {Promise<Object>} Validation result
 */
export const validateRequest = async (userId, requiredPermission) => {
  try {
    const user = await validateUser(userId)
    
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        statusCode: 401
      }
    }

    if (requiredPermission && !hasPermission(user, requiredPermission)) {
      return {
        success: false,
        error: 'Insufficient permissions',
        statusCode: 403
      }
    }

    return {
      success: true,
      user,
      error: null
    }

  } catch (error) {
    console.error('Request validation error:', error)
    return {
      success: false,
      error: 'Internal server error',
      statusCode: 500
    }
  }
}

/**
 * Check if user can perform action on specific report
 * @param {Object} user - User profile
 * @param {string} reportId - Report ID
 * @param {string} action - Action to perform (view, edit, complete, etc.)
 * @returns {Promise<Object>} Permission result
 */
export const checkReportPermission = async (user, reportId, action) => {
  try {
    if (!user || !reportId) {
      return { allowed: false, reason: 'Invalid parameters' }
    }

    // Get report information
    const { data: report, error } = await supabase
      .from('student_reports')
      .select('id, student_id, status')
      .eq('id', reportId)
      .single()

    if (error || !report) {
      return { allowed: false, reason: 'Report not found' }
    }

    // Check if user can access this student's data
    const canAccess = await canAccessStudent(user, report.student_id)
    if (!canAccess) {
      return { allowed: false, reason: 'No access to student data' }
    }

    // Action-specific permission checks
    switch (action) {
      case 'view':
        // All roles with student access can view (but content may vary)
        return { allowed: true, reason: null }

      case 'edit':
        // Only admin and faculty can edit, and only draft reports
        if (!['admin', 'faculty'].includes(user.role)) {
          return { allowed: false, reason: 'Insufficient role for editing' }
        }
        if (report.status === 'completed') {
          return { allowed: false, reason: 'Cannot edit completed report' }
        }
        return { allowed: true, reason: null }

      case 'complete':
        // Only admin can complete reports
        if (user.role !== 'admin') {
          return { allowed: false, reason: 'Only admin can complete reports' }
        }
        if (report.status === 'completed') {
          return { allowed: false, reason: 'Report already completed' }
        }
        return { allowed: true, reason: null }

      case 'revert':
        // Only admin can revert completed reports
        if (user.role !== 'admin') {
          return { allowed: false, reason: 'Only admin can revert reports' }
        }
        if (report.status !== 'completed') {
          return { allowed: false, reason: 'Can only revert completed reports' }
        }
        return { allowed: true, reason: null }

      default:
        return { allowed: false, reason: 'Unknown action' }
    }

  } catch (error) {
    console.error('Error checking report permission:', error)
    return { allowed: false, reason: 'Permission check failed' }
  }
} 