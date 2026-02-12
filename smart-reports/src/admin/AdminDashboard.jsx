import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { studentReportsAPI, profilesAPI } from '../lib/api'
import { getCurrentAcademicPeriod } from '../lib/academicPeriod'
import toast from 'react-hot-toast'
import AdminLayout from './AdminLayout'
import UsersPage from './UsersPage'
import Reports from './Reports'
import ReportBankContent from './ReportBankContent'
import ClassManagement from './ClassManagement'
import CourseAssignment from './CourseAssignment'
import AcademicSettings from './AcademicSettings'
import {
  FaGraduationCap,
  FaChalkboardTeacher,
  FaBook,
  FaFileAlt,
  FaSync,
  FaUserPlus,
  FaChartLine,
  FaEye,
  FaCog,
  FaSchool,
  FaBookOpen,
} from 'react-icons/fa'
import './AdminDashboard.css'

const AdminDashboard = ({ user, profile }) => {
  const location = useLocation()
  const navigate = useNavigate()
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
  const [teacherPerformanceSort, setTeacherPerformanceSort] = useState('desc')
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
      let cancelled = false
      const timeoutId = setTimeout(() => {
        if (!cancelled) setLoading(false)
      }, 15000)
      fetchDashboardData().finally(() => {
        if (!cancelled) setLoading(false)
        clearTimeout(timeoutId)
      })
      return () => {
        cancelled = true
        clearTimeout(timeoutId)
      }
    } else {
      setLoading(false)
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
      const classData = classDataRes?.data || []
      if (classData.length > 0) {
        const classGroups = classData.reduce((acc, student) => {
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
      const recentReports = recentReportsRes?.data || []
      if (recentReports.length > 0) {
        // Get student names for the reports
        const studentIds = recentReports.map(report => report.student_id).filter(Boolean)
        
        let studentProfiles = []
        if (studentIds.length > 0) {
          const { data: profiles } = await profilesAPI.getProfilesByIds(studentIds)
          studentProfiles = profiles || []
        }

        const profilesMap = new Map(
          studentProfiles.map(profile => [profile.id, profile])
        )

        const activities = recentReports.map(report => {
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
      const currentPeriod = await getCurrentAcademicPeriod()
      const currentTerm = currentPeriod.term
      const currentYear = currentPeriod.academicYear

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

      const facultyList = faculty || []
      const BATCH_SIZE = 100

      const teacherStats = await Promise.all(facultyList.map(async (teacher) => {
        try {
          const teacherCourses = Array.isArray(teacher.faculty_courses) ? teacher.faculty_courses : []
          if (teacherCourses.length === 0) {
            return {
              id: teacher.id,
              name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'Unknown',
              totalStudents: 0,
              reportsWithSomeGrades: 0,
              reportsCompletelyFilled: 0,
              overallSomeGradesPercentage: 0,
              overallCompletePercentage: 0,
              courses: []
            }
          }

          const courseStats = await Promise.all(teacherCourses.map(async (fc) => {
            const courseId = fc?.course_id
            const course = fc?.courses || { id: courseId, code: '—', name: 'Unknown' }
            if (!courseId) {
              return { course, totalStudents: 0, reportsWithSomeGrades: 0, reportsCompletelyFilled: 0, someGradesPercentage: 0, completePercentage: 0 }
            }

            const { data: enrollments, error: enrollmentError } = await supabase
              .from('student_courses')
              .select('student_id')
              .eq('course_id', courseId)
              .eq('status', 'enrolled')

            if (enrollmentError) {
              console.error('Enrollments error for course', courseId, enrollmentError)
              return { course, totalStudents: 0, reportsWithSomeGrades: 0, reportsCompletelyFilled: 0, someGradesPercentage: 0, completePercentage: 0 }
            }

            const totalStudents = enrollments?.length || 0
            const studentIds = (enrollments || []).map(e => e.student_id).filter(Boolean)
            let reportsWithSomeGrades = 0
            let reportsCompletelyFilled = 0

            if (studentIds.length > 0) {
              const reportGrades = new Map()
              for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
                const batch = studentIds.slice(i, i + BATCH_SIZE)
                const { data: grades, error: gradesError } = await supabase
                  .from('student_grades')
                  .select(`
                    report_id,
                    class_score,
                    exam_score,
                    total_score,
                    grade,
                    remark,
                    student_reports!inner ( student_id, term, academic_year )
                  `)
                  .eq('subject_id', courseId)
                  .in('student_reports.student_id', batch)
                  .eq('student_reports.term', currentTerm)
                  .eq('student_reports.academic_year', currentYear)

                if (!gradesError && grades) {
                  grades.forEach((grade) => {
                    if (!reportGrades.has(grade.report_id)) {
                      reportGrades.set(grade.report_id, grade)
                    }
                  })
                }
              }

              reportGrades.forEach((grade) => {
                const hasAnyGrades = (
                  (grade.class_score != null && grade.class_score > 0) ||
                  (grade.exam_score != null && grade.exam_score > 0) ||
                  (grade.total_score != null && grade.total_score > 0) ||
                  (grade.grade != null && grade.grade !== '') ||
                  (grade.remark != null && grade.remark !== '')
                )
                if (hasAnyGrades) reportsWithSomeGrades++

                const isCompletelyFilled = (
                  grade.class_score != null && grade.class_score > 0 &&
                  grade.exam_score != null && grade.exam_score > 0 &&
                  grade.total_score != null && grade.total_score > 0 &&
                  (grade.grade != null && grade.grade !== '') &&
                  (grade.remark != null && grade.remark !== '')
                )
                if (isCompletelyFilled) reportsCompletelyFilled++
              })
            }

            const someGradesPercentage = totalStudents > 0 ? Math.round((reportsWithSomeGrades / totalStudents) * 100) : 0
            const completePercentage = totalStudents > 0 ? Math.round((reportsCompletelyFilled / totalStudents) * 100) : 0
            return { course, totalStudents, reportsWithSomeGrades, reportsCompletelyFilled, someGradesPercentage, completePercentage }
          }))

          const totalStudentsAllCourses = courseStats.reduce((s, stat) => s + stat.totalStudents, 0)
          const totalReportsWithSomeGrades = courseStats.reduce((s, stat) => s + stat.reportsWithSomeGrades, 0)
          const totalReportsCompletelyFilled = courseStats.reduce((s, stat) => s + stat.reportsCompletelyFilled, 0)
          const overallSomeGradesPercentage = totalStudentsAllCourses > 0 ? Math.round((totalReportsWithSomeGrades / totalStudentsAllCourses) * 100) : 0
          const overallCompletePercentage = totalStudentsAllCourses > 0 ? Math.round((totalReportsCompletelyFilled / totalStudentsAllCourses) * 100) : 0

          return {
            id: teacher.id,
            name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'Unknown',
            totalStudents: totalStudentsAllCourses,
            reportsWithSomeGrades: totalReportsWithSomeGrades,
            reportsCompletelyFilled: totalReportsCompletelyFilled,
            overallSomeGradesPercentage,
            overallCompletePercentage,
            courses: courseStats
          }
        } catch (err) {
          console.error('Teacher performance error for', teacher.id, err)
          return {
            id: teacher.id,
            name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'Unknown',
            totalStudents: 0,
            reportsWithSomeGrades: 0,
            reportsCompletelyFilled: 0,
            overallSomeGradesPercentage: 0,
            overallCompletePercentage: 0,
            courses: []
          }
        }
      }))

      teacherStats.sort((a, b) => b.overallCompletePercentage - a.overallCompletePercentage)
      setTeacherPerformance(teacherStats)

    } catch (error) {
      console.error('Error fetching teacher performance:', error)
      toast.error('Failed to fetch teacher performance data')
    }
  }

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="admin-dashboard-loading">
          <div className="spinner-border" />
          <p>Loading dashboard...</p>
        </div>
      )
    }

    const pctColor = (pct) =>
      pct >= 80 ? 'var(--admin-secondary)' : pct >= 60 ? '#eab308' : '#dc2626'

    return (
      <div className="admin-dashboard">
        <header className="admin-dashboard-header">
          <div>
            <h2>Dashboard Overview</h2>
            <p>Welcome back. Monitoring system performance and managing reports.</p>
          </div>
          <div className="admin-dashboard-actions">
            <button type="button" className="admin-dashboard-btn-refresh" onClick={fetchDashboardData}>
              <FaSync />
              Refresh Data
            </button>
          </div>
        </header>

        <div className="admin-dashboard-stats">
          <div className="admin-dashboard-stat-card">
            <div className="admin-dashboard-stat-icon"><FaGraduationCap /></div>
            <div>
              <p className="admin-dashboard-stat-value">{stats.totalStudents}</p>
              <p className="admin-dashboard-stat-label">Total Students</p>
            </div>
          </div>
          <div className="admin-dashboard-stat-card">
            <div className="admin-dashboard-stat-icon"><FaChalkboardTeacher /></div>
            <div>
              <p className="admin-dashboard-stat-value">{stats.totalTeachers}</p>
              <p className="admin-dashboard-stat-label">Faculty Members</p>
            </div>
          </div>
          <div className="admin-dashboard-stat-card">
            <div className="admin-dashboard-stat-icon"><FaBook /></div>
            <div>
              <p className="admin-dashboard-stat-value">{stats.totalCourses}</p>
              <p className="admin-dashboard-stat-label">Active Courses</p>
            </div>
          </div>
          <div className="admin-dashboard-stat-card">
            <div className="admin-dashboard-stat-icon"><FaFileAlt /></div>
            <div>
              <p className="admin-dashboard-stat-value">{stats.reportsGenerated}</p>
              <p className="admin-dashboard-stat-label">Reports Generated</p>
            </div>
          </div>
        </div>

        <div className="admin-dashboard-grid">
          <div className="admin-dashboard-card">
            <div className="admin-dashboard-card-header">
              <div>
                <h3 className="admin-dashboard-card-title">Teacher Performance Overview</h3>
                <p className="admin-dashboard-card-subtitle">Reports filled by each teacher across their assigned courses</p>
              </div>
              <label className="admin-dashboard-teacher-sort">
                <span className="admin-dashboard-teacher-sort-label">Sort:</span>
                <select
                  value={teacherPerformanceSort}
                  onChange={(e) => setTeacherPerformanceSort(e.target.value)}
                  className="admin-dashboard-teacher-sort-select"
                  aria-label="Sort teacher performance"
                >
                  <option value="desc">Descending (complete %)</option>
                  <option value="asc">Ascending (complete %)</option>
                </select>
              </label>
            </div>
            <div className="admin-dashboard-teacher-list">
            {teacherPerformance.length > 0 ? (
              [...teacherPerformance]
                .sort((a, b) => teacherPerformanceSort === 'desc'
                  ? b.overallCompletePercentage - a.overallCompletePercentage
                  : a.overallCompletePercentage - b.overallCompletePercentage)
                .map((teacher) => (
                <div key={teacher.id} className="admin-dashboard-teacher-item">
                  <div className="admin-dashboard-teacher-header">
                    <div>
                      <h4 className="admin-dashboard-teacher-name">{teacher.name}</h4>
                      <div className="admin-dashboard-teacher-meta">
                        <span>{teacher.totalStudents} Total Students</span>
                        <span>{teacher.reportsWithSomeGrades} Partial</span>
                        <span>{teacher.reportsCompletelyFilled} Complete</span>
                      </div>
                      {teacher.courses.length === 1 && (
                        <p className="admin-dashboard-card-subtitle" style={{ marginTop: '0.5rem' }}>
                          {teacher.courses[0]?.course?.code}: {teacher.courses[0]?.course?.name}
                        </p>
                      )}
                    </div>
                    <div className="admin-dashboard-teacher-pct">
                      <div className="admin-dashboard-teacher-pct-item" style={{ color: pctColor(teacher.overallSomeGradesPercentage) }}>
                        <p>{teacher.overallSomeGradesPercentage}%</p>
                        <p>Partial</p>
                      </div>
                      <div className="admin-dashboard-teacher-pct-item" style={{ color: pctColor(teacher.overallCompletePercentage) }}>
                        <p>{teacher.overallCompletePercentage}%</p>
                        <p>Complete</p>
                      </div>
                    </div>
                  </div>
                  <div className="admin-dashboard-teacher-bar">
                    <div
                      className="admin-dashboard-teacher-bar-fill"
                      style={{ width: `${teacher.overallCompletePercentage}%` }}
                    />
                  </div>
                  {teacher.courses.length > 1 && (
                    <div className="admin-dashboard-course-list">
                      <p className="admin-dashboard-course-list-title">Course Breakdown</p>
                      {teacher.courses.map((courseData, idx) => (
                        <div key={idx} className="admin-dashboard-course-row">
                          <span>{courseData.course?.code} {courseData.course?.name}</span>
                          <div className="admin-dashboard-teacher-pct">
                            <div className="admin-dashboard-teacher-pct-item">
                              <p style={{ fontSize: '0.625rem', margin: 0 }}>{courseData.reportsWithSomeGrades}/{courseData.totalStudents}</p>
                              <p style={{ color: pctColor(courseData.someGradesPercentage) }}>{courseData.someGradesPercentage}% Partial</p>
                            </div>
                            <div className="admin-dashboard-teacher-pct-item">
                              <p style={{ fontSize: '0.625rem', margin: 0 }}>{courseData.reportsCompletelyFilled}/{courseData.totalStudents}</p>
                              <p style={{ color: pctColor(courseData.completePercentage) }}>{courseData.completePercentage}% Complete</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="admin-dashboard-empty">No teacher performance data available</div>
            )}
            </div>
          </div>

          <div className="admin-dashboard-card">
            <div className="admin-dashboard-section-header">
              <h3 className="admin-dashboard-card-title">Recent Activity</h3>
            </div>
            <div className="admin-dashboard-activity-list">
              {recentActivity.length === 0 ? (
                <div className="admin-dashboard-empty">No recent activity</div>
              ) : (
                <>
                  {recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="admin-dashboard-activity-item">
                      <p className="admin-dashboard-activity-text">{activity.description}</p>
                      <div className="admin-dashboard-activity-meta">
                        <span className="admin-dashboard-activity-term">{activity.term}</span>
                        <span className="admin-dashboard-activity-date">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="admin-dashboard-activity-more">View Full History</button>
                </>
              )}
            </div>
          </div>
        </div>

        <section className="admin-dashboard-quick-actions">
          <h3>Quick Actions</h3>
          <div className="admin-dashboard-quick-grid">
            <button type="button" className="admin-dashboard-quick-btn" onClick={() => setActiveTab('users')}>
              <span className="admin-dashboard-quick-btn-icon"><FaUserPlus /></span>
              <span className="admin-dashboard-quick-btn-label">Manage Users</span>
            </button>
            <button type="button" className="admin-dashboard-quick-btn admin-dashboard-quick-btn-green" onClick={() => setActiveTab('reports')}>
              <span className="admin-dashboard-quick-btn-icon"><FaChartLine /></span>
              <span className="admin-dashboard-quick-btn-label">Create Reports</span>
            </button>
            <button type="button" className="admin-dashboard-quick-btn" onClick={() => navigate('/admin/report-bank')}>
              <span className="admin-dashboard-quick-btn-icon"><FaEye /></span>
              <span className="admin-dashboard-quick-btn-label">View All Reports</span>
            </button>
            <button type="button" className="admin-dashboard-quick-btn" onClick={() => setActiveTab('settings')}>
              <span className="admin-dashboard-quick-btn-icon"><FaCog /></span>
              <span className="admin-dashboard-quick-btn-label">System Settings</span>
            </button>
            <button type="button" className="admin-dashboard-quick-btn admin-dashboard-quick-btn-green" onClick={() => setActiveTab('classes')}>
              <span className="admin-dashboard-quick-btn-icon"><FaSchool /></span>
              <span className="admin-dashboard-quick-btn-label">Manage Classes</span>
            </button>
            <button type="button" className="admin-dashboard-quick-btn" onClick={() => setActiveTab('courses')}>
              <span className="admin-dashboard-quick-btn-icon"><FaBookOpen /></span>
              <span className="admin-dashboard-quick-btn-label">Assign Courses</span>
            </button>
          </div>
        </section>
      </div>
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
        return <AcademicSettings user={user} />
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