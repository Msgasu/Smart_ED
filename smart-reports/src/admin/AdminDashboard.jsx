import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { studentReportsAPI, profilesAPI } from '../lib/api'
import toast from 'react-hot-toast'
import AdminLayout from './AdminLayout'
import UsersPage from './UsersPage'
import Reports from './Reports'
import ReportBankContent from './ReportBankContent'
import ClassManagement from './ClassManagement'
import CourseAssignment from './CourseAssignment'
import { FaGraduationCap, FaChalkboardTeacher, FaBook, FaFileAlt, FaUserCheck, FaClock, FaSync } from 'react-icons/fa'

const AdminDashboard = ({ user, profile }) => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    reportsGenerated: 0,
    activeUsers: 0,
    pendingReports: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [classStats, setClassStats] = useState([])
  const [teacherPerformance, setTeacherPerformance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(location.search)
    const tabParam = urlParams.get('tab')
    console.log('AdminDashboard tab check:', { tabParam, activeTab, locationSearch: location.search })
    if (tabParam && tabParam !== activeTab) {
      console.log('Setting active tab to:', tabParam)
      setActiveTab(tabParam)
    }
  }, [location.search, activeTab])

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData()
    }
  }, [activeTab])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch comprehensive statistics in parallel
      const [
        studentsRes,
        teachersRes, 
        coursesRes,
        reportsRes,
        activeUsersRes,
        classDataRes,
        recentReportsRes
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact' }).eq('role', 'student'),
        supabase.from('profiles').select('*', { count: 'exact' }).eq('role', 'faculty'),
        supabase.from('courses').select('*', { count: 'exact' }),
        supabase.from('student_reports').select('*', { count: 'exact' }),
        supabase.from('profiles').select('*', { count: 'exact' }).eq('status', 'active'),
        supabase.from('profiles').select(`
          id, first_name, last_name,
          students!inner(class_year)
        `).eq('role', 'student'),
        studentReportsAPI.getReports(10, 0)
      ])

      // Set basic statistics
      setStats({
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalCourses: coursesRes.count || 0,
        reportsGenerated: reportsRes.count || 0,
        activeUsers: activeUsersRes.count || 0,
        pendingReports: Math.max(0, (studentsRes.count || 0) - (reportsRes.count || 0))
      })

      // Process class statistics
      if (classDataRes.data) {
        const classGroups = classDataRes.data.reduce((acc, student) => {
          const className = student.students?.class_year || 'Unassigned'
          if (!acc[className]) {
            acc[className] = 0
          }
          acc[className]++
          return acc
        }, {})

        const classStatsArray = Object.entries(classGroups).map(([className, count]) => ({
          className,
          studentCount: count,
          reportsGenerated: 0 // This could be enhanced with actual report counts per class
        }))

        setClassStats(classStatsArray)
      }

      // Set recent activity
      if (recentReportsRes.data && recentReportsRes.data.length > 0) {
        // Get student names for the reports
        const studentIds = recentReportsRes.data.map(report => report.student_id).filter(Boolean)
        
        let studentProfiles = []
        if (studentIds.length > 0) {
          const { data: profiles } = await profilesAPI.getProfilesByIds(studentIds)
          studentProfiles = profiles || []
        }

        const profilesMap = new Map(
          studentProfiles.map(profile => [profile.id, profile])
        )

        const activities = recentReportsRes.data.map(report => {
          const profile = profilesMap.get(report.student_id)
          const studentName = profile 
            ? `${profile.first_name} ${profile.last_name}`
            : 'Unknown Student'
          
          return {
            id: report.id,
            type: 'report_generated',
            description: `Report generated for ${studentName}`,
            term: report.term,
            timestamp: report.created_at
          }
        })
        setRecentActivity(activities)
      } else {
        setRecentActivity([])
      }

      // Fetch teacher performance data
      await fetchTeacherPerformance()

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Error loading dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeacherPerformance = async () => {
    try {
      console.log('📊 Fetching teacher performance data...')
      
      // Get all faculty members with their course assignments
      const { data: faculty, error: facultyError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          faculty_courses!inner (
            course_id,
            status,
            courses (
              id,
              code,
              name
            )
          )
        `)
        .eq('role', 'faculty')
        .eq('faculty_courses.status', 'active')

      if (facultyError) throw facultyError

      const teacherStats = await Promise.all(faculty.map(async (teacher) => {
        const teacherCourses = teacher.faculty_courses
        
        // Calculate stats for each course this teacher teaches
        const courseStats = await Promise.all(teacherCourses.map(async (fc) => {
          const courseId = fc.course_id
          const course = fc.courses

          // Get total students in this course
          const { data: enrollments, error: enrollmentError } = await supabase
            .from('student_courses')
            .select('student_id')
            .eq('course_id', courseId)
            .eq('status', 'enrolled')

          if (enrollmentError) {
            console.error('Error fetching enrollments for course', courseId, enrollmentError)
            return {
              course,
              totalStudents: 0,
              reportsWithGrades: 0,
              percentage: 0
            }
          }

          const totalStudents = enrollments?.length || 0
          const studentIds = enrollments?.map(e => e.student_id) || []

          // Get all grades this teacher has entered for students in this course
          let reportsWithSomeGrades = 0
          let reportsCompletelyFilled = 0
          
          if (studentIds.length > 0) {
            const { data: grades, error: gradesError } = await supabase
              .from('student_grades')
              .select(`
                report_id,
                class_score,
                exam_score,
                total_score,
                grade,
                remark,
                student_reports!inner (
                  student_id,
                  term,
                  academic_year
                )
              `)
              .eq('subject_id', courseId)
              .in('student_reports.student_id', studentIds)

            if (!gradesError && grades) {
              // Group grades by report_id to analyze each report
              const reportGrades = new Map()
              grades.forEach(grade => {
                reportGrades.set(grade.report_id, grade)
              })

              reportGrades.forEach(grade => {
                // Check if this teacher has filled ANY fields for this report
                const hasAnyGrades = (
                  (grade.class_score !== null && grade.class_score > 0) ||
                  (grade.exam_score !== null && grade.exam_score > 0) ||
                  (grade.total_score !== null && grade.total_score > 0) ||
                  (grade.grade !== null && grade.grade !== '') ||
                  (grade.remark !== null && grade.remark !== '')
                )

                if (hasAnyGrades) {
                  reportsWithSomeGrades++
                }

                // Check if ALL fields are completely filled
                const isCompletelyFilled = (
                  grade.class_score !== null && grade.class_score > 0 &&
                  grade.exam_score !== null && grade.exam_score > 0 &&
                  grade.total_score !== null && grade.total_score > 0 &&
                  grade.grade !== null && grade.grade !== '' &&
                  grade.remark !== null && grade.remark !== ''
                )

                if (isCompletelyFilled) {
                  reportsCompletelyFilled++
                }
              })
            }
          }

          const someGradesPercentage = totalStudents > 0 ? Math.round((reportsWithSomeGrades / totalStudents) * 100) : 0
          const completePercentage = totalStudents > 0 ? Math.round((reportsCompletelyFilled / totalStudents) * 100) : 0

          return {
            course,
            totalStudents,
            reportsWithSomeGrades,
            reportsCompletelyFilled,
            someGradesPercentage,
            completePercentage
          }
        }))

        // Calculate overall stats for this teacher
        const totalStudentsAllCourses = courseStats.reduce((sum, stat) => sum + stat.totalStudents, 0)
        const totalReportsWithSomeGrades = courseStats.reduce((sum, stat) => sum + stat.reportsWithSomeGrades, 0)
        const totalReportsCompletelyFilled = courseStats.reduce((sum, stat) => sum + stat.reportsCompletelyFilled, 0)
        
        const overallSomeGradesPercentage = totalStudentsAllCourses > 0 
          ? Math.round((totalReportsWithSomeGrades / totalStudentsAllCourses) * 100) 
          : 0
        const overallCompletePercentage = totalStudentsAllCourses > 0 
          ? Math.round((totalReportsCompletelyFilled / totalStudentsAllCourses) * 100) 
          : 0

        return {
          id: teacher.id,
          name: `${teacher.first_name} ${teacher.last_name}`,
          totalStudents: totalStudentsAllCourses,
          reportsWithSomeGrades: totalReportsWithSomeGrades,
          reportsCompletelyFilled: totalReportsCompletelyFilled,
          overallSomeGradesPercentage,
          overallCompletePercentage,
          courses: courseStats
        }
      }))

      // Sort by overall complete percentage (highest first)
      teacherStats.sort((a, b) => b.overallCompletePercentage - a.overallCompletePercentage)
      
      console.log('📊 Teacher performance data:', teacherStats)
      setTeacherPerformance(teacherStats)

    } catch (error) {
      console.error('Error fetching teacher performance:', error)
      toast.error('Failed to fetch teacher performance data')
    }
  }

  const StatCard = ({ type, icon: IconComponent, number, label }) => (
    <div className={`stats-card ${type}`}>
      <div className="stats-icon" style={{ fontSize: '1.25rem' }}>
        <IconComponent />
      </div>
      <div className="stats-content">
        <div className="stats-number">{number}</div>
        <div className="stats-label">{label}</div>
      </div>
    </div>
  )

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner-border text-primary" />
          <p>Loading dashboard...</p>
        </div>
      )
    }

    return (
      <>
        {/* Page Header */}
        <div className="page-header">
          <div className="header-content">
            <h1>Dashboard Overview</h1>
            <p className="page-description">Monitor system performance and manage reports</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={fetchDashboardData}>
              <FaSync style={{ marginRight: '0.5rem' }} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="stats-grid">
          <StatCard 
            type="primary" 
            icon={FaGraduationCap} 
            number={stats.totalStudents} 
            label="Total Students" 
          />
          <StatCard 
            type="success" 
            icon={FaChalkboardTeacher} 
            number={stats.totalTeachers} 
            label="Faculty Members" 
          />
          <StatCard 
            type="info" 
            icon={FaBook} 
            number={stats.totalCourses} 
            label="Active Courses" 
          />
          <StatCard 
            type="warning" 
            icon={FaFileAlt} 
            number={stats.reportsGenerated} 
            label="Reports Generated" 
          />
          <StatCard 
            type="danger" 
            icon={FaUserCheck} 
            number={stats.activeUsers} 
            label="Active Users" 
          />
          <StatCard 
            type="primary" 
            icon={FaClock} 
            number={stats.pendingReports} 
            label="Pending Reports" 
          />
        </div>

        {/* Teacher Performance Section */}
        <div className="teacher-performance-section" style={{ marginBottom: '1.5rem' }}>
          <div className="users-table-container">
            <div className="table-header">
              <h3>Teacher Performance Overview</h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
                Reports filled by each teacher across their assigned courses
              </p>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {teacherPerformance.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {teacherPerformance.map(teacher => (
                    <div key={teacher.id} className="teacher-performance-card" style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      background: 'white'
                    }}>
                      {/* Teacher Header */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '1rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid var(--gray-100)'
                      }}>
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--wine)', fontWeight: '600' }}>
                            {teacher.name}
                          </h4>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                            <span>{teacher.totalStudents} Total Students</span>
                            <span>{teacher.reportsWithSomeGrades} Partial</span>
                            <span>{teacher.reportsCompletelyFilled} Complete</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: '1.25rem', 
                              fontWeight: '600',
                              color: teacher.overallSomeGradesPercentage >= 80 ? 'var(--lime)' : teacher.overallSomeGradesPercentage >= 60 ? '#ffc107' : '#dc3545'
                            }}>
                              {teacher.overallSomeGradesPercentage}%
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                              Partial
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: '1.5rem', 
                              fontWeight: '700',
                              color: teacher.overallCompletePercentage >= 80 ? 'var(--lime)' : teacher.overallCompletePercentage >= 60 ? '#ffc107' : '#dc3545'
                            }}>
                              {teacher.overallCompletePercentage}%
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                              Complete
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Course Breakdown */}
                      {teacher.courses.length > 1 ? (
                        <div>
                          <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                            Course Breakdown:
                          </h5>
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {teacher.courses.map((courseData, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem',
                                background: 'var(--gray-50)',
                                borderRadius: '4px',
                                fontSize: '0.875rem'
                              }}>
                                <div>
                                  <span style={{ fontWeight: '500', color: 'var(--wine)' }}>
                                    {courseData.course.code}
                                  </span>
                                  <span style={{ color: 'var(--gray-600)', marginLeft: '0.5rem' }}>
                                    {courseData.course.name}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.8rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--gray-600)' }}>
                                      {courseData.reportsWithSomeGrades}/{courseData.totalStudents}
                                    </span>
                                    <span style={{ 
                                      fontWeight: '600',
                                      color: courseData.someGradesPercentage >= 80 ? 'var(--lime)' : courseData.someGradesPercentage >= 60 ? '#ffc107' : '#dc3545'
                                    }}>
                                      {courseData.someGradesPercentage}% Partial
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--gray-600)' }}>
                                      {courseData.reportsCompletelyFilled}/{courseData.totalStudents}
                                    </span>
                                    <span style={{ 
                                      fontWeight: '600',
                                      color: courseData.completePercentage >= 80 ? 'var(--lime)' : courseData.completePercentage >= 60 ? '#ffc107' : '#dc3545'
                                    }}>
                                      {courseData.completePercentage}% Complete
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                          <strong>{teacher.courses[0]?.course.code}:</strong> {teacher.courses[0]?.course.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                  <p>No teacher performance data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Class Statistics */}
          <div className="users-table-container">
            <div className="table-header">
              <h3>Class Statistics</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {classStats.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"></div>
                  <h3>No class data available</h3>
                  <p>Students need to be assigned to classes</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {classStats.map(classItem => (
                    <div key={classItem.className} style={{
                      padding: '1.5rem',
                      background: 'var(--gray-50)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid var(--gray-200)'
                    }}>
                      <div>
                        <div style={{ 
                          fontWeight: '700', 
                          color: 'var(--wine)',
                          fontSize: '1.1rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Class {classItem.className}
                        </div>
                        <div style={{ 
                          fontSize: '0.9rem', 
                          color: 'var(--gray-600)',
                          marginTop: '0.25rem'
                        }}>
                          {classItem.studentCount} students enrolled
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>

                        <button 
                          className="btn"
                          style={{ 
                            padding: '0.75rem 1.25rem', 
                            fontSize: '0.8rem',
                            background: 'var(--gray-300)',
                            color: 'var(--gray-700)',
                            border: 'none',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="users-table-container">
            <div className="table-header">
              <h3>Recent Activity</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {recentActivity.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"></div>
                  <h3>No recent activity</h3>
                  <p>System activity will appear here</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {recentActivity.slice(0, 8).map(activity => (
                    <div key={activity.id} style={{
                      padding: '1rem',
                      background: 'var(--gray-50)',
                      borderRadius: '6px',
                      borderLeft: '4px solid var(--wine)',
                      border: '1px solid var(--gray-200)'
                    }}>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--gray-800)',
                        fontWeight: '600',
                        marginBottom: '0.25rem'
                      }}>
                        {activity.description}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--gray-500)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {activity.term} • {new Date(activity.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="users-table-container" style={{ marginTop: '1.5rem' }}>
          <div className="table-header">
            <h3>Quick Actions</h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <button 
                className="btn"
                style={{
                  padding: '1.5rem',
                  background: 'var(--wine)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: '700'
                }}
                onClick={() => setActiveTab('users')}
              >
                <div style={{ 
                  fontSize: '0.9rem',
                  backgroundColor: 'var(--lime)',
                  color: 'var(--wine)',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px'
                }}>
                  USERS
                </div>
                <span>Manage Users</span>
              </button>
              
              <button 
                className="btn"
                style={{
                  padding: '1.5rem',
                  background: 'var(--lime)',
                  color: 'var(--wine)',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: '700'
                }}
                onClick={() => setActiveTab('reports')}
              >
                <div style={{ 
                  fontSize: '0.9rem',
                  backgroundColor: 'var(--wine)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px'
                }}>
                  REPORTS
                </div>
                <span>Create Reports</span>
              </button>
              
              <button 
                className="btn"
                style={{
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: '700'
                }}
                onClick={() => window.location.href = '/admin/report-bank'}
              >
                <div style={{ 
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#28a745',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px'
                }}>
                  REPORT BANK
                </div>
                <span>View All Reports</span>
              </button>
              
              <button 
                className="btn"
                style={{
                  padding: '1.5rem',
                  background: 'var(--wine-light)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: '700'
                }}
                onClick={() => setActiveTab('settings')}
              >
                <div style={{ 
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: 'var(--wine)',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px'
                }}>
                  CONFIG
                </div>
                <span>System Settings</span>
              </button>
              
              <button 
                className="btn"
                style={{
                  padding: '1.5rem',
                  background: 'var(--lime-dark)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: '700'
                }}
                onClick={() => setActiveTab('classes')}
              >
                <div style={{ 
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: 'var(--wine)',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px'
                }}>
                  CLASSES
                </div>
                <span>Manage Classes</span>
              </button>
              
              <button 
                className="btn"
                style={{
                  padding: '1.5rem',
                  background: 'var(--wine-light)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: '700'
                }}
                onClick={() => setActiveTab('courses')}
              >
                <div style={{ 
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: 'var(--wine)',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px'
                }}>
                  COURSES
                </div>
                <span>Assign Courses</span>
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent()
      case 'users':
        return <UsersPage />
      case 'reports':
        return <Reports />
      case 'report-bank':
        return <ReportBankContent />
      case 'classes':
        return <ClassManagement />
      case 'courses':
        return <CourseAssignment />
      case 'analytics':
        return (
          <div className="page-header">
            <div className="header-content">
              <h1>Analytics</h1>
              <p className="page-description">View reports and system analytics</p>
            </div>
          </div>
        )
      case 'settings':
        return (
          <div className="page-header">
            <div className="header-content">
              <h1>System Settings</h1>
              <p className="page-description">Configure system preferences and settings</p>
            </div>
          </div>
        )
      default:
        return renderDashboardContent()
    }
  }

  return (
    <AdminLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      user={user}
      profile={profile}
    >
      {renderContent()}
    </AdminLayout>
  )
}

export default AdminDashboard 