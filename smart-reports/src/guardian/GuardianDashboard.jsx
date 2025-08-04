import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import GuardianLayout from './GuardianLayout'
import GuardianReportViewer from './GuardianReportViewer'
import toast from 'react-hot-toast'
import { FaUser, FaFileAlt, FaDownload, FaEye, FaChartBar, FaTrophy, FaClock, FaGraduationCap } from 'react-icons/fa'

const GuardianDashboard = ({ user, profile }) => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [wards, setWards] = useState([])
  const [selectedWard, setSelectedWard] = useState(null)
  const [wardReports, setWardReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)

  useEffect(() => {
    if (user) {
      fetchWards()
    }
  }, [user])

  useEffect(() => {
    if (selectedWard) {
      fetchWardReports()
    }
  }, [selectedWard])

  const fetchWards = async () => {
    try {
      setLoading(true)
      
      // Fetch students that this guardian is responsible for
      const { data: guardianStudents, error: guardianError } = await supabase
        .from('guardian_students')
        .select(`
          student_id,
          profiles!guardian_students_student_id_fkey (
            id,
            first_name,
            last_name,
            email,
            students (
              student_id,
              class_year,
              date_of_birth,
              phone_number
            )
          )
        `)
        .eq('guardian_id', user.id)

      if (guardianError) throw guardianError

      setWards(guardianStudents || [])
      
      // Auto-select first ward if available
      if (guardianStudents && guardianStudents.length > 0) {
        setSelectedWard(guardianStudents[0])
      }
      
    } catch (error) {
      console.error('Error fetching wards:', error)
      toast.error('Failed to load ward information')
    } finally {
      setLoading(false)
    }
  }

  const fetchWardReports = async () => {
    if (!selectedWard) return

    try {
      const { data: reports, error } = await supabase
        .from('student_reports')
        .select(`
          *,
          student_grades (
            *,
            courses (
              course_name,
              course_code
            )
          )
        `)
        .eq('student_id', selectedWard.student_id)
        .order('academic_year', { ascending: false })
        .order('term', { ascending: false })

      if (error) throw error

      setWardReports(reports || [])
    } catch (error) {
      console.error('Error fetching ward reports:', error)
      toast.error('Failed to load reports')
    }
  }

  const calculateOverallPerformance = () => {
    if (wardReports.length === 0) return null

    const latestReport = wardReports[0]
    const grades = latestReport?.student_grades || []
    
    if (grades.length === 0) return null

    const totalScore = grades.reduce((sum, grade) => sum + (grade.total_score || 0), 0)
    const averageScore = totalScore / grades.length
    
    const excellentGrades = grades.filter(g => (g.total_score || 0) >= 80).length
    const goodGrades = grades.filter(g => (g.total_score || 0) >= 60 && (g.total_score || 0) < 80).length
    const needsImprovement = grades.filter(g => (g.total_score || 0) < 60).length

    return {
      average: averageScore.toFixed(1),
      total: grades.length,
      excellent: excellentGrades,
      good: goodGrades,
      needsImprovement,
      conduct: latestReport.conduct || 'N/A',
      attendance: latestReport.attendance || 'N/A'
    }
  }

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="loading">
          <div className="loading-spinner"></div>
          Loading ward information...
        </div>
      )
    }

    if (wards.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FaUser />
          </div>
          <h3>No Wards Found</h3>
          <p>You don't have any wards assigned to your account.</p>
          <p>Please contact the school administration if you believe this is an error.</p>
        </div>
      )
    }

    const performance = calculateOverallPerformance()

    return (
      <>
        {/* Page Header */}
        <div className="page-header">
          <div className="header-content">
            <h1>Guardian Dashboard</h1>
            <p className="page-description">Monitor your ward's academic progress and access reports</p>
          </div>
        </div>

        {/* Ward Selection */}
        {wards.length > 1 && (
          <div className="ward-selection-section" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--gray-900)' }}>Select Ward</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {wards.map((ward) => (
                <div
                  key={ward.student_id}
                  className={`ward-card ${selectedWard?.student_id === ward.student_id ? 'selected' : ''}`}
                  onClick={() => setSelectedWard(ward)}
                  style={{
                    cursor: 'pointer',
                    border: selectedWard?.student_id === ward.student_id ? '2px solid var(--guardian-primary)' : '1px solid var(--gray-200)'
                  }}
                >
                  <div className="ward-header">
                    <div className="ward-avatar">
                      {ward.profiles?.first_name?.[0]}{ward.profiles?.last_name?.[0]}
                    </div>
                    <div className="ward-info">
                      <h3>{ward.profiles?.first_name} {ward.profiles?.last_name}</h3>
                      <div className="ward-details">
                        <p>Class: {ward.profiles?.students?.class_year || 'N/A'}</p>
                        <p>Student ID: {ward.profiles?.students?.student_id || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Ward Information */}
        {selectedWard && (
          <>
            {/* Ward Profile Card */}
            <div className="ward-card">
              <div className="ward-header">
                <div className="ward-avatar">
                  {selectedWard.profiles?.first_name?.[0]}{selectedWard.profiles?.last_name?.[0]}
                </div>
                <div className="ward-info">
                  <h3>{selectedWard.profiles?.first_name} {selectedWard.profiles?.last_name}</h3>
                  <div className="ward-details">
                    <p><strong>Class:</strong> {selectedWard.profiles?.students?.class_year || 'N/A'}</p>
                    <p><strong>Student ID:</strong> {selectedWard.profiles?.students?.student_id || 'N/A'}</p>
                    <p><strong>Email:</strong> {selectedWard.profiles?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            {performance && (
              <div className="performance-summary">
                <div className="summary-card excellent">
                  <div className="summary-value">{performance.average}%</div>
                  <div className="summary-label">Overall Average</div>
                </div>
                <div className="summary-card good">
                  <div className="summary-value">{performance.excellent}</div>
                  <div className="summary-label">Excellent Grades</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{performance.good}</div>
                  <div className="summary-label">Good Grades</div>
                </div>
                <div className="summary-card needs-improvement">
                  <div className="summary-value">{performance.needsImprovement}</div>
                  <div className="summary-label">Needs Improvement</div>
                </div>
              </div>
            )}

            {/* Recent Reports */}
            <div className="report-card">
              <div className="report-card-header">
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaFileAlt />
                  Recent Academic Reports
                </h4>
              </div>
              <div className="report-card-body">
                {wardReports.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <FaFileAlt />
                    </div>
                    <h3>No Reports Available</h3>
                    <p>No academic reports have been generated for this student yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {wardReports.slice(0, 3).map((report) => (
                      <div
                        key={report.id}
                        style={{
                          border: '1px solid var(--gray-200)',
                          borderRadius: '6px',
                          padding: '1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = 'var(--guardian-primary)'
                          e.target.style.boxShadow = '0 2px 8px rgba(107, 70, 193, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = 'var(--gray-200)'
                          e.target.style.boxShadow = 'none'
                        }}
                      >
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--gray-900)' }}>
                            {report.term} - {report.academic_year}
                          </h4>
                          <p style={{ margin: '0', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                            Class: {report.class_year} | Average: {report.total_score?.toFixed(1) || 'N/A'}% | Grade: {report.overall_grade || 'N/A'}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedReport(report)}
                          style={{
                            background: 'var(--guardian-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'var(--guardian-dark)'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'var(--guardian-primary)'
                          }}
                        >
                          <FaEye /> View Report
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="guardian-actions">
              <div className="action-button" onClick={() => setActiveTab('reports')}>
                <div className="action-icon">
                  <FaFileAlt />
                </div>
                <div className="action-title">All Reports</div>
                <div className="action-description">View all academic reports for your ward</div>
              </div>
              
              <div className="action-button" onClick={() => setActiveTab('ward-profile')}>
                <div className="action-icon">
                  <FaUser />
                </div>
                <div className="action-title">Ward Profile</div>
                <div className="action-description">View detailed student information</div>
              </div>
              
              <div className="action-button">
                <div className="action-icon">
                  <FaChartBar />
                </div>
                <div className="action-title">Performance Trends</div>
                <div className="action-description">View academic progress over time</div>
              </div>
            </div>
          </>
        )}
      </>
    )
  }

  const renderWardProfile = () => {
    if (!selectedWard) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FaUser />
          </div>
          <h3>No Ward Selected</h3>
          <p>Please select a ward to view their profile information.</p>
        </div>
      )
    }

    return (
      <>
        <div className="page-header">
          <div className="header-content">
            <h1>Ward Profile</h1>
            <p className="page-description">Detailed information about your ward</p>
          </div>
        </div>

        <div className="ward-card">
          <div className="ward-header">
            <div className="ward-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
              {selectedWard.profiles?.first_name?.[0]}{selectedWard.profiles?.last_name?.[0]}
            </div>
            <div className="ward-info">
              <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--gray-900)' }}>
                {selectedWard.profiles?.first_name} {selectedWard.profiles?.last_name}
              </h2>
              <div className="ward-details" style={{ fontSize: '1rem' }}>
                <p><strong>Student ID:</strong> {selectedWard.profiles?.students?.student_id || 'N/A'}</p>
                <p><strong>Class:</strong> {selectedWard.profiles?.students?.class_year || 'N/A'}</p>
                <p><strong>Email:</strong> {selectedWard.profiles?.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {selectedWard.profiles?.students?.phone_number || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const renderReports = () => {
    return (
      <>
        <div className="page-header">
          <div className="header-content">
            <h1>Academic Reports</h1>
            <p className="page-description">View all academic reports for your ward</p>
          </div>
        </div>

        {!selectedWard ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FaFileAlt />
            </div>
            <h3>No Ward Selected</h3>
            <p>Please select a ward to view their reports.</p>
          </div>
        ) : wardReports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FaFileAlt />
            </div>
            <h3>No Reports Available</h3>
            <p>No academic reports have been generated for this student yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {wardReports.map((report) => (
              <div
                key={report.id}
                className="report-card"
              >
                <div className="report-card-header">
                  <h4 style={{ margin: 0 }}>
                    {report.term} - {report.academic_year}
                  </h4>
                </div>
                <div className="report-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <strong>Class:</strong> {report.class_year}
                    </div>
                    <div>
                      <strong>Average Score:</strong> {report.total_score?.toFixed(1) || 'N/A'}%
                    </div>
                    <div>
                      <strong>Overall Grade:</strong> {report.overall_grade || 'N/A'}
                    </div>
                    <div>
                      <strong>Attendance:</strong> {report.attendance || 'N/A'}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReport(report)}
                    style={{
                      background: 'var(--guardian-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.75rem 1.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FaEye /> View Full Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  const renderContent = () => {
    if (selectedReport) {
      return (
        <GuardianReportViewer
          report={selectedReport}
          student={selectedWard?.profiles}
          onBack={() => setSelectedReport(null)}
        />
      )
    }

    switch (activeTab) {
      case 'dashboard':
        return renderDashboard()
      case 'ward-profile':
        return renderWardProfile()
      case 'reports':
        return renderReports()
      default:
        return renderDashboard()
    }
  }

  return (
    <GuardianLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      profile={profile}
    >
      {renderContent()}
    </GuardianLayout>
  )
}

export default GuardianDashboard 