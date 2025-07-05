import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const TeacherDashboard = ({ user, profile }) => {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [students, setStudents] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('Term 1')
  const [loading, setLoading] = useState(true)
  const [gradeEntry, setGradeEntry] = useState({})

  useEffect(() => {
    fetchTeacherCourses()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseStudents()
    }
  }, [selectedCourse, selectedSemester])

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

  const updateGrade = (studentId, field, value) => {
    setGradeEntry(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
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

  return (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Smart Reports - Teacher Dashboard</h1>
          <p className="text-muted">Enter student grades and generate reports</p>
        </div>
      </div>

      {/* Course and Semester Selection */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5>Select Course</h5>
              <select 
                className="form-select"
                value={selectedCourse?.id || ''}
                onChange={(e) => {
                  const course = courses.find(c => c.id === e.target.value)
                  setSelectedCourse(course)
                }}
              >
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5>Select Semester</h5>
              <select 
                className="form-select"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Students by Class */}
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
}

export default TeacherDashboard 