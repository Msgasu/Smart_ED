import React, { useState, useEffect, useCallback, useRef } from 'react'
import { FaPlus, FaSearch, FaTrashAlt, FaCalendarAlt, FaSave, FaPrint, FaFileExport } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { studentReportsAPI, studentGradesAPI, studentsAPI, coursesAPI } from '../lib/api'
import toast from 'react-hot-toast'
// Using native crypto.randomUUID() instead of uuid package
import './Reports.css'
import '../styles/report-enhancements.css'

const Reports = () => {
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
      // CLEAR ALL PREVIOUS DATA FIRST to ensure no data leakage
      setSubjects([])
      setReportData({
        studentName: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
        studentClass: selectedStudent.students?.class_year || '',
        studentAge: calculateAge(selectedStudent.date_of_birth) || '',
        studentGender: '',
        attendance: '',
        conduct: '',
        nextClass: '',
        teacherRemarks: '',
        principalSignature: '',
        reopeningDate: ''
      })
      
      console.log(`🔄 Loading data for NEW STUDENT: ${selectedStudent.first_name} ${selectedStudent.last_name} (ID: ${selectedStudent.id})`)
      console.log(`📅 Term: ${selectedTerm}, Year: ${selectedYear}`)
      
      // Load data specific to this student only
      loadStudentReport()
    } else {
      // Clear all data when no student is selected
      setSubjects([])
      setReportData({
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
      console.log('🔄 Cleared all data - no student selected')
    }
  }, [selectedStudent, selectedTerm, selectedYear])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const { data, error } = await studentsAPI.getStudents()

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
      const { data, error } = await coursesAPI.getCourses()

      if (error) throw error
      setAvailableCourses(data || [])
      setFilteredCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Error loading courses')
    }
  }

  const loadStudentReport = async () => {
    if (!selectedStudent) {
      console.log('❌ No student selected - cannot load report')
      return
    }
    
    try {
      setReportLoading(true)
      console.log(`📚 Loading courses for student: ${selectedStudent.first_name} ${selectedStudent.last_name} (ID: ${selectedStudent.id})`)
      
      // First, always load the student's enrolled courses - STUDENT SPECIFIC
      const { data: enrolledCourses, error: coursesError } = await studentsAPI.getStudentCourses(selectedStudent.id)

      if (coursesError) throw coursesError
      
      console.log(`✅ Found ${enrolledCourses?.length || 0} enrolled courses for this student`)
      if (enrolledCourses?.length > 0) {
        console.log('📋 Enrolled courses:', enrolledCourses.map(c => c.courses.name))
      }

      // Get existing report - STUDENT SPECIFIC
      console.log(`🔍 Looking for existing report for student ${selectedStudent.id}, term: ${selectedTerm}, year: ${selectedYear}`)
      const { data: existingReport, error: reportError } = await studentReportsAPI.getReport(
        selectedStudent.id, 
        selectedTerm, 
        selectedYear
      )

      if (reportError && reportError.code !== 'PGRST116') {
        throw reportError
      }

      if (existingReport) {
        console.log(`📄 Found existing report (ID: ${existingReport.id}) for this specific student + term + year`);
        setReportData(prev => ({
          ...prev,
          attendance: existingReport.attendance || '',
          conduct: existingReport.conduct || '',
          nextClass: existingReport.next_class || '',
          teacherRemarks: existingReport.teacher_remarks || '',
          principalSignature: existingReport.principal_signature || '',
          reopeningDate: existingReport.reopening_date || ''
        }))

        // Load grades for this specific report only
        console.log(`📊 Loading grades for report ID: ${existingReport.id} (specific to this student + term + year)`)
        const { data: grades, error: gradesError } = await studentGradesAPI.getGradesByReport(existingReport.id)

        if (gradesError) throw gradesError
        
        console.log(`✅ Found ${grades?.length || 0} grade records for this specific report`)

        // Create a map of existing grades by course ID
        const existingGradesMap = new Map(
          grades.map(grade => [grade.subject_id, grade])
        )

        // Combine enrolled courses with existing grades
        const subjectsWithGrades = enrolledCourses.map(enrollment => {
          const existingGrade = existingGradesMap.get(enrollment.course_id)
          
          if (existingGrade) {
            return {
              id: existingGrade.id,
              courseId: existingGrade.subject_id,
              name: existingGrade.courses.name,
              code: existingGrade.courses.code,
              classScore: existingGrade.class_score?.toString() || '',
              examScore: existingGrade.exam_score?.toString() || '',
              totalScore: existingGrade.total_score?.toString() || '',
              position: existingGrade.position || '',
              grade: existingGrade.grade || '',
              remark: existingGrade.remark || '',
              teacherSignature: existingGrade.teacher_signature || ''
            }
          } else {
            // Create empty grade entry for enrolled course
            return {
              id: crypto.randomUUID(),
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
            }
          }
        })

        setSubjects(subjectsWithGrades)
        
        // Notify user about loaded data
        const gradesCount = subjectsWithGrades.filter(s => s.classScore || s.examScore).length
        if (gradesCount > 0) {
          toast.success(`Loaded existing report with ${gradesCount} graded subjects`)
        } else {
          toast(`Report template loaded with ${subjectsWithGrades.length} enrolled courses`, {
            icon: 'ℹ️',
            duration: 3000
          })
        }
      } else {
        // No existing report, create default subjects from enrolled courses
        console.log(`📝 No existing report found. Creating new template with ${enrolledCourses.length} enrolled courses for ${selectedStudent.first_name}`)
        const defaultSubjects = enrolledCourses.map(enrollment => ({
          id: crypto.randomUUID(),
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
        
        // Notify user that courses have been loaded
        if (defaultSubjects.length > 0) {
          toast.success(`${defaultSubjects.length} enrolled courses loaded for ${selectedStudent.first_name}`)
        } else {
          toast(`No enrolled courses found for ${selectedStudent.first_name}`, {
            icon: 'ℹ️',
            duration: 3000
          })
        }
      }
    } catch (error) {
      console.error('Error loading student report:', error)
      toast.error('Error loading student report')
    } finally {
      setReportLoading(false)
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
    
    if (score >= 90 && score <= 100) return 'A1'
    if (score >= 80 && score <= 89) return 'B2'
    if (score >= 70 && score <= 79) return 'B3'
    if (score >= 65 && score <= 69) return 'C4'
    if (score >= 60 && score <= 64) return 'C5'
    if (score >= 55 && score <= 59) return 'C6'
    if (score >= 50 && score <= 54) return 'D7'
    if (score >= 40 && score <= 49) return 'E8'
    if (score >= 0 && score <= 39) return 'F9'
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
      toast.error(`${course.name} is already in the report`)
      return
    }

    const newSubject = {
      id: crypto.randomUUID(),
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
    toast.success(`${course.name} added to report`)
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

    if (!selectedTerm || !selectedYear) {
      toast.error('Please select term and academic year')
      return
    }

    try {
      setReportLoading(true)
      toast.loading('Saving report...')
      
      console.log('Saving report for student:', selectedStudent.id)
      console.log('Term:', selectedTerm, 'Year:', selectedYear)
      console.log('Subjects:', subjects.length)

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

      const { data: savedReport, error: reportError } = await studentReportsAPI.upsertReport(reportPayload)

      if (reportError) throw reportError

      // Save grades
      const gradesPayload = subjects.map(subject => ({
        report_id: savedReport.id,
        subject_id: subject.courseId,
        class_score: parseFloat(subject.classScore) || 0,
        exam_score: parseFloat(subject.examScore) || 0,
        total_score: parseFloat(subject.totalScore) || 0,
        position: subject.position || '',
        grade: subject.grade,
        remark: subject.remark,
        teacher_signature: subject.teacherSignature
      }))

      const { error: gradesError } = await studentGradesAPI.upsertGrades(gradesPayload)

      if (gradesError) throw gradesError

      toast.dismiss()
      toast.success('Report saved successfully!')
      
      // Reload the report to reflect saved changes
      loadStudentReport()
    } catch (error) {
      toast.dismiss()
      console.error('Error saving report:', error)
      
      // Show more detailed error message
      let errorMessage = 'Error saving report'
      if (error?.message) {
        errorMessage += `: ${error.message}`
      } else if (typeof error === 'object') {
        errorMessage += `: ${JSON.stringify(error)}`
      }
      
      toast.error(errorMessage)
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
              <img 
                src="/life-international-logo.svg" 
                alt="Life International College" 
                style={{ width: '60px', height: '60px' }}
              />
              <div className="school-info" style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#722F37', margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Life International College</h2>
                <p style={{ color: '#8BC34A', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Knowledge • Excellence • Christ</p>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem' }}>Private Mail Bag, 252 Tema. / Tel: 024 437 7584</p>
                <h3 style={{ color: '#722F37', margin: 0, fontSize: '1.2rem' }}>TERMINAL REPORT</h3>
              </div>
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
                    <th>Class Score ({getDisplayPercentages(reportData.studentClass).classText})</th>
                    <th>Exam Score ({getDisplayPercentages(reportData.studentClass).examText})</th>
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
                        {selectedStudent 
                          ? `No courses found for ${selectedStudent.first_name} ${selectedStudent.last_name}. You can add subjects manually using "Add Subject".`
                          : 'Select a student to view their enrolled courses, or add subjects manually.'
                        }
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