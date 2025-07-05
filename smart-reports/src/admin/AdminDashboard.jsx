import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import AdminLayout from './AdminLayout'
import UsersPage from './UsersPage'
import Reports from './Reports'
import { FaGraduationCap, FaChalkboardTeacher, FaBook, FaFileAlt, FaUserCheck, FaClock, FaSync } from 'react-icons/fa'

const AdminDashboard = ({ user, profile }) => {
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
  const [loading, setLoading] = useState(true)

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
        supabase.from('student_reports').select(`
          id, term, academic_year, created_at,
          profiles!inner(first_name, last_name)
        `).order('created_at', { ascending: false }).limit(10)
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
      if (recentReportsRes.data) {
        const activities = recentReportsRes.data.map(report => ({
          id: report.id,
          type: 'report_generated',
          description: `Report generated for ${report.profiles.first_name} ${report.profiles.last_name}`,
          term: report.term,
          timestamp: report.created_at
        }))
        setRecentActivity(activities)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Error loading dashboard data')
    } finally {
      setLoading(false)
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
                          className="btn btn-primary"
                          style={{ 
                            padding: '0.75rem 1.25rem', 
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                          onClick={() => toast.success(`Generating reports for Class ${classItem.className}`)}
                        >
                          Generate Reports
                        </button>
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
                onClick={() => setActiveTab('analytics')}
              >
                <div style={{ 
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: 'var(--wine)',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px'
                }}>
                  ANALYTICS
                </div>
                <span>View Analytics</span>
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