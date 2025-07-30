import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaUsers, FaBook, FaFileAlt, FaPlus, FaEye, FaEdit, FaClock, FaLock, FaChartBar } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { getReportsByStatus, saveReport, REPORT_STATUS } from '../lib/reportApi'
import toast from 'react-hot-toast'
import TeacherLayout from './TeacherLayout'

const TeacherDashboard = ({ user, profile }) => {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [students, setStudents] = useState([])
  const [allStudents, setAllStudents] = useState([]) // All assigned students
  const [reports, setReports] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('Term 1')
  const [selectedYear, setSelectedYear] = useState('2024')
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'students', 'reports', or 'grades'
  const [loading, setLoading] = useState(true)
  const [gradeEntry, setGradeEntry] = useState({})
  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    totalClasses: 0,
    draftReports: 0,
    completedReports: 0
  })

  useEffect(() => {
    fetchTeacherCourses()
    fetchAllAssignedStudents()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseStudents()
    }
  }, [selectedCourse, selectedSemester])

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchTeacherReports()
    }
  }, [activeTab, selectedSemester, selectedYear])

  const fetchTeacherCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('faculty_courses')
        .select(`
          course_id,
          courses (
            id,
            code,
            name,
            description
          )
        `)
        .eq('faculty_id', user.id)

      if (error) throw error

      const coursesData = data.map(fc => fc.courses)
      setCourses(coursesData)
      
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Error loading courses')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourseStudents = async () => {
    if (!selectedCourse) return

    try {
      setLoading(true)
      
      // Get students enrolled in this course
      const { data: enrolledStudents, error } = await supabase
        .from('student_courses')
        .select(`
          student_id,
          profiles:student_id (
            id,
            first_name,
            last_name,
            email,
            students (
              class_year
            )
          )
        `)
        .eq('course_id', selectedCourse.id)

      if (error) throw error

      // Get existing grades for these students
      const studentIds = enrolledStudents.map(s => s.student_id)
      
      const { data: existingGrades, error: gradesError } = await supabase
        .from('student_grades')
        .select(`
          *,
          student_reports (
            id,
            student_id,
            term,
            academic_year
          )
        `)
        .in('student_reports.student_id', studentIds)
        .eq('subject_id', selectedCourse.id)
        .eq('student_reports.term', selectedSemester)

      if (gradesError) throw gradesError

      // Combine student data with existing grades
      const studentsWithGrades = enrolledStudents.map(enrollment => {
        const student = enrollment.profiles
        const existingGrade = existingGrades?.find(g => 
          g.student_reports.student_id === student.id
        )

        return {
          ...student,
          class_year: student.students?.class_year || 'Unknown',
          currentGrade: existingGrade || null
        }
      })

      // Group by class
      const groupedStudents = studentsWithGrades.reduce((groups, student) => {
        const className = student.class_year
        if (!groups[className]) {
          groups[className] = []
        }
        groups[className].push(student)
        return groups
      }, {})

      setStudents(groupedStudents)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Error loading students')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllAssignedStudents = async () => {
    try {
      // Get all students from all courses taught by this teacher
      const { data: allEnrollments, error } = await supabase
        .from('faculty_courses')
        .select(`
          course_id,
          courses (
            id,
            name,
            code
          ),
          student_courses (
            student_id,
            profiles:student_id (
              id,
              first_name,
              last_name,
              email,
              students (
                class_year,
                student_id
              )
            )
          )
        `)
        .eq('faculty_id', user.id)

      if (error) throw error

      // Flatten and deduplicate students
      const studentsMap = new Map()
      
      allEnrollments.forEach(enrollment => {
        enrollment.student_courses.forEach(sc => {
          const student = sc.profiles
          if (student && !studentsMap.has(student.id)) {
            studentsMap.set(student.id, {
              ...student,
              class_year: student.students?.class_year || 'Unknown',
              student_id: student.students?.student_id || 'N/A'
            })
          }
        })
      })

      const uniqueStudents = Array.from(studentsMap.values())
      setAllStudents(uniqueStudents)

      // Calculate statistics
      const classesList = [...new Set(uniqueStudents.map(s => s.class_year))]
      setStatistics(prev => ({
        ...prev,
        totalStudents: uniqueStudents.length,
        totalClasses: classesList.length
      }))

    } catch (error) {
      console.error('Error fetching all students:', error)
      toast.error('Error loading assigned students')
    }
  }

  const fetchTeacherReports = async () => {
    try {
      setLoading(true)

      // Get student IDs for students in teacher's courses
      const studentIds = allStudents.map(s => s.id)
      
      if (studentIds.length === 0) {
        setReports([])
        return
      }

      // Fetch all reports for the teacher's students
      const filters = {
        student_ids: studentIds,
        term: selectedSemester,
        academic_year: selectedYear
      }

      // Get both draft and completed reports
      const { data: draftReports } = await getReportsByStatus(REPORT_STATUS.DRAFT, filters)
      const { data: completedReports } = await getReportsByStatus(REPORT_STATUS.COMPLETED, filters)
      
      const allReports = [
        ...(draftReports || []),
        ...(completedReports || [])
      ].filter(report => studentIds.includes(report.student_id))

      setReports(allReports)

      // Update statistics
      setStatistics(prev => ({
        ...prev,
        draftReports: draftReports?.length || 0,
        completedReports: completedReports?.length || 0
      }))

    } catch (error) {
      console.error('Error fetching teacher reports:', error)
      toast.error('Error loading reports')
    } finally {
      setLoading(false)
    }
  }

  const updateGrade = (studentId, field, value) => {
    setGradeEntry(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
  }

  const handleCreateReport = async (studentId) => {
    try {
      const student = allStudents.find(s => s.id === studentId)
      if (!student) {
        toast.error('Student not found')
        return
      }

      const newReport = {
        student_id: studentId,
        term: selectedSemester,
        academic_year: selectedYear,
        class_year: student.class_year,
        status: REPORT_STATUS.DRAFT,
        teacher_remarks: '',
        conduct: 'Good',
        attendance: '100%'
      }

      const { data, error } = await saveReport(newReport)
      
      if (error) {
        toast.error(error)
        return
      }

      toast.success('Report created successfully')
      navigate(`/teacher/report-edit/${data.id}`)
      
    } catch (error) {
      console.error('Error creating report:', error)
      toast.error('Failed to create report')
    }
  }

  const handleViewReport = (reportId) => {
    navigate(`/teacher/report-view/${reportId}`)
  }

  const handleEditReport = (reportId) => {
    navigate(`/teacher/report-edit/${reportId}`)
  }

  const getStudentReport = (studentId) => {
    return reports.find(report => 
      report.student_id === studentId && 
      report.term === selectedSemester && 
      report.academic_year === selectedYear
    )
  }

  const groupStudentsByClass = () => {
    const grouped = {}
    allStudents.forEach(student => {
      const className = student.class_year
      if (!grouped[className]) {
        grouped[className] = []
      }
      grouped[className].push(student)
    })
    return grouped
  }

  const saveGrades = async (className) => {
    try {
      toast.loading('Saving grades...')
      
      const studentsInClass = students[className] || []
      const gradesToSave = []

      for (const student of studentsInClass) {
        const gradeData = gradeEntry[student.id]
        if (!gradeData) continue

        // First ensure student has a report for this term
        const { data: existingReport, error: reportError } = await supabase
          .from('student_reports')
          .select('id')
          .eq('student_id', student.id)
          .eq('term', selectedSemester)
          .eq('academic_year', '2024-2025')
          .single()

        let reportId = existingReport?.id

        if (!reportId) {
          // Create report if it doesn't exist
          const { data: newReport, error: createReportError } = await supabase
            .from('student_reports')
            .insert({
              student_id: student.id,
              term: selectedSemester,
              academic_year: '2024-2025',
              class_year: student.class_year
            })
            .select('id')
            .single()

          if (createReportError) throw createReportError
          reportId = newReport.id
        }

        // Calculate total score and grade
        const classScore = parseFloat(gradeData.class_score || 0)
        const examScore = parseFloat(gradeData.exam_score || 0)
        const totalScore = classScore + examScore

        let grade = 'F'
        if (totalScore >= 90) grade = 'A'
        else if (totalScore >= 80) grade = 'B'
        else if (totalScore >= 70) grade = 'C'
        else if (totalScore >= 60) grade = 'D'

        gradesToSave.push({
          report_id: reportId,
          subject_id: selectedCourse.id,
          class_score: classScore,
          exam_score: examScore,
          total_score: totalScore,
          grade: grade,
          remark: gradeData.remark || '',
          teacher_signature: profile.first_name + ' ' + profile.last_name
        })
      }

      if (gradesToSave.length > 0) {
        const { error } = await supabase
          .from('student_grades')
          .upsert(gradesToSave, {
            onConflict: 'report_id,subject_id'
          })

        if (error) throw error
      }

      toast.dismiss()
      toast.success(`Grades saved for ${className}`)
      setGradeEntry({})
      fetchCourseStudents()
    } catch (error) {
      toast.dismiss()
      console.error('Error saving grades:', error)
      toast.error('Error saving grades')
    }
  }

  if (loading) {
    return <div className="text-center p-4">Loading...</div>
  }

  const groupedStudents = groupStudentsByClass()

  const renderDashboardContent = () => (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Teacher Dashboard</h1>
          <p className="text-muted">Welcome back, {profile?.first_name}! Here's your teaching overview.</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaUsers className="me-3" size={24} />
                <div>
                  <h5 className="mb-0">{statistics.totalStudents}</h5>
                  <small>Total Students</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaBook className="me-3" size={24} />
                <div>
                  <h5 className="mb-0">{statistics.totalClasses}</h5>
                  <small>Classes</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaClock className="me-3" size={24} />
                <div>
                  <h5 className="mb-0">{statistics.draftReports}</h5>
                  <small>Draft Reports</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaLock className="me-3" size={24} />
                <div>
                  <h5 className="mb-0">{statistics.completedReports}</h5>
                  <small>Completed Reports</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <button 
                    className="btn btn-outline-primary w-100 mb-2"
                    onClick={() => setActiveTab('students')}
                  >
                    <FaUsers className="me-2" />
                    View Students
                  </button>
                </div>
                <div className="col-md-3">
                  <button 
                    className="btn btn-outline-success w-100 mb-2"
                    onClick={() => setActiveTab('reports')}
                  >
                    <FaFileAlt className="me-2" />
                    Manage Reports
                  </button>
                </div>
                <div className="col-md-3">
                  <button 
                    className="btn btn-outline-warning w-100 mb-2"
                    onClick={() => setActiveTab('grades')}
                  >
                    <FaChartBar className="me-2" />
                    Enter Grades
                  </button>
                </div>
                <div className="col-md-3">
                  <button 
                    className="btn btn-primary w-100 mb-2"
                    onClick={() => navigate('/teacher/report-create')}
                  >
                    <FaPlus className="me-2" />
                    Create Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStudentsContent = () => (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Students by Class</h1>
          <p className="text-muted">View all students assigned to your courses</p>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          <label className="form-label">Academic Year:</label>
          <select 
            className="form-control"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2025">2025</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Term:</label>
          <select 
            className="form-control"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
      </div>

      {/* Students Grouped by Class */}
      <div className="row">
        {Object.entries(groupedStudents).map(([className, classStudents]) => (
          <div key={className} className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  {className} 
                  <span className="badge bg-primary ms-2">{classStudents.length} students</span>
                </h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Student ID</th>
                        <th>Report Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map(student => {
                        const report = getStudentReport(student.id)
                        return (
                          <tr key={student.id}>
                            <td>{student.first_name} {student.last_name}</td>
                            <td>{student.student_id}</td>
                            <td>
                              {report ? (
                                <span className={`badge ${report.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                                  {report.status === 'completed' ? (
                                    <>
                                      <FaLock className="me-1" size={12} />
                                      Completed
                                    </>
                                  ) : (
                                    <>
                                      <FaClock className="me-1" size={12} />
                                      Draft
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="badge bg-secondary">No Report</span>
                              )}
                            </td>
                            <td>
                              {report ? (
                                <div className="btn-group btn-group-sm">
                                  <button 
                                    className="btn btn-outline-primary"
                                    onClick={() => handleViewReport(report.id)}
                                    title="View Report"
                                  >
                                    <FaEye size={12} />
                                  </button>
                                  {report.status === 'draft' && (
                                    <button 
                                      className="btn btn-outline-warning"
                                      onClick={() => handleEditReport(report.id)}
                                      title="Edit Report"
                                    >
                                      <FaEdit size={12} />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleCreateReport(student.id)}
                                  title="Create Report"
                                >
                                  <FaPlus size={12} className="me-1" />
                                  Create
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groupedStudents).length === 0 && (
        <div className="text-center p-4">
          <p className="text-muted">No students assigned to your courses.</p>
        </div>
      )}
    </div>
  )

  const renderReportsContent = () => (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Report Management</h1>
          <p className="text-muted">Create and manage student reports</p>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-4">
          <label className="form-label">Academic Year:</label>
          <select 
            className="form-control"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2025">2025</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Term:</label>
          <select 
            className="form-control"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
        <div className="col-md-4">
          <div className="d-flex align-items-end h-100">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/teacher/report-create')}
            >
              <FaPlus className="me-2" />
              Create New Report
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>Reports for {selectedSemester} {selectedYear}</h5>
            </div>
            <div className="card-body">
              {reports.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Status</th>
                        <th>Total Score</th>
                        <th>Grade</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map(report => {
                        const student = allStudents.find(s => s.id === report.student_id)
                        return (
                          <tr key={report.id}>
                            <td>{student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'}</td>
                            <td>{report.class_year}</td>
                            <td>
                              <span className={`badge ${report.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                                {report.status === 'completed' ? (
                                  <>
                                    <FaLock className="me-1" size={12} />
                                    Completed
                                  </>
                                ) : (
                                  <>
                                    <FaClock className="me-1" size={12} />
                                    Draft
                                  </>
                                )}
                              </span>
                            </td>
                            <td>{report.total_score || 0}%</td>
                            <td>
                              <span className={`badge ${
                                report.overall_grade === 'A' ? 'bg-success' :
                                report.overall_grade === 'B' ? 'bg-info' :
                                report.overall_grade === 'C' ? 'bg-warning' :
                                'bg-secondary'
                              }`}>
                                {report.overall_grade || 'N/A'}
                              </span>
                            </td>
                            <td>{new Date(report.updated_at).toLocaleDateString()}</td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => handleViewReport(report.id)}
                                  title="View Report"
                                >
                                  <FaEye />
                                </button>
                                {report.status === 'draft' && (
                                  <button 
                                    className="btn btn-outline-warning"
                                    onClick={() => handleEditReport(report.id)}
                                    title="Edit Report"
                                  >
                                    <FaEdit />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-muted">No reports found for the selected term and year.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderGradesContent = () => (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Grade Entry</h1>
          <p className="text-muted">Enter and manage student grades by course</p>
        </div>
      </div>

      {/* Course Selection for Grade Entry */}
      <div className="row mb-4">
        <div className="col-md-6">
          <label className="form-label">Select Course:</label>
          <select 
            className="form-control"
            value={selectedCourse?.id || ''}
            onChange={(e) => {
              const course = courses.find(c => c.id === e.target.value)
              setSelectedCourse(course)
            }}
          >
            <option value="">Choose a course...</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Select Semester:</label>
          <select 
            className="form-control"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
      </div>

      {/* Students by Class for Grade Entry */}
      {selectedCourse && (
        <div className="row">
          <div className="col">
            <h3>Students for {selectedCourse.code} - {selectedSemester}</h3>
            
            {Object.entries(students).map(([className, classStudents]) => (
              <div key={className} className="card mb-4">
                <div className="card-header d-flex justify-content-between">
                  <h5>Class: {className} ({classStudents.length} students)</h5>
                  <button 
                    className="btn btn-success"
                    onClick={() => saveGrades(className)}
                  >
                    Save Grades for {className}
                  </button>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Class Score (40)</th>
                          <th>Exam Score (60)</th>
                          <th>Total</th>
                          <th>Grade</th>
                          <th>Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map(student => {
                          const currentGrade = student.currentGrade
                          const entryData = gradeEntry[student.id] || {}
                          const classScore = parseFloat(entryData.class_score || currentGrade?.class_score || 0)
                          const examScore = parseFloat(entryData.exam_score || currentGrade?.exam_score || 0)
                          const total = classScore + examScore

                          return (
                            <tr key={student.id}>
                              <td>{student.first_name} {student.last_name}</td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  max="40"
                                  min="0"
                                  value={entryData.class_score || currentGrade?.class_score || ''}
                                  onChange={(e) => updateGrade(student.id, 'class_score', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  max="60"
                                  min="0"
                                  value={entryData.exam_score || currentGrade?.exam_score || ''}
                                  onChange={(e) => updateGrade(student.id, 'exam_score', e.target.value)}
                                />
                              </td>
                              <td className="fw-bold">{total.toFixed(1)}</td>
                              <td className="fw-bold">
                                {total >= 90 ? 'A' : 
                                 total >= 80 ? 'B' : 
                                 total >= 70 ? 'C' : 
                                 total >= 60 ? 'D' : 'F'}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Enter remark"
                                  value={entryData.remark || currentGrade?.remark || ''}
                                  onChange={(e) => updateGrade(student.id, 'remark', e.target.value)}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}

            {Object.keys(students).length === 0 && (
              <div className="text-center p-4 text-muted">
                No students found for this course and semester.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent()
      case 'students':
        return renderStudentsContent()
      case 'reports':
        return renderReportsContent()
      case 'grades':
        return renderGradesContent()
      default:
        return renderDashboardContent()
    }
  }

  return (
    <TeacherLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      user={user}
      profile={profile}
    >
      {renderContent()}
    </TeacherLayout>
  )
}

export default TeacherDashboard 