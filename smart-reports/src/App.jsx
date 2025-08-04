import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import toast from 'react-hot-toast'

// Import components (these will be created)
import AdminDashboard from './admin/AdminDashboard'
import TeacherDashboard from './teacher/TeacherDashboard'
import StudentDashboard from './student/StudentDashboard'
import GuardianDashboard from './guardian/GuardianDashboard'
import Login from './shared/Login'
import Signup from './shared/Signup'
import ClassReportsPage from './admin/ClassReportsPage'
import ReportViewer from './admin/ReportViewer'
import TeacherReportViewer from './teacher/TeacherReportViewer'
import TeacherReportEditor from './teacher/TeacherReportEditor'
import TeacherClassReportsPage from './teacher/TeacherClassReportsPage'

function App() {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchUserProfile(session.user.id)
        } else {
          setUserProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Error loading profile')
    } finally {
      setLoading(false)
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

  if (!user || !userProfile) {
    return (
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  // Route based on user role
  const renderDashboard = () => {
    switch (userProfile.role) {
      case 'admin':
        return <AdminDashboard user={user} profile={userProfile} />
      case 'faculty':
        return <TeacherDashboard user={user} profile={userProfile} />
      case 'student':
        return <StudentDashboard user={user} profile={userProfile} />
      case 'guardian':
        return <GuardianDashboard user={user} profile={userProfile} />
      default:
        return <div>Unauthorized role</div>
    }
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={renderDashboard()} />
        <Route path="/dashboard" element={renderDashboard()} />
        
        {/* Admin-specific routes */}
        {userProfile?.role === 'admin' && (
          <>
            <Route path="/admin/class-reports/:className" element={<ClassReportsPage />} />
            <Route path="/admin/report-view/:reportId" element={<ReportViewer />} />
            <Route path="/admin/report-print/:reportId" element={<ReportViewer />} />
          </>
        )}
        
        {/* Teacher-specific routes */}
        {userProfile?.role === 'faculty' && (
          <>
            <Route path="/teacher/report-view/:reportId" element={<TeacherReportViewer user={user} profile={userProfile} />} />
            <Route path="/teacher/report-edit/:reportId" element={<TeacherReportEditor user={user} profile={userProfile} />} />
            <Route path="/teacher/report-create" element={<TeacherReportEditor user={user} profile={userProfile} />} />
            <Route path="/teacher/class-reports/:className" element={<TeacherClassReportsPage user={user} profile={userProfile} />} />
          </>
        )}
        
        {/* Guardian-specific routes */}
        {userProfile?.role === 'guardian' && (
          <>
            <Route path="/guardian/ward/:wardId" element={<GuardianDashboard user={user} profile={userProfile} />} />
          </>
        )}
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App 