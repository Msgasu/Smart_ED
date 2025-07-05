import React, { useState, useEffect, useCallback, useRef } from 'react'
import { FaPlus, FaSearch, FaTrashAlt, FaCalendarAlt, FaSave, FaPrint, FaFileExport } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'
import './Reports.css'

const Reports = () => {
  const [subjects, setSubjects] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [availableCourses, setAvailableCourses] = useState([])
  const [filteredCourses, setFilteredCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [students, setStudents] = useState([])
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [selectedYear, setSelectedYear] = useState('2024-2025')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportData, setReportData] = useState({
    studentName: '',
    studentClass: '',
    studentAge: '',
    studentGender: '',
    attendance: '',
    conduct: '',
    nextClass: '',
    teacherRemarks: '',
    principalSignature: '',
    reopeningDate: ''
  })

  // Refs for form fields
  const studentNameRef = useRef(null)
  const averageRef = useRef(null)
  const termRef = useRef(null)
  const academicYearRef = useRef(null)

  // Load students on component mount
  useEffect(() => {
    fetchStudents()
    fetchCourses()
  }, [])

  // Update report data when student changes
  useEffect(() => {
    if (selectedStudent) {
      setReportData(prev => ({
        ...prev,
        studentName: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
        studentClass: selectedStudent.students?.class_year || '',
        studentAge: calculateAge(selectedStudent.date_of_birth) || ''
      }))
      
      // Load existing report data if any
      loadStudentReport()
    }
  }, [selectedStudent, selectedTerm, selectedYear])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          students (
            class_year,
            student_id
          )
        `)
        .eq('role', 'student')
        .order('first_name')

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Error loading students')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name')

      if (error) throw error
      setAvailableCourses(data || [])
      setFilteredCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Error loading courses')
    }
  }

  const loadStudentReport = async () => {
    if (!selectedStudent) return
    
    try {
      setReportLoading(true)
      
      // Get existing report
      const { data: existingReport, error: reportError } = await supabase
        .from('student_reports')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .eq('term', selectedTerm)
        .eq('academic_year', selectedYear)
        .single()

      if (reportError && reportError.code !== 'PGRST116') {
        throw reportError
      }

      if (existingReport) {
        setReportData(prev => ({
          ...prev,
          attendance: existingReport.attendance || '',
          conduct: existingReport.conduct || '',
          nextClass: existingReport.next_class || '',
          teacherRemarks: existingReport.teacher_remarks || '',
          principalSignature: existingReport.principal_signature || '',
          reopeningDate: existingReport.reopening_date || ''
        }))

        // Load grades for this report
        const { data: grades, error: gradesError } = await supabase
          .from('student_grades')
          .select(`
            *,
            courses (
              id,
              name,
              code
            )
          `)
          .eq('report_id', existingReport.id)

        if (gradesError) throw gradesError

        const subjectsWithGrades = grades.map(grade => ({
          id: grade.id,
          courseId: grade.subject_id,
          name: grade.courses.name,
          code: grade.courses.code,
          classScore: grade.class_score?.toString() || '',
          examScore: grade.exam_score?.toString() || '',
          totalScore: grade.total_score?.toString() || '',
          position: grade.position || '',
          grade: grade.grade || '',
          remark: grade.remark || '',
          teacherSignature: grade.teacher_signature || ''
        }))

        setSubjects(subjectsWithGrades)
      } else {
        // Load default subjects based on student's enrolled courses
        loadDefaultSubjects()
      }
    } catch (error) {
      console.error('Error loading student report:', error)
      toast.error('Error loading student report')
    } finally {
      setReportLoading(false)
    }
  }

  const loadDefaultSubjects = async () => {
    if (!selectedStudent) return

    try {
      const { data: enrolledCourses, error } = await supabase
        .from('student_courses')
        .select(`
          course_id,
          courses (
            id,
            name,
            code
          )
        `)
        .eq('student_id', selectedStudent.id)

      if (error) throw error

      const defaultSubjects = enrolledCourses.map(enrollment => ({
        id: uuidv4(),
        courseId: enrollment.course_id,
        name: enrollment.courses.name,
        code: enrollment.courses.code,
        classScore: '',
        examScore: '',
        totalScore: '',
        position: '',
        grade: '',
        remark: '',
        teacherSignature: ''
      }))

      setSubjects(defaultSubjects)
    } catch (error) {
      console.error('Error loading default subjects:', error)
      setSubjects([])
    }
  }

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return ''
    
    const dob = new Date(dateOfBirth)
    const today = new Date()
    
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    
    return age
  }

  const calculateGrade = (total) => {
    if (!total || isNaN(total)) return 'F9'
    
    const score = parseFloat(total)
    
    if (score >= 95) return 'A1'
    if (score >= 90) return 'A2'
    if (score >= 85) return 'B2'
    if (score >= 80) return 'B3'
    if (score >= 75) return 'B4'
    if (score >= 70) return 'C4'
    if (score >= 65) return 'C5'
    if (score >= 60) return 'C6'
    if (score >= 55) return 'D7'
    if (score >= 50) return 'D8'
    if (score >= 45) return 'E8'
    if (score >= 40) return 'E9'
    return 'F9'
  }

  const calculateRemark = (total) => {
    if (!total || isNaN(total)) return 'Fail'
    
    const score = parseFloat(total)
    
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Very Good'
    if (score >= 65) return 'Good'
    if (score >= 55) return 'Fair'
    if (score >= 45) return 'Pass'
    return 'Fail'
  }

  const calculateTotal = (classScore, examScore) => {
    const cls = parseFloat(classScore) || 0
    const exam = parseFloat(examScore) || 0
    return cls + exam
  }

  const calculateAverage = () => {
    if (!subjects.length) return '0.00'
    
    const validScores = subjects.filter(subject => {
      const totalScore = calculateTotal(subject.classScore, subject.examScore)
      return !isNaN(totalScore) && totalScore > 0
    })
    
    if (!validScores.length) return '0.00'
    
    const sum = validScores.reduce((acc, subject) => {
      return acc + calculateTotal(subject.classScore, subject.examScore)
    }, 0)
    
    return (sum / validScores.length).toFixed(2)
  }

  const handleSearch = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    
    if (value.trim() === '') {
      setFilteredCourses(availableCourses)
    } else {
      const filtered = availableCourses.filter(course =>
        course.name.toLowerCase().includes(value.toLowerCase()) ||
        course.code.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredCourses(filtered)
    }
  }

  const addSubject = (course) => {
    const existingSubject = subjects.find(s => s.courseId === course.id)
    if (existingSubject) {
      toast.error('Subject already added')
      return
    }

    const newSubject = {
      id: uuidv4(),
      courseId: course.id,
      name: course.name,
      code: course.code,
      classScore: '',
      examScore: '',
      totalScore: '',
      position: '',
      grade: '',
      remark: '',
      teacherSignature: ''
    }

    setSubjects([...subjects, newSubject])
    toast.success(`${course.name} added successfully`)
  }

  const removeSubject = (id) => {
    setSubjects(subjects.filter(subject => subject.id !== id))
    toast.success('Subject removed successfully')
  }

  const handleSubjectChange = (id, field, value) => {
    const updatedSubjects = subjects.map(subject => {
      if (subject.id === id) {
        const updatedSubject = { ...subject, [field]: value }
        
        // Auto-calculate total, grade, and remark when class or exam score changes
        if (field === 'classScore' || field === 'examScore') {
          const total = calculateTotal(
            field === 'classScore' ? value : subject.classScore,
            field === 'examScore' ? value : subject.examScore
          )
          updatedSubject.totalScore = total.toString()
          updatedSubject.grade = calculateGrade(total)
          updatedSubject.remark = calculateRemark(total)
        }
        
        return updatedSubject
      }
      return subject
    })
    
    setSubjects(updatedSubjects)
  }

  const saveReport = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student first')
      return
    }

    if (subjects.length === 0) {
      toast.error('Please add at least one subject')
      return
    }

    try {
      setReportLoading(true)
      toast.loading('Saving report...')

      // Create or update student report
      const reportPayload = {
        student_id: selectedStudent.id,
        term: selectedTerm,
        academic_year: selectedYear,
        class_year: reportData.studentClass,
        total_score: parseFloat(calculateAverage()),
        overall_grade: calculateGrade(parseFloat(calculateAverage())),
        attendance: reportData.attendance,
        conduct: reportData.conduct,
        next_class: reportData.nextClass,
        teacher_remarks: reportData.teacherRemarks,
        principal_signature: reportData.principalSignature,
        reopening_date: reportData.reopeningDate
      }

      const { data: savedReport, error: reportError } = await supabase
        .from('student_reports')
        .upsert(reportPayload, {
          onConflict: 'student_id,term,academic_year'
        })
        .select()
        .single()

      if (reportError) throw reportError

      // Save grades
      const gradesPayload = subjects.map(subject => ({
        report_id: savedReport.id,
        subject_id: subject.courseId,
        class_score: parseFloat(subject.classScore) || 0,
        exam_score: parseFloat(subject.examScore) || 0,
        total_score: parseFloat(subject.totalScore) || 0,
        position: subject.position || null,
        grade: subject.grade,
        remark: subject.remark,
        teacher_signature: subject.teacherSignature
      }))

      const { error: gradesError } = await supabase
        .from('student_grades')
        .upsert(gradesPayload, {
          onConflict: 'report_id,subject_id'
        })

      if (gradesError) throw gradesError

      toast.dismiss()
      toast.success('Report saved successfully!')
      
      // Reload the report to reflect saved changes
      loadStudentReport()
    } catch (error) {
      toast.dismiss()
      console.error('Error saving report:', error)
      toast.error('Error saving report')
    } finally {
      setReportLoading(false)
    }
  }

  const printReport = () => {
    window.print()
  }

  const exportReport = () => {
    toast.success('Export functionality will be implemented soon')
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Student Reports</h1>
        <div className="header-actions">
          <button className="btn btn-success" onClick={saveReport} disabled={reportLoading}>
            <FaSave /> Save Report
          </button>
          <button className="btn btn-primary" onClick={printReport}>
            <FaPrint /> Print
          </button>
          <button className="btn btn-secondary" onClick={exportReport}>
            <FaFileExport /> Export
          </button>
        </div>
      </div>

      {/* Student Selection */}
      <div className="student-selection-section">
        <div className="form-group">
          <label>Select Student:</label>
          <select
            className="form-control"
            value={selectedStudent?.id || ''}
            onChange={(e) => {
              const student = students.find(s => s.id === e.target.value)
              setSelectedStudent(student)
            }}
          >
            <option value="">-- Select a student --</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name} - {student.students?.class_year || 'No Class'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedStudent && (
        <>
          {/* Report Header */}
          <div className="report-header-section">
            <div className="school-info">
              <h2>Smart Educational Dashboard</h2>
              <p>Private Mail Bag, 252 Tema. / Tel: 024 437 7584</p>
              <h3>TERMINAL REPORT</h3>
            </div>
          </div>

          {/* Student Information */}
          <div className="student-info-section">
            <h3>Student Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Student Name:</label>
                <input
                  type="text"
                  className="form-control"
                  value={reportData.studentName}
                  onChange={(e) => setReportData(prev => ({ ...prev, studentName: e.target.value }))}
                  ref={studentNameRef}
                />
              </div>
              <div className="info-item">
                <label>Class:</label>
                <input
                  type="text"
                  className="form-control"
                  value={reportData.studentClass}
                  onChange={(e) => setReportData(prev => ({ ...prev, studentClass: e.target.value }))}
                />
              </div>
              <div className="info-item">
                <label>Age:</label>
                <input
                  type="text"
                  className="form-control"
                  value={reportData.studentAge}
                  readOnly
                />
              </div>
              <div className="info-item">
                <label>Gender:</label>
                <select
                  className="form-control"
                  value={reportData.studentGender}
                  onChange={(e) => setReportData(prev => ({ ...prev, studentGender: e.target.value }))}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="info-item">
                <label>Term:</label>
                <select
                  className="form-control"
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  ref={termRef}
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
              <div className="info-item">
                <label>Academic Year:</label>
                <input
                  type="text"
                  className="form-control"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  ref={academicYearRef}
                />
              </div>
              <div className="info-item">
                <label>Average:</label>
                <input
                  type="text"
                  className="form-control"
                  value={calculateAverage()}
                  readOnly
                  ref={averageRef}
                />
              </div>
              <div className="info-item">
                <label>Attendance:</label>
                <input
                  type="text"
                  className="form-control"
                  value={reportData.attendance}
                  onChange={(e) => setReportData(prev => ({ ...prev, attendance: e.target.value }))}
                  placeholder="e.g., 45/50 days"
                />
              </div>
            </div>
          </div>

          {/* Academic Performance */}
          <div className="academic-performance-section">
            <div className="section-header">
              <h3>Academic Performance</h3>
              <div className="subject-actions">
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search for a subject..."
                    value={searchTerm}
                    onChange={handleSearch}
                    onFocus={() => setShowDropdown(true)}
                  />
                  <FaSearch className="search-icon" />
                  
                  {showDropdown && (
                    <div className="course-dropdown">
                      {filteredCourses.length > 0 ? (
                        filteredCourses.map(course => (
                          <div
                            key={course.id}
                            className="course-item"
                            onClick={() => {
                              addSubject(course)
                              setShowDropdown(false)
                              setSearchTerm('')
                            }}
                          >
                            <span className="course-code">{course.code}</span>
                            <span className="course-name">{course.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="no-courses">No matching courses found</div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="add-subject-btn"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <FaPlus /> Add Subject
                </button>
              </div>
            </div>

            <div className="grades-table-container">
              <table className="grades-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Class Score (60%)</th>
                    <th>Exam Score (40%)</th>
                    <th>Total</th>
                    <th>Position</th>
                    <th>Grade</th>
                    <th>Remark</th>
                    <th>Teacher's Sign</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.length > 0 ? (
                    subjects.map(subject => (
                      <tr key={subject.id}>
                        <td>
                          <strong>{subject.code}:</strong> {subject.name}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Score"
                            value={subject.classScore}
                            min="0"
                            max="60"
                            onChange={(e) => handleSubjectChange(subject.id, 'classScore', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Score"
                            value={subject.examScore}
                            min="0"
                            max="40"
                            onChange={(e) => handleSubjectChange(subject.id, 'examScore', e.target.value)}
                          />
                        </td>
                        <td className="total-score">
                          {subject.totalScore}
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Position"
                            value={subject.position}
                            onChange={(e) => handleSubjectChange(subject.id, 'position', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Grade"
                            value={subject.grade}
                            onChange={(e) => handleSubjectChange(subject.id, 'grade', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Remark"
                            value={subject.remark}
                            onChange={(e) => handleSubjectChange(subject.id, 'remark', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Sign"
                            value={subject.teacherSignature}
                            onChange={(e) => handleSubjectChange(subject.id, 'teacherSignature', e.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => removeSubject(subject.id)}
                            title="Remove subject"
                          >
                            <FaTrashAlt />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty-subjects">
                        No subjects added. Click "Add Subject" to add courses.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" className="text-right"><strong>Average Score:</strong></td>
                    <td className="total-score"><strong>{calculateAverage()}</strong></td>
                    <td colSpan="5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Final Assessment */}
          <div className="final-assessment-section">
            <h3>Final Assessment</h3>
            <div className="assessment-grid">
              <div className="info-item">
                <label>Conduct:</label>
                <input
                  type="text"
                  className="form-control"
                  value={reportData.conduct}
                  onChange={(e) => setReportData(prev => ({ ...prev, conduct: e.target.value }))}
                  placeholder="Enter conduct"
                />
              </div>
              <div className="info-item">
                <label>Next Class:</label>
                <input
                  type="text"
                  className="form-control"
                  value={reportData.nextClass}
                  onChange={(e) => setReportData(prev => ({ ...prev, nextClass: e.target.value }))}
                  placeholder="Enter next class"
                />
              </div>
              <div className="info-item">
                <label>Teacher's Remarks:</label>
                <textarea
                  className="form-control"
                  value={reportData.teacherRemarks}
                  onChange={(e) => setReportData(prev => ({ ...prev, teacherRemarks: e.target.value }))}
                  placeholder="Enter teacher's remarks"
                  rows="3"
                />
              </div>
              <div className="info-item">
                <label>Principal's Signature:</label>
                <input
                  type="text"
                  className="form-control"
                  value={reportData.principalSignature}
                  onChange={(e) => setReportData(prev => ({ ...prev, principalSignature: e.target.value }))}
                  placeholder="Enter principal's signature"
                />
              </div>
              <div className="info-item">
                <label>Reopening Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={reportData.reopeningDate}
                  onChange={(e) => setReportData(prev => ({ ...prev, reopeningDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Reports 