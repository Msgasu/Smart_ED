import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaPrint, FaDownload, FaFileAlt, FaClock, FaExclamationTriangle } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { getReportById, REPORT_STATUS } from '../lib/reportApi'
import toast from 'react-hot-toast'
import AdminLayout from './AdminLayout'
import './ReportViewer.css'

const ReportViewer = () => {
  const { reportId } = useParams()
  const navigate = useNavigate()
  
  // Helper function to get display percentages based on form level (text only)
  const getDisplayPercentages = (classYear) => {
    if (!classYear) return { classText: '40%', examText: '60%' }; // Default fallback
    
    const classYearStr = classYear.toString().toLowerCase();
    
    if (classYearStr.includes('form1') || classYearStr.includes('form 1')) {
      return { classText: '30%', examText: '70%' };
    } else if (classYearStr.includes('form2') || classYearStr.includes('form 2')) {
      return { classText: '40%', examText: '60%' };
    }
    
    // Default for other forms/grades
    return { classText: '40%', examText: '60%' };
  };

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [isIncomplete, setIsIncomplete] = useState(false)

  useEffect(() => {
    fetchUserProfile()
    if (reportId) {
      fetchReport()
    }
  }, [reportId])

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

  const fetchReport = async () => {
    try {
      setLoading(true)
      
      // Use new API to fetch report with status validation
      const includeIncomplete = userProfile?.role === 'admin'
      const { data: reportData, error } = await getReportById(reportId, includeIncomplete)

      if (error) {
        toast.error(error)
        return
      }

      if (!reportData) {
        toast.error('Report not found')
        return
      }

      // Check if report is incomplete
      if (reportData.incomplete) {
        setIsIncomplete(true)
        setReport(reportData)
        return
      }

      setReport(reportData)
      setIsIncomplete(false)
      
    } catch (error) {
      console.error('Error fetching report:', error)
      toast.error('Error loading report')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    setPrinting(true)
    window.print()
    setTimeout(() => setPrinting(false), 1000)
  }

  const handleDownload = () => {
    // Create a blob with the report content
    const reportContent = document.querySelector('.report-content').innerHTML
    const blob = new Blob([reportContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.student.first_name}_${report.student.last_name}_${report.term}_${report.academic_year}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const calculateGradeStats = () => {
    if (!report?.student_grades) return {}
    
    const grades = report.student_grades
    const total = grades.reduce((sum, grade) => sum + (grade.total_score || 0), 0)
    const average = grades.length > 0 ? total / grades.length : 0
    const highest = Math.max(...grades.map(g => g.total_score || 0))
    const lowest = Math.min(...grades.map(g => g.total_score || 0))
    
    return {
      total: grades.length,
      average: Math.round(average * 100) / 100,
      highest,
      lowest
    }
  }

  const getGradeBadgeClass = (grade) => {
    const gradeLower = grade?.toLowerCase()
    switch(gradeLower) {
      case 'a': return 'grade-a'
      case 'b': return 'grade-b'
      case 'c': return 'grade-c'
      case 'd': return 'grade-d'
      case 'f': return 'grade-f'
      default: return 'grade-default'
    }
  }

  if (loading) {
    return (
      <AdminLayout user={null} profile={userProfile}>
        <div className="report-viewer">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading report...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!report) {
    return (
      <AdminLayout user={null} profile={userProfile}>
        <div className="report-viewer">
          <div className="error-container">
            <FaFileAlt className="error-icon" />
            <h2>Report Not Found</h2>
            <p>The requested report could not be found.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/admin/classes')}
            >
              Back to Classes
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // Handle incomplete reports
  if (isIncomplete) {
    return (
      <AdminLayout user={null} profile={userProfile}>
        <div className="report-viewer">
          <div className="report-header no-print">
            <button 
              className="back-button"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft /> Back
            </button>
            <div className="header-content">
              <h1>Report Not Finalized</h1>
              <p className="page-description">
                This report is currently in draft status
              </p>
            </div>
          </div>

          <div className="incomplete-report-container">
            <div className="incomplete-message">
              <FaExclamationTriangle className="warning-icon" />
              <h2>This report is not yet finalized</h2>
              <p>
                The report you are trying to view is still in draft status and has not been 
                completed by the administration. Please check back later or contact your administrator.
              </p>
              
              {userProfile?.role === 'admin' && (
                <div className="admin-note">
                  <p><strong>Admin Note:</strong> This report is in draft status. You can complete it from the class reports page.</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/admin/classes')}
                  >
                    Go to Class Management
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const stats = calculateGradeStats()

  return (
    <AdminLayout user={null} profile={userProfile}>
      <div className="report-viewer">
        {/* Header - Hidden when printing */}
        <div className="report-header no-print">
          <button 
            className="back-button"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft /> Back
          </button>
          <div className="header-content">
            <h1>Student Report</h1>
            <p className="page-description">
              {report.student.first_name} {report.student.last_name} - {report.term} {report.academic_year}
            </p>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-secondary"
              onClick={handleDownload}
              disabled={printing}
            >
              <FaDownload /> Download
            </button>
            <button 
              className="btn btn-primary"
              onClick={handlePrint}
              disabled={printing}
            >
              <FaPrint /> {printing ? 'Printing...' : 'Print'}
            </button>
          </div>
        </div>

        {/* Report Content - Print-friendly */}
        <div className="report-content">
          {/* School Header */}
          <div className="school-header">
            <div className="school-logo">
              <img 
                src="/life-international-logo.svg" 
                alt="Life International College" 
                style={{ width: '80px', height: '80px' }}
              />
            </div>
            <div className="school-info">
              <h2 style={{ color: '#722F37' }}>Life International College</h2>
              <p style={{ color: '#8BC34A', fontWeight: '600' }}>Knowledge • Excellence • Christ</p>
              <p>Private Mail Bag, 252 Tema / Tel: 024 437 7584</p>
              <h3 style={{ color: '#722F37' }}>TERMINAL REPORT</h3>
            </div>
          </div>

          {/* Student Information */}
          <div className="student-info-section">
            <div className="section-header">
              <h4>Student Information</h4>
            </div>
            <div className="student-info-grid">
              <div className="info-item">
                <span className="label">Name:</span>
                <span className="value">{report.student.first_name} {report.student.last_name}</span>
              </div>
              <div className="info-item">
                <span className="label">Student ID:</span>
                <span className="value">{report.student.students?.student_id || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Class:</span>
                <span className="value">{report.class_year || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Term:</span>
                <span className="value">{report.term}</span>
              </div>
              <div className="info-item">
                <span className="label">Academic Year:</span>
                <span className="value">{report.academic_year}</span>
              </div>
              <div className="info-item">
                <span className="label">Attendance:</span>
                <span className="value">{report.attendance || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Grades Table */}
          <div className="grades-section">
            <div className="section-header">
              <h4>Subject Grades</h4>
            </div>
            <div className="grades-table">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Class Score ({getDisplayPercentages(report?.class_year).classText})</th>
                    <th>Exam Score ({getDisplayPercentages(report?.class_year).examText})</th>
                    <th>Total Score</th>
                    <th>Grade</th>
                    <th>Position</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {report.student_grades?.map((grade, index) => (
                    <tr key={grade.id}>
                      <td className="subject-name">
                        {grade.courses?.name || 'Unknown Subject'}
                      </td>
                      <td className="score">{grade.class_score || 0}</td>
                      <td className="score">{grade.exam_score || 0}</td>
                      <td className="score total">{grade.total_score || 0}</td>
                      <td className="grade">
                        <span className={`grade-badge ${getGradeBadgeClass(grade.grade)}`}>
                          {grade.grade || 'N/A'}
                        </span>
                      </td>
                      <td className="position">{grade.position || '-'}</td>
                      <td className="remark">{grade.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="performance-section">
            <div className="section-header">
              <h4>Performance Summary</h4>
            </div>
            <div className="performance-grid">
              <div className="performance-item">
                <span className="label">Total Subjects:</span>
                <span className="value">{stats.total}</span>
              </div>
              <div className="performance-item">
                <span className="label">Overall Average:</span>
                <span className="value">{report.total_score || 0}%</span>
              </div>
              <div className="performance-item">
                <span className="label">Overall Grade:</span>
                <span className="value">
                  <span className={`grade-badge ${getGradeBadgeClass(report.overall_grade)}`}>
                    {report.overall_grade || 'N/A'}
                  </span>
                </span>
              </div>
              <div className="performance-item">
                <span className="label">Highest Score:</span>
                <span className="value">{stats.highest || 0}%</span>
              </div>
              <div className="performance-item">
                <span className="label">Lowest Score:</span>
                <span className="value">{stats.lowest || 0}%</span>
              </div>
              <div className="performance-item">
                <span className="label">Conduct:</span>
                <span className="value">{report.conduct || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Remarks Section */}
          <div className="remarks-section">
            <div className="section-header">
              <h4>Remarks</h4>
            </div>
            <div className="remarks-content">
              <div className="remark-item">
                <span className="label">Teacher's Remarks:</span>
                <p className="remark-text">{report.teacher_remarks || 'No remarks provided'}</p>
              </div>
              <div className="remark-item">
                <span className="label">Next Class:</span>
                <p className="remark-text">{report.next_class || 'Not specified'}</p>
              </div>
              <div className="remark-item">
                <span className="label">Reopening Date:</span>
                <p className="remark-text">{report.reopening_date || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-item">
              <div className="signature-line"></div>
              <span className="signature-label">Class Teacher</span>
            </div>
            <div className="signature-item">
              <div className="signature-line"></div>
              <span className="signature-label">Principal</span>
            </div>
            <div className="signature-item">
              <div className="signature-line"></div>
              <span className="signature-label">Parent/Guardian</span>
            </div>
          </div>

          {/* Footer */}
          <div className="report-footer">
            <p>Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default ReportViewer 