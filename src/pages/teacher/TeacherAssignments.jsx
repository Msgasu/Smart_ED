import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TeacherLayout from '../../components/teacher/TeacherLayout';
import { getCourseDetails } from '../../backend/teachers/courses';
import { getAssignments, createAssignment, deleteAssignment } from '../../backend/teachers/assignments';
import { FaPlus, FaTrash, FaEdit, FaGraduationCap } from 'react-icons/fa';

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
      // Use the backend service to get course details
      const { data, error } = await getCourseDetails(courseId);
      
      if (error) throw error;
      setCourse(data);
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      // Use the backend service to get assignments
      const { data, error } = await getAssignments(courseId);
      
      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      // Use the backend service to create assignment
      const assignmentData = {
        ...newAssignment,
        course_id: courseId
      };
      
      const { data, error } = await createAssignment(assignmentData);
      
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

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      // Use the backend service to delete assignment
      const { data, error } = await deleteAssignment(assignmentId);
      
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
    if (courseId) {
      fetchCourse();
      fetchAssignments();
    }
  }, [courseId]);

  return (
    <TeacherLayout>
      <h1 className="page-title">
        {course ? `Assignments for ${course.code} - ${course.name}` : 'Course Assignments'}
      </h1>
      
      {loading ? (
        <div className="loading-spinner">Loading assignments...</div>
      ) : (
        <div className="assignments-container">
          <div className="course-info-card">
            <h2>Course Information</h2>
            {course && (
              <>
                <p><strong>Code:</strong> {course.code}</p>
                <p><strong>Name:</strong> {course.name}</p>
                <p><strong>Description:</strong> {course.description}</p>
              </>
            )}
          </div>
          
          <div className="create-assignment-card">
            <h2><FaPlus /> Create New Assignment</h2>
            <form onSubmit={handleCreateAssignment}>
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newAssignment.title}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="type">Type</label>
                <select
                  id="type"
                  name="type"
                  value={newAssignment.type}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="Homework">Homework</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Exam">Exam</option>
                  <option value="Project">Project</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="max_score">Maximum Score</label>
                <input
                  type="number"
                  id="max_score"
                  name="max_score"
                  value={newAssignment.max_score}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="due_date">Due Date</label>
                <input
                  type="datetime-local"
                  id="due_date"
                  name="due_date"
                  value={newAssignment.due_date}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                />
              </div>
              
              <button type="submit" className="btn-primary">
                Create Assignment
              </button>
            </form>
          </div>
          
          <div className="assignments-list-card">
            <h2>Assignments</h2>
            {assignments.length === 0 ? (
              <p>No assignments created yet.</p>
            ) : (
              <table className="assignments-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Due Date</th>
                    <th>Max Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(assignment => (
                    <tr key={assignment.id}>
                      <td>{assignment.title}</td>
                      <td>{assignment.type}</td>
                      <td>{new Date(assignment.due_date).toLocaleString()}</td>
                      <td>{assignment.max_score}</td>
                      <td className="actions-cell">
                        <Link to={`/teacher/grade/${assignment.id}`} className="btn-small">
                          <FaGraduationCap /> Grade
                        </Link>
                        <Link to={`/teacher/edit-assignment/${assignment.id}`} className="btn-small">
                          <FaEdit /> Edit
                        </Link>
                        <button 
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          className="btn-small btn-danger"
                        >
                          <FaTrash /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </TeacherLayout>
  );
};

export default TeacherAssignments;
