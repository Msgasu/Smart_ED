import React, { useState, useEffect } from 'react'
import { FaBook, FaChalkboardTeacher, FaGraduationCap, FaPlus, FaTrash, FaSearch, FaUserCheck, FaUsers, FaCalendarAlt } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import './CourseAssignment.css'

const CourseAssignment = () => {
  const [activeTab, setActiveTab] = useState('faculty')
  const [courses, setCourses] = useState([])
  const [faculty, setFaculty] = useState([])
  const [students, setStudents] = useState([])
  const [facultyCourses, setFacultyCourses] = useState([])
  const [studentCourses, setStudentCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedFaculty, setSelectedFaculty] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [showBulkModal, setShowBulkModal] = useState(false)

  // Class structure for filtering students
  const classStructure = [
    'Form 1 Loyalty', 'Form 1 Integrity', 'Form 1 Faith',
    'Form 2 Loyalty', 'Form 2 Integrity', 'Form 2 Faith',
    'Form 3 Loyalty', 'Form 3 Integrity', 'Form 3 Faith'
  ]

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchCourses(),
        fetchFaculty(),
        fetchStudents(),
        fetchFacultyCourses(),
        fetchStudentCourses()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code')

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
      throw error
    }
  }

  const fetchFaculty = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          faculty (
            profile_id,
            department,
            position
          )
        `)
        .eq('role', 'faculty')
        .order('first_name')

      if (error) throw error
      setFaculty(data || [])
    } catch (error) {
      console.error('Error fetching faculty:', error)
      throw error
    }
  }

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
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
        .order('first_name')

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
      throw error
    }
  }

  const fetchFacultyCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('faculty_courses')
        .select(`
          *,
          courses (
            id,
            code,
            name,
            description
          ),
          profiles (
            id,
            first_name,
            last_name,
            faculty (
              department,
              position
            )
          )
        `)
        .eq('status', 'active')
        .order('assignment_date', { ascending: false })

      if (error) throw error
      setFacultyCourses(data || [])
    } catch (error) {
      console.error('Error fetching faculty courses:', error)
      throw error
    }
  }

  const fetchStudentCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('student_courses')
        .select(`
          *,
          courses (
            id,
            code,
            name,
            description
          ),
          profiles (
            id,
            first_name,
            last_name,
            students (
              student_id,
              class_year
            )
          )
        `)
        .eq('status', 'enrolled')
        .order('enrollment_date', { ascending: false })

      if (error) throw error
      setStudentCourses(data || [])
    } catch (error) {
      console.error('Error fetching student courses:', error)
      throw error
    }
  }

  const assignCourseToFaculty = async (facultyId, courseId) => {
    try {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('faculty_courses')
        .select('id')
        .eq('faculty_id', facultyId)
        .eq('course_id', courseId)
        .eq('status', 'active')
        .single()

      if (existing) {
        toast.error('Course is already assigned to this faculty member')
        return
      }

      const { error } = await supabase
        .from('faculty_courses')
        .insert([{
          faculty_id: facultyId,
          course_id: courseId,
          status: 'active'
        }])

      if (error) throw error

      const facultyMember = faculty.find(f => f.id === facultyId)
      const course = courses.find(c => c.id === courseId)
      
      toast.success(`${course.code} assigned to ${facultyMember.first_name} ${facultyMember.last_name}`)
      fetchFacultyCourses()
    } catch (error) {
      console.error('Error assigning course to faculty:', error)
      toast.error('Error assigning course to faculty')
    }
  }

  const assignCourseToStudent = async (studentId, courseId) => {
    try {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('student_courses')
        .select('id')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('status', 'enrolled')
        .single()

      if (existing) {
        toast.error('Course is already assigned to this student')
        return
      }

      const { error } = await supabase
        .from('student_courses')
        .insert([{
          student_id: studentId,
          course_id: courseId,
          status: 'enrolled'
        }])

      if (error) throw error

      const student = students.find(s => s.id === studentId)
      const course = courses.find(c => c.id === courseId)
      
      toast.success(`${course.code} assigned to ${student.first_name} ${student.last_name}`)
      fetchStudentCourses()
    } catch (error) {
      console.error('Error assigning course to student:', error)
      toast.error('Error assigning course to student')
    }
  }

  const bulkAssignCourseToClass = async (className, courseId) => {
    try {
      const classStudents = students.filter(
        student => student.students?.[0]?.class_year === className
      )

      if (classStudents.length === 0) {
        toast.error('No students found in this class')
        return
      }

      // Get students who don't already have this course
      const { data: existingAssignments } = await supabase
        .from('student_courses')
        .select('student_id')
        .eq('course_id', courseId)
        .eq('status', 'enrolled')
        .in('student_id', classStudents.map(s => s.id))

      const existingStudentIds = existingAssignments?.map(a => a.student_id) || []
      const studentsToAssign = classStudents.filter(
        student => !existingStudentIds.includes(student.id)
      )

      if (studentsToAssign.length === 0) {
        toast.error('All students in this class already have this course')
        return
      }

      const assignments = studentsToAssign.map(student => ({
        student_id: student.id,
        course_id: courseId,
        status: 'enrolled'
      }))

      const { error } = await supabase
        .from('student_courses')
        .insert(assignments)

      if (error) throw error

      const course = courses.find(c => c.id === courseId)
      toast.success(`${course.code} assigned to ${studentsToAssign.length} students in ${className}`)
      fetchStudentCourses()
    } catch (error) {
      console.error('Error bulk assigning course to class:', error)
      toast.error('Error bulk assigning course to class')
    }
  }

  const bulkAssignSelectedStudents = async () => {
    if (!selectedCourse || selectedStudents.length === 0) {
      toast.error('Please select a course and students')
      return
    }

    try {
      // Get students who don't already have this course
      const { data: existingAssignments } = await supabase
        .from('student_courses')
        .select('student_id')
        .eq('course_id', selectedCourse)
        .eq('status', 'enrolled')
        .in('student_id', selectedStudents)

      const existingStudentIds = existingAssignments?.map(a => a.student_id) || []
      const studentsToAssign = selectedStudents.filter(
        studentId => !existingStudentIds.includes(studentId)
      )

      if (studentsToAssign.length === 0) {
        toast.error('All selected students already have this course')
        return
      }

      const assignments = studentsToAssign.map(studentId => ({
        student_id: studentId,
        course_id: selectedCourse,
        status: 'enrolled'
      }))

      const { error } = await supabase
        .from('student_courses')
        .insert(assignments)

      if (error) throw error

      const course = courses.find(c => c.id === selectedCourse)
      toast.success(`${course.code} assigned to ${studentsToAssign.length} students`)
      
      setSelectedStudents([])
      setSelectedCourse('')
      setShowBulkModal(false)
      fetchStudentCourses()
    } catch (error) {
      console.error('Error bulk assigning course:', error)
      toast.error('Error bulk assigning course')
    }
  }

  const removeFacultyCourse = async (assignmentId) => {
    try {
      const { error } = await supabase
        .from('faculty_courses')
        .update({ status: 'inactive' })
        .eq('id', assignmentId)

      if (error) throw error

      toast.success('Course assignment removed')
      fetchFacultyCourses()
    } catch (error) {
      console.error('Error removing faculty course:', error)
      toast.error('Error removing course assignment')
    }
  }

  const removeStudentCourse = async (assignmentId) => {
    try {
      const { error } = await supabase
        .from('student_courses')
        .update({ status: 'dropped' })
        .eq('id', assignmentId)

      if (error) throw error

      toast.success('Course assignment removed')
      fetchStudentCourses()
    } catch (error) {
      console.error('Error removing student course:', error)
      toast.error('Error removing course assignment')
    }
  }

  const FacultyAssignmentTab = () => {
    const filteredFaculty = faculty.filter(member =>
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.faculty?.[0]?.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div className="faculty-assignment">
        <div className="assignment-header">
          <h2>Faculty Course Assignment</h2>
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="assignment-content">
          <div className="faculty-grid">
            {filteredFaculty.map(member => {
              const memberCourses = facultyCourses.filter(fc => fc.faculty_id === member.id)
              return (
                <div key={member.id} className="faculty-card">
                  <div className="faculty-header">
                    <div className="faculty-info">
                      <h3>{member.first_name} {member.last_name}</h3>
                      <p className="faculty-department">{member.faculty?.[0]?.department || 'No Department'}</p>
                      <p className="faculty-position">{member.faculty?.[0]?.position || 'No Position'}</p>
                    </div>
                    <div className="faculty-stats">
                      <span className="course-count">{memberCourses.length} courses</span>
                    </div>
                  </div>
                  
                  <div className="course-assignment">
                    <div className="assign-course">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            assignCourseToFaculty(member.id, e.target.value)
                            e.target.value = ''
                          }
                        }}
                        className="course-select"
                      >
                        <option value="">Assign Course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {memberCourses.length > 0 && (
                      <div className="assigned-courses">
                        <h4>Assigned Courses:</h4>
                        <div className="course-tags">
                          {memberCourses.map(assignment => (
                            <div key={assignment.id} className="course-tag">
                              <span className="course-code">{assignment.courses.code}</span>
                              <span className="course-name">{assignment.courses.name}</span>
                              <button
                                onClick={() => removeFacultyCourse(assignment.id)}
                                className="remove-btn"
                                title="Remove assignment"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const StudentAssignmentTab = () => {
    const filteredStudents = selectedClass
      ? students.filter(student => student.students?.class_year === selectedClass || student.students?.[0]?.class_year === selectedClass)
      : students.filter(student =>
          `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.students?.student_id || student.students?.[0]?.student_id)?.toLowerCase().includes(searchTerm.toLowerCase())
        )

    return (
      <div className="student-assignment">
        <div className="assignment-header">
          <h2>Student Course Assignment</h2>
          <div className="header-controls">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="class-filter"
            >
              <option value="">All Students</option>
              {classStructure.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
            
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowBulkModal(true)}
              disabled={filteredStudents.length === 0}
            >
              <FaPlus /> Bulk Assign
            </button>
          </div>
        </div>

        {/* Bulk Assignment for Classes */}
        {selectedClass && (
          <div className="bulk-assignment">
            <h3>Assign Course to Entire Class: {selectedClass}</h3>
            <div className="bulk-controls">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    bulkAssignCourseToClass(selectedClass, e.target.value)
                    e.target.value = ''
                  }
                }}
                className="course-select"
              >
                <option value="">Select Course to Assign to Class</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
              <span className="student-count">
                {filteredStudents.length} students in this class
              </span>
            </div>
          </div>
        )}

        <div className="students-table-container">
          <table className="students-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Class</th>
                <th>Enrolled Courses</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => {
                const studentAssignments = studentCourses.filter(sc => sc.student_id === student.id)
                return (
                  <tr key={student.id}>
                    <td>
                      <div className="student-info">
                        <span className="student-name">{student.first_name} {student.last_name}</span>
                        <span className="student-email">{student.email}</span>
                      </div>
                    </td>
                    <td>{student.students?.student_id || student.students?.[0]?.student_id || 'N/A'}</td>
                    <td>
                      <span className="class-badge">
                        {student.students?.class_year || student.students?.[0]?.class_year || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <div className="enrolled-courses">
                        {studentAssignments.map(assignment => (
                          <div key={assignment.id} className="course-tag">
                            <span>{assignment.courses.code}</span>
                            <button
                              onClick={() => removeStudentCourse(assignment.id)}
                              className="remove-btn"
                              title="Remove course"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            assignCourseToStudent(student.id, e.target.value)
                            e.target.value = ''
                          }
                        }}
                        className="course-select"
                      >
                        <option value="">Assign Course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const BulkAssignModal = () => {
    if (!showBulkModal) return null

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Bulk Course Assignment</h3>
            <button
              className="close-btn"
              onClick={() => setShowBulkModal(false)}
            >
              ×
            </button>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label>Select Course:</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="form-control"
              >
                <option value="">Choose a course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Select Students:</label>
              <div className="student-selection">
                {students.map(student => (
                  <div key={student.id} className="student-checkbox">
                    <input
                      type="checkbox"
                      id={`student-${student.id}`}
                      checked={selectedStudents.includes(student.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudents([...selectedStudents, student.id])
                        } else {
                          setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                        }
                      }}
                    />
                    <label htmlFor={`student-${student.id}`}>
                      {student.first_name} {student.last_name} - {student.students?.class_year || student.students?.[0]?.class_year || 'Unassigned'}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setShowBulkModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={bulkAssignSelectedStudents}
              disabled={!selectedCourse || selectedStudents.length === 0}
            >
              Assign Course ({selectedStudents.length} students)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="course-assignment">
      <div className="page-header">
        <h1>Course Assignment</h1>
        <p>Assign courses to faculty and students</p>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'faculty' ? 'active' : ''}`}
          onClick={() => setActiveTab('faculty')}
        >
          <FaChalkboardTeacher /> Faculty Assignment
        </button>
        <button
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <FaGraduationCap /> Student Assignment
        </button>
      </div>

      <div className="tab-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">Loading...</div>
          </div>
        ) : (
          <>
            {activeTab === 'faculty' && <FacultyAssignmentTab />}
            {activeTab === 'students' && <StudentAssignmentTab />}
          </>
        )}
      </div>

      <BulkAssignModal />
    </div>
  )
}

export default CourseAssignment