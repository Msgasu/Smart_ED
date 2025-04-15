import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getAssignmentDetails } from '../../backend/students/assignments';
import StudentLayout from '../../components/student/StudentLayout';
import AssignmentSubmission from '../../components/student/AssignmentSubmission';
import { FaArrowLeft, FaCalendarAlt, FaBookOpen, FaClipboardList, FaTrophy } from 'react-icons/fa';
import './styles/StudentAssignmentDetail.css';

const StudentAssignmentDetail = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchAssignmentDetails = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Store the user ID
        setUserId(user.id);
        
        // Fetch assignment details
        const { data, error } = await getAssignmentDetails(assignmentId, user.id);
        
        if (error) throw error;
        
        setAssignment(data);
      } catch (error) {
        console.error('Error fetching assignment details:', error);
        setError('Failed to load assignment details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignmentDetails();
  }, [assignmentId]);

  // Format the due date
  const formatDueDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get remaining time or overdue status
  const getRemainingTime = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    
    if (diff < 0) {
      return { isOverdue: true, text: 'Overdue' };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return { isOverdue: false, text: `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''} remaining` };
    } else {
      return { isOverdue: false, text: `${hours} hour${hours !== 1 ? 's' : ''} remaining` };
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div>Loading assignment details...</div>
        </div>
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button onClick={() => navigate('/student/assignments')}>
            Back to Assignments
          </button>
        </div>
      </StudentLayout>
    );
  }

  if (!assignment) {
    return (
      <StudentLayout>
        <div className="not-found-container">
          <div className="not-found-message">Assignment not found</div>
          <button onClick={() => navigate('/student/assignments')}>
            Back to Assignments
          </button>
        </div>
      </StudentLayout>
    );
  }

  const timeInfo = getRemainingTime(assignment.due_date);

  return (
    <StudentLayout>
      <div className="assignment-detail-container">
        <div className="back-link">
          <Link to="/student/assignments">
            <FaArrowLeft /> Back to Assignments
          </Link>
        </div>
        
        <div className="assignment-detail-header">
          <h1>{assignment.title}</h1>
          
          <div className="assignment-meta">
            <div className="assignment-course">
              <FaBookOpen />
              <span>{assignment.courses.code}: {assignment.courses.name}</span>
            </div>
            
            <div className="assignment-type">
              <FaClipboardList />
              <span>Type: {assignment.type}</span>
            </div>
          </div>
          
          <div className="assignment-meta">
            <div className={`assignment-due-date ${timeInfo.isOverdue ? 'overdue' : ''}`}>
              <FaCalendarAlt />
              <span>Due: {formatDueDate(assignment.due_date)}</span>
              <span className="time-remaining">{timeInfo.text}</span>
            </div>
            
            <div className="assignment-score">
              <FaTrophy />
              <span>Max Score: {assignment.max_score}</span>
            </div>
          </div>
        </div>
        
        <div className="assignment-detail-content">
          <div className="assignment-description-card">
            <h2>Assignment Description</h2>
            <div className="assignment-description">
              {assignment.description || 'No description provided for this assignment.'}
            </div>
          </div>
          
          <div className="assignment-submission-card">
            <h2>Submission</h2>
            <AssignmentSubmission 
              assignmentId={assignmentId} 
              studentId={userId} 
            />
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentAssignmentDetail; 