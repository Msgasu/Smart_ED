import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import toast from 'react-hot-toast'

// Import components (these will be created)
import AdminDashboard from './admin/AdminDashboard'
import TeacherDashboard from './teacher/TeacherDashboard'
import StudentDashboard from './student/StudentDashboard'
import GuardianDashboard from './guardian/GuardianDashboard'
import GuardianPortalPublic from './guardian/GuardianPortalPublic'
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
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const location = useLocation()

  // Make the flag available globally
  window.setIsCreatingUser = setIsCreatingUser

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
        console.log('Auth state change:', event, 'Session:', session ? 'exists' : 'null')
        
        // Skip auth state changes during user creation to prevent redirects
        if (isCreatingUser) {
          console.log('Skipping auth state change during user creation')
          return
        }
        
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchUserProfile(session.user.id)
        } else {
          console.log('No session - clearing user profile and redirecting')
          setUserProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [isCreatingUser])

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

  // Route based on user role
  const renderDashboard = () => {
    switch (userProfile?.role) {
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  // Always render the full routing structure
  // This allows public routes to work without authentication
  return (
    <div className="App">
      <Routes>
        {/* Public routes - accessible without login */}
        <Route path="/guardian-portal" element={<GuardianPortalPublic />} />
        
        {/* Auth routes - redirect to dashboard if already logged in */}
        <Route path="/signup" element={user && userProfile ? <Navigate to="/" /> : <Signup />} />
        <Route path="/register" element={user && userProfile ? <Navigate to="/" /> : <Signup />} />
        <Route path="/login" element={user && userProfile ? <Navigate to="/" /> : <Login />} />

        {/* Protected routes - only accessible when logged in */}
        {user && userProfile ? (
          <>
            <Route path="/" element={renderDashboard()} />
            <Route path="/dashboard" element={renderDashboard()} />
            
            {/* Admin-specific routes */}
            {userProfile.role === 'admin' && (
              <>
                <Route path="/admin/class-reports/:className" element={<ClassReportsPage />} />
                <Route path="/admin/report-view/:reportId" element={<ReportViewer />} />
                <Route path="/admin/report-print/:reportId" element={<ReportViewer />} />
              </>
            )}
            
            {/* Teacher-specific routes */}
            {userProfile.role === 'faculty' && (
              <>
                <Route path="/teacher/report-view/:reportId" element={<TeacherReportViewer user={user} profile={userProfile} />} />
                <Route path="/teacher/report-edit/:reportId" element={<TeacherReportEditor user={user} profile={userProfile} />} />
                <Route path="/teacher/report-create" element={<TeacherReportEditor user={user} profile={userProfile} />} />
                <Route path="/teacher/class-reports/:className" element={<TeacherClassReportsPage user={user} profile={userProfile} />} />
              </>
            )}
            
            {/* Guardian-specific routes */}
            {userProfile.role === 'guardian' && (
              <>
                <Route path="/guardian/ward/:wardId" element={<GuardianDashboard user={user} profile={userProfile} />} />
              </>
            )}
          </>
        ) : (
          /* If not logged in, redirect protected routes to login */
          <>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Login />} />
            <Route path="/admin/*" element={<Login />} />
            <Route path="/teacher/*" element={<Login />} />
            <Route path="/guardian/*" element={<Login />} />
          </>
        )}
        
        {/* Catch all other routes */}
        <Route path="*" element={<Login />} />
      </Routes>
    </div>
  )
}

export default App 