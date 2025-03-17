import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import './style/StudentDashboard.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getStudentProfile, getStudentCourses } from '../../backend/students';
import { getChartData } from '../../backend/students/performance';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaHome, FaBook, FaChartLine, FaCalendarAlt, FaCog, FaCheckCircle, FaTimes, FaSignOutAlt } from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const StudentDashboard = () => {
  const [showCoursesSidebar, setShowCoursesSidebar] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignmentsResponse, setAssignmentsResponse] = useState(null);
  const [submissionsResponse, setSubmissionsResponse] = useState(null);
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
        const { data: profileData, error: profileError } = await getStudentProfile(user.id);
        if (profileError) throw profileError;
        setStudentData(profileData);
        
        // Fetch student courses
        const { data: coursesData, error: coursesError } = await getStudentCourses(user.id);
        if (coursesError) throw coursesError;
        
        // Fetch all assignments and submissions in a single batch
        const courseIds = coursesData.map(course => course.course_id);
        
        if (courseIds.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }
        
        const [assignmentsResponse, submissionsResponse] = await Promise.all([
          supabase
            .from('assignments')
            .select('*')
            .in('course_id', courseIds),
          supabase
            .from('student_assignments')
            .select('*')
            .eq('student_id', user.id)
        ]);
        
        if (assignmentsResponse.error) throw assignmentsResponse.error;
        if (submissionsResponse.error) throw submissionsResponse.error;
        
        // Store the responses for use in chart data
        setAssignmentsResponse(assignmentsResponse);
        setSubmissionsResponse(submissionsResponse);
        
        // Process course data with assignments and submissions
        const enhancedCourses = coursesData.map(course => {
          // Filter assignments for this course
          const courseAssignments = assignmentsResponse.data.filter(
            assignment => assignment.course_id === course.course_id
          );
          
          // Filter submissions for this course's assignments
          const assignmentIds = courseAssignments.map(a => a.id);
          const courseSubmissions = submissionsResponse.data.filter(
            submission => assignmentIds.includes(submission.assignment_id)
          );
          
          // Calculate course statistics
          const totalAssignments = courseAssignments.length;
          const completedAssignments = courseSubmissions.filter(
            s => s.status === 'submitted' || s.status === 'graded'
          ).length;
          
          // Calculate overall grade
          const gradedSubmissions = courseSubmissions.filter(
            s => s.status === 'graded' && s.score !== null
          );
          
          let overallGrade = 0;
          let letterGrade = 'N/A';
          
          if (gradedSubmissions.length > 0) {
            const totalScore = gradedSubmissions.reduce((sum, submission) => sum + submission.score, 0);
            overallGrade = Math.round(totalScore / gradedSubmissions.length);
            
            // Determine letter grade
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
          
          return {
            id: course.course_id,
            code: course.courses.code,
            name: course.courses.name,
            description: course.courses.description,
            grade: letterGrade,
            overallGrade: overallGrade || 'N/A',
            completedAssignments,
            totalAssignments,
            attendance: 90, // Placeholder
            term: '24-25-SEM1', // Placeholder
            completedItems: completedAssignments
          };
        });
        
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
  
  // Get chart data from actual graded assignments
  const fetchChartData = async (courseId) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }
    
    // Use the backend service to get chart data
    const { data: chartData, error } = await getChartData(courseId, user.id);
    
    if (error) {
      console.error('Error fetching chart data:', error);
      return null;
    }
    
    return chartData;
  };
  
  // For backward compatibility, keep the original getChartData function
  // but have it use the cached data
  const getChartData = (courseId) => {
    // Find the course
    const course = courses.find(c => c.id === courseId);
    if (!course) return null;
    
    // Get assignments and submissions for this course
    const courseAssignments = assignmentsResponse?.data?.filter(
      assignment => assignment.course_id === courseId
    ) || [];
    
    const assignmentIds = courseAssignments.map(a => a.id);
    const courseSubmissions = submissionsResponse?.data?.filter(
      submission => assignmentIds.includes(submission.assignment_id)
    ) || [];
    
    // Get graded submissions
    const gradedSubmissions = courseSubmissions.filter(
      s => s.status === 'graded' && s.score !== null
    );
    
    // If no graded submissions, return sample data
    if (gradedSubmissions.length === 0) {
      return {
        labels: ['No graded assignments yet'],
        datasets: [{
          label: 'Assessment Scores',
          data: [0],
          borderColor: '#0ea5e9',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(14, 165, 233, 0.1)'
        }]
      };
    }
    
    // Sort submissions by assignment due date
    const sortedSubmissions = [...gradedSubmissions].sort((a, b) => {
      const assignmentA = courseAssignments.find(assignment => assignment.id === a.assignment_id);
      const assignmentB = courseAssignments.find(assignment => assignment.id === b.assignment_id);
      return new Date(assignmentA?.due_date || 0) - new Date(assignmentB?.due_date || 0);
    });
    
    // Get assignment names and scores
    const labels = sortedSubmissions.map(submission => {
      const assignment = courseAssignments.find(a => a.id === submission.assignment_id);
      return assignment?.title || 'Assignment';
    });
    
    const scores = sortedSubmissions.map(submission => submission.score);
    
    return {
      labels,
      datasets: [{
        label: 'Assessment Scores',
        data: scores,
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
        <div className="loading-skeleton title"></div>
        <div className="loading-skeleton"></div>
        <div className="loading-skeleton"></div>
        <div className="loading-skeleton card"></div>
        <div className="loading-skeleton card"></div>
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