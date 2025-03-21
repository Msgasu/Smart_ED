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

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const StudentAnalysis = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [courseId, setCourseId] = useState(null);
  const [classStats, setClassStats] = useState(null);
  const [studentGrade, setStudentGrade] = useState({
    totalEarned: 0,
    percentage: 0,
    percentOfThreshold: 0,
    letterGrade: 'N/A',
    isPassing: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // First, get the student details and assignments
        const { data: studentData, error: studentError } = await getStudentAnalytics(studentId);
        
        if (studentError) throw studentError;
        
        if (studentData && studentData.assignments && studentData.assignments.length > 0) {
          // We have assignments, so we can determine the course
          const firstAssignment = studentData.assignments[0];
          const courseId = firstAssignment.assignments.course_id;
          setCourseId(courseId);
          
          // Now get the class performance stats for this course
          const { data: classData, error: classError } = await getClassPerformanceStats(courseId);
          
          if (classError) throw classError;
          
          setClassStats(classData);
          
          // Find this student in the class stats to get their grade info
          const studentStats = classData.students.find(s => s.id === studentId);
          
          if (studentStats) {
            setStudentGrade({
              totalEarned: studentStats.totalEarnedScore,
              percentage: studentStats.gradePercentage,
              percentOfThreshold: studentStats.percentOfThreshold,
              letterGrade: studentStats.letterGrade,
              isPassing: studentStats.isPassing
            });
          }
        }
        
        setStudent(studentData);
        setAssignments(studentData?.assignments || []);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchData();
    }
  }, [studentId]);

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
        <div className="analysis-container">
          <div className="loading-spinner">
            <p>Loading student data...</p>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  if (!student) {
    return (
      <TeacherLayout>
        <div className="analysis-container">
          <h1 className="analysis-title">Student not found</h1>
          <Link to="/teacher/dashboard" className="back-button">
            <FaArrowLeft /> Back to Dashboard
          </Link>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="analysis-container">
        <div className="analysis-header">
          <h1 className="analysis-title">
            Analysis for {student.first_name} {student.last_name}
          </h1>
          <div className="analysis-actions">
            <Link to={`/teacher/report/${studentId}`} className="generate-report-button">
              <FaFileAlt /> Generate Student Report
            </Link>
            <Link to="/teacher/dashboard" className="back-button">
              <FaArrowLeft /> Back to Dashboard
            </Link>
          </div>
        </div>
        
        <div className="student-info-card">
          <div className="student-info-header">
            <h2><FaUserGraduate /> Student Information</h2>
          </div>
          <div className="student-info-body">
            <p>
              <span className="info-label">Name:</span>
              <span>{student.first_name} {student.last_name}</span>
            </p>
            <p>
              <span className="info-label">Student ID:</span>
              <span>{student.student_id || 'N/A'}</span>
            </p>
            <p>
              <span className="info-label">Email:</span>
              <span>{student.email}</span>
            </p>
            
            <div className="grade-section">
              <h3>Grade Performance</h3>
              
              <div className="grade-metrics">
                <div className="grade-metric">
                  <div className={`letter-grade ${getLetterGradeClass(studentGrade.letterGrade)}`}>
                    {studentGrade.letterGrade}
                  </div>
                  <div className="grade-metric-label">Letter Grade</div>
                </div>
                
                <div className="grade-metric">
                  <div className="grade-metric-value">{studentGrade.percentage}%</div>
                  <div className="grade-metric-label">Overall Percentage</div>
                </div>
                
                <div className="grade-metric">
                  <div className={`grade-metric-value threshold-value ${getThresholdProgressClass(studentGrade.percentOfThreshold)}`}>
                    {studentGrade.percentOfThreshold}%
                  </div>
                  <div className="grade-metric-label">Of Total Grade Scale</div>
                </div>
              </div>
              
              <div className="threshold-progress-container">
                <div className="threshold-progress-label">
                  <span>Progress on the 60% scale:</span>
                  <span className="threshold-value-text">{studentGrade.totalEarned} of {classStats?.totalPossibleScore} possible points</span>
                </div>
                <div className="threshold-progress-bar-container">
                  <div 
                    className={`threshold-progress-bar ${getThresholdProgressClass(studentGrade.percentOfThreshold)}`}
                    style={{ width: `${Math.min(studentGrade.percentOfThreshold, 100)}%` }}
                  ></div>
                </div>
                <div className="threshold-status">
                  {studentGrade.isPassing ? (
                    <span className="passing-indicator passing"><FaCheck /> Above 60% threshold</span>
                  ) : (
                    <span className="passing-indicator failing"><FaTimes /> Below 60% threshold</span>
                  )}
                </div>
              </div>
              
              {classStats && (
                <div className="threshold-info">
                  <FaInfoCircle />
                  <div>
                    <strong>Class Information:</strong> Total possible points: {classStats.totalPossibleScore}. 
                    Student has earned {studentGrade.totalEarned} points ({studentGrade.percentage}%). 
                    Their score on the 60% scale is {studentGrade.percentOfThreshold}%.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="assignments-section">
          <div className="assignments-card">
            <div className="assignments-header">
              <h2><FaClipboardList /> Assignments</h2>
            </div>
            <div className="assignments-body">
              {assignments.length === 0 ? (
                <p>No assignments yet</p>
              ) : (
                <table className="assignments-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(assignment => (
                      <tr key={assignment.id}>
                        <td>{assignment.assignments.title}</td>
                        <td>{assignment.assignments.type}</td>
                        <td>{new Date(assignment.assignments.due_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge status-${assignment.status.toLowerCase()}`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td>
                          {assignment.status === 'graded' 
                            ? `${assignment.score} / ${assignment.assignments.max_score}`
                            : 'Pending'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
};

export default StudentAnalysis;