import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Signin from './pages/Signin'
import Signup from './pages/Signup'
// Import pages (not components)
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminReports from './pages/admin/AdminReports'
import AdminSettings from './pages/admin/AdminSettings'
import AdminStudents from './pages/admin/AdminStudents'
import 'bootstrap/dist/css/bootstrap.min.css';
import StudentDashboard from './pages/student/StudentDashboard'
import StudentCourses from './pages/student/StudentCourses'
import CourseDetails from './pages/student/CourseDetails'
import StudentAssignments from './pages/student/StudentAssignments'
// import FacultyDashboard from './pages/faculty/FacultyDashboard'
// import GuardianDashboard from './pages/guardian/GuardianDashboard'
import { Toaster } from 'react-hot-toast'

import Students from './components/admin/Students';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherCourses from './pages/teacher/TeacherCourses';
// import TeacherStudents from './pages/teacher/TeacherStudents';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import StudentAnalysis from './pages/teacher/StudentsAnalysis';
import GradeAssignment from './pages/teacher/GradeAssignment';

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Auth routes */}
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/students" element={<Students />} />
        
        {/* Student routes */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/courses" element={<StudentCourses />} />
        <Route path="/student/courses/:courseId" element={<CourseDetails />} />
        <Route path="/student/assignments" element={<StudentAssignments />} />
        
        {/* Teacher routes */}
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/courses" element={<TeacherCourses />} />
        {/* <Route path="/teacher/courses/:courseId/students" element={<TeacherStudents />} /> */}
        <Route path="/teacher/courses/:courseId/assignments" element={<TeacherAssignments />} />
        <Route path="/teacher/students/:studentId" element={<StudentAnalysis />} />
        <Route path="/teacher/assignments/:assignmentId/grade" element={<GradeAssignment />} />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/signin" />} />
      </Routes>
    </Router>
  );
}

export default App;
