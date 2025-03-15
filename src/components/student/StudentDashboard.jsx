import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import './style/StudentDashboard.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaHome, FaBook, FaChartLine, FaCalendarAlt, FaCog, FaCheckCircle, FaTimes, FaSignOutAlt } from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const StudentDashboard = () => {
  const [showCoursesSidebar, setShowCoursesSidebar] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Fetch student data and courses
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Fetch student profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        
        setStudentData(profileData);
        
        // Fetch student's courses
        const { data: studentCourses, error: coursesError } = await supabase
          .from('student_courses')
          .select(`
            course_id,
            courses (
              id,
              code,
              name,
              description
            )
          `)
          .eq('student_id', user.id);
          
        if (coursesError) throw coursesError;
        
        // Fetch additional course data (assignments, grades, etc.)
        const enhancedCourses = [];
        
        for (const course of studentCourses || []) {
          // Get assignments for this course
          const { data: assignments, error: assignmentsError } = await supabase
            .from('assignments')
            .select('*')
            .eq('course_id', course.course_id);
            
          if (assignmentsError) throw assignmentsError;
          
          // Get student's submissions for this course
          const { data: submissions, error: submissionsError } = await supabase
            .from('student_assignments')
            .select('*')
            .eq('student_id', user.id)
            .in('assignment_id', assignments.map(a => a.id) || []);
            
          if (submissionsError) throw submissionsError;
          
          // Calculate course statistics
          const totalAssignments = assignments?.length || 0;
          const completedAssignments = submissions?.filter(s => s.status === 'submitted' || s.status === 'graded').length || 0;
          
          // Calculate overall grade if there are graded assignments
          const gradedSubmissions = submissions?.filter(s => s.status === 'graded' && s.score !== null) || [];
          let overallGrade = 0;
          
          if (gradedSubmissions.length > 0) {
            const totalScore = gradedSubmissions.reduce((sum, submission) => sum + submission.score, 0);
            overallGrade = Math.round(totalScore / gradedSubmissions.length);
          }
          
          // Determine letter grade
          let letterGrade = 'N/A';
          if (gradedSubmissions.length > 0) {
            if (overallGrade >= 90) letterGrade = 'A';
            else if (overallGrade >= 80) letterGrade = 'B';
            else if (overallGrade >= 70) letterGrade = 'C';
            else if (overallGrade >= 60) letterGrade = 'D';
            else letterGrade = 'F';
            
            // Add +/- modifiers
            if (letterGrade !== 'F') {
              const remainder = overallGrade % 10;
              if (remainder >= 7 && letterGrade !== 'A') letterGrade += '+';
              else if (remainder <= 2 && letterGrade !== 'F') letterGrade += '-';
            }
          }
          
          enhancedCourses.push({
            id: course.course_id,
            code: course.courses.code,
            name: course.courses.name,
            description: course.courses.description,
            grade: letterGrade,
            overallGrade: overallGrade || 'N/A',
            completedAssignments,
            totalAssignments,
            attendance: 90, // Placeholder - would need attendance data from backend
            term: '24-25-SEM1', // Placeholder - would need term data from backend
            completedItems: completedAssignments
          });
        }
        
        setCourses(enhancedCourses);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Failed to load student data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchStudentData();
  }, []);
  
  // Navigate to course details page
  const handleCourseClick = (courseId) => {
    navigate(`/student/courses/${courseId}`);
  };
  
  // Sample data for chart - would be dynamic in production
  const getChartData = (courseId) => {
    // In a real app, this would fetch assessment data for the specific course
    return {
      labels: ['Quiz 1', 'Assignment 1', 'Midterm', 'Quiz 2', 'Assignment 2', 'Final'],
      datasets: [{
        label: 'Assessment Scores',
        data: [85, 88, 82, 90, 87, 85],
        borderColor: '#0ea5e9',
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(14, 165, 233, 0.1)'
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.06)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const sidebar = document.getElementById('coursesSidebar');
      const coursesButton = document.getElementById('coursesButton');
      
      if (sidebar && coursesButton && 
          !sidebar.contains(e.target) && 
          !coursesButton.contains(e.target) && 
          showCoursesSidebar) {
        setShowCoursesSidebar(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showCoursesSidebar]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading student dashboard...</p>
      </div>
    );
  }

  if (error && !studentData) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="wrapper">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="LIC" height="40" />
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item">
            <a className="nav-link active" href="#">
              <FaHome /> Dashboard
            </a>
          </div>
          <div className="nav-item">
            <a 
              className="nav-link" 
              href="#" 
              id="coursesButton"
              onClick={(e) => {
                e.preventDefault();
                setShowCoursesSidebar(true);
              }}
            >
              <FaBook /> Courses
            </a>
          </div>
          <div className="nav-item">
            <a className="nav-link" href="#" onClick={(e) => {
              e.preventDefault();
              navigate('/student/grades');
            }}>
              <FaChartLine /> Grade Projection
            </a>
          </div>
          <div className="nav-item">
            <a className="nav-link" href="#" onClick={(e) => {
              e.preventDefault();
              navigate('/student/schedule');
            }}>
              <FaCalendarAlt /> Schedule
            </a>
          </div>
          <div className="nav-item">
            <a className="nav-link" href="#" onClick={(e) => {
              e.preventDefault();
              navigate('/student/settings');
            }}>
              <FaCog /> Settings
            </a>
          </div>
          <div className="nav-item">
            <a className="nav-link logout-link" href="#" onClick={async (e) => {
              e.preventDefault();
              await supabase.auth.signOut();
              navigate('/signin');
            }}>
              <FaSignOutAlt /> Logout
            </a>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* User profile section */}
        <div className="user-profile">
          <div className="user-info">
            <div className="user-name">{studentData?.first_name} {studentData?.last_name}</div>
            <div className="user-role">{studentData?.role}</div>
          </div>
          <img src={studentData?.avatar_url || "/profile.jpg"} alt="Profile" />
        </div>

        <div className="container-fluid">
          {/* Course Performance Cards */}
          {courses.length > 0 ? (
            courses.map(course => (
              <div 
                key={course.id} 
                className="course-performance" 
                onClick={() => handleCourseClick(course.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="course-header">
                  <h4>{course.name} ({course.code})</h4>
                  <div className="course-grade">{course.grade}</div>
                </div>
                <div className="course-stats">
                  <div className="stat-card">
                    <div className="h3 mb-0">{course.overallGrade !== 'N/A' ? `${course.overallGrade}%` : 'N/A'}</div>
                    <small>Overall Grade</small>
                  </div>
                  <div className="stat-card">
                    <div className="h3 mb-0">{course.attendance}%</div>
                    <small>Attendance</small>
                  </div>
                  <div className="stat-card">
                    <div className="h3 mb-0">{course.completedAssignments}/{course.totalAssignments}</div>
                    <small>Assignments</small>
                  </div>
                </div>
                <div className="chart-container">
                  <Line data={getChartData(course.id)} options={chartOptions} />
                </div>
              </div>
            ))
          ) : (
            <div className="no-courses-message">
              <p>You are not enrolled in any courses yet.</p>
              <button 
                className="btn-primary" 
                onClick={() => navigate('/student/courses')}
              >
                Browse Available Courses
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Courses sidebar popup */}
      <div className={`courses-sidebar ${showCoursesSidebar ? 'active' : ''}`} id="coursesSidebar">
        <div className="courses-header">
          <h3>My Courses</h3>
          <button 
            className="close-btn" 
            onClick={() => setShowCoursesSidebar(false)}
          >
            <FaTimes />
          </button>
        </div>
        <div className="courses-search">
          <input type="text" placeholder="Search courses..." className="form-control" />
        </div>
        <div className="courses-list">
          {courses.length > 0 ? (
            courses.map(course => (
              <div 
                key={course.id} 
                className="course-item" 
                onClick={() => {
                  handleCourseClick(course.id);
                  setShowCoursesSidebar(false);
                }}
              >
                <h4>{course.name}</h4>
                <p className="course-code">{course.code}</p>
                <div className="course-meta">
                  <span>Term: {course.term}</span>
                  <span className="completion-status">
                    <FaCheckCircle />
                    {course.completedItems} completed {course.completedItems === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="no-courses">No courses found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard; 