/**
 * Smart Reports Backend API - Report Management
 * Handles all report-related operations with status workflow
 */

import { supabase } from '../config/supabase.js'
import { validateUser, hasPermission } from '../utils/auth.js'
import { logActivity } from '../utils/audit.js'

/**
 * Report Status Constants
 */
export const REPORT_STATUS = {
  DRAFT: 'draft',
  COMPLETED: 'completed'
}

/**
 * Get reports by status (only completed reports for viewing)
 * @param {string} status - Report status to filter by
 * @param {string} userId - User ID for permission checking
 * @param {Object} filters - Additional filters (term, academic_year, student_id)
 * @returns {Promise<Object>} Reports data or error
 */
export const getReportsByStatus = async (status = REPORT_STATUS.COMPLETED, userId, filters = {}) => {
  try {
    // Validate user permissions
    const user = await validateUser(userId)
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Build base query
    let query = supabase
      .from('student_reports')
      .select(`
        *,
        completed_by_profile:completed_by (
          first_name,
          last_name,
          role
        ),
        student_grades (
          *,
          courses (
            id,
            name,
            code
          )
        )
      `)
      .eq('status', status)
      .order('academic_year', { ascending: false })
      .order('term')
      .order('updated_at', { ascending: false })

    // Apply additional filters
    if (filters.term) {
      query = query.eq('term', filters.term)
    }
    
    if (filters.academic_year) {
      query = query.eq('academic_year', filters.academic_year)
    }
    
    if (filters.student_id) {
      query = query.eq('student_id', filters.student_id)
    }

    // For students, only show their own completed reports
    if (user.role === 'student') {
      query = query.eq('student_id', user.id)
    }

    const { data: reports, error } = await query

    if (error) throw error

    // Add student profile information
    if (reports && reports.length > 0) {
      const studentIds = [...new Set(reports.map(r => r.student_id))]
      
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          students (
            profile_id,
            student_id,
            class_year
          )
        `)
        .in('id', studentIds)
        .eq('role', 'student')

      if (studentsError) throw studentsError

      // Map student data to reports
      const studentsMap = new Map(students.map(s => [s.id, s]))
      
      const enrichedReports = reports.map(report => ({
        ...report,
        student: studentsMap.get(report.student_id)
      }))

      return { data: enrichedReports, error: null }
    }

    return { data: reports || [], error: null }

  } catch (error) {
    console.error('Error fetching reports by status:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Get a specific report with status validation
 * @param {string} reportId - Report ID
 * @param {string} userId - User ID for permission checking
 * @param {boolean} includeIncomplete - Whether to include draft reports (admin only)
 * @returns {Promise<Object>} Report data or error
 */
export const getReportById = async (reportId, userId, includeIncomplete = false) => {
  try {
    const user = await validateUser(userId)
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { data: report, error } = await supabase
      .from('student_reports')
      .select(`
        *,
        completed_by_profile:completed_by (
          first_name,
          last_name,
          role
        ),
        student_grades (
          *,
          courses (
            id,
            name,
            code
          )
        )
      `)
      .eq('id', reportId)
      .single()

    if (error) throw error
    if (!report) {
      return { data: null, error: 'Report not found' }
    }

    // Check permissions and status
    if (user.role === 'student' && report.student_id !== user.id) {
      return { data: null, error: 'Unauthorized to view this report' }
    }

    // For non-admin users, only show completed reports
    if (user.role !== 'admin' && !includeIncomplete && report.status !== REPORT_STATUS.COMPLETED) {
      return { 
        data: { 
          ...report, 
          incomplete: true,
          message: 'This report is not yet finalized.'
        }, 
        error: null 
      }
    }

    // Get student information
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select(`
        *,
        students (
          profile_id,
          student_id,
          class_year
        )
      `)
      .eq('id', report.student_id)
      .single()

    if (studentError) throw studentError

    return { 
      data: {
        ...report,
        student: {
          ...student,
          students: student.students[0] || null
        }
      }, 
      error: null 
    }

  } catch (error) {
    console.error('Error fetching report by ID:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Mark a report as completed (admin only)
 * @param {string} reportId - Report ID
 * @param {string} userId - Admin user ID
 * @returns {Promise<Object>} Updated report data or error
 */
export const completeReport = async (reportId, userId) => {
  try {
    const user = await validateUser(userId)
    if (!user || !hasPermission(user, 'manage_reports')) {
      return { data: null, error: 'Unauthorized to complete reports' }
    }

    // Check if report exists and is in draft status
    const { data: currentReport, error: fetchError } = await supabase
      .from('student_reports')
      .select('id, status, student_id')
      .eq('id', reportId)
      .single()

    if (fetchError) throw fetchError
    if (!currentReport) {
      return { data: null, error: 'Report not found' }
    }

    if (currentReport.status === REPORT_STATUS.COMPLETED) {
      return { data: null, error: 'Report is already completed' }
    }

    // Validate that report has grades before completing
    const { data: grades, error: gradesError } = await supabase
      .from('student_grades')
      .select('id')
      .eq('report_id', reportId)
      .limit(1)

    if (gradesError) throw gradesError
    if (!grades || grades.length === 0) {
      return { data: null, error: 'Cannot complete report without grades' }
    }

    // Mark report as completed
    const { data: updatedReport, error: updateError } = await supabase
      .from('student_reports')
      .update({
        status: REPORT_STATUS.COMPLETED,
        completed_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single()

    if (updateError) throw updateError

    // Log the activity
    await logActivity({
      user_id: userId,
      action: 'report_completed',
      resource_type: 'student_report',
      resource_id: reportId,
      details: { student_id: currentReport.student_id }
    })

    return { data: updatedReport, error: null }

  } catch (error) {
    console.error('Error completing report:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Revert a report to draft status (admin only, with confirmation)
 * @param {string} reportId - Report ID
 * @param {string} userId - Admin user ID
 * @param {string} reason - Reason for reverting
 * @returns {Promise<Object>} Updated report data or error
 */
export const revertReportToDraft = async (reportId, userId, reason) => {
  try {
    const user = await validateUser(userId)
    if (!user || !hasPermission(user, 'manage_reports')) {
      return { data: null, error: 'Unauthorized to revert reports' }
    }

    if (!reason || reason.trim().length < 10) {
      return { data: null, error: 'Reason is required (minimum 10 characters)' }
    }

    // Check if report exists and is completed
    const { data: currentReport, error: fetchError } = await supabase
      .from('student_reports')
      .select('id, status, student_id')
      .eq('id', reportId)
      .single()

    if (fetchError) throw fetchError
    if (!currentReport) {
      return { data: null, error: 'Report not found' }
    }

    if (currentReport.status !== REPORT_STATUS.COMPLETED) {
      return { data: null, error: 'Report is not completed' }
    }

    // Revert report to draft
    const { data: updatedReport, error: updateError } = await supabase
      .from('student_reports')
      .update({
        status: REPORT_STATUS.DRAFT,
        completed_by: null,
        completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single()

    if (updateError) throw updateError

    // Log the activity with reason
    await logActivity({
      user_id: userId,
      action: 'report_reverted',
      resource_type: 'student_report',
      resource_id: reportId,
      details: { 
        student_id: currentReport.student_id,
        reason: reason.trim()
      }
    })

    return { data: updatedReport, error: null }

  } catch (error) {
    console.error('Error reverting report:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Check if a report can be edited
 * @param {string} reportId - Report ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Can edit status or error
 */
export const canEditReport = async (reportId, userId) => {
  try {
    const user = await validateUser(userId)
    if (!user) {
      return { canEdit: false, reason: 'Unauthorized' }
    }

    const { data: report, error } = await supabase
      .from('student_reports')
      .select('id, status, student_id')
      .eq('id', reportId)
      .single()

    if (error) throw error
    if (!report) {
      return { canEdit: false, reason: 'Report not found' }
    }

    // Only admin and faculty can edit reports
    if (!['admin', 'faculty'].includes(user.role)) {
      return { canEdit: false, reason: 'Insufficient permissions' }
    }

    // Cannot edit completed reports
    if (report.status === REPORT_STATUS.COMPLETED) {
      return { canEdit: false, reason: 'Report is completed and locked' }
    }

    return { canEdit: true, reason: null }

  } catch (error) {
    console.error('Error checking edit permissions:', error)
    return { canEdit: false, reason: error.message }
  }
}

/**
 * Get report statistics by status
 * @param {string} userId - User ID for permission checking
 * @param {Object} filters - Filters (class_year, term, academic_year)
 * @returns {Promise<Object>} Statistics or error
 */
export const getReportStatistics = async (userId, filters = {}) => {
  try {
    const user = await validateUser(userId)
    if (!user || !hasPermission(user, 'view_reports')) {
      return { data: null, error: 'Unauthorized' }
    }

    // Build query for statistics
    let query = supabase
      .from('student_reports')
      .select('status, student_id, term, academic_year, total_score')

    // Apply filters
    if (filters.term) {
      query = query.eq('term', filters.term)
    }
    if (filters.academic_year) {
      query = query.eq('academic_year', filters.academic_year)
    }

    const { data: reports, error } = await query

    if (error) throw error

    // Calculate statistics
    const stats = {
      total: reports.length,
      draft: reports.filter(r => r.status === REPORT_STATUS.DRAFT).length,
      completed: reports.filter(r => r.status === REPORT_STATUS.COMPLETED).length,
      averageScore: 0,
      byTerm: {},
      byStatus: {
        [REPORT_STATUS.DRAFT]: 0,
        [REPORT_STATUS.COMPLETED]: 0
      }
    }

    // Calculate averages for completed reports only
    const completedReports = reports.filter(r => 
      r.status === REPORT_STATUS.COMPLETED && r.total_score > 0
    )
    
    if (completedReports.length > 0) {
      stats.averageScore = completedReports.reduce((sum, r) => sum + r.total_score, 0) / completedReports.length
    }

    // Group by term
    reports.forEach(report => {
      const termKey = `${report.academic_year} - ${report.term}`
      if (!stats.byTerm[termKey]) {
        stats.byTerm[termKey] = { total: 0, draft: 0, completed: 0 }
      }
      stats.byTerm[termKey].total++
      stats.byTerm[termKey][report.status]++
    })

    // Count by status
    reports.forEach(report => {
      stats.byStatus[report.status]++
    })

    return { data: stats, error: null }

  } catch (error) {
    console.error('Error fetching report statistics:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Save or update a report (only if in draft status)
 * @param {Object} reportData - Report data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Saved report data or error
 */
export const saveReport = async (reportData, userId) => {
  try {
    const user = await validateUser(userId)
    if (!user || !hasPermission(user, 'edit_reports')) {
      return { data: null, error: 'Unauthorized to save reports' }
    }

    // If updating existing report, check if it can be edited
    if (reportData.id) {
      const { canEdit, reason } = await canEditReport(reportData.id, userId)
      if (!canEdit) {
        return { data: null, error: reason }
      }
    }

    // Ensure status is set to draft for new/updated reports
    const reportToSave = {
      ...reportData,
      status: REPORT_STATUS.DRAFT,
      updated_at: new Date().toISOString()
    }

    let result
    if (reportData.id) {
      // Update existing report
      const { data, error } = await supabase
        .from('student_reports')
        .update(reportToSave)
        .eq('id', reportData.id)
        .select()
        .single()
      
      result = { data, error }
    } else {
      // Create new report
      const { data, error } = await supabase
        .from('student_reports')
        .insert([reportToSave])
        .select()
        .single()
      
      result = { data, error }
    }

    if (result.error) throw result.error

    // Log the activity
    await logActivity({
      user_id: userId,
      action: reportData.id ? 'report_updated' : 'report_created',
      resource_type: 'student_report',
      resource_id: result.data.id,
      details: { student_id: reportData.student_id }
    })

    return { data: result.data, error: null }

  } catch (error) {
    console.error('Error saving report:', error)
    return { data: null, error: error.message }
  }
} 