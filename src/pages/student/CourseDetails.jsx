import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AssignmentList from '../../components/student/AssignmentList';
import PerformanceChart from '../../components/shared/PerformanceChart';
import { FaBook, FaUser, FaCalendarAlt, FaClock, FaClipboardList } from 'react-icons/fa';
import './styles/CourseDetails.css';
import { getCourseDetails } from '../../backend/students/courses';
import { calculateCourseGrade } from '../../backend/students/performance';
import StudentLayout from '../../components/student/StudentLayout';

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [courseGrade, setCourseGrade] = useState(null);
  const [gradeLoading, setGradeLoading] = useState(false);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // Use the backend service to get course details
        const { data: courseData, error: courseError } = await getCourseDetails(courseId);
        if (courseError) throw courseError;
        
        setCourse(courseData.course);
        setInstructor(courseData.instructor);

        // Fetch all assignments for this course and student submissions in parallel
        const [assignmentsResponse, submissionsResponse] = await Promise.all([
          supabase
            .from('assignments')
            .select('*')
            .eq('course_id', courseId)
            .order('due_date', { ascending: true }),
          supabase
            .from('student_assignments')
            .select('*')
            .eq('student_id', user.id)
        ]);
          
        if (assignmentsResponse.error) throw assignmentsResponse.error;
        if (submissionsResponse.error) throw submissionsResponse.error;
        
        // Combine assignments with their submissions
        const assignmentsWithSubmissions = assignmentsResponse.data.map(assignment => {
          const submission = submissionsResponse.data.find(
            sub => sub.assignment_id === assignment.id
          );
          
          return {
            ...assignment,
            student_assignments: submission ? [submission] : [{
              status: 'not_submitted',
              score: null,
              submitted_at: null
            }]
          };
        });

        setAssignments(assignmentsWithSubmissions);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseId]);

  // Use the backend service to calculate course grade
  const fetchCourseGrade = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: gradeData, error } = await calculateCourseGrade(courseId, user.id);
      
      if (error) throw error;
      return gradeData;
    } catch (error) {
      console.error('Error calculating course grade:', error);
      return {
        overallGrade: 0,
        letterGrade: 'N/A',
        gradedAssignments: 0,
        totalAssignments: assignments.length
      };
    }
  };

  useEffect(() => {
    // Load grades when the grades tab is activated
    if (activeTab === 'grades' && !courseGrade) {
      const loadGrades = async () => {
        setGradeLoading(true);
        const gradeData = await fetchCourseGrade();
        setCourseGrade(gradeData);
        setGradeLoading(false);
      };
      loadGrades();
    }
  }, [activeTab, courseGrade]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="course-details-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading course details...</div>
        </div>
      </StudentLayout>
    );
  }
  
  if (!course) return (
    <StudentLayout>
      <div className="course-not-found">Course not found</div>
    </StudentLayout>
  );

  // Filter assignments that have been graded for the chart
  const gradedAssignments = assignments.filter(
    a => a.student_assignments[0]?.status === 'graded'
  );
  
  // Calculate overall grade
  let overallGrade = 0;
  let letterGrade = 'N/A';
  
  if (gradedAssignments.length > 0) {
    const totalScore = gradedAssignments.reduce(
      (sum, assignment) => sum + (assignment.student_assignments[0]?.score || 0), 
      0
    );
    overallGrade = Math.round(totalScore / gradedAssignments.length);
    
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
  
  // Group assignments by status
  const upcomingAssignments = assignments.filter(
    a => a.student_assignments[0]?.status === 'not_submitted' && new Date(a.due_date) > new Date()
  );
  
  const pastDueAssignments = assignments.filter(
    a => a.student_assignments[0]?.status === 'not_submitted' && new Date(a.due_date) <= new Date()
  );
  
  const submittedAssignments = assignments.filter(
    a => a.student_assignments[0]?.status === 'submitted'
  );

  return (
    <StudentLayout>
      <div className="course-details-container">
        <div className="course-details-header">
          <h1>{course.code} - {course.name}</h1>
          <div className="course-grade-badge">{letterGrade}</div>
        </div>
        
        <div className="course-details-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            Assignments ({assignments.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'grades' ? 'active' : ''}`}
            onClick={() => setActiveTab('grades')}
          >
            Grades
          </button>
        </div>
        
        {activeTab === 'overview' && (
          <div className="course-overview">
            <div className="course-info-card">
              <div className="course-info-header">
                <FaBook className="info-icon" />
                <h2>Course Information</h2>
              </div>
              <div className="course-description">
                <p>{course.description || 'No description available.'}</p>
              </div>
              <div className="course-meta">
                {instructor && (
                  <div className="meta-item">
                    <FaUser className="meta-icon" />
                    <div>
                      <span className="meta-label">Instructor</span>
                      <span className="meta-value">{instructor.first_name} {instructor.last_name}</span>
                    </div>
                  </div>
                )}
                <div className="meta-item">
                  <FaCalendarAlt className="meta-icon" />
                  <div>
                    <span className="meta-label">Term</span>
                    <span className="meta-value">{course.term || '24-25-SEM1'}</span>
                  </div>
                </div>
                <div className="meta-item">
                  <FaClock className="meta-icon" />
                  <div>
                    <span className="meta-label">Schedule</span>
                    <span className="meta-value">{course.schedule || 'TBD'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="course-stats-container">
              <div className="course-stats-card">
                <h3>Course Progress</h3>
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: `${Math.round((gradedAssignments.length + submittedAssignments.length) / 
                        (assignments.length || 1) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="progress-stats">
                  <div className="stat">
                    <span className="stat-value">{gradedAssignments.length + submittedAssignments.length}</span>
                    <span className="stat-label">Completed</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{upcomingAssignments.length}</span>
                    <span className="stat-label">Upcoming</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{pastDueAssignments.length}</span>
                    <span className="stat-label">Past Due</span>
                  </div>
                </div>
              </div>
              
              <div className="course-stats-card">
                <h3>Grade Summary</h3>
                <div className="grade-summary">
                  <div className="grade-circle">
                    <span className="grade-percentage">{overallGrade || 'N/A'}</span>
                    <span className="grade-label">Overall</span>
                  </div>
                  <div className="grade-details">
                    <div className="grade-detail">
                      <span className="detail-label">Letter Grade:</span>
                      <span className="detail-value">{letterGrade}</span>
                    </div>
                    <div className="grade-detail">
                      <span className="detail-label">Graded Items:</span>
                      <span className="detail-value">{gradedAssignments.length} of {assignments.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {upcomingAssignments.length > 0 && (
              <div className="upcoming-assignments">
                <h3>Upcoming Assignments</h3>
                <div className="assignment-list">
                  {upcomingAssignments.slice(0, 3).map(assignment => (
                    <div key={assignment.id} className="assignment-item">
                      <div className="assignment-title">{assignment.title}</div>
                      <div className="assignment-due">
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {upcomingAssignments.length > 3 && (
                    <button 
                      className="view-all-button"
                      onClick={() => setActiveTab('assignments')}
                    >
                      View All ({upcomingAssignments.length})
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {gradedAssignments.length > 0 && (
              <div className="performance-chart-container">
                <h3>Performance</h3>
                <div className="chart-wrapper">
                  <PerformanceChart 
                    assignments={gradedAssignments} 
                    title={`Performance in ${course.code}`}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'assignments' && (
          <div className="assignments-tab">
            <div className="assignments-header">
              <h2><FaClipboardList /> Course Assignments</h2>
            </div>
            <AssignmentList assignments={assignments} />
          </div>
        )}
        
        {activeTab === 'grades' && (
          <div className="grades-tab">
            <div className="grades-header">
              <h2>Grade Summary</h2>
              <div className="overall-grade">
                <div 
                  className="grade-progress-circle"
                  style={{ 
                    '--grade-percent': courseGrade?.overallGrade || 0 
                  }}
                >
                  <div className="grade-circle-inner">
                    <span className="grade-percentage">{courseGrade?.overallGrade || 'N/A'}</span>
                    <span className="grade-percent-sign">%</span>
                  </div>
                </div>
                <div className="grade-details">
                  <div className="grade-letter">{courseGrade?.letterGrade || 'N/A'}</div>
                  <div className="grade-stats">
                    <div className="grade-fraction">
                      <span className="grade-earned">{courseGrade?.totalEarned || 0}</span>
                      <span className="grade-separator">/</span>
                      <span className="grade-possible">{courseGrade?.totalPossible || 0}</span>
                      <span className="grade-points">points</span>
                    </div>
                    <div className="grade-completion">
                      <span>{courseGrade?.gradedAssignments || 0} of {courseGrade?.totalAssignments || 0} assignments completed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {gradeLoading ? (
              <div className="grades-loading">
                <div className="loading-spinner"></div>
                <p>Loading grades...</p>
              </div>
            ) : courseGrade?.detailedGrades?.length > 0 ? (
              <div className="grades-detail-section">
                <div className="grades-filters">
                  <h3>Assignment Grades</h3>
                </div>
                <div className="grades-table-wrapper">
                  <table className="grades-table">
                    <thead>
                      <tr>
                        <th className="assignment-column">Assignment</th>
                        <th className="date-column">Due Date</th>
                        <th className="status-column">Status</th>
                        <th className="score-column">Score</th>
                        <th className="percentage-column">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseGrade.detailedGrades.map(assignment => (
                        <tr key={assignment.id} className={`grade-row status-${assignment.status}`}>
                          <td className="assignment-title">{assignment.title}</td>
                          <td>{new Date(assignment.dueDate).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge status-${assignment.status}`}>
                              {assignment.status === 'graded' ? 'Graded' : 
                              assignment.status === 'submitted' ? 'Submitted' : 
                              new Date(assignment.dueDate) < new Date() ? 'Past Due' : 'Pending'}
                            </span>
                          </td>
                          <td className="score-cell">
                            {assignment.status === 'graded' 
                              ? `${assignment.score || 0}/${assignment.maxScore}` 
                              : '-'}
                          </td>
                          <td>
                            {assignment.percentage !== null ? (
                              <div className="percentage-display">
                                <div 
                                  className="percentage-bar" 
                                  style={{ width: `${assignment.percentage}%` }}
                                ></div>
                                <span>{assignment.percentage}%</span>
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="no-grades-message">
                <p>No graded assignments yet for this course.</p>
                <button 
                  className="check-assignments-btn"
                  onClick={() => setActiveTab('assignments')}
                >
                  View Assignments
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default CourseDetails;