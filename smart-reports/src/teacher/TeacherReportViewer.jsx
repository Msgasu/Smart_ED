import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaPrint, FaEdit, FaClock, FaLock, FaUser, FaGraduationCap, FaChartBar } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { getReportById, canEditReport, REPORT_STATUS } from '../lib/reportApi'
import toast from 'react-hot-toast'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar, Line, Radar } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend)

const TeacherReportViewer = ({ user, profile }) => {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [chartType, setChartType] = useState('bar') // 'bar' or 'radar'

  useEffect(() => {
    if (reportId) {
      fetchReport()
    }
  }, [reportId])

  const fetchReport = async () => {
    try {
      setLoading(true)
      
      // Fetch report with teacher access validation
      const { data: reportData, error } = await getReportById(reportId, true) // Include incomplete for teachers
      
      if (error) {
        toast.error(error)
        return
      }

      if (!reportData) {
        toast.error('Report not found')
        return
      }

      // Check if teacher has access to this student
      const hasTeacherAccess = await validateTeacherAccess(reportData.student_id)
      if (!hasTeacherAccess) {
        toast.error('You do not have access to this student\'s report')
        navigate('/dashboard')
        return
      }

      setReport(reportData)
      setHasAccess(true)

      // Check if report can be edited
      const { canEdit: editPermission } = await canEditReport(reportId)
      setCanEdit(editPermission)

    } catch (error) {
      console.error('Error fetching report:', error)
      toast.error('Error loading report')
    } finally {
      setLoading(false)
    }
  }

  const validateTeacherAccess = async (studentId) => {
    try {
      // Check if the teacher teaches any courses that this student is enrolled in
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('faculty_courses')
        .select('course_id')
        .eq('faculty_id', user.id)

      if (coursesError) throw coursesError

      const courseIds = teacherCourses.map(tc => tc.course_id)
      
      if (courseIds.length === 0) return false

      const { data: studentCourses, error: studentError } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', studentId)
        .in('course_id', courseIds)

      if (studentError) throw studentError

      return studentCourses && studentCourses.length > 0
    } catch (error) {
      console.error('Error validating teacher access:', error)
      return false
    }
  }

  const handleEdit = () => {
    navigate(`/teacher/report-edit/${reportId}`)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleGoBack = () => {
    navigate('/dashboard')
  }

  const calculateOverallGrade = () => {
    if (!report?.student_grades || report.student_grades.length === 0) {
      return 'N/A'
    }

    const totalScore = report.student_grades.reduce((sum, grade) => sum + (grade.total_score || 0), 0)
    const averageScore = totalScore / report.student_grades.length

    if (averageScore >= 90) return 'A'
    if (averageScore >= 80) return 'B'
    if (averageScore >= 70) return 'C'
    if (averageScore >= 60) return 'D'
    return 'F'
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!hasAccess || !report) {
    return (
      <div className="container-fluid p-4">
        <div className="text-center">
          <h3>Access Denied</h3>
          <p>You do not have permission to view this report.</p>
          <button className="btn btn-primary" onClick={handleGoBack}>
            Go Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <button 
                className="btn btn-outline-secondary me-3"
                onClick={handleGoBack}
              >
                <FaArrowLeft className="me-2" />
                Back to Dashboard
              </button>
              <div>
                <h2>Student Report</h2>
                <p className="text-muted mb-0">
                  Viewing report for {report.student?.first_name} {report.student?.last_name}
                </p>
              </div>
            </div>
            
            <div className="d-flex align-items-center gap-2">
              <span className={`badge ${report.status === 'completed' ? 'bg-success' : 'bg-warning'} me-3`}>
                {report.status === 'completed' ? (
                  <><FaLock className="me-1" /> Completed</>
                ) : (
                  <><FaClock className="me-1" /> Draft</>
                )}
              </span>
              
              {canEdit && (
                <button 
                  className="btn btn-outline-warning me-2"
                  onClick={handleEdit}
                >
                  <FaEdit className="me-2" />
                  Edit Report
                </button>
              )}
              
              <button 
                className="btn btn-outline-primary"
                onClick={handlePrint}
              >
                <FaPrint className="me-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">Student Academic Report</h4>
            </div>
            <div className="card-body">
              {/* Student Information */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <h5><FaUser className="me-2" />Student Information</h5>
                  <table className="table table-borderless">
                    <tbody>
                      <tr>
                        <td><strong>Name:</strong></td>
                        <td>{report.student?.first_name} {report.student?.last_name}</td>
                      </tr>
                      <tr>
                        <td><strong>Student ID:</strong></td>
                        <td>{report.student?.students?.student_id || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Class:</strong></td>
                        <td>{report.class_year}</td>
                      </tr>
                      <tr>
                        <td><strong>Term:</strong></td>
                        <td>{report.term}</td>
                      </tr>
                      <tr>
                        <td><strong>Academic Year:</strong></td>
                        <td>{report.academic_year}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="col-md-6">
                  <h5><FaChartBar className="me-2" />Performance Summary</h5>
                  <table className="table table-borderless">
                    <tbody>
                      <tr>
                        <td><strong>Overall Grade:</strong></td>
                        <td>
                          <span className={`badge ${
                            calculateOverallGrade() === 'A' ? 'bg-success' :
                            calculateOverallGrade() === 'B' ? 'bg-info' :
                            calculateOverallGrade() === 'C' ? 'bg-warning' :
                            'bg-secondary'
                          } fs-6`}>
                            {calculateOverallGrade()}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Total Subjects:</strong></td>
                        <td>{report.student_grades?.length || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>Attendance:</strong></td>
                        <td>{report.attendance || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Conduct:</strong></td>
                        <td>{report.conduct || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grades Table */}
              {report.student_grades && report.student_grades.length > 0 && (
                <div className="row mb-4">
                  <div className="col-12">
                    <h5><FaGraduationCap className="me-2" />Academic Performance</h5>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>Subject</th>
                            <th>Class Score (40)</th>
                            <th>Exam Score (60)</th>
                            <th>Total Score (100)</th>
                            <th>Grade</th>
                            <th>Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.student_grades.map((grade, index) => (
                            <tr key={index}>
                              <td>{grade.courses?.name || 'Unknown Subject'}</td>
                              <td>{grade.class_score || 0}</td>
                              <td>{grade.exam_score || 0}</td>
                              <td className="fw-bold">{grade.total_score || 0}</td>
                              <td>
                                <span className={`badge ${
                                  grade.grade === 'A' ? 'bg-success' :
                                  grade.grade === 'B' ? 'bg-info' :
                                  grade.grade === 'C' ? 'bg-warning' :
                                  'bg-secondary'
                                }`}>
                                  {grade.grade || 'N/A'}
                                </span>
                              </td>
                              <td>{grade.remark || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Visualization Section - EXACT LIKE THE IMAGE */}
              {report.student_grades && report.student_grades.length > 0 && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="border-bottom pb-2 mb-0">Performance Visualization</h5>
                      <div className="btn-group" role="group">
                        <button 
                          type="button" 
                          className={`btn btn-sm ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setChartType('bar')}
                        >
                          Bar Chart
                        </button>
                        <button 
                          type="button" 
                          className={`btn btn-sm ${chartType === 'radar' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setChartType('radar')}
                        >
                          Radar Chart
                        </button>
                      </div>
                    </div>
                    
                    <div className="card">
                      <div className="card-body">
                        <div style={{ height: '400px', position: 'relative' }}>
                          {chartType === 'bar' ? (
                            // Bar Chart
                            <Bar 
                              data={{
                                labels: report.student_grades.map(grade => grade.courses?.name || 'Unknown'),
                                datasets: [
                                  {
                                    label: 'Class Score (60%)',
                                    data: report.student_grades.map(grade => grade.class_score || 0),
                                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 1
                                  },
                                  {
                                    label: 'Exam Score (40%)',
                                    data: report.student_grades.map(grade => grade.exam_score || 0),
                                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                    borderColor: 'rgba(255, 99, 132, 1)',
                                    borderWidth: 1
                                  },
                                  {
                                    label: 'Total Score',
                                    data: report.student_grades.map(grade => (grade.class_score || 0) + (grade.exam_score || 0)),
                                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    borderWidth: 1
                                  }
                                ]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    max: 100,
                                    title: {
                                      display: true,
                                      text: 'Score'
                                    }
                                  },
                                  x: {
                                    title: {
                                      display: true,
                                      text: 'Subjects'
                                    }
                                  }
                                },
                                plugins: {
                                  title: {
                                    display: true,
                                    text: 'Performance Across Subjects',
                                    font: {
                                      size: 16
                                    }
                                  },
                                  legend: {
                                    position: 'top'
                                  }
                                }
                              }}
                            />
                          ) : (
                            // Radar Chart
                            <Radar 
                              data={{
                                labels: report.student_grades.map(grade => grade.courses?.name || 'Unknown'),
                                datasets: [{
                                  label: 'Total Scores',
                                  data: report.student_grades.map(grade => (grade.class_score || 0) + (grade.exam_score || 0)),
                                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                  borderColor: 'rgba(75, 192, 192, 1)',
                                  pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                                  pointBorderColor: '#fff',
                                  pointHoverBackgroundColor: '#fff',
                                  pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
                                }]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                  r: {
                                    beginAtZero: true,
                                    max: 100,
                                    ticks: {
                                      stepSize: 20
                                    }
                                  }
                                },
                                plugins: {
                                  title: {
                                    display: true,
                                    text: 'Performance Profile',
                                    font: {
                                      size: 16
                                    }
                                  },
                                  legend: {
                                    position: 'top'
                                  }
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Teacher's Remarks */}
              <div className="row mb-4">
                <div className="col-12">
                  <h5>Teacher's Remarks</h5>
                  <div className="border rounded p-3 bg-light">
                    <p className="mb-0">
                      {report.teacher_remarks || 'No remarks provided.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Report Status */}
              <div className="row">
                <div className="col-12">
                  <div className="text-end text-muted">
                    <small>
                      Report {report.status} on {new Date(report.updated_at).toLocaleDateString()}
                      {report.completed_by_profile && (
                        <> by {report.completed_by_profile.first_name} {report.completed_by_profile.last_name}</>
                      )}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherReportViewer 