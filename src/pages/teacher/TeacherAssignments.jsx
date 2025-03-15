import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const TeacherAssignments = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    type: 'Homework',
    max_score: 100,
    due_date: ''
  });
  const [loading, setLoading] = useState(true);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
        
      if (error) throw error;
      setCourse(data);
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId);
        
      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    try {
      // Format the date properly for database storage
      const formattedDueDate = new Date(newAssignment.due_date).toISOString();
      
      const assignmentData = {
        ...newAssignment,
        course_id: courseId,
        due_date: formattedDueDate,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('assignments')
        .insert([assignmentData]);
        
      if (error) throw error;
      
      // Reset form
      setNewAssignment({
        title: '',
        type: 'Homework',
        max_score: 100,
        due_date: ''
      });
      
      // Refresh assignments
      fetchAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  const deleteAssignment = async (assignmentId) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);
        
      if (error) throw error;
      
      // Refresh assignments
      fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAssignment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    fetchCourse();
    fetchAssignments();
  }, [courseId]);

  if (loading) return <div>Loading...</div>;
  if (!course) return <div>Course not found</div>;

  return (
    <div>
      <h1>Assignments for {course.code} - {course.name}</h1>
      <Link to="/teacher/courses">Back to Courses</Link>
      
      <div>
        <h2>Create New Assignment</h2>
        <form onSubmit={createAssignment}>
          <div>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={newAssignment.title}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="type">Type</label>
            <select
              id="type"
              name="type"
              value={newAssignment.type}
              onChange={handleInputChange}
              required
            >
              <option value="Homework">Homework</option>
              <option value="Quiz">Quiz</option>
              <option value="Test">Test</option>
              <option value="Project">Project</option>
              <option value="Exam">Exam</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="max_score">Max Score</label>
            <input
              type="number"
              id="max_score"
              name="max_score"
              value={newAssignment.max_score}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="due_date">Due Date</label>
            <input
              type="datetime-local"
              id="due_date"
              name="due_date"
              value={newAssignment.due_date}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <button type="submit">Create Assignment</button>
        </form>
      </div>
      
      <div>
        <h2>Existing Assignments</h2>
        {assignments.length === 0 ? (
          <p>No assignments yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Max Score</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(assignment => (
                <tr key={assignment.id}>
                  <td>{assignment.title}</td>
                  <td>{assignment.type}</td>
                  <td>{assignment.max_score}</td>
                  <td>{new Date(assignment.due_date).toLocaleString()}</td>
                  <td>
                    <button 
                      onClick={() => deleteAssignment(assignment.id)}
                    >
                      Delete
                    </button>
                    <Link 
                      to={`/teacher/assignments/${assignment.id}/grade`}
                    >
                      Grade
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeacherAssignments;
