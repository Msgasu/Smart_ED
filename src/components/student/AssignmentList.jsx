import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { FaCheck, FaClock, FaFileUpload } from 'react-icons/fa';

const AssignmentList = ({ assignments, onSubmissionUpdate }) => {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
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
  }, []);

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
      
      const updatedAssignments = assignments.map(assignment => {
        if (assignment.id === assignmentId) {
          return {
            ...assignment,
            student_submission: {
              ...assignment.student_submission,
              status: 'submitted',
              submitted_at: new Date().toISOString()
            }
          };
        }
        return assignment;
      });
      
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

  const progress = calculateProgress();

  return (
    <div className="assignments-container">
      <div className="progress-bar-container">
        <div className="progress-label">
          <span>Assignment Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="assignments-list">
        {assignments?.length > 0 ? (
          assignments.map((assignment) => (
            <div key={assignment.id} className="assignment-card">
              <div className="assignment-header">
                <h3>{assignment.title}</h3>
                <div className={`status-badge status-${assignment.student_submission?.status || 'not_submitted'}`}>
                  {assignment.student_submission?.status === 'submitted' && <FaCheck />}
                  {assignment.student_submission?.status === 'graded' && <FaCheck />}
                  {assignment.student_submission?.status === 'not_submitted' && <FaClock />}
                  {assignment.student_submission?.status === 'pending' && <FaClock />}
                  
                  <span>
                    {assignment.student_submission?.status === 'submitted' ? 'Submitted' : 
                     assignment.student_submission?.status === 'graded' ? 'Graded' : 
                     assignment.student_submission?.status === 'pending' ? 'Pending' : 'Not Submitted'}
                  </span>
                </div>
              </div>
              
              <div className="assignment-details">
                <p><strong>Course:</strong> {assignment.courses?.name}</p>
                <p><strong>Due Date:</strong> {new Date(assignment.due_date).toLocaleDateString()}</p>
                <p><strong>Max Score:</strong> {assignment.max_score}</p>
                {assignment.student_submission?.score && (
                  <p><strong>Your Score:</strong> {assignment.student_submission.score}</p>
                )}
              </div>
              
              <div className="assignment-actions">
                {assignment.student_submission?.status !== 'submitted' && 
                 assignment.student_submission?.status !== 'graded' && (
                  <button 
                    className="submit-btn"
                    onClick={() => handleSubmit(assignment.id)}
                  >
                    <FaFileUpload /> Submit Assignment
                  </button>
                )}
                
                {assignment.student_submission?.status === 'submitted' && (
                  <p className="submitted-text">
                    Submitted on {new Date(assignment.student_submission.submitted_at).toLocaleString()}
                  </p>
                )}
                
                {assignment.student_submission?.status === 'graded' && (
                  <p className="graded-text">
                    Graded: {assignment.student_submission.score}/{assignment.max_score}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="no-assignments">No assignments found</p>
        )}
      </div>
    </div>
  );
};

export default AssignmentList;
