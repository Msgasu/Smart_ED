import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getStudentAssignments } from '../../backend/students/assignments';

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Use the backend service to get student assignments
        const { data, error } = await getStudentAssignments(user.id);
        
        if (error) throw error;
        setAssignments(data || []);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignments();
  }, []);

  if (loading) return <div>Loading assignments...</div>;

  return (
    <div>
      <h1>My Assignments</h1>
      <Link to="/student/dashboard">Back to Dashboard</Link>
      
      {assignments.length === 0 ? (
        <p>No assignments found. Make sure you're enrolled in courses.</p>
      ) : (
        <table>
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
            {assignments.map(assignment => (
              <tr key={assignment.id}>
                <td>{assignment.courses.code}</td>
                <td>{assignment.title}</td>
                <td>{assignment.type}</td>
                <td>{new Date(assignment.due_date).toLocaleString()}</td>
                <td>{assignment.student_submission.status}</td>
                <td>
                  {assignment.student_submission.status === 'graded' 
                    ? `${assignment.student_submission.score} / ${assignment.max_score}`
                    : 'Pending'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentAssignments; 