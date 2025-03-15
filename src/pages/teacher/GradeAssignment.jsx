import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const GradeAssignment = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState({});

  useEffect(() => {
    const fetchAssignmentDetails = async () => {
      try {
        // Get assignment details
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assignments')
          .select(`
            *,
            courses (
              id,
              code,
              name
            )
          `)
          .eq('id', assignmentId)
          .single();
          
        if (assignmentError) throw assignmentError;
        setAssignment(assignmentData);
        
        // Get students enrolled in this course
        const { data: enrolledStudents, error: enrollmentError } = await supabase
          .from('student_courses')
          .select(`
            student_id,
            profiles:student_id (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('course_id', assignmentData.course_id);
          
        if (enrollmentError) throw enrollmentError;
        
        // Get existing grades for this assignment
        const { data: existingGrades, error: gradesError } = await supabase
          .from('student_assignments')
          .select('*')
          .eq('assignment_id', assignmentId);
          
        if (gradesError) throw gradesError;
        
        // Initialize grades object with existing grades
        const gradesObj = {};
        existingGrades?.forEach(grade => {
          gradesObj[grade.student_id] = {
            score: grade.score,
            status: grade.status,
            id: grade.id
          };
        });
        
        setGrades(gradesObj);
        setStudents(enrolledStudents);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load assignment data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignmentDetails();
  }, [assignmentId]);

  const handleScoreChange = (studentId, score) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: parseInt(score, 10) || 0,
        status: 'graded'
      }
    }));
  };

  const saveGrades = async () => {
    try {
      // Log the data we're about to save for debugging
      console.log("Saving grades:", grades);
      
      // Create an array of grade objects to save
      const gradesToSave = [];
      
      for (const [studentId, data] of Object.entries(grades)) {
        // Create a grade object without the id field (let Supabase generate it)
        const gradeData = {
          student_id: studentId,
          assignment_id: assignmentId,
          score: data.score || 0,
          status: 'graded'
        };
        
        // If this is an update (has an id), include it
        if (data.id) {
          gradeData.id = data.id;
        }
        
        gradesToSave.push(gradeData);
      }
      
      console.log("Formatted grades to save:", gradesToSave);
      
      // Save each grade individually to better handle errors
      for (const grade of gradesToSave) {
        let result;
        
        if (grade.id) {
          // Update existing grade
          result = await supabase
            .from('student_assignments')
            .update({
              score: grade.score,
              status: grade.status
            })
            .eq('id', grade.id);
        } else {
          // Insert new grade
          result = await supabase
            .from('student_assignments')
            .insert([{
              student_id: grade.student_id,
              assignment_id: grade.assignment_id,
              score: grade.score,
              status: grade.status
            }]);
        }
        
        if (result.error) {
          console.error("Error saving grade:", result.error);
          throw result.error;
        }
      }
      
      toast.success('Grades saved successfully');
      navigate(`/teacher/courses/${assignment.course_id}/assignments`);
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades: ' + error.message);
    }
  };

  if (loading) return <div>Loading assignment details...</div>;
  if (!assignment) return <div>Assignment not found</div>;

  return (
    <div>
      <h1>Grade Assignment: {assignment.title}</h1>
      <p>Course: {assignment.courses.code} - {assignment.courses.name}</p>
      <p>Max Score: {assignment.max_score}</p>
      <p>Due Date: {new Date(assignment.due_date).toLocaleString()}</p>
      
      <Link to={`/teacher/courses/${assignment.course_id}/assignments`}>
        Back to Assignments
      </Link>
      
      <div>
        <h2>Student Grades</h2>
        {students.length === 0 ? (
          <p>No students enrolled in this course</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Email</th>
                <th>Score (out of {assignment.max_score})</th>
              </tr>
            </thead>
            <tbody>
              {students.map(enrollment => (
                <tr key={enrollment.student_id}>
                  <td>{enrollment.profiles.first_name} {enrollment.profiles.last_name}</td>
                  <td>{enrollment.profiles.email}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={assignment.max_score}
                      value={grades[enrollment.student_id]?.score || 0}
                      onChange={(e) => handleScoreChange(
                        enrollment.student_id, 
                        e.target.value
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        <button onClick={saveGrades}>Save Grades</button>
      </div>
    </div>
  );
};

export default GradeAssignment; 