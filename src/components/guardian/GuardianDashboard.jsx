import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getStudentProfile, getStudentCourses } from '../../backend/students';
import { getChartData } from '../../backend/students/performance';
import GuardianLayout from './GuardianLayout';
import { calculateGrade, getGradeColor } from '../../utils/gradeUtils';
import { getUserNotifications } from '../../backend/admin/notifications';
import { toast } from 'react-hot-toast';
import './styles/GuardianDashboard.css';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaHome, FaBook, FaChartLine, FaCalendarAlt, FaCheckCircle, FaTimes, FaBell, FaClipboardList, FaExclamationTriangle, FaChevronDown, FaChevronUp, FaEye } from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const GuardianDashboard = () => {
  const [studentData, setStudentData] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignmentsResponse, setAssignmentsResponse] = useState(null);
  const [submissionsResponse, setSubmissionsResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const navigate = useNavigate();
  
  // State for collapsible widgets
  const [expandedWidgets, setExpandedWidgets] = useState(() => {
    // Load saved widget states from localStorage
    const savedState = localStorage.getItem('guardian_dashboard_widget_state');
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
      courses: true
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
      localStorage.setItem('guardian_dashboard_widget_state', JSON.stringify(newState));
      
      return newState;
    });
  };
  
  // Fetch student data and courses
  useEffect(() => {
    const fetchGuardianData = async () => {
      try {
        setLoading(true);
        
        // Get current user (guardian)
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Get guardian profile
        const { data: guardianData, error: guardianError } = await supabase
          .from('guardian_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (guardianError) throw guardianError;
        
        // Get linked student information
        const { data: studentLink, error: linkError } = await supabase
          .from('guardian_student_links')
          .select('student_id')
          .eq('guardian_id', guardianData.id)
          .single();
        
        if (linkError) throw linkError;
        
        const studentId = studentLink.student_id;
        setStudentId(studentId);
        
        // Fetch student profile
        const { data: profileData, error: profileError } = await getStudentProfile(studentId);
        if (profileError) throw profileError;
        setStudentData(profileData);
        
        // Fetch student courses
        const { data: coursesData, error: coursesError } = await getStudentCourses(studentId);
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
            .eq('student_id', studentId)
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
            progress: {
              completed: completedAssignments,
              total: totalAssignments,
              percentage: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0
            }
          };
        });
        
        setCourses(enhancedCourses);
        
        // Process upcoming assignments
        const now = new Date();
        const futureAssignments = assignmentsResponse.data
          .filter(assignment => {
            const dueDate = new Date(assignment.due_date);
            const submission = submissionsResponse.data.find(s => s.assignment_id === assignment.id);
            return dueDate > now && (!submission || submission.status === 'pending');
          })
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
          .slice(0, 5); // Get the 5 most recent upcoming assignments
        
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
    
    fetchGuardianData();
  }, []);
  
  // Navigate to course details page
  const handleCourseClick = (courseId) => {
    navigate(`/guardian/courses/${courseId}`);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  
  // Get urgency class based on due date
  const getUrgencyClass = (dueDate) => {
    const daysLeft = getDaysLeft(dueDate);
    if (daysLeft < 0) return 'overdue';
    if (daysLeft <= 1) return 'urgent';
    if (daysLeft <= 3) return 'soon';
    return 'normal';
  };

  // Filter upcoming assignments
  const filteredUpcomingAssignments = () => {
    return upcomingAssignments.filter(assignment => !isOverdue(assignment.due_date));
  };
  
  // Filter overdue assignments
  const filteredOverdueAssignments = () => {
    return upcomingAssignments.filter(assignment => isOverdue(assignment.due_date));
  };
  
  // Filter submitted assignments
  const filteredSubmittedAssignments = () => {
    if (!submissionsResponse?.data) return [];
    
    return submissionsResponse.data
      .filter(submission => submission.status === 'submitted' || submission.status === 'graded')
      .map(submission => {
        const assignment = assignmentsResponse?.data?.find(a => a.id === submission.assignment_id);
        const course = courses.find(c => c.id === assignment?.course_id);
        return {
          ...submission,
          assignment: assignment,
          courseName: course?.name || 'Unknown Course',
          courseCode: course?.code || ''
        };
      })
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5);
  };

  return (
    <GuardianLayout>
      <div className="guardian-dashboard">
        <div className="guardian-view-banner">
          <FaEye /> Guardian View - You are viewing your student's dashboard in read-only mode
        </div>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading student data...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            <div className="dashboard-welcome">
              <h1>Welcome to {studentData?.first_name}'s Dashboard</h1>
              <p>Here you can monitor your student's academic progress and upcoming assignments</p>
            </div>
            
            <div className="dashboard-grid">
              {/* Courses Overview */}
              <div className="dashboard-widget courses-widget">
                <div className="widget-header" onClick={() => toggleWidget('courses')}>
                  <h2><FaBook /> Courses</h2>
                  {expandedWidgets.courses ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                
                {expandedWidgets.courses && (
                  <div className="widget-content">
                    {courses.length > 0 ? (
                      <div className="courses-grid">
                        {courses.map(course => (
                          <div 
                            key={course.id} 
                            className="course-card"
                            onClick={() => handleCourseClick(course.id)}
                          >
                            <div className="course-header">
                              <h3>{course.code}</h3>
                              <span className="course-grade" style={{ backgroundColor: course.gradeColor }}>
                                {course.grade}
                              </span>
                            </div>
                            <div className="course-name">{course.name}</div>
                            <div className="course-progress">
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{ width: `${course.progress.percentage}%` }}
                                ></div>
                              </div>
                              <div className="progress-text">
                                {course.progress.completed}/{course.progress.total} assignments completed
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-data-message">No courses available</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Upcoming Assignments */}
              <div className="dashboard-widget upcoming-widget">
                <div className="widget-header" onClick={() => toggleWidget('upcomingAssignments')}>
                  <h2><FaCalendarAlt /> Upcoming Assignments</h2>
                  {expandedWidgets.upcomingAssignments ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                
                {expandedWidgets.upcomingAssignments && (
                  <div className="widget-content">
                    {filteredUpcomingAssignments().length > 0 ? (
                      <div className="assignments-list">
                        {filteredUpcomingAssignments().map(assignment => (
                          <div key={assignment.id} className="assignment-item">
                            <div className="assignment-details">
                              <div className="assignment-course">{assignment.courseCode}</div>
                              <div className="assignment-title">{assignment.title}</div>
                              <div className={`assignment-due ${getUrgencyClass(assignment.due_date)}`}>
                                Due: {formatDate(assignment.due_date)}
                                {getDaysLeft(assignment.due_date) > 0 ? (
                                  <span className="days-left">
                                    {getDaysLeft(assignment.due_date)} day{getDaysLeft(assignment.due_date) !== 1 ? 's' : ''} left
                                  </span>
                                ) : (
                                  <span className="days-left overdue">Overdue</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-data-message">No upcoming assignments</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Overdue Assignments */}
              <div className="dashboard-widget overdue-widget">
                <div className="widget-header" onClick={() => toggleWidget('overdueAssignments')}>
                  <h2><FaExclamationTriangle /> Overdue Assignments</h2>
                  {expandedWidgets.overdueAssignments ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                
                {expandedWidgets.overdueAssignments && (
                  <div className="widget-content">
                    {filteredOverdueAssignments().length > 0 ? (
                      <div className="assignments-list">
                        {filteredOverdueAssignments().map(assignment => (
                          <div key={assignment.id} className="assignment-item overdue">
                            <div className="assignment-details">
                              <div className="assignment-course">{assignment.courseCode}</div>
                              <div className="assignment-title">{assignment.title}</div>
                              <div className="assignment-due overdue">
                                Due: {formatDate(assignment.due_date)}
                                <span className="days-left overdue">
                                  {Math.abs(getDaysLeft(assignment.due_date))} day{Math.abs(getDaysLeft(assignment.due_date)) !== 1 ? 's' : ''} overdue
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-data-message success">No overdue assignments</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Recent Submissions */}
              <div className="dashboard-widget submissions-widget">
                <div className="widget-header" onClick={() => toggleWidget('submittedAssignments')}>
                  <h2><FaClipboardList /> Recent Submissions</h2>
                  {expandedWidgets.submittedAssignments ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                
                {expandedWidgets.submittedAssignments && (
                  <div className="widget-content">
                    {filteredSubmittedAssignments().length > 0 ? (
                      <div className="submissions-list">
                        {filteredSubmittedAssignments().map(submission => (
                          <div key={submission.id} className="submission-item">
                            <div className="submission-details">
                              <div className="submission-course">{submission.courseCode}</div>
                              <div className="submission-title">{submission.assignment?.title || 'Unknown Assignment'}</div>
                              <div className="submission-status">
                                {submission.status === 'graded' ? (
                                  <>
                                    <span className="status graded">
                                      <FaCheckCircle /> Graded
                                    </span>
                                    <span className="submission-score">
                                      Score: {submission.score}/{submission.assignment?.max_score || 100}
                                    </span>
                                  </>
                                ) : (
                                  <span className="status submitted">
                                    <FaCheckCircle /> Submitted
                                  </span>
                                )}
                              </div>
                              <div className="submission-date">
                                Submitted on {formatDate(submission.updated_at)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-data-message">No recent submissions</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Notifications */}
              <div className="dashboard-widget notifications-widget">
                <div className="widget-header" onClick={() => toggleWidget('notifications')}>
                  <h2><FaBell /> Notifications</h2>
                  {expandedWidgets.notifications ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                
                {expandedWidgets.notifications && (
                  <div className="widget-content">
                    {notifications.length > 0 ? (
                      <div className="notifications-list">
                        {notifications.map(notification => (
                          <div key={notification.id} className="notification-item">
                            <div className="notification-icon">
                              <FaBell />
                            </div>
                            <div className="notification-details">
                              <div className="notification-title">{notification.title}</div>
                              <div className="notification-message">{notification.message}</div>
                              <div className="notification-date">{formatDate(notification.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-data-message">No new notifications</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </GuardianLayout>
  );
};

export default GuardianDashboard; 