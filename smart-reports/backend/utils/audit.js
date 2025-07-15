/**
 * Smart Reports Backend - Audit Logging Utilities
 * Tracks all report operations for security and compliance
 */

import { supabase } from '../config/supabase.js'

/**
 * Log an activity/action in the audit trail
 * @param {Object} params - Activity parameters
 * @param {string} params.user_id - User who performed the action
 * @param {string} params.action - Action performed
 * @param {string} params.resource_type - Type of resource (student_report, etc.)
 * @param {string} params.resource_id - ID of the resource
 * @param {Object} params.details - Additional details about the action
 * @param {string} params.ip_address - User's IP address (optional)
 * @returns {Promise<boolean>} Success status
 */
export const logActivity = async ({
  user_id,
  action,
  resource_type,
  resource_id,
  details = {},
  ip_address = null
}) => {
  try {
    if (!user_id || !action || !resource_type) {
      console.error('Missing required audit log parameters')
      return false
    }

    const auditEntry = {
      user_id,
      action,
      resource_type,
      resource_id,
      details: JSON.stringify(details),
      ip_address,
      timestamp: new Date().toISOString()
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert([auditEntry])

    if (error) {
      console.error('Error logging activity:', error)
      return false
    }

    return true

  } catch (error) {
    console.error('Failed to log activity:', error)
    return false
  }
}

/**
 * Get audit logs for a specific resource
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - ID of the resource
 * @param {string} userId - User ID for permission checking
 * @param {number} limit - Number of entries to return
 * @returns {Promise<Object>} Audit logs or error
 */
export const getAuditLogs = async (resourceType, resourceId, userId, limit = 50) => {
  try {
    // Validate user has permission to view audit logs
    const { data: user } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!user || user.role !== 'admin') {
      return { data: null, error: 'Unauthorized to view audit logs' }
    }

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:user_id (
          first_name,
          last_name,
          role
        )
      `)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Parse details JSON
    const processedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : {}
    }))

    return { data: processedLogs, error: null }

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Log report status change
 * @param {string} reportId - Report ID
 * @param {string} userId - User making the change
 * @param {string} fromStatus - Previous status
 * @param {string} toStatus - New status
 * @param {string} reason - Reason for change (optional)
 * @returns {Promise<boolean>} Success status
 */
export const logReportStatusChange = async (reportId, userId, fromStatus, toStatus, reason = null) => {
  return await logActivity({
    user_id: userId,
    action: 'report_status_changed',
    resource_type: 'student_report',
    resource_id: reportId,
    details: {
      from_status: fromStatus,
      to_status: toStatus,
      reason: reason
    }
  })
}

/**
 * Log report access/view
 * @param {string} reportId - Report ID
 * @param {string} userId - User viewing the report
 * @param {string} accessType - Type of access (view, print, download)
 * @returns {Promise<boolean>} Success status
 */
export const logReportAccess = async (reportId, userId, accessType = 'view') => {
  return await logActivity({
    user_id: userId,
    action: 'report_accessed',
    resource_type: 'student_report',
    resource_id: reportId,
    details: {
      access_type: accessType,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log report modification
 * @param {string} reportId - Report ID
 * @param {string} userId - User modifying the report
 * @param {Object} changes - Changes made to the report
 * @returns {Promise<boolean>} Success status
 */
export const logReportModification = async (reportId, userId, changes = {}) => {
  return await logActivity({
    user_id: userId,
    action: 'report_modified',
    resource_type: 'student_report',
    resource_id: reportId,
    details: {
      changes: changes,
      modified_at: new Date().toISOString()
    }
  })
}

/**
 * Log grade changes
 * @param {string} reportId - Report ID
 * @param {string} userId - User making changes
 * @param {Array} gradeChanges - Array of grade changes
 * @returns {Promise<boolean>} Success status
 */
export const logGradeChanges = async (reportId, userId, gradeChanges = []) => {
  return await logActivity({
    user_id: userId,
    action: 'grades_modified',
    resource_type: 'student_report',
    resource_id: reportId,
    details: {
      grade_changes: gradeChanges,
      total_changes: gradeChanges.length
    }
  })
}

/**
 * Get activity summary for dashboard
 * @param {string} userId - Admin user ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} Activity summary or error
 */
export const getActivitySummary = async (userId, days = 7) => {
  try {
    // Validate admin user
    const { data: user } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!user || user.role !== 'admin') {
      return { data: null, error: 'Unauthorized' }
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: activities, error } = await supabase
      .from('audit_logs')
      .select('action, resource_type, timestamp')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })

    if (error) throw error

    // Process activities into summary
    const summary = {
      totalActivities: activities.length,
      byAction: {},
      byResourceType: {},
      byDay: {},
      recentActivities: activities.slice(0, 20)
    }

    activities.forEach(activity => {
      // Count by action
      summary.byAction[activity.action] = (summary.byAction[activity.action] || 0) + 1
      
      // Count by resource type
      summary.byResourceType[activity.resource_type] = 
        (summary.byResourceType[activity.resource_type] || 0) + 1
      
      // Count by day
      const day = new Date(activity.timestamp).toDateString()
      summary.byDay[day] = (summary.byDay[day] || 0) + 1
    })

    return { data: summary, error: null }

  } catch (error) {
    console.error('Error getting activity summary:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Clean up old audit logs (for maintenance)
 * @param {number} retentionDays - Number of days to retain logs
 * @returns {Promise<Object>} Cleanup result
 */
export const cleanupAuditLogs = async (retentionDays = 365) => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const { data, error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())

    if (error) throw error

    return { 
      success: true, 
      message: `Audit logs older than ${retentionDays} days have been cleaned up`,
      deletedCount: data?.length || 0
    }

  } catch (error) {
    console.error('Error cleaning up audit logs:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
} 