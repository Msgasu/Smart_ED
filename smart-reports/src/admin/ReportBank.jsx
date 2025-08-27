import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { getReportsByStatus, completeReport, revertReportToDraft, REPORT_STATUS } from '../lib/reportApi'
import toast from 'react-hot-toast'
import AdminLayout from './AdminLayout'
import './ReportBank.css'

const ReportBank = () => {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [completingReports, setCompletingReports] = useState(new Set())
  const [showRevertModal, setShowRevertModal] = useState(false)
  const [revertingReport, setRevertingReport] = useState(null)
  const [revertReason, setRevertReason] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUserProfile()
    fetchAllStudents()
  }, [])

  useEffect(() => {
    if (students.length > 0) {
      fetchAllReports()
    }
  }, [students])

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchAllStudents = async () => {
    try {
      setLoading(true)
      
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select(`
          *,
          students!inner (
            profile_id,
            student_id,
            class_year
          )
        `)
        .eq('role', 'student')
        .order('first_name')

      if (studentsError) throw studentsError

      setStudents(studentsData || [])

    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Error loading students')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllReports = async () => {
    try {
      const studentIds = students.map(s => s.id)
      
      // Fetch both draft and completed reports
      const { data: draftReports } = await getReportsByStatus(REPORT_STATUS.DRAFT, { student_ids: studentIds })
      const { data: completedReports } = await getReportsByStatus(REPORT_STATUS.COMPLETED, { student_ids: studentIds })
      
      const allReports = [
        ...(draftReports || []),
        ...(completedReports || [])
      ]

      setReports(allReports)

    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Error loading reports')
    }
  }

  const getStudentReports = (studentId) => {
    return reports.filter(report => report.student_id === studentId)
  }

  const handleViewReport = (reportId) => {
    navigate(`/admin/report-view/${reportId}`)
  }

  const handlePrintReport = (reportId) => {
    const reportWindow = window.open(`/admin/report-print/${reportId}`, '_blank')
    if (reportWindow) {
      reportWindow.focus()
    }
  }

  const handleCompleteReport = async (reportId) => {
    if (!userProfile || userProfile.role !== 'admin') {
      toast.error('Only administrators can complete reports')
      return
    }

    try {
      setCompletingReports(prev => new Set([...prev, reportId]))
      
      const { data, error } = await completeReport(reportId)
      
      if (error) {
        toast.error(error)
        return
      }

      toast.success('Report marked as completed and locked')
      fetchAllReports()
      
    } catch (error) {
      console.error('Error completing report:', error)
      toast.error('Failed to complete report')
    } finally {
      setCompletingReports(prev => {
        const newSet = new Set(prev)
        newSet.delete(reportId)
        return newSet
      })
    }
  }

  const handleRevertReport = (report) => {
    if (!userProfile || userProfile.role !== 'admin') {
      toast.error('Only administrators can revert reports')
      return
    }

    setRevertingReport(report)
    setRevertReason('')
    setShowRevertModal(true)
  }

  const confirmRevertReport = async () => {
    if (!revertingReport || !revertReason.trim()) {
      toast.error('Please provide a reason for reverting the report')
      return
    }

    try {
      const { data, error } = await revertReportToDraft(revertingReport.id, revertReason)
      
      if (error) {
        toast.error(error)
        return
      }

      toast.success('Report reverted to draft status')
      setShowRevertModal(false)
      setRevertingReport(null)
      setRevertReason('')
      
      fetchAllReports()
      
    } catch (error) {
      console.error('Error reverting report:', error)
      toast.error('Failed to revert report')
    }
  }

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
    const studentId = student.students?.student_id || ''
    return fullName.includes(searchTerm.toLowerCase()) || 
           studentId.includes(searchTerm.toLowerCase())
  })

  const ReportRow = ({ student, report }) => {
    const hasGrades = report.student_grades && report.student_grades.length > 0
    const isCompleted = report.status === REPORT_STATUS.COMPLETED
    const isDraft = report.status === REPORT_STATUS.DRAFT
    const isAdmin = userProfile?.role === 'admin'
    const isCompleting = completingReports.has(report.id)

    return (
      <div className="report-row">
        <div className="student-info">
          <div className="student-name">
            {student.first_name} {student.last_name}
          </div>
          <div className="student-id">
            ID: {student.students?.student_id || 'N/A'}
          </div>
          <div className="student-class">
            Class: {student.students?.class_year || 'N/A'}
          </div>
        </div>
        
        <div className="report-info">
          <div className="report-term">
            {report.academic_year} - {report.term}
          </div>
          <div className="report-score">
            Score: {report.total_score || 0}% | Grade: {report.overall_grade || 'N/A'}
          </div>
          <div className="report-status">
                         {isCompleted ? (
               <span className="status completed">
                 🔒 Completed
               </span>
             ) : (
               <span className="status draft">
                 🔓 Draft
               </span>
             )}
          </div>
        </div>
        
        <div className="action-buttons">
                     {/* View/Edit Button */}
           <button 
             className="action-btn view-btn"
             onClick={() => handleViewReport(report.id)}
             title={isCompleted ? "View Report" : "Edit Draft"}
           >
             👁️
           </button>
          
                     {/* Complete Button - Only for draft reports with grades */}
           {isDraft && hasGrades && isAdmin && (
             <button 
               className="action-btn complete-btn"
               onClick={() => handleCompleteReport(report.id)}
               disabled={isCompleting}
               title="Mark as Completed"
             >
               ✅
             </button>
           )}
          
                     {/* Print Button - Only for completed reports */}
           {isCompleted && (
             <button 
               className="action-btn print-btn"
               onClick={() => handlePrintReport(report.id)}
               title="Print Report"
             >
               🖨️
             </button>
           )}
          
                     {/* Revert Button - Only for completed reports (admin only) */}
           {isCompleted && isAdmin && (
             <button 
               className="action-btn revert-btn"
               onClick={() => handleRevertReport(report)}
               title="Revert to Draft"
             >
               🔓
             </button>
           )}
        </div>
      </div>
    )
  }

  return (
    <AdminLayout user={null} profile={userProfile}>
      <div className="report-bank-page">
        <div className="page-header">
                     <button 
             className="back-button"
             onClick={() => navigate('/admin/dashboard')}
           >
             ← Back to Dashboard
           </button>
          <div className="header-content">
            <h1>Report Bank</h1>
            <p className="page-description">
              View and manage all student reports across all classes
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="search-section">
          <input
            type="text"
            placeholder="Search students by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading report bank...</p>
          </div>
        ) : (
          <div className="reports-container">
            {filteredStudents.map(student => {
              const studentReports = getStudentReports(student.id)
              
              if (studentReports.length === 0) {
                return null // Don't show students with no reports
              }
              
              return (
                <div key={student.id} className="student-section">
                  <div className="student-header">
                    <h3>{student.first_name} {student.last_name}</h3>
                    <span className="reports-count">
                      {studentReports.length} report{studentReports.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="reports-list">
                    {studentReports.map(report => (
                      <ReportRow 
                        key={report.id} 
                        student={student} 
                        report={report} 
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            
            {filteredStudents.filter(student => getStudentReports(student.id).length > 0).length === 0 && (
              <div className="no-reports">
                <p>No reports found for the selected criteria.</p>
              </div>
            )}
          </div>
        )}

        {/* Revert Modal */}
        {showRevertModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Revert Report to Draft</h3>
              <p>
                Are you sure you want to revert this report back to draft status? 
                This will unlock the report for editing but remove its completed status.
              </p>
              
              {revertingReport && (
                <div className="report-info">
                  <strong>Report:</strong> {revertingReport.academic_year} - {revertingReport.term}
                  <br />
                  <strong>Student:</strong> {students.find(s => s.id === revertingReport.student_id)?.first_name} {students.find(s => s.id === revertingReport.student_id)?.last_name}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="revertReason">Reason for reverting (required):</label>
                <textarea
                  id="revertReason"
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  placeholder="Please explain why this report is being reverted to draft status..."
                  className="form-control"
                  rows={4}
                />
                <small>Minimum 10 characters required</small>
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRevertModal(false)
                    setRevertingReport(null)
                    setRevertReason('')
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-warning"
                  onClick={confirmRevertReport}
                  disabled={!revertReason.trim() || revertReason.trim().length < 10}
                >
                  Revert to Draft
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default ReportBank
