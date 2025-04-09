import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { FaCheck, FaClock, FaFileUpload, FaCalendarAlt, FaTrophy, FaBook, FaExclamationTriangle } from 'react-icons/fa';
import './styles/AssignmentList.css';

const AssignmentList = ({ assignments, onSubmissionUpdate, studentId }) => {
  const [userId, setUserId] = useState(studentId || null);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (studentId) {
      setUserId(studentId);
    } else {
      const getUserId = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserId(user.id);
          }
        } catch (error) {
          console.error('Error getting user ID:', error);
        }
      };
      getUserId();
    }
  }, [studentId]);

  useEffect(() => {
    // Sort assignments by due date (most recent first) and apply filters
    const sortedAssignments = [...assignments].sort((a, b) => 
      new Date(a.due_date) - new Date(b.due_date)
    );
    
    if (filter === 'all') {
      setFilteredAssignments(sortedAssignments);
    } else {
      setFilteredAssignments(sortedAssignments.filter(assignment => 
        assignment.student_submission?.status === filter ||
        (filter === 'not_submitted' && !assignment.student_submission?.status)
      ));
    }
  }, [assignments, filter]);

  const handleSubmit = async (assignmentId) => {
    try {
      if (!userId) {
        throw new Error('Student ID is not available');
      }

      const { data, error } = await supabase
        .from('student_assignments')
        .upsert({
          assignment_id: assignmentId,
          student_id: userId,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Assignment submitted successfully!');
      if (onSubmissionUpdate) onSubmissionUpdate();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast.error('Failed to submit assignment: ' + error.message);
    }
  };

  // Calculate progress for the progress bar
  const calculateProgress = () => {
    if (!assignments || assignments.length === 0) return 0;
    
    const submittedCount = assignments.filter(assignment => 
      assignment.student_submission?.status === 'submitted' || 
      assignment.student_submission?.status === 'graded'
    ).length;
    
    return Math.round((submittedCount / assignments.length) * 100);
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const getStatusColor = (status, dueDate) => {
    if (status === 'graded') return '#4CAF50';
    if (status === 'submitted') return '#2196F3';
    if (isOverdue(dueDate)) return '#F44336';
    return '#FF9800';
  };

  const getStatusIcon = (status, dueDate) => {
    if (status === 'graded') return <FaCheck />;
    if (status === 'submitted') return <FaCheck />;
    if (isOverdue(dueDate)) return <FaExclamationTriangle />;
    return <FaClock />;
  };

  const getStatusText = (status, dueDate) => {
    if (status === 'graded') return 'Graded';
    if (status === 'submitted') return 'Submitted';
    if (isOverdue(dueDate)) return 'Overdue';
    return 'Pending';
  };

  const progress = calculateProgress();

  return (
    <div className="assignments-container">
      <div className="assignments-header">
        <h2>My Assignments</h2>
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'not_submitted' ? 'active' : ''} 
            onClick={() => setFilter('not_submitted')}
          >
            Pending
          </button>
          <button 
            className={filter === 'submitted' ? 'active' : ''} 
            onClick={() => setFilter('submitted')}
          >
            Submitted
          </button>
          <button 
            className={filter === 'graded' ? 'active' : ''} 
            onClick={() => setFilter('graded')}
          >
            Graded
          </button>
        </div>
      </div>

      <div className="progress-container">
        <div className="progress-info">
          <div>
            <h3>Assignment Progress</h3>
            <p>{assignments.filter(a => a.student_submission?.status === 'submitted' || a.student_submission?.status === 'graded').length} of {assignments.length} completed</p>
          </div>
          <div className="progress-percentage">{progress}%</div>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="no-assignments">
          <p>No {filter !== 'all' ? filter.replace('_', ' ') : ''} assignments found</p>
        </div>
      ) : (
        <div className="assignment-grid">
          {filteredAssignments.map((assignment) => {
            const status = assignment.student_submission?.status || 'not_submitted';
            const dueDate = assignment.due_date;
            const statusColor = getStatusColor(status, dueDate);
            
            return (
              <div 
                key={assignment.id} 
                className="assignment-card"
              >
                <div className="card-status-indicator" style={{ backgroundColor: statusColor }}></div>
                <div className="card-content">
                  <div className="card-header">
                    <h3>{assignment.title}</h3>
                    <div className="status-badge" style={{ backgroundColor: statusColor }}>
                      {getStatusIcon(status, dueDate)}
                      <span>{getStatusText(status, dueDate)}</span>
                    </div>
                  </div>
                  
                  <div className="card-details">
                    <div className="detail-item">
                      <FaBook />
                      <span>{assignment.courses?.name || 'Biology'}</span>
                    </div>
                    <div className="detail-item">
                      <FaCalendarAlt />
                      <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <FaTrophy />
                      <span>Max Score: {assignment.max_score || 100}</span>
                    </div>
                    {assignment.student_submission?.score && (
                      <div className="detail-item score">
                        <FaTrophy />
                        <span>Your Score: {assignment.student_submission.score}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="card-actions">
                    {status !== 'submitted' && status !== 'graded' && (
                      <button 
                        className="submit-button"
                        onClick={() => handleSubmit(assignment.id)}
                      >
                        <FaFileUpload /> Submit Now
                      </button>
                    )}
                    
                    {status === 'submitted' && (
                      <div className="submission-info">
                        <span>Submitted on {new Date(assignment.student_submission.submitted_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {status === 'graded' && (
                      <div className="grade-info">
                        <span>Grade: {assignment.student_submission.score}/{assignment.max_score}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
