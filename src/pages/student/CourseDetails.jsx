import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AssignmentList from '../../components/student/AssignmentList';
import PerformanceChart from '../../components/shared/PerformanceChart';

const CourseDetails = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
          
        if (courseError) throw courseError;

        // Fetch all assignments for this course
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assignments')
          .select('*')
          .eq('course_id', courseId);
          
        if (assignmentError) throw assignmentError;
        
        // For each assignment, check if the student has a submission
        const assignmentsWithSubmissions = [];
        
        for (const assignment of assignmentData || []) {
          // Check for student submission
          const { data: submissionData, error: submissionError } = await supabase
            .from('student_assignments')
            .select('*')
            .eq('assignment_id', assignment.id)
            .eq('student_id', user.id);
            
          if (submissionError) throw submissionError;
          
          // If no submission exists, create a default one
          if (!submissionData || submissionData.length === 0) {
            assignment.student_assignments = [{
              status: 'not_submitted',
              score: null,
              submitted_at: null
            }];
          } else {
            assignment.student_assignments = submissionData;
          }
          
          assignmentsWithSubmissions.push(assignment);
        }

        setCourse(courseData);
        setAssignments(assignmentsWithSubmissions);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseId]);

  if (loading) return <div>Loading...</div>;
  if (!course) return <div>Course not found</div>;

  // Filter assignments that have been graded for the chart
  const gradedAssignments = assignments.filter(
    a => a.student_assignments[0]?.status === 'graded'
  );

  return (
    <div>
      <h1>{course.code} - {course.name}</h1>
      <Link to="/student/courses">Back to Courses</Link>
      
      <div>
        <h2>Course Description</h2>
        <p>{course.description}</p>
      </div>
      
      {gradedAssignments.length > 0 && (
        <div>
          <h2>Performance</h2>
          <PerformanceChart 
            assignments={gradedAssignments} 
            title={`Performance in ${course.code}`}
          />
        </div>
      )}
      
      <AssignmentList assignments={assignments} />
    </div>
  );
};

export default CourseDetails;