import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaPlus, FaTrash, FaEdit, FaCalendarAlt, FaClock, FaBook, FaFileAlt, FaSearch } from 'react-icons/fa';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import { getCourseDetails } from '../../backend/teachers/courses';
import { getAssignments, createAssignment, deleteAssignment } from '../../backend/teachers/assignments';
import './styles/TeacherAssignments.css';

const TeacherAssignments = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    // description: '',
    type: 'Homework',
    max_score: 100,
    due_date: '',
    due_time: ''
  });
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('due_date');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await fetchCourse();
        await fetchAssignments();
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [courseId]);

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
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      // Format due date and time
      const dueDateTime = newAssignment.due_date && newAssignment.due_time
        ? `${newAssignment.due_date}T${newAssignment.due_time}:00`
        : null;
      
      // Use the backend service to create assignment
      const assignmentData = {
        course_id: courseId,
        title: newAssignment.title,
        // description: newAssignment.description,
        type: newAssignment.type,
        max_score: newAssignment.max_score,
        due_date: dueDateTime
      };
      
      const { data, error } = await createAssignment(assignmentData);
      
      if (error) throw error;
      
      // Reset form and refresh assignments
      setNewAssignment({
        title: '',
        description: '',
        type: 'Homework',
        max_score: 100,
        due_date: '',
        due_time: ''
      });
      
      setFormVisible(false);
      await fetchAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        // Use the backend service to delete assignment
        const { error } = await deleteAssignment(assignmentId);
        
        if (error) throw error;
        
        // Refresh assignments
        await fetchAssignments();
      } catch (error) {
        console.error('Error deleting assignment:', error);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAssignment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleForm = () => {
    setFormVisible(!formVisible);
  };
  
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const filteredAssignments = assignments.filter(assignment => 
    assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'type') {
      comparison = a.type.localeCompare(b.type);
    } else if (sortBy === 'due_date') {
      comparison = new Date(a.due_date || '9999-12-31') - new Date(b.due_date || '9999-12-31');
    } else if (sortBy === 'max_score') {
      comparison = a.max_score - b.max_score;
    }
    
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TeacherLayout>
      <div className="assignments-page">
        <div className="page-header">
          <h1 className="page-title">Course Assignments</h1>
          {course && (
            <p className="page-subtitle">{course.code}: {course.name}</p>
          )}
        </div>
        
        {loading ? (
          <div className="loading-spinner">
            <p>Loading assignments...</p>
          </div>
        ) : (
          <>
            <div className="course-info-card">
              <div className="card-header">
                <h2>
                  <FaBook /> Course Information
                </h2>
              </div>
              {course && (
                <div className="card-body">
                  <div className="course-details">
                    <div className="detail-item">
                      <span className="label">Course Code:</span>
                      <span className="value">{course.code}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Course Name:</span>
                      <span className="value">{course.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Description:</span>
                      <span className="value description">{course.description}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="assignments-controls">
              <div className="search-container">
                <FaSearch />
                <input 
                  type="text" 
                  placeholder="Search assignments..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button className="btn btn-primary" onClick={toggleForm}>
                <FaPlus /> Create Assignment
              </button>
            </div>
            
            {formVisible && (
              <div className="assignment-form-card">
                <div className="card-header">
                  <h2>
                    <FaFileAlt /> Create New Assignment
                  </h2>
                </div>
                <div className="card-body">
                  <form onSubmit={handleCreateAssignment}>
                    <div className="form-group">
                      <label htmlFor="title">Assignment Title</label>
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
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        name="description"
                        value={newAssignment.description}
                        onChange={handleInputChange}
                        className="form-control"
                        rows="3"
                      ></textarea>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="type">Assignment Type</label>
                        <select
                          id="type"
                          name="type"
                          value={newAssignment.type}
                          onChange={handleInputChange}
                          className="form-select"
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
                          min="1"
                          required
                          className="form-control"
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="due_date">Due Date</label>
                        <div className="input-with-icon">
                          <FaCalendarAlt />
                          <input
                            type="date"
                            id="due_date"
                            name="due_date"
                            value={newAssignment.due_date}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="due_time">Due Time</label>
                        <div className="input-with-icon">
                          <FaClock />
                          <input
                            type="time"
                            id="due_time"
                            name="due_time"
                            value={newAssignment.due_time}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        <FaPlus /> Create Assignment
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={toggleForm}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            <div className="assignments-list-card">
              <div className="card-header">
                <h2>
                  <FaFileAlt /> Assignments
                </h2>
              </div>
              <div className="card-body">
                {sortedAssignments.length > 0 ? (
                  <table className="assignments-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort('title')} className="sortable">
                          Title {sortBy === 'title' && (sortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => handleSort('type')} className="sortable">
                          Type {sortBy === 'type' && (sortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => handleSort('due_date')} className="sortable">
                          Due Date {sortBy === 'due_date' && (sortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => handleSort('max_score')} className="sortable">
                          Max Score {sortBy === 'max_score' && (sortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAssignments.map(assignment => (
                        <tr key={assignment.id}>
                          <td>{assignment.title}</td>
                          <td>
                            <span className={`badge type-${assignment.type.toLowerCase()}`}>
                              {assignment.type}
                            </span>
                          </td>
                          <td>
                            <div className="due-date">
                              <FaCalendarAlt />
                              <span>{formatDate(assignment.due_date)}</span>
                            </div>
                          </td>
                          <td>{assignment.max_score} pts</td>
                          <td>
                            <div className="action-buttons">
                              <Link 
                                to={`/teacher/assignments/${assignment.id}/edit`} 
                                className="btn-icon"
                                title="Edit Assignment"
                              >
                                <FaEdit />
                              </Link>
                              <button
                                className="btn-icon delete"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                title="Delete Assignment"
                              >
                                <FaTrash />
                              </button>
                              <Link 
                                to={`/teacher/assignments/${assignment.id}/grade`} 
                                className="btn-icon grade"
                                title="Grade Submissions"
                              >
                                <FaFileAlt />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <FaFileAlt className="empty-icon" />
                    <h3>No Assignments Found</h3>
                    <p>Create your first assignment for this course.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherAssignments;
