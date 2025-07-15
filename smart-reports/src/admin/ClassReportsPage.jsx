import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaEye, FaPrint, FaDownload, FaFilter, FaSearch, FaFileAlt, FaChartBar, FaCheck, FaLock, FaUnlock, FaClock } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { getReportsByStatus, getReportStatistics, completeReport, revertReportToDraft, REPORT_STATUS } from '../lib/reportApi'
import toast from 'react-hot-toast'
import AdminLayout from './AdminLayout'
import './ClassReportsPage.css'

const ClassReportsPage = () => {
  const { className } = useParams()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTerm, setSelectedTerm] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all') // 'all', 'draft', 'completed'
  const [searchTerm, setSearchTerm] = useState('')
  const [groupBy, setGroupBy] = useState('student') // 'student' or 'term'
  const [availableTerms, setAvailableTerms] = useState([])
  const [availableYears, setAvailableYears] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    totalReports: 0,
    draftReports: 0,
    completedReports: 0,
    averageScore: 0,
    reportsWithGrades: 0
  })
  const [completingReports, setCompletingReports] = useState(new Set())
  const [showRevertModal, setShowRevertModal] = useState(false)
  const [revertingReport, setRevertingReport] = useState(null)
  const [revertReason, setRevertReason] = useState('')

  useEffect(() => {
    fetchUserProfile()
    if (className) {
      fetchClassData()
    }
  }, [className])

  useEffect(() => {
    if (students.length > 0) {
      fetchReports()
      fetchStatistics()
    }
  }, [students, selectedTerm, selectedYear, selectedStatus])

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

  const fetchClassData = async () => {
    try {
      setLoading(true)
      
      // Fetch all students in the class
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
        .eq('students.class_year', className)
        .order('first_name')

      if (studentsError) throw studentsError

      console.log('Students in class:', studentsData)
      setStudents(studentsData || [])
      
      // Update statistics
      setStatistics(prev => ({
        ...prev,
        totalStudents: studentsData?.length || 0
      }))

    } catch (error) {
      console.error('Error fetching class data:', error)
      toast.error('Error loading class data')
    } finally {
      setLoading(false)
    }
  }

  const fetchReports = async () => {
    if (students.length === 0) return

    try {
      setLoading(true)
      
      const studentIds = students.map(s => s.id)
      
      // Use new API to fetch reports by status
      const filters = {
        student_ids: studentIds,
        ...(selectedTerm !== 'all' && { term: selectedTerm }),
        ...(selectedYear !== 'all' && { academic_year: selectedYear })
      }

      let allReports = []

      if (selectedStatus === 'all') {
        // Fetch both draft and completed reports
        const { data: draftReports } = await getReportsByStatus(REPORT_STATUS.DRAFT, filters)
        const { data: completedReports } = await getReportsByStatus(REPORT_STATUS.COMPLETED, filters)
        
        allReports = [
          ...(draftReports || []),
          ...(completedReports || [])
        ]
      } else {
        // Fetch reports with specific status
        const status = selectedStatus === 'draft' ? REPORT_STATUS.DRAFT : REPORT_STATUS.COMPLETED
        const { data: reportsData } = await getReportsByStatus(status, filters)
        allReports = reportsData || []
      }

      // Filter by class students
      const classReports = allReports.filter(report => 
        studentIds.includes(report.student_id)
      )

      console.log('Reports fetched:', classReports)
      setReports(classReports)

      // Extract unique terms and years for filtering
      const terms = [...new Set(classReports.map(r => r.term))]
      const years = [...new Set(classReports.map(r => r.academic_year))]
      
      setAvailableTerms(terms)
      setAvailableYears(years)

    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Error loading reports')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const filters = {
        ...(selectedTerm !== 'all' && { term: selectedTerm }),
        ...(selectedYear !== 'all' && { academic_year: selectedYear })
      }

      const { data: stats } = await getReportStatistics(filters)
      
      if (stats) {
        setStatistics(prev => ({
          ...prev,
          totalReports: stats.total,
          draftReports: stats.draft,
          completedReports: stats.completed,
          averageScore: Math.round(stats.averageScore * 100) / 100,
          reportsWithGrades: stats.completed
        }))
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const getStudentReports = (studentId) => {
    return reports.filter(report => report.student_id === studentId)
  }

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId)
    return student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'
  }

  const getStudentById = (studentId) => {
    return students.find(s => s.id === studentId)
  }

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
    const studentId = student.students?.student_id || ''
    return fullName.includes(searchTerm.toLowerCase()) || 
           studentId.includes(searchTerm.toLowerCase())
  })

  const groupedReports = () => {
    if (groupBy === 'student') {
      return filteredStudents.map(student => ({
        student,
        reports: getStudentReports(student.id)
      }))
    } else {
      // Group by term
      const termGroups = {}
      reports.forEach(report => {
        const key = `${report.academic_year} - ${report.term}`
        if (!termGroups[key]) {
          termGroups[key] = []
        }
        termGroups[key].push(report)
      })
      return Object.entries(termGroups).map(([term, reports]) => ({
        term,
        reports: reports.filter(report => {
          const student = getStudentById(report.student_id)
          if (!student) return false
          const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
          const studentId = student.students?.student_id || ''
          return fullName.includes(searchTerm.toLowerCase()) || 
                 studentId.includes(searchTerm.toLowerCase())
        })
      }))
    }
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
      // Refresh reports
      fetchReports()
      fetchStatistics()
      
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
      
      // Refresh reports
      fetchReports()
      fetchStatistics()
      
    } catch (error) {
      console.error('Error reverting report:', error)
      toast.error('Failed to revert report')
    }
  }

  const calculateGradeDistribution = () => {
    const grades = {}
    reports.forEach(report => {
      const grade = report.overall_grade || 'N/A'
      grades[grade] = (grades[grade] || 0) + 1
    })
    return grades
  }

  const StatisticsPanel = () => (
    <div className="statistics-panel">
      <h3>Class Statistics</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{statistics.totalStudents}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{statistics.totalReports}</div>
          <div className="stat-label">Total Reports</div>
        </div>
        <div className="stat-card draft">
          <div className="stat-number">{statistics.draftReports}</div>
          <div className="stat-label">Draft Reports</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-number">{statistics.completedReports}</div>
          <div className="stat-label">Completed Reports</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{statistics.averageScore.toFixed(1)}%</div>
          <div className="stat-label">Average Score</div>
        </div>
      </div>
      
      <div className="grade-distribution">
        <h4>Grade Distribution (Completed Reports)</h4>
        <div className="grade-chart">
          {Object.entries(calculateGradeDistribution()).map(([grade, count]) => (
            <div key={grade} className="grade-item">
              <span className="grade-label">{grade}</span>
              <span className="grade-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const ReportCard = ({ report }) => {
    const student = getStudentById(report.student_id)
    const hasGrades = report.student_grades && report.student_grades.length > 0
    const isCompleted = report.status === REPORT_STATUS.COMPLETED
    const isDraft = report.status === REPORT_STATUS.DRAFT
    const isAdmin = userProfile?.role === 'admin'
    const isCompleting = completingReports.has(report.id)
    
    return (
      <div className={`report-card ${report.status}`}>
        <div className="report-header">
          <div className="report-info">
            <div className="report-title">
              <h4>{report.academic_year} - {report.term}</h4>
              <div className="status-indicator">
                {isCompleted && (
                  <span className="status-badge completed">
                    <FaLock /> Completed
                  </span>
                )}
                {isDraft && (
                  <span className="status-badge draft">
                    <FaClock /> Draft
                  </span>
                )}
              </div>
            </div>
            <p className="report-meta">
              Total Score: {report.total_score || 0}% | 
              Grade: {report.overall_grade || 'N/A'}
              {hasGrades && (
                <span className="grades-count"> | {report.student_grades.length} subjects</span>
              )}
            </p>
            {isCompleted && report.completed_at && (
              <p className="completion-info">
                Completed: {new Date(report.completed_at).toLocaleDateString()}
                {report.completed_by_profile && (
                  <span> by {report.completed_by_profile.first_name} {report.completed_by_profile.last_name}</span>
                )}
              </p>
            )}
          </div>
          <div className="report-actions">
            {/* View button - available for all completed reports */}
            {isCompleted && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => handleViewReport(report.id)}
                title="View Report"
              >
                <FaEye />
              </button>
            )}
            
            {/* Print button - only for completed reports */}
            {isCompleted && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => handlePrintReport(report.id)}
                title="Print Report"
              >
                <FaPrint />
              </button>
            )}
            
            {/* Admin controls */}
            {isAdmin && (
              <>
                {/* Complete button - only for draft reports with grades */}
                {isDraft && hasGrades && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => handleCompleteReport(report.id)}
                    disabled={isCompleting}
                    title="Mark as Completed"
                  >
                    {isCompleting ? <FaClock /> : <FaCheck />}
                  </button>
                )}
                
                {/* Revert button - only for completed reports */}
                {isCompleted && (
                  <button 
                    className="btn btn-warning btn-sm"
                    onClick={() => handleRevertReport(report)}
                    title="Revert to Draft"
                  >
                    <FaUnlock />
                  </button>
                )}
                
                {/* Edit/View Draft button - for draft reports */}
                {isDraft && (
                  <button 
                    className="btn btn-info btn-sm"
                    onClick={() => handleViewReport(report.id)}
                    title="Edit Draft"
                  >
                    <FaEye />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        
        {hasGrades && (
          <div className="subjects-preview">
            <h5>Subjects:</h5>
            <div className="subjects-grid">
              {report.student_grades.slice(0, 4).map(grade => (
                <div key={grade.id} className="subject-item">
                  <span className="subject-name">{grade.courses?.name || 'Unknown'}</span>
                  <span className="subject-score">{grade.total_score || 0}%</span>
                </div>
              ))}
              {report.student_grades.length > 4 && (
                <div className="subject-item more">
                  +{report.student_grades.length - 4} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <AdminLayout user={null} profile={userProfile}>
      <div className="class-reports-page">
        <div className="page-header">
          <button 
            className="back-button"
            onClick={() => navigate('/admin/classes')}
          >
            <FaArrowLeft /> Back to Classes
          </button>
          <div className="header-content">
            <h1>{className} - Class Reports</h1>
            <p className="page-description">
              View all students and their saved reports for this class
            </p>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="filters-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search students by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-controls">
            <div className="filter-group">
              <label>Term:</label>
              <select 
                value={selectedTerm} 
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Terms</option>
                {availableTerms.map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Academic Year:</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Reports</option>
                <option value="completed">Completed Only</option>
                <option value="draft">Draft Only</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Group By:</label>
              <select 
                value={groupBy} 
                onChange={(e) => setGroupBy(e.target.value)}
                className="filter-select"
              >
                <option value="student">Student</option>
                <option value="term">Term</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading class data...</p>
          </div>
        ) : (
          <>
            {/* Main Content */}
            <div className="main-content">
              <div className="reports-section">
                {groupBy === 'student' ? (
                  // Group by Student
                  <div className="students-reports">
                    {groupedReports().map(({ student, reports }) => (
                      <div key={student.id} className="student-section">
                        <div className="student-header">
                          <div className="student-info">
                            <h3>{student.first_name} {student.last_name}</h3>
                            <p className="student-meta">
                              ID: {student.students?.student_id || 'N/A'} | 
                              Email: {student.email}
                            </p>
                          </div>
                          <div className="student-stats">
                            <span className="reports-count">
                              {reports.length} report{reports.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        
                        {reports.length > 0 ? (
                          <div className="student-reports-grid">
                            {reports.map(report => (
                              <ReportCard key={report.id} report={report} />
                            ))}
                          </div>
                        ) : (
                          <div className="no-reports">
                            <FaFileAlt className="no-reports-icon" />
                            <p>No reports available for the selected filters</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Group by Term
                  <div className="terms-reports">
                    {groupedReports().map(({ term, reports }) => (
                      <div key={term} className="term-section">
                        <div className="term-header">
                          <h3>{term}</h3>
                          <span className="reports-count">
                            {reports.length} report{reports.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="term-reports-grid">
                          {reports.map(report => (
                            <div key={report.id} className="term-report-card">
                              <div className="student-name">
                                {getStudentName(report.student_id)}
                              </div>
                              <ReportCard report={report} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Statistics Panel */}
            <StatisticsPanel />
          </>
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
                  <strong>Student:</strong> {getStudentName(revertingReport.student_id)}
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
                  style={{ width: '100%', marginTop: '0.5rem' }}
                />
                <small style={{ color: '#6b7280', marginTop: '0.25rem' }}>
                  Minimum 10 characters required
                </small>
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

export default ClassReportsPage 