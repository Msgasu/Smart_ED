import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getStudentAssignments } from '../../backend/students/assignments';
import StudentLayout from '../../components/student/StudentLayout';
import './styles/StudentAssignments.css';

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Use the backend service to get student assignments
        const { data, error } = await getStudentAssignments(user.id);
        
        if (error) throw error;
        console.log('Assignments data:', data); // Log the data structure
        setAssignments(data || []);
      } catch (error) {
        console.error('Error fetching assignments:', error);
        setError('Failed to load assignments. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignments();
  }, []);

  // Calculate assignment statistics
  const stats = assignments.reduce((acc, assignment) => {
    acc.total++;
    
    // Check if student_submission is an array or an object
    let status = 'pending';
    
    if (assignment.student_submission) {
      if (Array.isArray(assignment.student_submission)) {
        // If it's an array, find the current student's submission
        const submission = assignment.student_submission.length > 0 ? 
          assignment.student_submission[0] : null;
        
        if (submission) {
          status = submission.status || 'pending';
        }
      } else {
        // If it's an object, use it directly
        status = assignment.student_submission.status || 'pending';
      }
    }
    
    if (status === 'graded') {
      acc.graded++;
    } else if (status === 'submitted') {
      acc.submitted++;
    } else {
      acc.pending++;
    }
    
    return acc;
  }, { total: 0, graded: 0, submitted: 0, pending: 0 });

  // Calculate completion percentage
  const completionPercentage = stats.total > 0 
    ? Math.round(((stats.graded + stats.submitted) / stats.total) * 100) 
    : 0;
    
  console.log('Stats:', stats);
  console.log('Completion percentage:', completionPercentage);

  if (loading) return (
    <StudentLayout>
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading assignments...</div>
      </div>
    </StudentLayout>
  );

  if (error) return (
    <StudentLayout>
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    </StudentLayout>
  );

  return (
    <StudentLayout>
      <div className="assignments-container">
        <h1>My Assignments</h1>
        
        {/* Progress Section */}
        <div className="progress-section">
          <div className="progress-header">
            <h2>Assignment Progress</h2>
            <span className="progress-percentage">{completionPercentage}% Complete</span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <div className="progress-stats">
            <div className="stat-item">
              <span className="stat-value">{stats.graded}</span>
              <span className="stat-label">Graded</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.submitted}</span>
              <span className="stat-label">Submitted</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
        </div>
        
        {assignments.length === 0 ? (
          <div className="no-assignments">
            <p>No assignments found.</p>
          </div>
        ) : (
          <div className="assignments-table-container">
            <table className="assignments-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => {
                  // Determine the submission status
                  let status = 'pending';
                  let score = null;
                  
                  if (assignment.student_submission) {
                    if (Array.isArray(assignment.student_submission)) {
                      const submission = assignment.student_submission.length > 0 ? 
                        assignment.student_submission[0] : null;
                      
                      if (submission) {
                        status = submission.status || 'pending';
                        score = submission.score;
                      }
                    } else {
                      status = assignment.student_submission.status || 'pending';
                      score = assignment.student_submission.score;
                    }
                  }
                  
                  return (
                    <tr key={assignment.id}>
                      <td>{assignment.courses?.code || 'N/A'}</td>
                      <td>{assignment.title}</td>
                      <td>{assignment.type}</td>
                      <td>{new Date(assignment.due_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge status-${status}`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        {status === 'graded' && score !== null ? (
                          <span className="score">
                            {score}/{assignment.max_score}
                          </span>
                        ) : (
                          <span className="not-graded">Not graded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentAssignments; 