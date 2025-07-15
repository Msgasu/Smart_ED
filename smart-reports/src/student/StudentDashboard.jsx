import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getReportsByStatus, getReportById, REPORT_STATUS } from '../lib/reportApi'
import toast from 'react-hot-toast'

const StudentDashboard = ({ user, profile }) => {
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudentReports()
  }, [])

  const fetchStudentReports = async () => {
    try {
      // Fetch only completed student reports using new API
      const { data: reportsData, error } = await getReportsByStatus(
        REPORT_STATUS.COMPLETED, 
        { student_id: user.id }
      )

      if (error) {
        toast.error(error)
        return
      }

      // Sort by academic year and term (most recent first)
      const sortedReports = (reportsData || []).sort((a, b) => {
        if (a.academic_year !== b.academic_year) {
          return b.academic_year.localeCompare(a.academic_year)
        }
        return b.term.localeCompare(a.term)
      })

      setReports(sortedReports)

      // If there are reports, fetch grades for the most recent one
      if (sortedReports && sortedReports.length > 0) {
        setSelectedReport(sortedReports[0])
        fetchReportGrades(sortedReports[0].id)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Error loading reports')
    } finally {
      setLoading(false)
    }
  }

  const fetchReportGrades = async (reportId) => {
    try {
      const { data: gradesData, error } = await supabase
        .from('student_grades')
        .select(`
          *,
          courses (
            code,
            name
          )
        `)
        .eq('report_id', reportId)

      if (error) throw error

      setGrades(gradesData || [])
    } catch (error) {
      console.error('Error fetching grades:', error)
      toast.error('Error loading grades')
    }
  }

  const handleReportSelect = (report) => {
    setSelectedReport(report)
    fetchReportGrades(report.id)
  }

  const calculateGPA = () => {
    if (grades.length === 0) return 0

    const gradePoints = {
      'A': 4.0,
      'B': 3.0,
      'C': 2.0,
      'D': 1.0,
      'F': 0.0
    }

    const totalPoints = grades.reduce((sum, grade) => {
      return sum + (gradePoints[grade.grade] || 0)
    }, 0)

    return (totalPoints / grades.length).toFixed(2)
  }

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'success'
      case 'B': return 'info'
      case 'C': return 'warning'
      case 'D': return 'secondary'
      case 'F': return 'danger'
      default: return 'secondary'
    }
  }

  if (loading) {
    return <div className="text-center p-4">Loading...</div>
  }

  return (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Smart Reports - Student Dashboard</h1>
          <p className="text-muted">View your academic reports and performance</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h5>Total Reports</h5>
              <h2>{reports.length}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <h5>Current GPA</h5>
              <h2>{calculateGPA()}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <h5>Subjects</h5>
              <h2>{grades.length}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <h5>Class Year</h5>
              <h2>{selectedReport?.class_year || 'N/A'}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Reports List */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5>Your Reports</h5>
            </div>
            <div className="card-body">
              {reports.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <p><strong>No completed reports available yet.</strong></p>
                  <p>Your reports will appear here once they have been finalized by your teachers and administrators.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {reports.map(report => (
                    <div 
                      key={report.id}
                      className={`list-group-item list-group-item-action ${
                        selectedReport?.id === report.id ? 'active' : ''
                      }`}
                      onClick={() => handleReportSelect(report)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">{report.term}</h6>
                        <small>{report.academic_year}</small>
                      </div>
                      <p className="mb-1">Class: {report.class_year}</p>
                      <small>
                        {report.overall_grade && `Grade: ${report.overall_grade}`}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Details */}
        <div className="col-md-8">
          {selectedReport ? (
            <div className="card">
              <div className="card-header">
                <h5>
                  Report Card - {selectedReport.term} {selectedReport.academic_year}
                </h5>
              </div>
              <div className="card-body">
                {/* Student Info */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <p><strong>Student:</strong> {profile.first_name} {profile.last_name}</p>
                    <p><strong>Class:</strong> {selectedReport.class_year}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Term:</strong> {selectedReport.term}</p>
                    <p><strong>Academic Year:</strong> {selectedReport.academic_year}</p>
                  </div>
                </div>

                {/* Grades Table */}
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Class Score</th>
                        <th>Exam Score</th>
                        <th>Total</th>
                        <th>Grade</th>
                        <th>Position</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map(grade => (
                        <tr key={grade.id}>
                          <td>
                            <strong>{grade.courses?.code}</strong><br/>
                            <small className="text-muted">{grade.courses?.name}</small>
                          </td>
                          <td>{grade.class_score}</td>
                          <td>{grade.exam_score}</td>
                          <td className="fw-bold">{grade.total_score}</td>
                          <td>
                            <span className={`badge bg-${getGradeColor(grade.grade)}`}>
                              {grade.grade}
                            </span>
                          </td>
                          <td>{grade.position || '-'}</td>
                          <td>
                            <small>{grade.remark || '-'}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Overall Performance */}
                {selectedReport.total_score && (
                  <div className="row mt-4">
                    <div className="col-md-6">
                      <div className="card bg-light">
                        <div className="card-body">
                          <h6>Overall Performance</h6>
                          <p><strong>Total Score:</strong> {selectedReport.total_score}</p>
                          <p><strong>Overall Grade:</strong> 
                            <span className={`badge bg-${getGradeColor(selectedReport.overall_grade)} ms-2`}>
                              {selectedReport.overall_grade}
                            </span>
                          </p>
                          <p><strong>GPA:</strong> {calculateGPA()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card bg-light">
                        <div className="card-body">
                          <h6>Additional Information</h6>
                          {selectedReport.conduct && (
                            <p><strong>Conduct:</strong> {selectedReport.conduct}</p>
                          )}
                          {selectedReport.attendance && (
                            <p><strong>Attendance:</strong> {selectedReport.attendance}</p>
                          )}
                          {selectedReport.next_class && (
                            <p><strong>Next Class:</strong> {selectedReport.next_class}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Teacher Remarks */}
                {selectedReport.teacher_remarks && (
                  <div className="mt-4">
                    <div className="card bg-light">
                      <div className="card-body">
                        <h6>Teacher's Remarks</h6>
                        <p className="mb-0">{selectedReport.teacher_remarks}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body text-center text-muted py-5">
                <h5>Select a report to view details</h5>
                <p>Choose a report from the list on the left to see your grades and performance.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard 