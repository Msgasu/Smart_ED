import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaPlus, FaTrash, FaEdit, FaCalendarAlt, FaClock, FaBook, 
  FaFileAlt, FaSearch, FaCloudUploadAlt, FaFileDownload, 
  FaCheck, FaListUl, FaTimes, FaCheckCircle, FaChevronUp, FaChevronDown
} from 'react-icons/fa';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import { 
  getCourseDetails, 
  uploadCourseSyllabus, 
  getCourseSyllabus, 
  createCourseTodo, 
  getCourseTodos, 
  updateCourseTodo, 
  deleteCourseTodo 
} from '../../backend/teachers/courses';
import { getAssignments, createAssignment, deleteAssignment } from '../../backend/teachers/assignments';
import { uploadFile, downloadFile } from '../../backend/storage';
import { toast } from 'react-hot-toast';
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
  
  // New state variables for syllabus
  const [syllabus, setSyllabus] = useState(null);
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const [syllabusFormVisible, setSyllabusFormVisible] = useState(false);
  const fileInputRef = useRef(null);
  
  // New state variables for weekly to-dos
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    week_number: 1,
    start_date: '',
    end_date: '',
    priority: 'medium'
  });
  const [todoFormVisible, setTodoFormVisible] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // New state variables for collapsible widgets
  const [expandedWidgets, setExpandedWidgets] = useState(() => {
    // Load saved widget states from localStorage
    const savedState = localStorage.getItem('teacher_dashboard_widget_state');
    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch (err) {
        console.error('Error parsing saved widget state:', err);
      }
    }
    
    // Default state if nothing is saved
    return {
      syllabus: true,
      todos: true
    };
  });
  
  // Toggle widget expanded/collapsed state
  const toggleWidget = (widgetName) => {
    setExpandedWidgets(prevState => {
      const newState = {
        ...prevState,
        [widgetName]: !prevState[widgetName]
      };
      
      // Save to localStorage
      localStorage.setItem('teacher_dashboard_widget_state', JSON.stringify(newState));
      
      return newState;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await fetchCourse();
        await fetchAssignments();
        await fetchSyllabus();
        await fetchTodos();
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

  const fetchSyllabus = async () => {
    try {
      // Use the backend service to get syllabus
      const { data, error } = await getCourseSyllabus(courseId);
      
      if (error) throw error;
      setSyllabus(data);
    } catch (error) {
      console.error('Error fetching syllabus:', error);
    }
  };

  const fetchTodos = async () => {
    try {
      // Use the backend service to get todos
      const { data, error } = await getCourseTodos(courseId);
      
      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
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
  
  // Syllabus handling functions
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSyllabusFile(file);
    }
  };
  
  const toggleSyllabusForm = () => {
    setSyllabusFormVisible(!syllabusFormVisible);
    if (!syllabusFormVisible) {
      setSyllabusFile(null);
    }
  };
  
  const handleSyllabusUpload = async (e) => {
    e.preventDefault();
    
    if (!syllabusFile) {
      toast.error("Please select a file to upload");
      return;
    }
    
    try {
      setUploadingSyllabus(true);
      
      // Upload file to storage
      const { data: fileData, error: fileError } = await uploadFile(
        syllabusFile, 
        'syllabi',
        `courses/${courseId}`
      );
      
      if (fileError) throw fileError;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Save syllabus record to database
      const syllabusData = {
        course_id: courseId,
        faculty_id: user.id,
        title: document.getElementById('syllabus-title').value,
        description: document.getElementById('syllabus-description').value,
        term: document.getElementById('syllabus-term').value,
        academic_year: document.getElementById('syllabus-academic-year').value,
        ...fileData
      };
      
      const { data, error } = await uploadCourseSyllabus(syllabusData);
      
      if (error) throw error;
      
      setSyllabus(data);
      setSyllabusFormVisible(false);
      setSyllabusFile(null);
      toast.success("Syllabus uploaded successfully");
    } catch (error) {
      console.error('Error uploading syllabus:', error);
      toast.error("Failed to upload syllabus");
    } finally {
      setUploadingSyllabus(false);
    }
  };
  
  const handleDownloadSyllabus = async () => {
    if (!syllabus) return;
    
    try {
      // Use the download link directly if available
      if (syllabus.url) {
        window.open(syllabus.url, '_blank');
        return;
      }
      
      // Otherwise create a signed URL
      const { data, error } = await downloadFile(syllabus.path, 'syllabi');
      
      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading syllabus:', error);
      toast.error("Failed to download syllabus");
    }
  };
  
  // Weekly to-do functions
  const toggleTodoForm = (todoId = null) => {
    if (todoId) {
      // Editing existing to-do
      const todoToEdit = todos.find(todo => todo.id === todoId);
      if (todoToEdit) {
        setNewTodo({ ...todoToEdit });
        setEditingTodoId(todoId);
      }
    } else {
      // Creating new to-do
      setNewTodo({
        title: '',
        description: '',
        week_number: todos.length > 0 ? Math.max(...todos.map(t => t.week_number)) + 1 : 1,
        start_date: '',
        end_date: '',
        priority: 'medium'
      });
      setEditingTodoId(null);
    }
    
    setTodoFormVisible(!todoFormVisible);
  };
  
  const handleTodoInputChange = (e) => {
    const { name, value } = e.target;
    setNewTodo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCreateOrUpdateTodo = async (e) => {
    e.preventDefault();
    
    try {
      setLoadingTodos(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const todoData = {
        ...newTodo,
        course_id: courseId,
        faculty_id: user.id
      };
      
      let data, error;
      
      if (editingTodoId) {
        // Update existing to-do
        ({ data, error } = await updateCourseTodo(editingTodoId, todoData));
      } else {
        // Create new to-do
        ({ data, error } = await createCourseTodo(todoData));
      }
      
      if (error) throw error;
      
      // Reset form and refresh to-dos
      setNewTodo({
        title: '',
        description: '',
        week_number: todos.length > 0 ? Math.max(...todos.map(t => t.week_number)) + 1 : 1,
        start_date: '',
        end_date: '',
        priority: 'medium'
      });
      
      setTodoFormVisible(false);
      setEditingTodoId(null);
      await fetchTodos();
      toast.success(editingTodoId ? "To-do updated successfully" : "To-do created successfully");
    } catch (error) {
      console.error('Error with course to-do:', error);
      toast.error("Failed to save to-do item");
    } finally {
      setLoadingTodos(false);
    }
  };
  
  const handleDeleteTodo = async (todoId) => {
    if (window.confirm('Are you sure you want to delete this to-do item?')) {
      try {
        const { error } = await deleteCourseTodo(todoId);
        
        if (error) throw error;
        
        // Refresh to-dos
        await fetchTodos();
        toast.success("To-do deleted successfully");
      } catch (error) {
        console.error('Error deleting to-do:', error);
        toast.error("Failed to delete to-do item");
      }
    }
  };
  
  const handleTodoStatusChange = async (todoId, newStatus) => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === todoId);
      if (!todoToUpdate) return;
      
      const { error } = await updateCourseTodo(todoId, { status: newStatus });
      
      if (error) throw error;
      
      // Refresh to-dos
      await fetchTodos();
      toast.success("To-do status updated");
    } catch (error) {
      console.error('Error updating to-do status:', error);
      toast.error("Failed to update to-do status");
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

  // Calculate pagination
  const totalPages = Math.ceil(sortedAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssignments = sortedAssignments.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Memoized search handler to prevent re-renders
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
    );

    // First page + ellipsis
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          className={`pagination-btn ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );
      
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="pagination-ellipsis">...</span>);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    // Last page + ellipsis
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="pagination-ellipsis">...</span>);
      }
      
      pages.push(
        <button
          key={totalPages}
          className={`pagination-btn ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    );

    return (
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {startIndex + 1}-{Math.min(endIndex, sortedAssignments.length)} of {sortedAssignments.length} assignments
        </div>
        <div className="pagination-buttons">
          {pages}
        </div>
      </div>
    );
  };

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
                  placeholder="Search by title or type..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              
              <button className="btn btn-primary" onClick={toggleForm}>
                <FaPlus /> Create Assignment
              </button>
            </div>
            
            {/* Syllabus Widget */}
            {expandedWidgets.syllabus ? (
              <div className="syllabus-widget">
                <div className="card-header">
                  <h2>
                    <FaFileAlt /> Course Syllabus
                  </h2>
                  <div className="widget-actions">
                    <button 
                      className="toggle-widget-btn"
                      onClick={() => toggleWidget('syllabus')}
                      aria-label="Collapse"
                    >
                      <FaChevronUp />
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {syllabus ? (
                    <div className="syllabus-content">
                      <div className="syllabus-details">
                        <h3>{syllabus.title}</h3>
                        <p>{syllabus.description}</p>
                        <div className="syllabus-meta">
                          <span>Term: {syllabus.term}</span>
                          <span>Academic Year: {syllabus.academic_year}</span>
                          <span>Uploaded: {new Date(syllabus.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="syllabus-actions">
                        <button 
                          className="btn btn-secondary" 
                          onClick={handleDownloadSyllabus}
                        >
                          <FaFileDownload /> Download Syllabus
                        </button>
                        <button 
                          className="btn btn-primary" 
                          onClick={toggleSyllabusForm}
                        >
                          <FaCloudUploadAlt /> Update Syllabus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <FaFileAlt className="empty-icon" />
                      <h3>No Syllabus Uploaded</h3>
                      <p>Upload a syllabus for this course.</p>
                      <button className="btn btn-primary" onClick={toggleSyllabusForm}>
                        <FaCloudUploadAlt /> Upload Syllabus
                      </button>
                    </div>
                  )}
                </div>
                
                {syllabusFormVisible && (
                  <div className="syllabus-form">
                    <h3>{syllabus ? 'Update Syllabus' : 'Upload Syllabus'}</h3>
                    <form onSubmit={handleSyllabusUpload}>
                      <div className="form-group">
                        <label htmlFor="syllabus-title">Title</label>
                        <input 
                          type="text" 
                          id="syllabus-title" 
                          className="form-control" 
                          placeholder="Course Syllabus Title"
                          defaultValue={syllabus?.title || `${course?.name || 'Course'} Syllabus`}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="syllabus-description">Description</label>
                        <textarea 
                          id="syllabus-description" 
                          className="form-control" 
                          placeholder="Brief description of the syllabus content"
                          defaultValue={syllabus?.description || ''}
                          rows="3"
                        ></textarea>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="syllabus-term">Term</label>
                          <select 
                            id="syllabus-term" 
                            className="form-select"
                            defaultValue={syllabus?.term || 'Fall'}
                          >
                            <option value="Fall">Fall</option>
                            <option value="Spring">Spring</option>
                            <option value="Summer">Summer</option>
                            <option value="Winter">Winter</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="syllabus-academic-year">Academic Year</label>
                          <input 
                            type="text" 
                            id="syllabus-academic-year" 
                            className="form-control" 
                            placeholder="e.g. 2023-2024"
                            defaultValue={syllabus?.academic_year || new Date().getFullYear()}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="syllabus-file">Syllabus File (PDF)</label>
                        <input
                          type="file"
                          id="syllabus-file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                          className="form-control-file"
                          required={!syllabus}
                        />
                        <span className="field-hint">Upload a PDF or Word document</span>
                      </div>
                      <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={toggleSyllabusForm}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={uploadingSyllabus}>
                          {uploadingSyllabus ? 'Uploading...' : (syllabus ? 'Update' : 'Upload')}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className="collapsed-widget-btn"
                onClick={() => toggleWidget('syllabus')}
                aria-label="Expand Syllabus"
              >
                <FaFileAlt /> <span>Course Syllabus</span> <FaChevronDown />
              </button>
            )}
            
            {/* Weekly To-Dos Widget */}
            {expandedWidgets.todos ? (
              <div className="todos-widget">
                <div className="card-header">
                  <h2>
                    <FaListUl /> Weekly To-Dos
                  </h2>
                  <div className="widget-actions">
                    <button 
                      className="toggle-widget-btn"
                      onClick={() => toggleWidget('todos')}
                      aria-label="Collapse"
                    >
                      <FaChevronUp />
                    </button>
                    <button className="btn btn-primary" onClick={() => toggleTodoForm()}>
                      <FaPlus /> Add To-Do
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {todos.length > 0 ? (
                    <div className="todos-list">
                      {todos.map(todo => (
                        <div key={todo.id} className={`todo-item priority-${todo.priority} ${todo.status === 'completed' ? 'completed' : ''}`}>
                          <div className="todo-header">
                            <div className="todo-title-status">
                              <span className="todo-week">Week {todo.week_number}</span>
                              <h3>{todo.title}</h3>
                              <div className="todo-status">
                                <button 
                                  className={`status-btn ${todo.status === 'pending' ? 'active' : ''}`}
                                  onClick={() => handleTodoStatusChange(todo.id, 'pending')}
                                >
                                  Pending
                                </button>
                                <button 
                                  className={`status-btn ${todo.status === 'in_progress' ? 'active' : ''}`}
                                  onClick={() => handleTodoStatusChange(todo.id, 'in_progress')}
                                >
                                  In Progress
                                </button>
                                <button 
                                  className={`status-btn ${todo.status === 'completed' ? 'active' : ''}`}
                                  onClick={() => handleTodoStatusChange(todo.id, 'completed')}
                                >
                                  <FaCheckCircle /> Completed
                                </button>
                              </div>
                            </div>
                            <div className="todo-actions">
                              <button 
                                className="btn-icon edit"
                                onClick={() => toggleTodoForm(todo.id)}
                                title="Edit To-Do"
                              >
                                <FaEdit />
                              </button>
                              <button 
                                className="btn-icon delete"
                                onClick={() => handleDeleteTodo(todo.id)}
                                title="Delete To-Do"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                          
                          <div className="todo-description">
                            {todo.description}
                          </div>
                          
                          <div className="todo-footer">
                            <div className="todo-dates">
                              <span>From: {todo.start_date && new Date(todo.start_date).toLocaleDateString()}</span>
                              <span>To: {todo.end_date && new Date(todo.end_date).toLocaleDateString()}</span>
                            </div>
                            <div className="todo-priority">
                              Priority: <span className="priority-label">{todo.priority}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <FaListUl className="empty-icon" />
                      <h3>No To-Dos Created</h3>
                      <p>Create weekly to-dos to help manage your course schedule.</p>
                      <button className="btn btn-primary" onClick={() => toggleTodoForm()}>
                        <FaPlus /> Create First To-Do
                      </button>
                    </div>
                  )}
                </div>
                
                {todoFormVisible && (
                  <div className="todo-form">
                    <h3>{editingTodoId ? 'Edit To-Do' : 'Create New To-Do'}</h3>
                    <form onSubmit={handleCreateOrUpdateTodo}>
                      <div className="form-group">
                        <label htmlFor="title">Title</label>
                        <input 
                          type="text" 
                          id="title" 
                          name="title"
                          className="form-control" 
                          placeholder="To-Do Title"
                          value={newTodo.title}
                          onChange={handleTodoInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea 
                          id="description" 
                          name="description"
                          className="form-control" 
                          placeholder="Details about what needs to be done"
                          value={newTodo.description}
                          onChange={handleTodoInputChange}
                          rows="3"
                        ></textarea>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="week_number">Week Number</label>
                          <input 
                            type="number" 
                            id="week_number" 
                            name="week_number"
                            className="form-control" 
                            value={newTodo.week_number}
                            onChange={handleTodoInputChange}
                            min="1"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="priority">Priority</label>
                          <select 
                            id="priority" 
                            name="priority"
                            className="form-select"
                            value={newTodo.priority}
                            onChange={handleTodoInputChange}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="start_date">Start Date</label>
                          <input 
                            type="date" 
                            id="start_date" 
                            name="start_date"
                            className="form-control" 
                            value={newTodo.start_date}
                            onChange={handleTodoInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="end_date">End Date</label>
                          <input 
                            type="date" 
                            id="end_date" 
                            name="end_date"
                            className="form-control" 
                            value={newTodo.end_date}
                            onChange={handleTodoInputChange}
                          />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => toggleTodoForm()}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loadingTodos}>
                          {loadingTodos ? 'Saving...' : (editingTodoId ? 'Update To-Do' : 'Create To-Do')}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className="collapsed-widget-btn"
                onClick={() => toggleWidget('todos')}
                aria-label="Expand Weekly To-Dos"
              >
                <FaListUl /> <span>Weekly To-Dos</span> <FaChevronDown />
              </button>
            )}
            
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
                        placeholder="Enter a descriptive title for the assignment"
                      />
                      <span className="field-hint">A clear title helps students understand the assignment quickly.</span>
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
                        placeholder="Provide detailed instructions and requirements for this assignment"
                      ></textarea>
                      <span className="field-hint">Be specific about your expectations, deliverables, and any resources students should use.</span>
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
                        
                        <div className="badge-options">
                          <div 
                            className={`badge-option ${newAssignment.type === 'Homework' ? 'active' : ''}`}
                            onClick={() => handleInputChange({target: {name: 'type', value: 'Homework'}})}
                          >
                            Homework
                          </div>
                          <div 
                            className={`badge-option ${newAssignment.type === 'Quiz' ? 'active' : ''}`}
                            onClick={() => handleInputChange({target: {name: 'type', value: 'Quiz'}})}
                          >
                            Quiz
                          </div>
                          <div 
                            className={`badge-option ${newAssignment.type === 'Exam' ? 'active' : ''}`}
                            onClick={() => handleInputChange({target: {name: 'type', value: 'Exam'}})}
                          >
                            Exam
                          </div>
                          <div 
                            className={`badge-option ${newAssignment.type === 'Project' ? 'active' : ''}`}
                            onClick={() => handleInputChange({target: {name: 'type', value: 'Project'}})}
                          >
                            Project
                          </div>
                        </div>
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
                          placeholder="Points available"
                        />
                        <div 
                          className="score-range"
                          style={{"--score-percentage": Math.min(newAssignment.max_score, 100)}}
                        >
                          <div className="score-indicator"></div>
                        </div>
                        <span className="field-hint">Typically between 10-100 points. Choose a value that reflects the assignment's complexity.</span>
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="due_date">Due Date</label>
                        <div className="input-with-icon">
                          <input
                            type="date"
                            id="due_date"
                            name="due_date"
                            value={newAssignment.due_date}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                          <FaCalendarAlt />
                        </div>
                        <span className="field-hint">Select a date that gives students sufficient time to complete the work.</span>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="due_time">Due Time</label>
                        <div className="input-with-icon">
                          <input
                            type="time"
                            id="due_time"
                            name="due_time"
                            value={newAssignment.due_time}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                          <FaClock />
                        </div>
                        <span className="field-hint">Recommended to set end-of-day (23:59) for less confusion.</span>
                      </div>
                    </div>
                    
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={toggleForm}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        <FaPlus /> Create Assignment
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
                  <>
                    <div className="assignments-summary">
                      <p>Total: {sortedAssignments.length} assignments</p>
                    </div>
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
                        {currentAssignments.map(assignment => (
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
                  {renderPagination()}
                  </>
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
