import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlus, FaSearch, FaTrashAlt, FaCalendarAlt, FaSave, FaPrint, FaFileExport, FaUsers, FaFileAlt, FaChartBar, FaHome, FaEye, FaEdit, FaLock, FaClock, FaFilter, FaUser, FaBook, FaExclamationTriangle } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { studentReportsAPI, studentGradesAPI, studentsAPI, coursesAPI } from '../lib/api'
import { getReportsByStatus, getReportById, REPORT_STATUS } from '../lib/reportApi'
import toast from 'react-hot-toast'

import TeacherLayout from './TeacherLayout'
import logo from '../assets/logo_nbg.png'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar, Line, Radar } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend)
import './TeacherDashboard.css'

const TeacherDashboard = ({ user, profile }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  
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
  
  // Reports Tab State (exact replica of admin Reports.jsx)
  const [subjects, setSubjects] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [availableCourses, setAvailableCourses] = useState([])
  const [filteredCourses, setFilteredCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [students, setStudents] = useState([])
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
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

  // Dashboard state
  const [courses, setCourses] = useState([])
  const [statistics, setStatistics] = useState({
    myStudents: 0,
    myCourses: 0,
    reportsIFilled: 0,
    fieldsICompleted: 0
  })
  const [courseBreakdown, setCourseBreakdown] = useState([])
  const [studentsWithMissingGrades, setStudentsWithMissingGrades] = useState([])
  const [missingGradesCurrentPage, setMissingGradesCurrentPage] = useState(1)
  const [missingGradesItemsPerPage] = useState(10)

  // Reports Management state (for viewing complete report cards)
  const [allReports, setAllReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [reportSearchTerm, setReportSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'draft', 'completed'
  const [termFilter, setTermFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)
  const [showReportViewer, setShowReportViewer] = useState(false)
  const [reportViewerLoading, setReportViewerLoading] = useState(false)
  const [chartType, setChartType] = useState('bar') // 'bar' or 'radar'
  const [historicalReports, setHistoricalReports] = useState([])
  const [loadingHistorical, setLoadingHistorical] = useState(false)

  // Class Reports state
  const [teacherCourses, setTeacherCourses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [classStudents, setClassStudents] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Refs for form fields (exact replica of admin Reports.jsx)
  const studentNameRef = useRef(null)
  const averageRef = useRef(null)
  const termRef = useRef(null)
  const academicYearRef = useRef(null)

  // Load students on component mount
  useEffect(() => {
    fetchStudents()
    fetchCourses()
    fetchDashboardStats()
    fetchAllTeacherReports()
  }, [])

  // Reset missing grades pagination when data changes
  useEffect(() => {
    setMissingGradesCurrentPage(1)
  }, [studentsWithMissingGrades.length])

  // Refresh dashboard stats when switching back to dashboard tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      console.log('🔄 Refreshing dashboard stats on tab switch...')
      fetchDashboardStats()
    }
  }, [activeTab])

  // Memoized search handler for student search
  const handleStudentSearchChange = useCallback((e) => {
    setStudentSearchTerm(e.target.value)
  }, [])

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    if (!studentSearchTerm) return true
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
    const className = student.students?.class_year || ''
    const searchLower = studentSearchTerm.toLowerCase()
    
    return fullName.includes(searchLower) || 
           className.toLowerCase().includes(searchLower) ||
           student.email.toLowerCase().includes(searchLower)
  })

  // Fetch reports when active tab changes to reports management
  useEffect(() => {
    if (activeTab === 'manage-reports') {
      fetchAllTeacherReports()
    }
  }, [activeTab])

  // Fetch teacher courses when classes tab is activated
  useEffect(() => {
    if (activeTab === 'classes') {
      fetchTeacherCourses()
    }
  }, [activeTab])

  // Update report data when student changes (exact replica of admin logic)
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

  const fetchDashboardStats = async () => {
    try {
      console.log('🔍 Fetching dashboard stats for teacher:', user.id)
      
      // Get teacher's courses - based on your exact DB schema
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('faculty_courses')
        .select(`
          id,
          course_id,
          faculty_id,
          status,
          courses (
            id,
            code,
            name,
            description
          )
        `)
        .eq('faculty_id', user.id)
        .eq('status', 'active')

      console.log('📚 Teacher courses query result:', { teacherCourses, coursesError })

      if (coursesError) {
        console.error('❌ Error fetching teacher courses:', coursesError)
        throw coursesError
      }

      const courseIds = teacherCourses?.map(tc => tc.course_id) || []
      const myCourses = courseIds.length
      
      console.log('📋 Found', myCourses, 'courses for teacher. Course IDs:', courseIds)

      // Get all students in teacher's courses - based on your exact DB schema
      let allStudentCourses = []
      if (courseIds.length > 0) {
        console.log('👥 Fetching students for course IDs:', courseIds)
        
        // Let's try the query without the inner join first to see all enrollments
        const { data: allEnrollments, error: allEnrollmentsError } = await supabase
          .from('student_courses')
          .select('*')
          .in('course_id', courseIds)
          .eq('status', 'enrolled')
          
        console.log('📋 All enrollments (no join):', { count: allEnrollments?.length, allEnrollments, allEnrollmentsError })

        const { data: studentCourses, error: studentsError } = await supabase
          .from('student_courses')
          .select(`
            id,
            student_id,
            course_id,
            status,
            profiles!inner (
              id,
              first_name,
              last_name,
              email,
              students (
                profile_id,
                student_id,
                class_year
              )
            )
          `)
          .in('course_id', courseIds)
          .eq('status', 'enrolled')

        console.log('👥 Student courses with profile join:', { count: studentCourses?.length, studentCourses, studentsError })
        
        // Check if the join is causing the missing student
        if (allEnrollments?.length !== studentCourses?.length) {
          console.log('⚠️ FOUND THE ISSUE! Join is excluding students.')
          console.log('Raw enrollments:', allEnrollments?.length, 'vs Joined data:', studentCourses?.length)
          
          // Find which student_ids are missing from the joined result
          const allStudentIds = allEnrollments?.map(e => e.student_id) || []
          const joinedStudentIds = studentCourses?.map(sc => sc.student_id) || []
          const missingStudentIds = allStudentIds.filter(id => !joinedStudentIds.includes(id))
          console.log('🔍 Missing student IDs from join:', missingStudentIds)
        }

        if (!studentsError) {
          allStudentCourses = studentCourses || []
          console.log('✅ Found', allStudentCourses.length, 'student-course enrollments')
        } else {
          console.error('❌ Error fetching student courses:', studentsError)
          allStudentCourses = []
        }
      } else {
        console.log('⚠️ No course IDs found - teacher has no assigned courses')
      }

      // Use the same method as dropdown to get accurate student count
      console.log('👥 Getting accurate student count using dropdown method...')
      
      // Get all students using the same API as dropdown
      const { data: allStudentsFromAPI, error: allStudentsError } = await studentsAPI.getStudents()
      
      if (allStudentsError) {
        console.error('❌ Error fetching all students:', allStudentsError)
        throw allStudentsError
      }
      
      // Get student enrollments (same as dropdown method)
      const { data: studentEnrollments, error: enrollmentError } = await supabase
        .from('student_courses')
        .select('student_id')
        .in('course_id', courseIds)
        .eq('status', 'enrolled')
      
      if (enrollmentError) {
        console.error('❌ Error fetching enrollments:', enrollmentError)
        throw enrollmentError
      }
      
      // Filter students exactly like the dropdown does
      const enrolledStudentIds = new Set(studentEnrollments.map(sc => sc.student_id))
      const myStudentsFromAPI = allStudentsFromAPI.filter(student => 
        enrolledStudentIds.has(student.id)
      )
      
      const myStudents = myStudentsFromAPI.length
      const myStudentIds = myStudentsFromAPI.map(s => s.id)
      
      console.log('✅ Accurate student count using dropdown method:', myStudents)
      console.log('👥 Student IDs from API method:', myStudentIds)
      
      // Keep the old method for comparison
      const oldMyStudentIds = [...new Set(allStudentCourses.map(sc => sc.student_id))]
      const oldMyStudents = oldMyStudentIds.length
      
      console.log('📊 Comparison - API method:', myStudents, 'vs Old join method:', oldMyStudents)

      // Get reports where this teacher has filled grades - based on your exact DB schema
      let reportsIFilled = 0
      let fieldsICompleted = 0
      let courseBreakdownData = []
      let studentsWithMissingGradesData = []
      
      if (courseIds.length > 0 && myStudentIds.length > 0) {
        console.log('📊 Fetching grades for teacher courses and students...')
        
        // Get all grades this teacher has entered for their courses
        const { data: myGrades, error: gradesError } = await supabase
          .from('student_grades')
          .select(`
            id,
            report_id,
            subject_id,
            class_score,
            exam_score,
            total_score,
            grade,
            remark,
            student_reports!inner (
              id,
              student_id,
              term,
              academic_year,
              status
            )
          `)
          .in('subject_id', courseIds)
          .in('student_reports.student_id', myStudentIds)

        console.log('📊 Grades query result:', { myGrades, gradesError })

        if (!gradesError && myGrades) {
          // Count unique reports this teacher has contributed to
          const uniqueReportIds = [...new Set(myGrades.map(grade => grade.report_id))]
          reportsIFilled = uniqueReportIds.length

          // Count fields (grades) this teacher has completed (where they have non-null scores)
          fieldsICompleted = myGrades.filter(grade => 
            (grade.class_score !== null && grade.class_score > 0) || 
            (grade.exam_score !== null && grade.exam_score > 0) || 
            (grade.total_score !== null && grade.total_score > 0)
          ).length
          
          console.log('📈 Calculated stats - Reports filled:', reportsIFilled, 'Fields completed:', fieldsICompleted)
        } else {
          console.log('❌ Error fetching grades or no grades found:', gradesError)
        }

        // Calculate course-specific breakdown
        courseBreakdownData = await Promise.all(teacherCourses.map(async (tc) => {
          const courseId = tc.course_id
          const course = tc.courses
          
          // Get actual enrollment count for this specific course directly from database
          const { data: courseEnrollments, error: courseEnrollmentError } = await supabase
            .from('student_courses')
            .select('student_id')
            .eq('course_id', courseId)
            .eq('status', 'enrolled')
          
          const actualStudentCount = courseEnrollments?.length || 0
          
          console.log(`📚 ${course.code} - Direct DB query shows ${actualStudentCount} students`)
          
          // Students in this specific course from our joined data
          const courseStudents = allStudentCourses.filter(sc => sc.course_id === courseId)
          const joinedStudentCount = courseStudents.length
          
          console.log(`📚 ${course.code} - Joined data shows ${joinedStudentCount} students`)
          
          if (actualStudentCount !== joinedStudentCount) {
            console.log(`⚠️ Discrepancy in ${course.code}: DB=${actualStudentCount}, Joined=${joinedStudentCount}`)
          }
          
          // Grades filled for this course
          const courseGrades = myGrades?.filter(grade => grade.subject_id === courseId) || []
          const filledGradesCount = courseGrades.filter(grade => 
            (grade.class_score !== null && grade.class_score > 0) || 
            (grade.exam_score !== null && grade.exam_score > 0) || 
            (grade.total_score !== null && grade.total_score > 0)
          ).length
          
          // Reports for this course
          const courseReports = [...new Set(courseGrades.map(grade => grade.report_id))].length
          
          return {
            course,
            studentCount: actualStudentCount, // Use the accurate count from direct DB query
            reportsFilledCount: courseReports,
            gradesFilledCount: filledGradesCount,
            students: courseStudents // Keep the joined data for other purposes
          }
        }))

                // Find students with missing grades - improved logic
        console.log('🔍 Finding students with missing grades...')
        
        // Strategy: For each student in teacher's courses, check if they have grades for ALL of teacher's courses
        studentsWithMissingGradesData = []
        
        // Get all students enrolled in teacher's courses
        for (const courseId of courseIds) {
          const course = teacherCourses.find(tc => tc.course_id === courseId)?.courses
          
          // Get all students in this specific course
          const { data: courseStudents, error: courseStudentsError } = await supabase
            .from('student_courses')
            .select(`
              student_id,
              profiles!inner (
                id,
                first_name,
                last_name,
                students (class_year)
              )
            `)
            .eq('course_id', courseId)
            .eq('status', 'enrolled')
            
          if (courseStudentsError) continue
          
          console.log(`📚 Checking ${course?.code}: ${courseStudents?.length} enrolled students`)
          
          // For each student, check if they have grades for this course
          for (const studentData of courseStudents || []) {
            const studentId = studentData.student_id
            
            // Check if this teacher has entered grades for this student in this course
            const hasGradesForCourse = myGrades?.some(grade => 
              grade.subject_id === courseId && 
              grade.student_reports?.student_id === studentId &&
              ((grade.class_score !== null && grade.class_score > 0) || 
               (grade.exam_score !== null && grade.exam_score > 0) || 
               (grade.total_score !== null && grade.total_score > 0))
            )
            
            if (!hasGradesForCourse) {
              // This student is missing grades for this course
              const existingEntry = studentsWithMissingGradesData.find(s => s.student_id === studentId)
              
              if (existingEntry) {
                // Add this course to existing entry
                existingEntry.courses.push(course)
              } else {
                // Create new entry for this student
                studentsWithMissingGradesData.push({
                  student_id: studentId,
                  studentName: `${studentData.profiles.first_name} ${studentData.profiles.last_name}`,
                  classYear: studentData.profiles.students?.class_year || 'Unknown',
                  courses: [course],
                  term: 'Term 3',
                  academic_year: '2024'
                })
              }
            }
          }
        }
        
        console.log(`⚠️ Found ${studentsWithMissingGradesData.length} students with missing grades:`, studentsWithMissingGradesData)
      }

        setStatistics({
        myStudents,
        myCourses,
        reportsIFilled,
        fieldsICompleted
      })

      setCourseBreakdown(courseBreakdownData)
      setStudentsWithMissingGrades(studentsWithMissingGradesData)

      // Debug logging
      console.log('📊 Dashboard Stats:', {
        myStudents,
        myCourses,
        reportsIFilled,
        fieldsICompleted,
        courseBreakdownCount: courseBreakdownData.length,
        studentsWithMissingGradesCount: studentsWithMissingGradesData.length
      })

    } catch (error) {
      console.error('Error fetching teacher dashboard stats:', error)
      toast.error('Failed to load dashboard statistics')
    }
  }

  const fetchStudents = async () => {
    try {
      setLoading(true)
      
      // Get teacher's courses first
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('faculty_courses')
        .select('course_id')
        .eq('faculty_id', user.id)

      if (coursesError) throw coursesError

      const courseIds = teacherCourses.map(tc => tc.course_id)

      if (courseIds.length === 0) {
        setStudents([])
        return
      }

      // Use exact same API as admin Reports.jsx
      const { data: allStudents, error: studentsError } = await studentsAPI.getStudents()

      if (studentsError) throw studentsError

      // Filter students who are enrolled in teacher's courses
      const { data: studentCourses, error: enrollmentError } = await supabase
        .from('student_courses')
        .select('student_id')
        .in('course_id', courseIds)

      if (enrollmentError) throw enrollmentError

      const enrolledStudentIds = new Set(studentCourses.map(sc => sc.student_id))
      const filteredStudents = allStudents.filter(student => 
        enrolledStudentIds.has(student.id)
      )

      console.log('Students in teacher courses:', filteredStudents)
      setStudents(filteredStudents || [])
      
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Error loading students')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      // Get teacher's courses (filtered from all courses using exact same API as admin)
      const { data: allCourses, error: coursesError } = await coursesAPI.getCourses()

      if (coursesError) throw coursesError

      // Get teacher's specific courses
      const { data: teacherCourses, error: teacherCoursesError } = await supabase
        .from('faculty_courses')
        .select('course_id')
        .eq('faculty_id', user.id)

      if (teacherCoursesError) throw teacherCoursesError

      const teacherCourseIds = teacherCourses.map(tc => tc.course_id)
      const filteredCourses = allCourses.filter(course => 
        teacherCourseIds.includes(course.id)
      )

      setCourses(filteredCourses)
      setAvailableCourses(filteredCourses)
      setFilteredCourses(filteredCourses)

    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Error loading courses')
    }
  }

  // Fetch teacher courses grouped by class for class reports
  const fetchTeacherCourses = async () => {
    try {
      setLoadingCourses(true)
      const { data: facultyCourses, error } = await supabase
        .from('faculty_courses')
        .select(`
          course_id,
          courses (
            id,
            name,
            code,
            description
          )
        `)
        .eq('faculty_id', user.id)

      if (error) throw error

      // Get all students to determine which classes they belong to
      const { data: allStudents, error: studentsError } = await studentsAPI.getStudents()
      
      if (studentsError) throw studentsError

      // Group by course and class
      const classCourseCombinations = []

      for (const fc of facultyCourses) {
        // Get all students enrolled in this course
        const { data: studentCourses, error: enrollmentError } = await supabase
          .from('student_courses')
          .select('student_id')
          .eq('course_id', fc.course_id)

        if (enrollmentError) continue

        if (!studentCourses || studentCourses.length === 0) continue

        const enrolledStudentIds = studentCourses.map(sc => sc.student_id)
        const enrolledStudents = allStudents.filter(student => 
          enrolledStudentIds.includes(student.id)
        )

        // Group students by their class_year
        const studentsByClass = enrolledStudents.reduce((acc, student) => {
          // Get class from student data - check multiple possible fields
          const classYear = student.students?.class_year || 
                           student.class_year || 
                           student.students?.class || 
                           student.class ||
                           'Unknown Class'
          
          if (!acc[classYear]) {
            acc[classYear] = []
          }
          acc[classYear].push(student)
          return acc
        }, {})

        // Create separate entries for each class-course combination
        Object.keys(studentsByClass).forEach(classYear => {
          classCourseCombinations.push({
            id: `${fc.course_id}-${classYear}`,
            courseId: fc.course_id,
            courseName: fc.courses.name,
            courseCode: fc.courses.code,
            courseDescription: fc.courses.description,
            classYear: classYear,
            displayName: `${classYear} ${fc.courses.name}`,
            displayCode: `${classYear} - ${fc.courses.code}`,
            studentCount: studentsByClass[classYear].length,
            students: studentsByClass[classYear]
          })
        })
      }

      // Sort by class year, then by course name
      classCourseCombinations.sort((a, b) => {
        // First sort by class year
        if (a.classYear !== b.classYear) {
          return a.classYear.localeCompare(b.classYear)
        }
        // Then by course name
        return a.courseName.localeCompare(b.courseName)
      })

      setTeacherCourses(classCourseCombinations)
    } catch (error) {
      console.error('Error fetching teacher courses:', error)
      toast.error('Failed to load courses')
    } finally {
      setLoadingCourses(false)
    }
  }

  // Fetch students for a specific class-course combination
  const fetchClassStudents = async (classCourseId) => {
    try {
      setLoadingStudents(true)
      
      // Find the selected class-course combination
      const selectedClassCourse = teacherCourses.find(tc => tc.id === classCourseId)
      
      if (!selectedClassCourse || !selectedClassCourse.students) {
        setClassStudents([])
        return
      }

      // Students are already loaded, just need to get their report data
      const studentsWithReports = await Promise.all(
        selectedClassCourse.students.map(async (student) => {
          const { data: reports, error: reportsError } = await supabase
            .from('student_reports')
            .select('*')
            .eq('student_id', student.id)
            .order('updated_at', { ascending: false })
            .limit(1)

          return {
            ...student,
            latestReport: reports?.[0] || null,
            totalReports: reports?.length || 0
          }
        })
      )

      setClassStudents(studentsWithReports)
    } catch (error) {
      console.error('Error fetching class students:', error)
      toast.error('Failed to load students')
    } finally {
      setLoadingStudents(false)
    }
  }

  // Handle class selection
  const handleClassSelect = (course) => {
    setSelectedClass(course)
    fetchClassStudents(course.id)
  }

  // Handle creating a report for a student
  const handleCreateReport = (studentId) => {
    const student = classStudents.find(s => s.id === studentId)
    if (student) {
      setSelectedStudent(student)
      setActiveTab('reports')
    }
  }

  // Fetch all reports for teacher's students (fresh data from database)
  const fetchAllTeacherReports = async () => {
    try {
      console.log('🔄 Fetching all reports for teacher\'s students...')
      
      // Get teacher's courses first
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('faculty_courses')
        .select('course_id')
        .eq('faculty_id', user.id)

      if (coursesError) throw coursesError

      const courseIds = teacherCourses.map(tc => tc.course_id)

      if (courseIds.length === 0) {
        setAllReports([])
        setFilteredReports([])
        return
      }

      // Get students enrolled in teacher's courses
      const { data: studentCourses, error: enrollmentError } = await supabase
        .from('student_courses')
        .select('student_id')
        .in('course_id', courseIds)

      if (enrollmentError) throw enrollmentError

      const enrolledStudentIds = [...new Set(studentCourses.map(sc => sc.student_id))]

      if (enrolledStudentIds.length === 0) {
        setAllReports([])
        setFilteredReports([])
        return
      }

      // Fetch reports first (basic report info)
      console.log('📊 Fetching reports for students:', enrolledStudentIds)
      
      const { data: reports, error: reportsError } = await supabase
        .from('student_reports')
        .select('*')
        .in('student_id', enrolledStudentIds)
        .order('academic_year', { ascending: false })
        .order('term')
        .order('updated_at', { ascending: false })

      if (reportsError) throw reportsError

      // Now fetch student profiles for these reports
      const { data: studentProfiles, error: studentsError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          students (
            student_id,
            class_year
          )
        `)
        .in('id', enrolledStudentIds)

      if (studentsError) throw studentsError

      // Combine reports with student data
      const reportsWithStudents = reports.map(report => {
        const student = studentProfiles.find(s => s.id === report.student_id)
        return {
          ...report,
          student: student
        }
      })

      console.log(`✅ Found ${reportsWithStudents.length} reports for teacher's students`)
      setAllReports(reportsWithStudents || [])
      applyReportFilters(reportsWithStudents || [])

    } catch (error) {
      console.error('Error fetching teacher reports:', error)
      toast.error('Error loading reports')
    }
  }

  // Apply filters to reports
  const applyReportFilters = (reports = allReports) => {
    let filtered = [...reports]

    // Filter by search term (student name)
    if (reportSearchTerm.trim()) {
      filtered = filtered.filter(report => {
        const student = students.find(s => s.id === report.student_id)
        if (!student) return false
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
        return fullName.includes(reportSearchTerm.toLowerCase())
      })
    }

    // Filter by status
    if (statusFilter !== 'all') {
      const targetStatus = statusFilter === 'completed' ? REPORT_STATUS.COMPLETED : REPORT_STATUS.DRAFT
      filtered = filtered.filter(report => report.status === targetStatus)
    }

    // Filter by term
    if (termFilter !== 'all') {
      filtered = filtered.filter(report => report.term === termFilter)
    }

    // Filter by year
    if (yearFilter !== 'all') {
      filtered = filtered.filter(report => report.academic_year === yearFilter)
    }

    // Sort by most recent first
    filtered.sort((a, b) => {
      if (a.academic_year !== b.academic_year) {
        return b.academic_year.localeCompare(a.academic_year)
      }
      if (a.term !== b.term) {
        return b.term.localeCompare(a.term)
      }
      return new Date(b.updated_at) - new Date(a.updated_at)
    })

    setFilteredReports(filtered)
  }

  // Handle viewing a complete report card with ALL subjects
  const handleViewFullReport = async (reportId) => {
    try {
      setReportViewerLoading(true)
      setShowReportViewer(true)
      
      console.log(`🔍 Fetching complete report card with ALL subjects for report ID: ${reportId}`)
      
      // First, fetch the basic report data
      const { data: reportData, error: reportError } = await supabase
        .from('student_reports')
        .select('*')
        .eq('id', reportId)
        .single()

      if (reportError) {
        console.error('Error fetching report:', reportError)
        toast.error('Error loading report from database')
        setShowReportViewer(false)
        return
      }

      if (!reportData) {
        toast.error('Report not found')
        setShowReportViewer(false)
        return
      }

      // Validate teacher has access to this student
      const hasAccess = await validateTeacherAccess(reportData.student_id)
      if (!hasAccess) {
        toast.error('You do not have access to this student\'s report')
        setShowReportViewer(false)
        return
      }

      // Fetch teacher's course IDs to determine which subjects they can edit
      const { data: teacherCourses, error: teacherCoursesError } = await supabase
        .from('faculty_courses')
        .select('course_id')
        .eq('faculty_id', user.id)

      if (teacherCoursesError) {
        console.error('Error fetching teacher courses:', teacherCoursesError)
        toast.error('Error loading teacher course data')
        setShowReportViewer(false)
        return
      }

      const teacherCourseIds = teacherCourses.map(tc => tc.course_id)
      console.log(`👨‍🏫 Teacher's course IDs:`, teacherCourseIds)

      // Fetch student profile
      const { data: studentProfile, error: studentError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          students (
            student_id,
            class_year
          )
        `)
        .eq('id', reportData.student_id)
        .single()

      if (studentError) {
        console.error('Error fetching student profile:', studentError)
        toast.error('Error loading student information')
        setShowReportViewer(false)
        return
      }

              // Fetch ALL grades for this report (ALL subjects from ALL teachers)
        console.log(`📊 Fetching ALL grades for report ID: ${reportId} (including other teachers' subjects)`)
        const { data: gradesData, error: gradesError } = await supabase
          .from('student_grades')
          .select('*')
          .eq('report_id', reportId)

        if (gradesError) {
          console.error('Error fetching grades:', gradesError)
          toast.error('Error loading grade data')
          setShowReportViewer(false)
          return
        }

        console.log(`✅ Found ${gradesData?.length || 0} existing grades in database for this report (ALL teachers)`)

        // For each grade, fetch the course information (ALL subjects, not filtered)
        const gradesWithCourses = await Promise.all(
          (gradesData || []).map(async (grade) => {
            const { data: courseData, error: courseError } = await supabase
              .from('courses')
              .select('id, name, code')
              .eq('id', grade.subject_id)
              .single()

            if (courseError) {
              console.error(`Error fetching course ${grade.subject_id}:`, courseError)
            }

            // Check if teacher can edit this subject (only their own subjects)
            const canEdit = teacherCourseIds && teacherCourseIds.length > 0 ? teacherCourseIds.includes(grade.subject_id) : false

            return {
              ...grade,
              courses: courseData,
              canEdit: canEdit
            }
          })
        )

        console.log(`📋 ALL grades found:`, gradesWithCourses.map(g => `${g.courses?.name} (${g.canEdit ? 'editable' : 'view-only'})`))
        console.log(`🎯 Teacher can edit: ${gradesWithCourses.filter(g => g.canEdit).length} out of ${gradesWithCourses.length} subjects`)

        // Debug: Check if we have grades from other teachers
        const otherTeacherGrades = gradesWithCourses.filter(g => !g.canEdit)
        console.log(`👥 Grades from other teachers: ${otherTeacherGrades.length} subjects`)
        if (otherTeacherGrades.length > 0) {
          console.log(`📝 Other teachers' subjects:`, otherTeacherGrades.map(g => g.courses?.name))
        }

      // Combine all data into a complete report
      const fullReport = {
        ...reportData,
        student: {
          ...studentProfile,
          students: studentProfile.students?.[0] || null
        },
        student_grades: gradesWithCourses
      }

      console.log(`✅ Loaded complete report card with ${fullReport.student_grades?.length || 0} subjects (ALL subjects):`, fullReport)
      console.log(`📊 Final grade count: ${fullReport.student_grades?.length || 0} total grades in report`)
      setSelectedReport(fullReport)

    } catch (error) {
      console.error('Error loading full report:', error)
      toast.error('Error loading complete report')
      setShowReportViewer(false)
    } finally {
      setReportViewerLoading(false)
    }
  }

  // Validate teacher access to student
  const validateTeacherAccess = async (studentId) => {
    try {
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('faculty_courses')
        .select('course_id')
        .eq('faculty_id', user.id)

      if (coursesError) throw coursesError

      const courseIds = teacherCourses.map(tc => tc.course_id)

      const { data: studentCourses, error: studentCoursesError } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', studentId)
        .in('course_id', courseIds)

      if (studentCoursesError) throw studentCoursesError

      return studentCourses && studentCourses.length > 0
    } catch (error) {
      console.error('Error validating teacher access:', error)
      return false
    }
  }

  // Get unique terms and years for filters
  const getAvailableTerms = () => {
    return [...new Set(allReports.map(report => report.term))].sort()
  }

  const getAvailableYears = () => {
    return [...new Set(allReports.map(report => report.academic_year))].sort().reverse()
  }

  // Update filters
  useEffect(() => {
    applyReportFilters()
  }, [reportSearchTerm, statusFilter, termFilter, yearFilter, allReports, students])

  // Effect for rendering charts when report data is available
  useEffect(() => {
    if (selectedReport && selectedReport.student_grades && selectedReport.student_grades.length > 0) {
      // Fetch historical reports for this student when a report is selected
      fetchHistoricalReports(selectedReport.student_id)
    }
  }, [selectedReport])

  // Fetch historical report data for the student
  const fetchHistoricalReports = async (studentId) => {
    try {
      setLoadingHistorical(true)
      
      // Get all reports for this student
      const { data: reports, error } = await supabase
        .from('student_reports')
        .select(`
          *,
          student_grades (
            *,
            courses (
              name
            )
          )
        `)
        .eq('student_id', studentId)
        .order('academic_year', { ascending: true })
        .order('term', { ascending: true })

      if (error) throw error

      if (reports && reports.length > 0) {
        // Sort reports by academic year and term
        const sortedReports = [...reports].sort((a, b) => {
          // Sort by academic year first
          const yearA = a.academic_year || ''
          const yearB = b.academic_year || ''
          
          if (yearA !== yearB) {
            return yearA.localeCompare(yearB)
          }
          
          // Then sort by term
          const termOrder = { 'Term 1': 1, 'Term 2': 2, 'Term 3': 3 }
          return termOrder[a.term] - termOrder[b.term]
        })
        
        setHistoricalReports(sortedReports)
      }
    } catch (error) {
      console.error('Error fetching historical reports:', error)
    } finally {
      setLoadingHistorical(false)
    }
  }

  // Calculate average score for a report
  const calculateReportAverage = (report) => {
    if (!report.student_grades || report.student_grades.length === 0) {
      return 0
    }
    
    const totalScore = report.student_grades.reduce((sum, grade) => sum + (grade.total_score || 0), 0)
    return totalScore / report.student_grades.length
  }

  // Prepare data for the performance trend chart
  const getPerformanceTrendData = () => {
    if (historicalReports.length === 0) {
      return {
        labels: ['No historical data'],
        datasets: [{
          label: 'Average Score',
          data: [0],
          borderColor: '#5b9bd5',
          backgroundColor: 'rgba(91, 155, 213, 0.2)',
          tension: 0.4,
          fill: true
        }]
      }
    }

    const labels = historicalReports.map(report => `${report.term} ${report.academic_year}`)
    const averages = historicalReports.map(report => calculateReportAverage(report))
    
    return {
      labels,
      datasets: [{
        label: 'Average Score',
        data: averages,
        borderColor: '#5b9bd5',
        backgroundColor: 'rgba(91, 155, 213, 0.2)',
        tension: 0.4,
        fill: true
      }]
    }
  }
  
  // Get subject-specific performance trends
  const getSubjectPerformanceTrends = () => {
    if (historicalReports.length === 0 || !selectedReport?.student_grades?.length) {
      return {
        labels: ['No historical data'],
        datasets: []
      }
    }

    // Get unique subject names from current report
    const currentSubjectNames = selectedReport.student_grades.map(grade => grade.courses?.name).filter(Boolean)
    
    // Create labels from historical reports
    const labels = historicalReports.map(report => `${report.term} ${report.academic_year}`)
    
    // Create datasets for each subject
    const datasets = currentSubjectNames.map((subjectName, index) => {
      // Generate a color based on the index, but use lighter pastel colors
      const hue = (index * 137) % 360 // Use golden angle approximation for good distribution
      const color = `hsl(${hue}, 60%, 70%)` // Lighter saturation and higher lightness
      const backgroundColor = `hsla(${hue}, 60%, 80%, 0.2)` // Even lighter for background
      
      // Find this subject's scores in each historical report
      const data = historicalReports.map(report => {
        const subjectGrade = report.student_grades?.find(grade => 
          grade.courses?.name?.toLowerCase() === subjectName.toLowerCase()
        )
        return subjectGrade ? subjectGrade.total_score || 0 : null
      })
      
      return {
        label: subjectName,
        data,
        borderColor: color,
        backgroundColor: backgroundColor,
        tension: 0.4,
        fill: false,
        pointRadius: 4
      }
    })
    
    return {
      labels,
      datasets
    }
  }

  // Handle grade editing in report viewer
  const handleGradeEdit = (gradeId, field, value) => {
    if (!selectedReport) return

    setSelectedReport(prev => ({
      ...prev,
      student_grades: prev.student_grades.map(grade => {
        if (grade.id === gradeId) {
          const updatedGrade = { ...grade, [field]: value }
          
          // Auto-calculate total score if class_score or exam_score changed
          if (field === 'class_score' || field === 'exam_score') {
            const classScore = field === 'class_score' ? parseFloat(value) || 0 : (grade.class_score || 0)
            const examScore = field === 'exam_score' ? parseFloat(value) || 0 : (grade.exam_score || 0)
            updatedGrade.total_score = classScore + examScore
          }
          
          return updatedGrade
        }
        return grade
      })
    }))
  }

  // Handle saving individual grade
  const handleSaveGrade = async (gradeId) => {
    try {
      const grade = selectedReport.student_grades.find(g => g.id === gradeId)
      if (!grade) {
        toast.error('Grade not found')
        return
      }

      console.log(`💾 Saving grade ${gradeId} for subject: ${grade.courses?.name}`)

      const { error } = await supabase
        .from('student_grades')
        .update({
          class_score: grade.class_score ? parseFloat(grade.class_score) : null,
          exam_score: grade.exam_score ? parseFloat(grade.exam_score) : null,
          total_score: grade.total_score ? parseFloat(grade.total_score) : null,
          grade: grade.grade || null,
          position: grade.position || '',
          remark: grade.remark || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', gradeId)

      if (error) {
        console.error('Error saving grade:', error)
        toast.error('Error saving grade')
        return
      }

      toast.success(`Grade saved for ${grade.courses?.name}`)
      
      // Refresh the report data to show updated values
      await handleViewFullReport(selectedReport.id)
      
      // Refresh dashboard statistics to update missing grades and counts
      console.log('🔄 Refreshing dashboard stats after grade save...')
      await fetchDashboardStats()

    } catch (error) {
      console.error('Error saving grade:', error)
      toast.error('Error saving grade')
    }
  }

  // Exact replica of admin loadStudentReport logic
  const loadStudentReport = async () => {
    if (!selectedStudent) {
      console.log('❌ No student selected - cannot load report')
      return
    }
    
    try {
      setReportLoading(true)
      console.log(`📚 Loading courses for student: ${selectedStudent.first_name} ${selectedStudent.last_name} (ID: ${selectedStudent.id})`)
      
      // First, always load the student's enrolled courses that are taught by this teacher (using exact same API as admin)
      const { data: teacherCourses, error: teacherCoursesError } = await supabase
        .from('faculty_courses')
        .select('course_id')
        .eq('faculty_id', user.id)

      if (teacherCoursesError) throw teacherCoursesError

      const teacherCourseIds = teacherCourses.map(tc => tc.course_id)

      const { data: enrolledCourses, error: coursesError } = await studentsAPI.getStudentCourses(selectedStudent.id)

      if (coursesError) throw coursesError

      // Show ALL courses for complete view, but mark which ones teacher can edit
      const allEnrolledCourses = enrolledCourses.map(enrollment => ({
        ...enrollment,
        canEdit: teacherCourseIds.includes(enrollment.course_id)
      }))
      
      const teacherEditableCourses = allEnrolledCourses.filter(c => c.canEdit)
      
      console.log(`✅ Found ${allEnrolledCourses?.length || 0} total enrolled courses for this student`)
      console.log(`🎯 Teacher can edit ${teacherEditableCourses?.length || 0} of these courses`)
      if (allEnrolledCourses?.length > 0) {
        console.log('📋 All enrolled courses:', allEnrolledCourses.map(c => `${c.courses.name} ${c.canEdit ? '(editable)' : '(view-only)'}`))
      }

      // Get existing report - STUDENT SPECIFIC (exact replica of admin logic)
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

        // Load grades for this specific report only (using exact same API as admin)
        console.log(`📊 Loading grades for report ID: ${existingReport.id} (specific to this student + term + year)`)
        const { data: grades, error: gradesError } = await studentGradesAPI.getGradesByReport(existingReport.id)

        if (gradesError) throw gradesError
        
        console.log(`✅ Found ${grades?.length || 0} total grade records for this specific report (ALL subjects)`)
        
        // Filter grades to only include teacher's courses (for grade entry - teachers only edit their own subjects)
        const teacherGrades = grades.filter(grade => 
          teacherCourseIds.includes(grade.subject_id)
        )
        
        console.log(`🎯 Teacher can edit ${teacherGrades?.length || 0} out of ${grades?.length || 0} total grades`)
        console.log(`📝 All grades found:`, grades.map(g => g.courses?.name || 'Unknown'))
        console.log(`✏️ Teacher's editable grades:`, teacherGrades.map(g => g.courses?.name || 'Unknown'))

        // Create a map of existing grades by course ID
        const existingGradesMap = new Map(
          teacherGrades.map(grade => [grade.subject_id, grade])
        )

        // Create a map of ALL existing grades by course ID (not just teacher's)
        const allExistingGradesMap = new Map(
          grades.map(grade => [grade.subject_id, grade])
        )

        // Combine ALL enrolled courses with existing grades (show everything, mark edit permissions)
        const subjectsWithGrades = allEnrolledCourses.map(enrollment => {
          const existingGrade = allExistingGradesMap.get(enrollment.course_id)
          
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
              teacherSignature: existingGrade.teacher_signature || '',
              canEdit: enrollment.canEdit // Mark if teacher can edit this subject
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
              teacherSignature: '',
              canEdit: enrollment.canEdit // Mark if teacher can edit this subject
            }
          }
        })

        setSubjects(subjectsWithGrades)
        
        // Notify user about loaded data
        const gradesCount = subjectsWithGrades.filter(s => s.classScore || s.examScore).length
        const editableCount = subjectsWithGrades.filter(s => s.canEdit).length
        if (gradesCount > 0) {
          toast.success(`Loaded report with ${gradesCount} graded subjects (${editableCount} editable)`)
        } else {
          toast(`Report template loaded with ${subjectsWithGrades.length} enrolled courses (${editableCount} editable)`, {
            icon: 'ℹ️',
            duration: 3000
          })
        }
      } else {
        // No existing report, create default subjects from enrolled courses
        console.log(`📝 No existing report found. Creating new template with ${allEnrolledCourses.length} enrolled courses for ${selectedStudent.first_name}`)
        const defaultSubjects = allEnrolledCourses.map(enrollment => ({
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
          teacherSignature: '',
          canEdit: enrollment.canEdit
        }))

        setSubjects(defaultSubjects)
        
        // Notify user that courses have been loaded
        const editableCount = defaultSubjects.filter(s => s.canEdit).length
        if (defaultSubjects.length > 0) {
          toast.success(`${defaultSubjects.length} enrolled courses loaded for ${selectedStudent.first_name} (${editableCount} editable)`)
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

  // Exact replica of admin calculation functions
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

  // Exact replica of admin search and subject management functions
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

  // Exact replica of admin saveReport logic
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

      // Create or update student report (exact replica of admin logic using same API)
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

      // Save grades (exact replica of admin logic using same API)
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
      
      // Refresh dashboard statistics to update missing grades and counts
      console.log('🔄 Refreshing dashboard stats after report save...')
      await fetchDashboardStats()
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

  const renderDashboardContent = () => (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Teacher Dashboard</h1>
          <p className="text-muted">Welcome back, {profile?.first_name}! Here's your teaching overview.</p>
        </div>
      </div>

      {/* Teacher-Specific Statistics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaUsers className="fs-2 me-3" />
                <div>
                  <h3 className="mb-1">{statistics.myStudents}</h3>
                  <small>My Students</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaChartBar className="fs-2 me-3" />
                <div>
                  <h3 className="mb-1">{statistics.myCourses}</h3>
                  <small>My Courses</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaFileAlt className="fs-2 me-3" />
                <div>
                  <h3 className="mb-1">{statistics.reportsIFilled}</h3>
                  <small>Reports I've Filled</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaEdit className="fs-2 me-3" />
                <div>
                  <h3 className="mb-1">{statistics.fieldsICompleted}</h3>
                  <small>Grade Fields Completed</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course-Specific Breakdown */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <FaChartBar className="me-2" />
                Course Breakdown
              </h5>
              <small className="text-muted">Detailed statistics for each of your courses</small>
            </div>
            <div className="card-body">
              {courseBreakdown.length > 0 ? (
                <div className="row">
                  {courseBreakdown.map((courseData, index) => (
                    <div key={courseData.course.id} className="col-md-6 col-lg-4 mb-3">
                      <div className="card border-start border-4 border-info">
                        <div className="card-body">
                          <h6 className="card-title text-info">
                            {courseData.course.code}
                          </h6>
                          <p className="card-text text-muted small">
                            {courseData.course.name}
                          </p>
                          <div className="row text-center">
                            <div className="col-4">
                              <div className="h5 mb-0 text-primary">{courseData.studentCount}</div>
                              <small className="text-muted">Students</small>
                            </div>
                            <div className="col-4">
                              <div className="h5 mb-0 text-success">{courseData.reportsFilledCount}</div>
                              <small className="text-muted">Reports</small>
                            </div>
                            <div className="col-4">
                              <div className="h5 mb-0 text-warning">{courseData.gradesFilledCount}</div>
                              <small className="text-muted">Grades</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FaChartBar className="fs-1 text-muted mb-3" />
                  <h6 className="text-muted">No course data available yet</h6>
                  <p className="text-muted small">Course breakdown will appear once you have students and grades entered.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Students with Missing Grades */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-start border-4 border-warning">
            <div className="card-header bg-light">
              <h5 className="mb-0 text-warning">
                <FaExclamationTriangle className="me-2" />
                Students Requiring Grade Entry
              </h5>
              <small className="text-muted">
                {studentsWithMissingGrades.length > 0 
                  ? `${studentsWithMissingGrades.length} student(s) have draft reports that need your grades`
                  : "All students have their grades completed"
                }
              </small>
            </div>
            <div className="card-body">
              {studentsWithMissingGrades.length > 0 ? (
                <>
                  {/* Pagination calculation */}
                  {(() => {
                    const totalPages = Math.ceil(studentsWithMissingGrades.length / missingGradesItemsPerPage)
                    const startIndex = (missingGradesCurrentPage - 1) * missingGradesItemsPerPage
                    const endIndex = startIndex + missingGradesItemsPerPage
                    const currentStudents = studentsWithMissingGrades.slice(startIndex, endIndex)

                    const handlePageChange = (pageNumber) => {
                      setMissingGradesCurrentPage(pageNumber)
                    }

                    const renderPagination = () => {
                      if (totalPages <= 1) return null

                      return (
                        <div className="pagination-container d-flex justify-content-between align-items-center mt-3">
                          <div className="pagination-info">
                            <small className="text-muted">
                              Showing {startIndex + 1}-{Math.min(endIndex, studentsWithMissingGrades.length)} of {studentsWithMissingGrades.length} students
                            </small>
                          </div>
                          <div className="pagination-buttons">
                            <button 
                              className="pagination-btn me-2"
                              onClick={() => handlePageChange(missingGradesCurrentPage - 1)}
                              disabled={missingGradesCurrentPage === 1}
                            >
                              Previous
                            </button>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                              <button
                                key={pageNumber}
                                className={`pagination-btn me-1 ${pageNumber === missingGradesCurrentPage ? 'active' : ''}`}
                                onClick={() => handlePageChange(pageNumber)}
                              >
                                {pageNumber}
                              </button>
                            ))}
                            
                            <button 
                              className="pagination-btn ms-2"
                              onClick={() => handlePageChange(missingGradesCurrentPage + 1)}
                              disabled={missingGradesCurrentPage === totalPages}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <>
                        <div className="table-responsive">
                          <table className="table table-hover">
                            <thead>
                              <tr>
                                <th>Student Name</th>
                                <th>Class</th>
                                <th>Term</th>
                                <th>Academic Year</th>
                                <th>Your Course(s)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentStudents.map((student, index) => (
                                <tr key={`${student.student_id}-${startIndex + index}`}>
                                  <td className="fw-medium">{student.studentName}</td>
                                  <td>
                                    <span className="badge bg-secondary">{student.classYear}</span>
                                  </td>
                                  <td>{student.term}</td>
                                  <td>{student.academic_year}</td>
                                  <td>
                                    <div className="d-flex flex-wrap gap-1">
                                      {student.courses.map((course, idx) => (
                                        <span key={idx} className="badge bg-info text-white">
                                          {course.code}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {renderPagination()}
                      </>
                    )
                  })()}
                </>
              ) : (
                <div className="text-center py-4">
                  <FaExclamationTriangle className="fs-1 text-success mb-3" />
                  <h6 className="text-success">Great work! No missing grades</h6>
                  <p className="text-muted small">All your students have their grades entered, or there are no draft reports requiring your input.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Your Courses Summary */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <FaBook className="me-2" />
                Your Courses
              </h5>
            </div>
            <div className="card-body">
              {courses.length > 0 ? (
                <div className="row">
                  {courses.map(course => (
                    <div key={course.id} className="col-md-4 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <h6 className="card-title">{course.code}</h6>
                          <p className="card-text">{course.name}</p>
                          <small className="text-muted">{course.description}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No courses assigned yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Exact replica of admin Reports.jsx interface
  const renderReportsContent = () => (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Student Reports</h1>
        <p className="text-muted">View ALL subjects • Green = Editable • Gray = View Only</p>
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
        <div className="student-search-container">
          <div className="form-group search-group">
            <label>Search Students:</label>
            <div className="search-input-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                className="form-control search-input"
                placeholder="Search by name, class, or email..."
                value={studentSearchTerm}
                onChange={handleStudentSearchChange}
              />
            </div>
          </div>
          
          <div className="form-group select-group">
          <label>Select Student:</label>
          <select
            className="form-control"
            value={selectedStudent?.id || ''}
            onChange={(e) => {
              const student = students.find(s => s.id === e.target.value)
              setSelectedStudent(student)
            }}
          >
              <option value="">-- Select a student ({filteredStudents.length} found) --</option>
              {filteredStudents.map(student => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name} - {student.students?.class_year || 'No Class'}
              </option>
            ))}
          </select>
        </div>
        </div>
        
        {studentSearchTerm && (
          <div className="search-results-info">
            <small className="text-muted">
              {filteredStudents.length} student(s) found for "{studentSearchTerm}"
            </small>
          </div>
        )}
      </div>

      {selectedStudent && (
        <>
          {/* Report Header */}
          <div className="report-header-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
              <img 
                src={logo} 
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
                    <th>Permission</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.length > 0 ? (
                    subjects.map(subject => (
                      <tr key={subject.id} className={subject.canEdit ? 'table-success' : 'table-light'}>
                        <td>
                          <strong>{subject.code}:</strong> {subject.name}
                        </td>
                        <td>
                          {subject.canEdit ? (
                            <input
                              type="number"
                              className="form-control"
                              placeholder="Score"
                              value={subject.classScore}
                              min="0"
                              max="60"
                              onChange={(e) => handleSubjectChange(subject.id, 'classScore', e.target.value)}
                            />
                          ) : (
                            <span className="text-muted">{subject.classScore || '-'}</span>
                          )}
                        </td>
                        <td>
                          {subject.canEdit ? (
                            <input
                              type="number"
                              className="form-control"
                              placeholder="Score"
                              value={subject.examScore}
                              min="0"
                              max="40"
                              onChange={(e) => handleSubjectChange(subject.id, 'examScore', e.target.value)}
                            />
                          ) : (
                            <span className="text-muted">{subject.examScore || '-'}</span>
                          )}
                        </td>
                        <td className="total-score">
                          {subject.totalScore}
                        </td>
                        <td>
                          {subject.canEdit ? (
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Position"
                              value={subject.position}
                              onChange={(e) => handleSubjectChange(subject.id, 'position', e.target.value)}
                            />
                          ) : (
                            <span className="text-muted">{subject.position || '-'}</span>
                          )}
                        </td>
                        <td>
                          {subject.canEdit ? (
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Grade"
                              value={subject.grade}
                              onChange={(e) => handleSubjectChange(subject.id, 'grade', e.target.value)}
                            />
                          ) : (
                            <span className="text-muted">{subject.grade || '-'}</span>
                          )}
                        </td>
                        <td>
                          {subject.canEdit ? (
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Remark"
                              value={subject.remark}
                              onChange={(e) => handleSubjectChange(subject.id, 'remark', e.target.value)}
                            />
                          ) : (
                            <span className="text-muted">{subject.remark || '-'}</span>
                          )}
                        </td>
                        <td>
                          {subject.canEdit ? (
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Sign"
                              value={subject.teacherSignature}
                              onChange={(e) => handleSubjectChange(subject.id, 'teacherSignature', e.target.value)}
                            />
                          ) : (
                            <span className="text-muted">{subject.teacherSignature || '-'}</span>
                          )}
                        </td>
                        <td>
                          {subject.canEdit ? (
                            <span className="badge bg-success">
                              <FaEdit className="me-1" />
                              Editable
                            </span>
                          ) : (
                            <span className="badge bg-secondary">
                              <FaEye className="me-1" />
                              View Only
                            </span>
                          )}
                        </td>
                        <td>
                          {subject.canEdit && (
                            <button
                              className="delete-btn"
                              onClick={() => removeSubject(subject.id)}
                              title="Remove subject"
                            >
                              <FaTrashAlt />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="empty-subjects">
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
                    <td colSpan="6"></td>
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

  // Render Report Management tab - view complete report cards
  const renderReportManagementContent = () => (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Report Management</h1>
          <p className="text-muted">View complete report cards for your students</p>
        </div>
        <div className="col-auto">
          <button 
            className="btn btn-primary"
            onClick={fetchAllTeacherReports}
            disabled={loading}
          >
            <FaSearch className="me-2" />
            Refresh Reports
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by student name..."
                    value={reportSearchTerm}
                    onChange={(e) => setReportSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <select
                    className="form-control"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Reports</option>
                    <option value="completed">Completed</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-control"
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value)}
                  >
                    <option value="all">All Terms</option>
                    {getAvailableTerms().map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-control"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                  >
                    <option value="all">All Years</option>
                    {getAvailableYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <FaFilter className="me-2 text-muted" />
                    <span className="text-muted">
                      {filteredReports.length} of {allReports.length} reports
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Overview Charts */}
      {filteredReports.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <FaChartBar className="me-2" />
                  Performance Overview - All Reports
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {/* Class Performance Distribution */}
                  <div className="col-md-6 mb-4">
                    <h6 className="text-center mb-3">Grade Distribution</h6>
                    <div style={{ height: '300px', position: 'relative' }}>
                      <Bar 
                        data={{
                          labels: ['A1-A2', 'B2-B4', 'C4-C6', 'D7-E8', 'F9'],
                          datasets: [{
                            label: 'Number of Students',
                            data: (() => {
                              const gradeCounts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 }
                              filteredReports.forEach(report => {
                                const grade = report.overall_grade?.charAt(0) || 'F'
                                if (grade === 'A') gradeCounts.A++
                                else if (grade === 'B') gradeCounts.B++
                                else if (grade === 'C') gradeCounts.C++
                                else if (grade === 'D') gradeCounts.D++
                                else gradeCounts.F++
                              })
                              return [gradeCounts.A, gradeCounts.B, gradeCounts.C, gradeCounts.D, gradeCounts.F]
                            })(),
                            backgroundColor: [
                              'rgba(40, 167, 69, 0.7)',
                              'rgba(23, 162, 184, 0.7)',
                              'rgba(255, 193, 7, 0.7)',
                              'rgba(108, 117, 125, 0.7)',
                              'rgba(220, 53, 69, 0.7)'
                            ],
                            borderColor: [
                              'rgba(40, 167, 69, 1)',
                              'rgba(23, 162, 184, 1)',
                              'rgba(255, 193, 7, 1)',
                              'rgba(108, 117, 125, 1)',
                              'rgba(220, 53, 69, 1)'
                            ],
                            borderWidth: 1
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Number of Students'
                              }
                            }
                          },
                          plugins: {
                            title: {
                              display: true,
                              text: 'Grade Distribution Across All Reports'
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Average Performance by Term */}
                  <div className="col-md-6 mb-4">
                    <h6 className="text-center mb-3">Average Performance by Term</h6>
                    <div style={{ height: '300px', position: 'relative' }}>
                      <Line 
                        data={{
                          labels: (() => {
                            const terms = [...new Set(filteredReports.map(r => `${r.term} ${r.academic_year}`))]
                            return terms.sort()
                          })(),
                          datasets: [{
                            label: 'Average Score (%)',
                            data: (() => {
                              const termAverages = {}
                              filteredReports.forEach(report => {
                                const termKey = `${report.term} ${report.academic_year}`
                                if (!termAverages[termKey]) {
                                  termAverages[termKey] = { total: 0, count: 0 }
                                }
                                termAverages[termKey].total += report.total_score || 0
                                termAverages[termKey].count++
                              })
                              const terms = [...new Set(filteredReports.map(r => `${r.term} ${r.academic_year}`))].sort()
                              return terms.map(term => {
                                const avg = termAverages[term]
                                return avg.count > 0 ? Math.round(avg.total / avg.count) : 0
                              })
                            })(),
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.4,
                            fill: true
                          }]
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
                                text: 'Average Score (%)'
                              }
                            }
                          },
                          plugins: {
                            title: {
                              display: true,
                              text: 'Class Performance Trends'
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Subject Performance Overview */}
                  <div className="col-md-12">
                    <h6 className="text-center mb-3">Subject Performance Overview</h6>
                    <div style={{ height: '400px', position: 'relative' }}>
                      <Bar 
                        data={{
                          labels: (() => {
                            const allSubjects = new Set()
                            filteredReports.forEach(report => {
                              report.student_grades?.forEach(grade => {
                                if (grade.courses?.name) {
                                  allSubjects.add(grade.courses.name)
                                }
                              })
                            })
                            return Array.from(allSubjects).sort()
                          })(),
                          datasets: [{
                            label: 'Average Class Score (60%)',
                            data: (() => {
                              const subjects = (() => {
                                const allSubjects = new Set()
                                filteredReports.forEach(report => {
                                  report.student_grades?.forEach(grade => {
                                    if (grade.courses?.name) {
                                      allSubjects.add(grade.courses.name)
                                    }
                                  })
                                })
                                return Array.from(allSubjects).sort()
                              })()
                              
                              return subjects.map(subject => {
                                let totalScore = 0
                                let count = 0
                                filteredReports.forEach(report => {
                                  report.student_grades?.forEach(grade => {
                                    if (grade.courses?.name === subject && grade.class_score) {
                                      totalScore += grade.class_score
                                      count++
                                    }
                                  })
                                })
                                return count > 0 ? Math.round(totalScore / count) : 0
                              })
                            })(),
                            backgroundColor: 'rgba(54, 162, 235, 0.7)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                          }, {
                            label: 'Average Exam Score (40%)',
                            data: (() => {
                              const subjects = (() => {
                                const allSubjects = new Set()
                                filteredReports.forEach(report => {
                                  report.student_grades?.forEach(grade => {
                                    if (grade.courses?.name) {
                                      allSubjects.add(grade.courses.name)
                                    }
                                  })
                                })
                                return Array.from(allSubjects).sort()
                              })()
                              
                              return subjects.map(subject => {
                                let totalScore = 0
                                let count = 0
                                filteredReports.forEach(report => {
                                  report.student_grades?.forEach(grade => {
                                    if (grade.courses?.name === subject && grade.exam_score) {
                                      totalScore += grade.exam_score
                                      count++
                                    }
                                  })
                                })
                                return count > 0 ? Math.round(totalScore / count) : 0
                              })
                            })(),
                            backgroundColor: 'rgba(255, 99, 132, 0.7)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                          }]
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
                                text: 'Average Score (%)'
                              }
                            }
                          },
                          plugins: {
                            title: {
                              display: true,
                              text: 'Subject Performance Across All Students'
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading reports...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-5">
                  <FaFileAlt size={48} className="text-muted mb-3" />
                  <h5>No Reports Found</h5>
                  <p className="text-muted">
                    {allReports.length === 0 
                      ? "No reports have been created for your students yet."
                      : "No reports match your current filters."
                    }
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Term</th>
                        <th>Academic Year</th>
                        <th>Status</th>
                        <th>Subjects</th>
                        <th>Total Score</th>
                        <th>Grade</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map(report => {
                        const student = students.find(s => s.id === report.student_id)
                        const isCompleted = report.status === REPORT_STATUS.COMPLETED
                        const isDraft = report.status === REPORT_STATUS.DRAFT
                        
                        return (
                          <tr key={report.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <FaUser className="me-2 text-muted" />
                                <div>
                                  <div className="fw-bold">
                                    {student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'}
                                  </div>
                                  <small className="text-muted">
                                    {student?.students?.student_id || 'N/A'}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>{report.class_year}</td>
                            <td>{report.term}</td>
                            <td>{report.academic_year}</td>
                            <td>
                              {isCompleted ? (
                                <span className="badge bg-success">
                                  <FaLock className="me-1" />
                                  Completed
                                </span>
                              ) : (
                                <span className="badge bg-warning">
                                  <FaClock className="me-1" />
                                  Draft
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              <span className="badge bg-info">
                                {report.student_grades?.length || 0} subjects
                              </span>
                            </td>
                            <td>
                              <span className="fw-bold text-primary">
                                {report.total_score || 0}%
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                report.overall_grade === 'A1' || report.overall_grade === 'A2' ? 'bg-success' :
                                report.overall_grade === 'B2' || report.overall_grade === 'B3' || report.overall_grade === 'B4' ? 'bg-info' :
                                report.overall_grade === 'C4' || report.overall_grade === 'C5' || report.overall_grade === 'C6' ? 'bg-warning' :
                                'bg-secondary'
                              }`}>
                                {report.overall_grade || 'N/A'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-primary btn-sm me-2"
                                onClick={() => handleViewFullReport(report.id)}
                                title="View Complete Report Card"
                              >
                                <FaEye className="me-1" />
                                View Report
                              </button>
                              {isDraft && (
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => {
                                    setActiveTab('reports')
                                    const student = students.find(s => s.id === report.student_id)
                                    if (student) {
                                      setSelectedStudent(student)
                                    }
                                  }}
                                  title="Edit Grades"
                                >
                                  <FaEdit className="me-1" />
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Viewer Modal */}
      {showReportViewer && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl" style={{ maxWidth: '100vw', width: '100vw', maxHeight: '100vh', margin: '0', padding: '0' }}>
                          <div className="modal-content" style={{ height: '100vh', maxHeight: '100vh', margin: '0', borderRadius: '0' }}>
              <div className="modal-header" style={{ padding: '1rem 2rem' }}>
                <h5 className="modal-title" style={{ fontSize: '1.5rem', fontWeight: '600' }}>Complete Report Card</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowReportViewer(false)
                    setSelectedReport(null)
                  }}
                ></button>
              </div>
              <div className="modal-body" style={{ height: 'calc(100vh - 140px)', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', padding: '2rem' }}>
                {reportViewerLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Loading complete report card...</p>
                  </div>
                ) : selectedReport ? (
                  <TeacherReportViewer report={selectedReport} />
                ) : (
                  <div className="text-center py-5">
                    <p className="text-muted">No report selected</p>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ padding: '1rem 2rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowReportViewer(false)
                    setSelectedReport(null)
                  }}
                >
                  Close
                </button>
                {selectedReport && (
                  <>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => {
                        // Save all editable grades
                        const editableGrades = selectedReport.student_grades.filter(g => g.canEdit)
                        if (editableGrades.length > 0) {
                          editableGrades.forEach(grade => handleSaveGrade(grade.id))
                        }
                      }}
                    >
                      <FaSave className="me-2" />
                      Save All Changes
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => window.print()}
                    >
                      <FaPrint className="me-2" />
                      Print Report
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Teacher Report Viewer Component - Complete Report Card with ALL Subjects
  const TeacherReportViewer = ({ report }) => {
    if (!report) return null

    // Debug logging to verify all subjects are present
    console.log('📋 Rendering report with subjects:', report.student_grades?.map(g => g.courses?.name) || [])
    console.log('📊 Total subjects in report:', report.student_grades?.length || 0)
    console.log('🎯 Editable subjects:', report.student_grades?.filter(g => g.canEdit).map(g => g.courses?.name) || [])
    console.log('👥 View-only subjects:', report.student_grades?.filter(g => !g.canEdit).map(g => g.courses?.name) || [])

    const calculateGradeStats = () => {
      if (!report.student_grades || report.student_grades.length === 0) return {
        total: 0,
        average: 0,
        highest: 0,
        lowest: 0
      }
      
      const grades = report.student_grades
      const validScores = grades.filter(g => g.total_score !== null && g.total_score !== undefined)
      
      if (validScores.length === 0) return {
        total: grades.length,
        average: 0,
        highest: 0,
        lowest: 0
      }
      
      const total = validScores.reduce((sum, grade) => sum + (grade.total_score || 0), 0)
      const average = validScores.length > 0 ? total / validScores.length : 0
      const highest = Math.max(...validScores.map(g => g.total_score || 0))
      const lowest = Math.min(...validScores.map(g => g.total_score || 0))
      
      return {
        total: grades.length,
        average: Math.round(average * 100) / 100,
        highest,
        lowest
      }
    }

    const getGradeBadgeClass = (grade) => {
      const gradeLetter = grade?.charAt(0)?.toLowerCase()
      switch(gradeLetter) {
        case 'a': return 'success'
        case 'b': return 'info'
        case 'c': return 'warning'
        case 'd': return 'secondary'
        case 'f': return 'danger'
        default: return 'secondary'
      }
    }

    const stats = calculateGradeStats()

    return (
      <div className="report-viewer-content">
        {/* School Header */}
        <div className="text-center mb-4 p-3 border-bottom">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <img 
              src={logo} 
              alt="Life International College" 
              style={{ width: '50px', height: '50px' }}
            />
            <div>
              <h3 style={{ color: '#722F37', margin: '0 0 0.25rem 0' }}>Life International College</h3>
              <p style={{ color: '#8BC34A', margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: '600' }}>Knowledge • Excellence • Christ</p>
            </div>
          </div>
          <p className="text-muted">Private Mail Bag, 252 Tema / Tel: 024 437 7584</p>
          <h4 style={{ color: '#722F37' }}>TERMINAL REPORT</h4>
        </div>

        {/* Student Information */}
        <div className="row mb-4">
          <div className="col-12">
            <h5 className="border-bottom pb-2">Student Information</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <strong>Name:</strong> {report.student.first_name} {report.student.last_name}
              </div>
              <div className="col-md-4">
                <strong>Student ID:</strong> {report.student.students?.student_id || 'N/A'}
              </div>
              <div className="col-md-4">
                <strong>Class:</strong> {report.class_year || 'N/A'}
              </div>
              <div className="col-md-4">
                <strong>Term:</strong> {report.term}
              </div>
              <div className="col-md-4">
                <strong>Academic Year:</strong> {report.academic_year}
              </div>
              <div className="col-md-4">
                <strong>Attendance:</strong> {report.attendance || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Grades Table - ALL Subjects with Edit Capability */}
        <div className="mb-4">
          <h5 className="border-bottom pb-2">
            Subject Grades - All Subjects ({report.student_grades?.length || 0} subjects)
            <small className="text-muted ms-2">• Green = Editable • Gray = View Only</small>
          </h5>
          <div className="alert alert-info mb-3">
            <strong>Database Query:</strong> Showing ALL {report.student_grades?.length || 0} grades from database 
            ({report.student_grades?.filter(g => g.canEdit)?.length || 0} editable, {report.student_grades?.filter(g => !g.canEdit)?.length || 0} view-only)
          </div>
          {!report.student_grades || report.student_grades.length === 0 ? (
            <div className="alert alert-warning">
              <strong>No grades found:</strong> This report does not contain any subject grades yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Subject</th>
                    <th>Class Score ({getDisplayPercentages(report.class_year).classText})</th>
                    <th>Exam Score ({getDisplayPercentages(report.class_year).examText})</th>
                    <th>Total Score</th>
                    <th>Grade</th>
                    <th>Position</th>
                    <th>Remark</th>
                    <th>Permission</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {report.student_grades.map((grade, index) => (
                    <tr key={grade.id || index} className={grade.canEdit ? 'table-success' : 'table-light'}>
                      <td className="text-center fw-bold">{index + 1}</td>
                      <td className="fw-bold">
                        {grade.courses?.name || grade.course_name || 'Unknown Subject'}
                        {grade.courses?.code && (
                          <small className="text-muted d-block">({grade.courses.code})</small>
                        )}
                      </td>
                      <td className="text-center">
                        {grade.canEdit ? (
                          <input
                            type="number"
                            className="form-control form-control-sm text-center"
                            value={grade.class_score || ''}
                            onChange={(e) => handleGradeEdit(grade.id, 'class_score', e.target.value)}
                            min="0"
                            max="60"
                            placeholder="0-60"
                          />
                        ) : (
                          <span>{grade.class_score !== null && grade.class_score !== undefined ? grade.class_score : '-'}</span>
                        )}
                      </td>
                      <td className="text-center">
                        {grade.canEdit ? (
                          <input
                            type="number"
                            className="form-control form-control-sm text-center"
                            value={grade.exam_score || ''}
                            onChange={(e) => handleGradeEdit(grade.id, 'exam_score', e.target.value)}
                            min="0"
                            max="40"
                            placeholder="0-40"
                          />
                        ) : (
                          <span>{grade.exam_score !== null && grade.exam_score !== undefined ? grade.exam_score : '-'}</span>
                        )}
                      </td>
                      <td className="text-center fw-bold text-primary">
                        {grade.total_score !== null && grade.total_score !== undefined ? grade.total_score : '-'}
                      </td>
                      <td className="text-center">
                        {grade.canEdit ? (
                          <select
                            className="form-select form-select-sm"
                            value={grade.grade || ''}
                            onChange={(e) => handleGradeEdit(grade.id, 'grade', e.target.value)}
                          >
                            <option value="">Select Grade</option>
                            <option value="A1">A1</option>
                            <option value="A2">A2</option>
                            <option value="B2">B2</option>
                            <option value="B3">B3</option>
                            <option value="B4">B4</option>
                            <option value="C4">C4</option>
                            <option value="C5">C5</option>
                            <option value="C6">C6</option>
                            <option value="D7">D7</option>
                            <option value="E8">E8</option>
                            <option value="F9">F9</option>
                          </select>
                        ) : (
                          <span className={`badge bg-${getGradeBadgeClass(grade.grade)}`}>
                            {grade.grade || '-'}
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {grade.canEdit ? (
                          <input
                            type="text"
                            className="form-control form-control-sm text-center"
                            value={grade.position || ''}
                            onChange={(e) => handleGradeEdit(grade.id, 'position', e.target.value)}
                            placeholder="e.g., 1st"
                          />
                        ) : (
                          <span>{grade.position || '-'}</span>
                        )}
                      </td>
                      <td>
                        {grade.canEdit ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={grade.remark || ''}
                            onChange={(e) => handleGradeEdit(grade.id, 'remark', e.target.value)}
                            placeholder="Remark"
                          />
                        ) : (
                          <span>{grade.remark || '-'}</span>
                        )}
                      </td>
                      <td className="text-center">
                        {grade.canEdit ? (
                          <span className="badge bg-success">
                            <FaEdit className="me-1" />
                            Editable
                          </span>
                        ) : (
                          <span className="badge bg-secondary">
                            <FaEye className="me-1" />
                            View Only
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {grade.canEdit && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSaveGrade(grade.id)}
                            title="Save Changes"
                          >
                            <FaSave className="me-1" />
                            Save
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance Summary */}
        <div className="row mb-4">
          <div className="col-12">
            <h5 className="border-bottom pb-2">Performance Summary</h5>
            <div className="row g-3">
              <div className="col-md-3">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h6>Total Subjects</h6>
                    <h4 className="text-primary">{stats.total}</h4>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h6>Overall Average</h6>
                    <h4 className="text-success">{report.total_score || 0}%</h4>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h6>Overall Grade</h6>
                    <h4>
                      <span className={`badge bg-${getGradeBadgeClass(report.overall_grade)}`}>
                        {report.overall_grade || 'N/A'}
                      </span>
                    </h4>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h6>Status</h6>
                    <h4>
                      {report.status === REPORT_STATUS.COMPLETED ? (
                        <span className="badge bg-success">
                          <FaLock className="me-1" />
                          Completed
                        </span>
                      ) : (
                        <span className="badge bg-warning">
                          <FaClock className="me-1" />
                          Draft
                        </span>
                      )}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remarks Section */}
        <div className="mb-4">
          <h5 className="border-bottom pb-2">Remarks</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <strong>Conduct:</strong>
              <p className="mt-1">{report.conduct || 'No conduct remarks'}</p>
            </div>
            <div className="col-md-6">
              <strong>Next Class:</strong>
              <p className="mt-1">{report.next_class || 'Not specified'}</p>
            </div>
            <div className="col-12">
              <strong>Teacher's Remarks:</strong>
              <p className="mt-1">{report.teacher_remarks || 'No teacher remarks'}</p>
            </div>
            <div className="col-12">
              <strong>Reopening Date:</strong>
              <p className="mt-1">{report.reopening_date || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {/* Data Source Information */}
        <div className="mb-4">
          <h5 className="border-bottom pb-2">Report Data Information</h5>
          <div className="row g-3">
            <div className="col-md-3">
              <div className="card bg-light">
                <div className="card-body text-center">
                  <h6>Total Subjects</h6>
                  <h4 className="text-primary">{report.student_grades?.length || 0}</h4>
                  <small className="text-muted">ALL subjects from database</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-light">
                <div className="card-body text-center">
                  <h6>Editable Subjects</h6>
                  <h4 className="text-success">{report.student_grades?.filter(g => g.canEdit)?.length || 0}</h4>
                  <small className="text-muted">Teacher can edit</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-light">
                <div className="card-body text-center">
                  <h6>Data Source</h6>
                  <h4 className="text-info">Fresh DB</h4>
                  <small className="text-muted">Real-time from database</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-light">
                <div className="card-body text-center">
                  <h6>Last Updated</h6>
                  <h4 className="text-warning">
                    {report.updated_at ? new Date(report.updated_at).toLocaleDateString() : 'N/A'}
                  </h4>
                  <small className="text-muted">Report last modified</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Analysis Charts */}
        {report.student_grades && report.student_grades.length > 0 ? (
          <div className="mb-4">
            <h5 className="border-bottom pb-2">
              📊 Performance Analysis 
              <small className="text-muted ms-2">
                (Debug: {report.student_grades.length} subjects loaded)
              </small>
            </h5>
            
            {/* Debug Info */}
            <div className="alert alert-info mb-3">
              <strong>Chart Debug Info:</strong>
              <ul className="mb-0">
                <li>Subjects: {report.student_grades.map(g => g.courses?.name).join(', ')}</li>
                <li>Class Scores: {report.student_grades.map(g => g.class_score).join(', ')}</li>
                <li>Exam Scores: {report.student_grades.map(g => g.exam_score).join(', ')}</li>
                <li>Chart Components Available: {typeof Bar !== 'undefined' ? 'Yes' : 'No'}</li>
              </ul>
            </div>
            
            {/* Test Chart First */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title text-center">Test Chart - Simple Bar Chart</h6>
                    <div style={{ height: '200px', position: 'relative', border: '2px solid red' }}>
                      {(() => {
                        const testData = {
                          labels: ['Test 1', 'Test 2', 'Test 3'],
                          datasets: [{
                            label: 'Test Scores',
                            data: [75, 85, 90],
                            backgroundColor: 'rgba(255, 0, 0, 0.5)',
                            borderColor: 'rgba(255, 0, 0, 1)',
                            borderWidth: 1
                          }]
                        }
                        console.log('🧪 Test Chart Data:', testData)
                        console.log('🧪 Bar component type:', typeof Bar)
                        return <Bar 
                          data={testData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false
                          }}
                        />
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Visualization Section - EXACT LIKE THE IMAGE */}
            <div className="mb-4 performance-visualization">
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
                  <div className="chart-container" style={{ height: '500px', position: 'relative', minHeight: '500px' }}>
                    {chartType === 'bar' ? (
                      // Bar Chart
                      (() => {
                        const chartData = {
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
                        }
                        console.log('📊 Bar Chart Data:', chartData)
                        return <Bar 
                          data={chartData}
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
                      })()
                    ) : (
                      // Radar Chart
                      (() => {
                        const radarData = {
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
                        }
                        console.log('🎯 Radar Chart Data:', radarData)
                        return <Radar 
                          data={radarData}
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
                      })()
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Historical Performance Trend */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title text-center">Performance Trend Across Terms</h6>
                    {loadingHistorical ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading historical data...</p>
                      </div>
                    ) : historicalReports.length > 0 ? (
                      <div style={{ height: '300px', position: 'relative' }}>
                        <Line 
                          data={getPerformanceTrendData()}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                max: 100,
                                title: {
                                  display: true,
                                  text: 'Average Score'
                                }
                              }
                            },
                            plugins: {
                              title: {
                                display: true,
                                text: 'Student Progress Over Time'
                              },
                              tooltip: {
                                callbacks: {
                                  title: function(context) {
                                    return context[0].label
                                  },
                                  label: function(context) {
                                    return `Average Score: ${context.parsed.y.toFixed(1)}%`
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted">No historical data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Subject Performance Trends */}
            {historicalReports.length > 1 && (
              <div className="row">
                <div className="col-12">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title text-center">Subject Performance Trends</h6>
                      <div style={{ height: '300px', position: 'relative' }}>
                        <Line 
                          data={getSubjectPerformanceTrends()}
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
                              }
                            },
                            plugins: {
                              title: {
                                display: true,
                                text: 'Subject Progress Over Time'
                              },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <div className="alert alert-warning">
              <strong>No Performance Data Available</strong>
              <p className="mb-0">No subject grades found for this report. Charts will appear once grades are added.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-4 pt-3 border-top">
          <small className="text-muted">
            Generated on {new Date().toLocaleDateString()} | 
            Report ID: {report.id} | 
            Showing ALL {report.student_grades?.length || 0} subjects from database
          </small>
        </div>
      </div>
    )
  }

  // Class Reports Content - Shows all classes assigned to teacher
  const renderClassReportsContent = () => {

    if (!selectedClass) {
      return (
        <div className="container-fluid p-4">
          <div className="row mb-4">
            <div className="col">
              <h2 className="mb-3">Class Reports</h2>
              <p className="text-muted">Select a class to view and manage student reports</p>
            </div>
          </div>

          {loadingCourses ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-3">Loading your classes...</p>
            </div>
          ) : teacherCourses.length === 0 ? (
            <div className="row">
              <div className="col-12">
                <div className="alert alert-info text-center">
                  <FaUsers className="mb-3" style={{ fontSize: '3rem', opacity: 0.5 }} />
                  <h4>No Classes Assigned</h4>
                  <p className="mb-0">You don't have any classes assigned yet. Contact your administrator for assistance.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="row">
              {teacherCourses.map((course) => (
                <div key={course.id} className="col-lg-4 col-md-6 mb-4">
                  <div 
                    className="card h-100 border-0 shadow-sm class-card"
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onClick={() => handleClassSelect(course)}
                    onMouseEnter={(e) => e.target.closest('.card').style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.target.closest('.card').style.transform = 'translateY(0)'}
                  >
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center me-3"
                          style={{ 
                            width: '50px', 
                            height: '50px', 
                            background: 'linear-gradient(135deg, var(--wine), var(--wine-light))',
                            color: 'white'
                          }}
                        >
                          <FaUsers />
                        </div>
                        <div className="flex-grow-1">
                          <h5 className="card-title mb-1">{course.displayName}</h5>
                          <small className="text-muted">{course.displayCode}</small>
                        </div>
                      </div>
                      
                      <p className="card-text text-muted small mb-3">
                        {course.courseDescription || 'No description available'}
                      </p>
                      
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="badge bg-primary">{course.studentCount} students</span>
                        <small className="text-muted">Click to view →</small>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="container-fluid p-4">
        <div className="row mb-4">
          <div className="col">
            <div className="d-flex align-items-center mb-3">
              <button 
                className="btn btn-outline-secondary me-3"
                onClick={() => setSelectedClass(null)}
              >
                ← Back to Classes
              </button>
              <div>
                <h2 className="mb-1">{selectedClass.displayName}</h2>
                <p className="text-muted mb-0">{selectedClass.displayCode} • Manage student reports</p>
              </div>
            </div>
          </div>
        </div>

        {loadingStudents ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-3">Loading students...</p>
          </div>
        ) : classStudents.length === 0 ? (
          <div className="alert alert-info text-center">
            <FaUsers className="mb-3" style={{ fontSize: '3rem', opacity: 0.5 }} />
            <h4>No Students Enrolled</h4>
            <p className="mb-0">This class doesn't have any students enrolled yet.</p>
          </div>
        ) : (
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Student ID</th>
                          <th>Latest Report</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((student) => (
                          <tr key={student.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div 
                                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                                  style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    background: 'var(--wine)',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                  }}
                                >
                                  {student.first_name[0]}{student.last_name[0]}
                                </div>
                                <div>
                                  <div className="fw-medium">{student.first_name} {student.last_name}</div>
                                  <small className="text-muted">{student.email}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark">{student.student_id}</span>
                            </td>
                            <td>
                              {student.latestReport ? (
                                <div>
                                  <div className="fw-medium">{student.latestReport.term} {student.latestReport.academic_year}</div>
                                  <small className="text-muted">Grade: {student.latestReport.overall_grade}</small>
                                </div>
                              ) : (
                                <span className="text-muted">No reports yet</span>
                              )}
                            </td>
                            <td>
                              <button 
                                className="btn btn-primary btn-sm me-2"
                                onClick={() => handleCreateReport(student.id)}
                                title="Create/Edit Report"
                              >
                                <FaEdit className="me-1" />
                                Edit Report
                              </button>
                              {student.latestReport && (
                                <button 
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => {
                                    setSelectedReport(student.latestReport)
                                    setShowReportViewer(true)
                                  }}
                                  title="View Latest Report"
                                >
                                  <FaEye className="me-1" />
                                  View
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Students Content - Simple placeholder for now
  const renderStudentsContent = () => (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-3">Students</h2>
          <p className="text-muted">View and manage your students</p>
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          <div className="alert alert-info">
            <h4>Students Overview</h4>
            <p className="mb-0">This section will show all students across your classes. For now, please use the <strong>Class Reports</strong> tab to view students by class.</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent()
      case 'reports':
        return renderReportsContent()
      case 'manage-reports':
        return renderReportManagementContent()
      case 'classes':
        return renderClassReportsContent()
      case 'students':
        return renderStudentsContent()
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