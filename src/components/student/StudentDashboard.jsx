import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import './styles/StudentDashboard.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getStudentProfile, getStudentCourses } from '../../backend/students';
import { getChartData } from '../../backend/students/performance';
import StudentLayout from './StudentLayout';
import AssignmentList from './AssignmentList';
import { calculateGrade, getGradeColor } from '../../utils/gradeUtils';
import { getUserNotifications } from '../../backend/admin/notifications';
import { toast } from 'react-hot-toast';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaHome, FaBook, FaChartLine, FaCalendarAlt, FaCog, FaCheckCircle, FaTimes, FaSignOutAlt, FaBell, FaEnvelope, FaClipboardList, FaExclamationTriangle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

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
  const [notifications, setNotifications] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  
  // State for collapsible widgets
  const [expandedWidgets, setExpandedWidgets] = useState(() => {
    // Load saved widget states from localStorage
    const savedState = localStorage.getItem('dashboard_widget_state');
    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch (err) {
        console.error('Error parsing saved widget state:', err);
      }
    }
    
    // Default state if nothing is saved
    return {
      upcomingAssignments: true,
      overdueAssignments: true,
      submittedAssignments: true,
      notifications: true,
      courses: true,
      modules: true,
      allAssignments: true
    };
  });
  
  // Toggle widget expanded/collapsed state
  const toggleWidget = (widgetName) => {
    setExpandedWidgets(prevState => {
      const newState = {
        ...prevState,
        [widgetName]: !prevState[widgetName]
      };
      
      // Save to localStorage
      localStorage.setItem('dashboard_widget_state', JSON.stringify(newState));
      
      return newState;
    });
  };
  
  // Toggle all widgets at once
  const toggleAllWidgets = (expandAll) => {
    const newState = {
      upcomingAssignments: expandAll,
      overdueAssignments: expandAll,
      submittedAssignments: expandAll,
      notifications: expandAll,
      courses: expandAll,
      modules: expandAll,
      allAssignments: expandAll
    };
    
    // Save to localStorage and update state
    localStorage.setItem('dashboard_widget_state', JSON.stringify(newState));
    setExpandedWidgets(newState);
    
    // Show confirmation to user
    toast.success(expandAll ? 'Expanded all sections' : 'Collapsed all sections');
  };
  
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
        
        setUserId(user.id); // Set the userId state
        
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
          
          // Calculate overall grade using the weighted calculation method
          const gradedSubmissions = courseSubmissions.filter(
            s => s.status === 'graded' && s.score !== null
          );
          
          // Calculate total points earned and total possible points
          let totalEarned = 0;
          let totalPossible = 0;
          let overallGrade = 0;
          let letterGrade = 'N/A';
          
          if (gradedSubmissions.length > 0) {
            // Get assignment details to calculate weighted scores
            gradedSubmissions.forEach(submission => {
              const assignment = courseAssignments.find(a => a.id === submission.assignment_id);
              if (assignment) {
                const maxPoints = assignment.max_score || 100;
                totalEarned += submission.score || 0;
                totalPossible += maxPoints;
              }
            });
            
            // Calculate as percentage
            overallGrade = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
            
            // Use the grade utility function
            letterGrade = calculateGrade(overallGrade);
          }
          
          return {
            id: course.course_id,
            code: course.courses.code,
            name: course.courses.name,
            description: course.courses.description,
            grade: letterGrade,
            gradeColor: getGradeColor(letterGrade),
            overallGrade: overallGrade || 'N/A',
            totalEarned,
            totalPossible,
            completedAssignments,
            totalAssignments,
            attendance: 90, // Placeholder
            term: '24-25-SEM1', // Placeholder
            completedItems: completedAssignments
          };
        });
        
        setCourses(enhancedCourses);

        // Process upcoming assignments
        const now = new Date();
        const futureAssignments = assignmentsResponse.data
          .filter(assignment => new Date(assignment.due_date) > now)
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        
        // Get course information for each assignment
        const upcomingWithCourseInfo = futureAssignments.map(assignment => {
          const course = coursesData.find(c => c.course_id === assignment.course_id);
          return {
            ...assignment,
            courseName: course?.courses?.name || 'Unknown Course',
            courseCode: course?.courses?.code || ''
          };
        });
        
        setUpcomingAssignments(upcomingWithCourseInfo);

        // Fetch notifications
        const { data: notificationsData } = await getUserNotifications();
        if (notificationsData) {
          setNotifications(notificationsData.slice(0, 5)); // Get the 5 most recent notifications
        }
        
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

  // Smaller chart options for the dashboard
  const smallChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins.legend,
        display: false
      },
      title: {
        display: false
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

  // Format date for notifications
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Calculate days left until due date
  const getDaysLeft = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check if assignment is overdue
  const isOverdue = (dueDate) => {
    return getDaysLeft(dueDate) < 0;
  };

  // get urgency class for assignment
  const getUrgencyClass = (dueDate) => {
    const daysLeft = getDaysLeft(dueDate);
    if (daysLeft < 0) return 'overdue';
    if (daysLeft <= 1) return 'urgent';
    if (daysLeft <= 3) return 'soon';
    return '';
  };

  // Check if submission was late
  const isLateSubmission = (dueDate, submissionDate) => {
    if (!dueDate || !submissionDate) return false;
    return new Date(submissionDate) > new Date(dueDate);
  };
  
  // Hide assignment from upcoming list
  const [hiddenAssignments, setHiddenAssignments] = useState([]);
  
  const hideAssignment = (assignmentId, e) => {
    e.stopPropagation(); // Prevent navigation to assignment page
    setHiddenAssignments(prev => [...prev, assignmentId]);
    toast.success('Assignment removed from dashboard');
  };

  // Filter assignments for different sections
  const filteredUpcomingAssignments = () => {
    if (!upcomingAssignments) return [];
    
    return upcomingAssignments
      .filter(assignment => {
        // Filter out hidden assignments
        if (hiddenAssignments.includes(assignment.id)) return false;
        
        // Check if assignment is due in the future and not submitted
        const submission = submissionsResponse?.data?.find(
          s => s.assignment_id === assignment.id
        );
        
        const isSubmitted = submission && 
          (submission.status === 'submitted' || submission.status === 'graded');
        
        // Only show upcoming assignments that aren't overdue and aren't submitted
        return !isOverdue(assignment.due_date) && !isSubmitted;
      })
      .slice(0, 5); // Only show 5 assignments
  };
  
  const filteredOverdueAssignments = () => {
    if (!upcomingAssignments) return [];
    
    return upcomingAssignments
      .filter(assignment => {
        // Filter out hidden assignments
        if (hiddenAssignments.includes(assignment.id)) return false;
        
        // Check if assignment is overdue and not submitted
        const submission = submissionsResponse?.data?.find(
          s => s.assignment_id === assignment.id
        );
        
        const isSubmitted = submission && 
          (submission.status === 'submitted' || submission.status === 'graded');
        
        // Only show overdue assignments that aren't submitted
        return isOverdue(assignment.due_date) && !isSubmitted;
      })
      .slice(0, 5); // Only show 5 assignments
  };
  
  const filteredSubmittedAssignments = () => {
    if (!upcomingAssignments) return [];
    
    return upcomingAssignments
      .filter(assignment => {
        // Filter out hidden assignments
        if (hiddenAssignments.includes(assignment.id)) return false;
        
        // Check if assignment is submitted
        const submission = submissionsResponse?.data?.find(
          s => s.assignment_id === assignment.id
        );
        
        const isSubmitted = submission && 
          (submission.status === 'submitted' || submission.status === 'graded');
        
        // Only show submitted assignments
        return isSubmitted;
      })
      .slice(0, 5); // Only show 5 assignments
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-skeleton title"></div>
          <div className="loading-skeleton"></div>
          <div className="loading-skeleton"></div>
          <div className="loading-skeleton card"></div>
          <div className="loading-skeleton card"></div>
        </div>
      </StudentLayout>
    );
  }

  if (error && !studentData) {
    return (
      <StudentLayout>
        <div className="error-container">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="dashboard-content">
        <div className="container-fluid">
          {/* Dashboard Controls */}
          <div className="dashboard-controls">
            <button 
              className="dashboard-control-btn"
              onClick={() => toggleAllWidgets(true)}
              title="Expand all sections"
            >
              <FaChevronDown /> Expand All
            </button>
            <button 
              className="dashboard-control-btn"
              onClick={() => toggleAllWidgets(false)}
              title="Collapse all sections"
            >
              <FaChevronUp /> Collapse All
            </button>
          </div>
          
          {/* Dashboard Overview Section */}
          <div className="dashboard-overview">
            <div className="dashboard-grid">
              {/* Notifications and Upcoming Assignments */}
              <div className="notifications-assignments-section">
                {/* Upcoming Assignments Widget */}
                {expandedWidgets.upcomingAssignments ? (
                  <div className="upcoming-assignments-widget">
                    <div className="widget-header">
                      <h3><FaCalendarAlt /> Upcoming Assignments</h3>
                      <div className="widget-actions">
                        <button 
                          className="toggle-widget-btn"
                          onClick={() => toggleWidget('upcomingAssignments')}
                          aria-label="Collapse"
                        >
                          <FaChevronUp />
                        </button>
                        <button 
                          className="view-all-btn" 
                          onClick={() => navigate('/student/assignments')}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                    <div className="widget-content">
                      {filteredUpcomingAssignments().length > 0 ? (
                        filteredUpcomingAssignments().map(assignment => {
                          return (
                            <div 
                              key={assignment.id} 
                              className={`upcoming-assignment-item ${getUrgencyClass(assignment.due_date)}`}
                              onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                            >
                              <div className="assignment-details">
                                <div className="assignment-name">{assignment.title}</div>
                                <div className="assignment-course">{assignment.courseCode} - {assignment.courseName}</div>
                              </div>
                              <div className="assignment-due">
                                <span className="due-label">Due:</span> {new Date(assignment.due_date).toLocaleDateString()}
                                <div className="days-left">
                                  {getDaysLeft(assignment.due_date) <= 0 
                                    ? 'Due today!' 
                                    : `${getDaysLeft(assignment.due_date)} days left`
                                  }
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="no-items-message">
                          <p>No upcoming assignments</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button 
                    className="collapsed-widget-btn"
                    onClick={() => toggleWidget('upcomingAssignments')}
                    aria-label="Expand Upcoming Assignments"
                  >
                    <FaCalendarAlt /> <span>Upcoming Assignments</span> <FaChevronDown />
                  </button>
                )}

                {/* Overdue Assignments Widget */}
                {filteredOverdueAssignments().length > 0 && (
                  expandedWidgets.overdueAssignments ? (
                    <div className="overdue-assignments-widget">
                      <div className="widget-header">
                        <h3><FaExclamationTriangle /> Overdue Assignments</h3>
                        <div className="widget-actions">
                          <button 
                            className="toggle-widget-btn"
                            onClick={() => toggleWidget('overdueAssignments')}
                            aria-label="Collapse"
                          >
                            <FaChevronUp />
                          </button>
                          <button 
                            className="view-all-btn" 
                            onClick={() => navigate('/student/assignments?filter=overdue')}
                          >
                            View All
                          </button>
                        </div>
                      </div>
                      <div className="widget-content">
                        {filteredOverdueAssignments().map(assignment => (
                          <div 
                            key={assignment.id} 
                            className="upcoming-assignment-item overdue"
                            onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                          >
                            <div className="assignment-details">
                              <div className="assignment-name">{assignment.title}</div>
                              <div className="assignment-course">{assignment.courseCode} - {assignment.courseName}</div>
                            </div>
                            <div className="assignment-due">
                              <span className="due-label overdue">Overdue:</span> {new Date(assignment.due_date).toLocaleDateString()}
                              <div className="days-left overdue">
                                {Math.abs(getDaysLeft(assignment.due_date))} days past due
                              </div>
                              <button 
                                className="hide-assignment-btn"
                                onClick={(e) => hideAssignment(assignment.id, e)}
                                title="Remove from dashboard"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="collapsed-widget-btn overdue"
                      onClick={() => toggleWidget('overdueAssignments')}
                      aria-label="Expand Overdue Assignments"
                    >
                      <FaExclamationTriangle /> <span>Overdue Assignments</span> <FaChevronDown />
                    </button>
                  )
                )}

                {/* Submitted Assignments Widget */}
                {filteredSubmittedAssignments().length > 0 && (
                  expandedWidgets.submittedAssignments ? (
                    <div className="submitted-assignments-widget">
                      <div className="widget-header">
                        <h3><FaCheckCircle /> Submitted Assignments</h3>
                        <div className="widget-actions">
                          <button 
                            className="toggle-widget-btn"
                            onClick={() => toggleWidget('submittedAssignments')}
                            aria-label="Collapse"
                          >
                            <FaChevronUp />
                          </button>
                          <button 
                            className="view-all-btn" 
                            onClick={() => navigate('/student/assignments?filter=submitted')}
                          >
                            View All
                          </button>
                        </div>
                      </div>
                      <div className="widget-content">
                        {filteredSubmittedAssignments().map(assignment => {
                          const submission = submissionsResponse?.data?.find(
                            s => s.assignment_id === assignment.id
                          );
                          const isLate = isLateSubmission(assignment.due_date, submission?.submitted_at);
                          
                          return (
                            <div 
                              key={assignment.id} 
                              className={`upcoming-assignment-item submitted ${isLate ? 'late' : ''}`}
                              onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                            >
                              <div className="assignment-details">
                                <div className="assignment-name">{assignment.title}</div>
                                <div className="assignment-course">{assignment.courseCode} - {assignment.courseName}</div>
                              </div>
                              <div className="assignment-due">
                                <div className="submission-status">
                                  <FaCheckCircle /> {submission?.status === 'graded' ? 'Graded' : 'Submitted'}
                                  {isLate && <span className="late-tag">LATE</span>}
                                </div>
                                <div className="submission-date">
                                  {new Date(submission?.submitted_at || Date.now()).toLocaleDateString()}
                                </div>
                                <button 
                                  className="hide-assignment-btn"
                                  onClick={(e) => hideAssignment(assignment.id, e)}
                                  title="Remove from dashboard"
                                >
                                  <FaTimes />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="collapsed-widget-btn submitted"
                      onClick={() => toggleWidget('submittedAssignments')}
                      aria-label="Expand Submitted Assignments"
                    >
                      <FaCheckCircle /> <span>Submitted Assignments</span> <FaChevronDown />
                    </button>
                  )
                )}

                {/* Notifications Widget */}
                {expandedWidgets.notifications ? (
                  <div className="notifications-widget">
                    <div className="widget-header">
                      <h3><FaBell /> Recent Notifications</h3>
                      <div className="widget-actions">
                        <button 
                          className="toggle-widget-btn"
                          onClick={() => toggleWidget('notifications')}
                          aria-label="Collapse"
                        >
                          <FaChevronUp />
                        </button>
                        <button 
                          className="view-all-btn" 
                          onClick={() => navigate('/notifications')}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                    <div className="widget-content">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div key={notification.id} className={`notification-item ${!notification.is_read ? 'unread' : ''}`}>
                            <div className="notification-icon">
                              {notification.type === 'assignment' ? <FaClipboardList /> : 
                               notification.type === 'module' ? <FaBook /> : <FaEnvelope />}
                            </div>
                            <div className="notification-content">
                              <div className="notification-title">{notification.title}</div>
                              <div className="notification-message">{notification.message}</div>
                              <div className="notification-time">{formatDate(notification.created_at)}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-items-message">
                          <p>No new notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button 
                    className="collapsed-widget-btn"
                    onClick={() => toggleWidget('notifications')}
                    aria-label="Expand Notifications"
                  >
                    <FaBell /> <span>Recent Notifications</span> <FaChevronDown />
                  </button>
                )}
              </div>

              {/* Course List and Module Section */}
              <div className="courses-modules-section">
                {/* Course Cards */}
                {expandedWidgets.courses ? (
                  <div className="my-courses-widget">
                    <div className="widget-header">
                      <h3><FaBook /> My Courses</h3>
                      <div className="widget-actions">
                        <button 
                          className="toggle-widget-btn"
                          onClick={() => toggleWidget('courses')}
                          aria-label="Collapse"
                        >
                          <FaChevronUp />
                        </button>
                        <button 
                          className="view-all-btn" 
                          onClick={() => setShowCoursesSidebar(true)}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                    <div className="widget-content">
                      {courses.length > 0 ? (
                        <div className="course-grid">
                          {courses.map(course => (
                            <div 
                              key={course.id} 
                              className="course-card" 
                              onClick={() => handleCourseClick(course.id)}
                            >
                              <div className="course-card-header">
                                <div className="course-code">{course.code}</div>
                                <div 
                                  className="course-grade" 
                                  style={{ backgroundColor: course.gradeColor || '#9E9E9E' }}
                                >
                                  {course.grade}
                                </div>
                              </div>
                              <div className="course-name">{course.name}</div>
                              <div className="course-stats-simple">
                                <div className="stat-item">
                                  <span className="stat-label">Overall:</span>
                                  <span className="stat-value">{course.overallGrade !== 'N/A' ? `${course.overallGrade}%` : 'N/A'}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Assignments:</span>
                                  <span className="stat-value">{course.completedAssignments}/{course.totalAssignments}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
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
                  </div>
                ) : (
                  <button 
                    className="collapsed-widget-btn"
                    onClick={() => toggleWidget('courses')}
                    aria-label="Expand My Courses"
                  >
                    <FaBook /> <span>My Courses</span> <FaChevronDown />
                  </button>
                )}

                {/* Recent Activity/Modules Widget */}
                {expandedWidgets.modules ? (
                  <div className="modules-widget">
                    <div className="widget-header">
                      <h3><FaBook /> Recent Modules</h3>
                      <div className="widget-actions">
                        <button 
                          className="toggle-widget-btn"
                          onClick={() => toggleWidget('modules')}
                          aria-label="Collapse"
                        >
                          <FaChevronUp />
                        </button>
                        <button 
                          className="view-all-btn" 
                          onClick={() => navigate('/student/modules')}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                    <div className="widget-content">
                      {courses.length > 0 ? (
                        <div className="module-list">
                          {courses.slice(0, 3).map(course => (
                            <div key={course.id} className="module-item" onClick={() => handleCourseClick(course.id)}>
                              <div className="module-icon"><FaBook /></div>
                              <div className="module-content">
                                <div className="module-title">{course.name}</div>
                                <div className="module-course">{course.code}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-items-message">
                          <p>No modules available</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button 
                    className="collapsed-widget-btn"
                    onClick={() => toggleWidget('modules')}
                    aria-label="Expand Recent Modules"
                  >
                    <FaBook /> <span>Recent Modules</span> <FaChevronDown />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

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

        {/* All Assignments Section */}
        <div className="assignments-section">
          <div className="section-header">
            <h2 className="section-title"><FaClipboardList /> All Assignments</h2>
            <button 
              className="toggle-section-btn"
              onClick={() => toggleWidget('allAssignments')}
              aria-label={expandedWidgets.allAssignments ? "Collapse" : "Expand"}
            >
              {expandedWidgets.allAssignments ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          </div>
          {expandedWidgets.allAssignments && (
            <AssignmentList 
              assignments={assignmentsResponse?.data || []} 
              studentId={userId}
              onSubmissionUpdate={() => {
                // Refresh assignments after submission
                fetchStudentData();
              }}
            />
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard; 