// src/pages/teacher/StudentAnalysis.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FaChartBar, FaUserGraduate, FaBook, FaClipboardList, FaArrowLeft, FaInfoCircle, FaCheck, FaTimes, FaFileAlt } from 'react-icons/fa';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import { getStudentAnalytics, getClassPerformanceStats } from '../../backend/teachers/students';
import './styles/StudentsAnalysis.css';
import { toast } from 'react-hot-toast';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const StudentAnalysis = () => {
  const { studentId, courseId } = useParams();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseAnalytics, setCourseAnalytics] = useState({
    assignments: [],
    stats: {
      totalAssignments: 0,
      completedAssignments: 0,
      overallPercentage: 0,
      classScore: 0
    },
    progress: {
      completed: 0,
      upcoming: 0,
      pastDue: 0
    }
  });
  const [loading, setLoading] = useState(true);

  // Fetch student's courses
  useEffect(() => {
    const fetchStudentCourses = async () => {
      try {
        // Get student profile
        const { data: studentData, error: studentError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .single();

        if (studentError) throw studentError;
        setStudent(studentData);

        // Get student's enrolled courses
        const { data: enrolledCourses, error: coursesError } = await supabase
          .from('student_courses')
          .select(`
            course_id,
            courses (
              id,
              name,
              code
            )
          `)
          .eq('student_id', studentId);

        if (coursesError) throw coursesError;

        const coursesData = enrolledCourses.map(ec => ec.courses);
        setCourses(coursesData);
        
        // Set course from URL param if available, otherwise use first course
        if (courseId) {
          setSelectedCourseId(courseId);
        } else if (coursesData.length > 0) {
          setSelectedCourseId(coursesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    if (studentId) {
      fetchStudentCourses();
    }
  }, [studentId, courseId]);

  // Fetch course analytics when selected course changes
  useEffect(() => {
    const fetchCourseAnalytics = async () => {
      if (!selectedCourseId || !studentId) return;

      try {
        setLoading(true);
        
        // Get all assignments for this course
        const { data: assignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .eq('course_id', selectedCourseId)
          .order('due_date', { ascending: true });

        if (assignmentsError) throw assignmentsError;

        // Get student's submissions for these assignments
        const { data: submissions, error: submissionsError } = await supabase
          .from('student_assignments')
          .select('*')
          .eq('student_id', studentId)
          .in('assignment_id', assignments.map(a => a.id));

        if (submissionsError) throw submissionsError;

        // Process assignments and submissions
        const now = new Date();
        const gradedSubmissions = submissions.filter(s => s.status === 'graded' && s.score !== null);
        const submittedAssignments = submissions.filter(s => s.status === 'submitted' || s.status === 'graded');
        
        let totalScore = 0;
        let maxPossibleScore = 0;
        const processedAssignments = [];

        assignments.forEach(assignment => {
          const submission = submissions.find(s => s.assignment_id === assignment.id);
          
          if (submission?.status === 'graded') {
            totalScore += submission.score;
            maxPossibleScore += assignment.max_score;
            
            processedAssignments.push({
              title: assignment.title,
              score: submission.score,
              maxScore: assignment.max_score,
              percentage: ((submission.score / assignment.max_score) * 100).toFixed(2),
              date: assignment.due_date,
              status: submission.status
            });
          }
        });

        // Calculate progress stats
        const upcomingAssignments = assignments.filter(a => 
          !submittedAssignments.find(s => s.assignment_id === a.id) && 
          new Date(a.due_date) > now
        );
        
        const pastDueAssignments = assignments.filter(a => 
          !submittedAssignments.find(s => s.assignment_id === a.id) && 
          new Date(a.due_date) <= now
        );

        // Update state with all analytics
        setCourseAnalytics({
          assignments: processedAssignments,
          stats: {
            totalAssignments: assignments.length,
            completedAssignments: gradedSubmissions.length,
            overallPercentage: maxPossibleScore > 0 ? ((totalScore / maxPossibleScore) * 100).toFixed(2) : 0,
            classScore: maxPossibleScore > 0 ? ((totalScore / maxPossibleScore) * 60).toFixed(2) : 0
          },
          progress: {
            completed: submittedAssignments.length,
            upcoming: upcomingAssignments.length,
            pastDue: pastDueAssignments.length
          }
        });

      } catch (error) {
        console.error('Error fetching course analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAnalytics();
  }, [selectedCourseId, studentId]);

  const getLetterGradeClass = (grade) => {
    if (grade === 'A') return 'grade-a';
    if (grade === 'B') return 'grade-b';
    if (grade === 'C') return 'grade-c';
    if (grade === 'D') return 'grade-d';
    if (grade === 'F') return 'grade-f';
    return 'grade-na';
  };

  const getThresholdProgressClass = (percent) => {
    if (percent >= 150) return 'threshold-excellent';
    if (percent >= 100) return 'threshold-good';
    if (percent >= 75) return 'threshold-fair';
    if (percent >= 50) return 'threshold-warning';
    return 'threshold-danger';
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="loading-spinner">Loading analysis...</div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="student-analysis">
        <div className="analysis-header">
          <Link to="/teacher/students" className="back-button">
            <FaArrowLeft /> Back to Students
            </Link>
          <h2>{student?.first_name} {student?.last_name}'s Performance</h2>
          
          <div className="header-actions">
            <div className="course-selector">
              <select 
                value={selectedCourseId || ''} 
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="">Select Course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>
        
        {selectedCourseId ? (
          <div className="analysis-grid">
            {/* Course Progress Card */}
            <div className="analysis-card">
              <h3>Course Progress</h3>
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{ 
                    width: `${Math.round((courseAnalytics.progress.completed) / 
                      courseAnalytics.stats.totalAssignments * 100)}%` 
                  }}
                ></div>
          </div>
              <div className="progress-stats">
                <div className="stat">
                  <span className="stat-value">{courseAnalytics.progress.completed}</span>
                  <span className="stat-label">Completed</span>
                  </div>
                <div className="stat">
                  <span className="stat-value">{courseAnalytics.progress.upcoming}</span>
                  <span className="stat-label">Upcoming</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{courseAnalytics.progress.pastDue}</span>
                  <span className="stat-label">Past Due</span>
                  </div>
                </div>
              </div>
              
            {/* Performance Card */}
            <div className="analysis-card">
              <h3>Course Performance</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Class Score (60%)</span>
                  <span className="stat-value">{courseAnalytics.stats.classScore}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Overall Grade</span>
                  <span className="stat-value">{courseAnalytics.stats.overallPercentage}%</span>
                </div>
                </div>
              </div>
              
            {/* Performance Trend Chart - Smaller size */}
            <div className="analysis-card chart-card">
              <h3>Performance Trend</h3>
              <div className="chart-container">
                <Line
                  data={{
                    labels: courseAnalytics.assignments.map(a => a.title.substring(0, 15)),
                    datasets: [{
                      label: 'Assignment Scores (%)',
                      data: courseAnalytics.assignments.map(a => a.percentage),
                      borderColor: '#5b9bd5',
                      backgroundColor: 'rgba(91, 155, 213, 0.2)',
                      borderWidth: 2,
                      pointBackgroundColor: '#5b9bd5',
                      pointBorderColor: '#fff',
                      pointBorderWidth: 2,
                      pointRadius: 6,
                      pointHoverRadius: 8,
                      fill: true,
                      tension: 0.3
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'index',
                      intersect: false,
                    },
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        padding: 12,
                        titleColor: '#555',
                        bodyColor: '#555',
                        titleFont: {
                          size: 14,
                          weight: 'bold'
                        },
                        bodyFont: {
                          size: 13
                        },
                        callbacks: {
                          label: function(context) {
                            return `Score: ${context.parsed.y}%`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          stepSize: 10,
                          font: {
                            size: 12,
                            weight: '500'
                          },
                          color: '#777',
                          callback: function(value) {
                            return value + '%';
                          }
                        },
                        grid: {
                          display: true,
                          color: '#e2e8f0',
                          drawBorder: false
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        },
                        ticks: {
                          font: {
                            size: 11,
                            weight: '500'
                          },
                          color: '#777',
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    },
                    layout: {
                      padding: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20
                      }
                    }
                  }}
                />
          </div>
        </div>

            {/* Assignment Details Table */}
            <div className="analysis-card full-width">
              <h3>Assignment Details</h3>
              <div className="assignments-table">
                <table>
                  <thead>
                    <tr>
                      <th>Assignment</th>
                      <th>Score</th>
                      <th>Max Score</th>
                      <th>Percentage</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseAnalytics.assignments.map((assignment, index) => (
                      <tr key={index}>
                        <td>{assignment.title}</td>
                        <td>{assignment.score}</td>
                        <td>{assignment.maxScore}</td>
                        <td>{assignment.percentage}%</td>
                        <td>{new Date(assignment.date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge status-${assignment.status}`}>
                            {assignment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
        ) : (
          <div className="no-course-selected">
            Please select a course to view analysis
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default StudentAnalysis;