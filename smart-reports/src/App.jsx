import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

  // Make the flag available globally
  window.setIsCreatingUser = setIsCreatingUser
  
  // Global logout function
  const handleGlobalLogout = async () => {
    try {
      // Check if there's an active session before trying to sign out
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }
      
      // Clear local state immediately
      setUser(null)
      setUserProfile(null)
      
      // Navigate to login
      navigate('/login', { replace: true })
      
      return true
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails, clear local state and redirect
      setUser(null)
      setUserProfile(null)
      navigate('/login', { replace: true })
      return false
    }
  }
  
  // Make logout function available globally
  window.handleGlobalLogout = handleGlobalLogout

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
          console.log('No session - clearing user profile')
          setUserProfile(null)
          setLoading(false)
          
          // Only redirect to login if user is on a protected route
          // Don't redirect if they're on public routes like /guardian-portal
          const publicRoutes = ['/guardian-portal', '/login', '/signup', '/register']
          const currentPath = window.location.pathname
          
          if (!publicRoutes.includes(currentPath)) {
            console.log('Redirecting to login from protected route:', currentPath)
            setTimeout(() => {
              navigate('/login', { replace: true })
            }, 100)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [isCreatingUser, navigate])

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
        {/* Public routes - always accessible regardless of auth state */}
        <Route path="/guardian-portal" element={<GuardianPortalPublic />} />
        <Route path="/signup" element={user && userProfile ? <Navigate to="/" /> : <Signup />} />
        <Route path="/register" element={user && userProfile ? <Navigate to="/" /> : <Signup />} />
        <Route path="/login" element={user && userProfile ? <Navigate to="/" /> : <Login />} />

        {/* Protected routes - only accessible when logged in */}
        {user && userProfile && (
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
        )}

        {/* Default routes when not authenticated */}
        {!user || !userProfile ? (
          <>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Login />} />
            <Route path="/admin/*" element={<Login />} />
            <Route path="/teacher/*" element={<Login />} />
            <Route path="/guardian/*" element={<Login />} />
          </>
        ) : (
          /* Catch all for authenticated users */
          <Route path="*" element={<Navigate to="/" />} />
        )}
        
        {/* Final catch-all for unauthenticated users (except public routes) */}
        {(!user || !userProfile) && <Route path="*" element={<Login />} />}
      </Routes>
    </div>
  )
}

export default App 