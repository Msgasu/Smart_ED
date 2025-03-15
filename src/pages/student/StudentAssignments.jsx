import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // First get the courses the student is enrolled in
        const { data: studentCourses, error: coursesError } = await supabase
          .from('student_courses')
          .select('course_id')
          .eq('student_id', user.id);
          
        if (coursesError) throw coursesError;
        
        if (!studentCourses || studentCourses.length === 0) {
          setAssignments([]);
          return;
        }
        
        // Get course IDs
        const courseIds = studentCourses.map(sc => sc.course_id);
        
        // Fetch all assignments for these courses
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select(`
            *,
            courses (
              code,
              name
            ),
            student_assignments (
              id,
              score,
              status,
              submitted_at
            )
          `)
          .in('course_id', courseIds)
          .order('due_date', { ascending: false });
          
        if (assignmentsError) throw assignmentsError;
        
        // Filter to only include assignments with student_assignments records
        // or create placeholder records for assignments without submissions
        const processedAssignments = assignmentsData.map(assignment => {
          // Find student's submission for this assignment
          const studentSubmission = assignment.student_assignments.find(
            sa => sa.student_id === user.id
          );
          
          // If no submission exists, create a placeholder
          if (!studentSubmission) {
            assignment.student_submission = {
              status: 'not_submitted',
              score: null,
              submitted_at: null
            };
          } else {
            assignment.student_submission = studentSubmission;
          }
          
          return assignment;
        });
        
        setAssignments(processedAssignments);
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