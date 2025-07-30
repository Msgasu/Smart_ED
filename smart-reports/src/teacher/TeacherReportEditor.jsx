import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaSave, FaEye, FaUser, FaGraduationCap, FaChartBar } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { getReportById, saveReport, canEditReport, REPORT_STATUS } from '../lib/reportApi'
import toast from 'react-hot-toast'

const TeacherReportEditor = ({ user, profile }) => {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  
  const [reportData, setReportData] = useState({
    student_id: '',
    term: 'Term 1',
    academic_year: '2024',
    class_year: '',
    teacher_remarks: '',
    conduct: 'Good',
    attendance: '100%',
    status: REPORT_STATUS.DRAFT
  })
  
  const [grades, setGrades] = useState([])

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (reportId) {
      fetchReport()
    } else {
      setLoading(false)
    }
  }, [reportId])

  const fetchInitialData = async () => {
    try {
      // Fetch teacher's courses
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('faculty_courses')
        .select(`
          course_id,
          courses (
            id,
            code,
            name
          )
        `)
        .eq('faculty_id', user.id)

      if (coursesError) throw coursesError

      const coursesData = teacherCourses.map(fc => fc.courses)
      setCourses(coursesData)

      // Fetch teacher's students
      const courseIds = coursesData.map(c => c.id)
      if (courseIds.length > 0) {
        const { data: studentCourses, error: studentsError } = await supabase
          .from('student_courses')
          .select(`
            student_id,
            profiles:student_id (
              id,
              first_name,
              last_name,
              students (
                class_year,
                student_id
              )
            )
          `)
          .in('course_id', courseIds)

        if (studentsError) throw studentsError

        // Deduplicate students
        const studentsMap = new Map()
        studentCourses.forEach(sc => {
          const student = sc.profiles
          if (student && !studentsMap.has(student.id)) {
            studentsMap.set(student.id, {
              ...student,
              class_year: student.students?.class_year || 'Unknown',
              student_id: student.students?.student_id || 'N/A'
            })
          }
        })

        setStudents(Array.from(studentsMap.values()))
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
      toast.error('Error loading data')
    }
  }

  const fetchReport = async () => {
    try {
      setLoading(true)
      
      const { data: reportData, error } = await getReportById(reportId, true)
      
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

      // Check if report can be edited
      const { canEdit: editPermission } = await canEditReport(reportId)
      if (!editPermission) {
        toast.error('This report cannot be edited')
        navigate(`/teacher/report-view/${reportId}`)
        return
      }

      setReportData(reportData)
      setHasAccess(true)
      setCanEdit(true)

      // Fetch existing grades for this report
      const { data: existingGrades, error: gradesError } = await supabase
        .from('student_grades')
        .select(`
          *,
          courses (
            id,
            code,
            name
          )
        `)
        .eq('report_id', reportId)

      if (gradesError) throw gradesError

      // Initialize grades for all teacher's courses
      const initialGrades = courses.map(course => {
        const existingGrade = existingGrades?.find(g => g.subject_id === course.id)
        return {
          subject_id: course.id,
          course_name: course.name,
          course_code: course.code,
          class_score: existingGrade?.class_score || '',
          exam_score: existingGrade?.exam_score || '',
          total_score: existingGrade?.total_score || 0,
          grade: existingGrade?.grade || '',
          remark: existingGrade?.remark || '',
          id: existingGrade?.id || null
        }
      })

      setGrades(initialGrades)

    } catch (error) {
      console.error('Error fetching report:', error)
      toast.error('Error loading report')
    } finally {
      setLoading(false)
    }
  }

  const validateTeacherAccess = async (studentId) => {
    try {
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

  const handleReportDataChange = (field, value) => {
    setReportData(prev => ({
      ...prev,
      [field]: value
    }))

    // Auto-populate class year if student is selected
    if (field === 'student_id' && value) {
      const selectedStudent = students.find(s => s.id === value)
      if (selectedStudent) {
        setReportData(prev => ({
          ...prev,
          class_year: selectedStudent.class_year
        }))
      }
    }
  }

  const handleGradeChange = (courseIndex, field, value) => {
    setGrades(prev => {
      const newGrades = [...prev]
      newGrades[courseIndex] = {
        ...newGrades[courseIndex],
        [field]: value
      }

      // Auto-calculate total and grade
      if (field === 'class_score' || field === 'exam_score') {
        const classScore = parseFloat(newGrades[courseIndex].class_score || 0)
        const examScore = parseFloat(newGrades[courseIndex].exam_score || 0)
        const totalScore = classScore + examScore

        newGrades[courseIndex].total_score = totalScore

        // Calculate letter grade
        let grade = 'F'
        if (totalScore >= 90) grade = 'A'
        else if (totalScore >= 80) grade = 'B'
        else if (totalScore >= 70) grade = 'C'
        else if (totalScore >= 60) grade = 'D'

        newGrades[courseIndex].grade = grade
      }

      return newGrades
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Validate required fields
      if (!reportData.student_id) {
        toast.error('Please select a student')
        return
      }

      // Save report data
      const reportToSave = {
        ...reportData,
        id: reportId || undefined
      }

      const { data: savedReport, error: reportError } = await saveReport(reportToSave)

      if (reportError) {
        toast.error(reportError)
        return
      }

      const finalReportId = savedReport.id

      // Save grades
      const gradesToSave = grades.filter(grade => 
        grade.class_score !== '' || grade.exam_score !== '' || grade.remark !== ''
      )

      if (gradesToSave.length > 0) {
        for (const grade of gradesToSave) {
          const gradeData = {
            report_id: finalReportId,
            subject_id: grade.subject_id,
            class_score: parseFloat(grade.class_score || 0),
            exam_score: parseFloat(grade.exam_score || 0),
            total_score: grade.total_score,
            grade: grade.grade,
            remark: grade.remark || '',
            teacher_signature: `${profile.first_name} ${profile.last_name}`
          }

          if (grade.id) {
            // Update existing grade
            const { error } = await supabase
              .from('student_grades')
              .update(gradeData)
              .eq('id', grade.id)

            if (error) throw error
          } else {
            // Insert new grade
            const { error } = await supabase
              .from('student_grades')
              .insert([gradeData])

            if (error) throw error
          }
        }
      }

      toast.success('Report saved successfully')
      
      // Redirect to view the saved report
      navigate(`/teacher/report-view/${finalReportId}`)

    } catch (error) {
      console.error('Error saving report:', error)
      toast.error('Failed to save report')
    } finally {
      setSaving(false)
    }
  }

  const handleGoBack = () => {
    navigate('/dashboard')
  }

  const handlePreview = () => {
    if (reportId) {
      navigate(`/teacher/report-view/${reportId}`)
    } else {
      toast.error('Save the report first to preview')
    }
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

  if (reportId && (!hasAccess || !canEdit)) {
    return (
      <div className="container-fluid p-4">
        <div className="text-center">
          <h3>Access Denied</h3>
          <p>You do not have permission to edit this report.</p>
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
                <h2>{reportId ? 'Edit Report' : 'Create New Report'}</h2>
                <p className="text-muted mb-0">
                  {reportId ? 'Editing existing student report' : 'Create a new report for a student'}
                </p>
              </div>
            </div>
            
            <div className="d-flex align-items-center gap-2">
              {reportId && (
                <button 
                  className="btn btn-outline-info me-2"
                  onClick={handlePreview}
                >
                  <FaEye className="me-2" />
                  Preview
                </button>
              )}
              
              <button 
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                <FaSave className="me-2" />
                {saving ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">Student Report Form</h4>
            </div>
            <div className="card-body">
              {/* Basic Information */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <h5><FaUser className="me-2" />Student Information</h5>
                  
                  <div className="mb-3">
                    <label className="form-label">Select Student *</label>
                    <select 
                      className="form-control"
                      value={reportData.student_id}
                      onChange={(e) => handleReportDataChange('student_id', e.target.value)}
                      disabled={!!reportId} // Can't change student for existing reports
                    >
                      <option value="">Choose a student...</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} ({student.student_id}) - {student.class_year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Class Year</label>
                    <input
                      type="text"
                      className="form-control"
                      value={reportData.class_year}
                      onChange={(e) => handleReportDataChange('class_year', e.target.value)}
                      placeholder="e.g., Grade 10"
                    />
                  </div>
                </div>
                
                <div className="col-md-6">
                  <h5><FaChartBar className="me-2" />Report Details</h5>
                  
                  <div className="mb-3">
                    <label className="form-label">Term</label>
                    <select 
                      className="form-control"
                      value={reportData.term}
                      onChange={(e) => handleReportDataChange('term', e.target.value)}
                    >
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Academic Year</label>
                    <select 
                      className="form-control"
                      value={reportData.academic_year}
                      onChange={(e) => handleReportDataChange('academic_year', e.target.value)}
                    >
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2025">2025</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Attendance</label>
                    <input
                      type="text"
                      className="form-control"
                      value={reportData.attendance}
                      onChange={(e) => handleReportDataChange('attendance', e.target.value)}
                      placeholder="e.g., 95%"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Conduct</label>
                    <select 
                      className="form-control"
                      value={reportData.conduct}
                      onChange={(e) => handleReportDataChange('conduct', e.target.value)}
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Satisfactory">Satisfactory</option>
                      <option value="Needs Improvement">Needs Improvement</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grades Section */}
              <div className="row mb-4">
                <div className="col-12">
                  <h5><FaGraduationCap className="me-2" />Academic Performance</h5>
                  
                  {courses.length > 0 ? (
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
                          {grades.map((grade, index) => (
                            <tr key={index}>
                              <td>
                                <strong>{grade.course_code}</strong><br />
                                <small className="text-muted">{grade.course_name}</small>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  max="40"
                                  min="0"
                                  value={grade.class_score}
                                  onChange={(e) => handleGradeChange(index, 'class_score', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  max="60"
                                  min="0"
                                  value={grade.exam_score}
                                  onChange={(e) => handleGradeChange(index, 'exam_score', e.target.value)}
                                />
                              </td>
                              <td className="fw-bold text-center">
                                {grade.total_score}
                              </td>
                              <td className="text-center">
                                <span className={`badge ${
                                  grade.grade === 'A' ? 'bg-success' :
                                  grade.grade === 'B' ? 'bg-info' :
                                  grade.grade === 'C' ? 'bg-warning' :
                                  'bg-secondary'
                                }`}>
                                  {grade.grade || 'N/A'}
                                </span>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Enter remark"
                                  value={grade.remark}
                                  onChange={(e) => handleGradeChange(index, 'remark', e.target.value)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center p-4 text-muted">
                      <p>No courses assigned to you. Contact the administrator to assign courses.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Teacher's Remarks */}
              <div className="row mb-4">
                <div className="col-12">
                  <h5>Teacher's Remarks</h5>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={reportData.teacher_remarks}
                    onChange={(e) => handleReportDataChange('teacher_remarks', e.target.value)}
                    placeholder="Enter your remarks about the student's performance, behavior, and areas for improvement..."
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="row">
                <div className="col-12">
                  <div className="d-flex justify-content-end gap-2">
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={handleGoBack}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <FaSave className="me-2" />
                      {saving ? 'Saving...' : 'Save Report'}
                    </button>
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

export default TeacherReportEditor 