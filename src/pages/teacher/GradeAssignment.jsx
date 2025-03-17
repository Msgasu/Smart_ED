import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import TeacherLayout from '../../components/teacher/TeacherLayout';
import { getAssignmentDetails } from '../../backend/teachers/assignments';
import { getSubmissionsByAssignment, bulkGradeSubmissions } from '../../backend/teachers/grading';
import { FaSave, FaArrowLeft, FaFilter, FaSearch } from 'react-icons/fa';

const GradeAssignment = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState({});
  const [filter, setFilter] = useState('all'); // 'all', 'graded', 'ungraded'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAssignmentDetails = async () => {
      try {
        // Use the backend service to get assignment details
        const { data: assignmentData, error: assignmentError } = await getAssignmentDetails(assignmentId);
        if (assignmentError) throw assignmentError;
        setAssignment(assignmentData);
        
        // Use the backend service to get submissions by assignment
        const { data: submissionsData, error: submissionsError } = await getSubmissionsByAssignment(assignmentId);
        if (submissionsError) throw submissionsError;
        
        // Initialize grades object with existing grades
        const gradesObj = {};
        submissionsData.students.forEach(student => {
          gradesObj[student.id] = {
            score: student.submission.score,
            feedback: student.submission.feedback,
            status: student.submission.status,
            id: student.submission.id
          };
        });
        
        setGrades(gradesObj);
        setStudents(submissionsData.students);
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

  const handleFeedbackChange = (studentId, feedback) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        feedback,
        status: 'graded'
      }
    }));
  };

  const saveGrades = async () => {
    try {
      // Prepare grades for bulk update
      const gradesToSave = [];
      
      for (const [studentId, data] of Object.entries(grades)) {
        // Only save if there's a score
        if (data.score !== null && data.score !== undefined) {
          gradesToSave.push({
            studentId,
            assignmentId,
            gradeData: {
              score: data.score,
              feedback: data.feedback || ''
            }
          });
        }
      }
      
      // Use the backend service to bulk grade submissions
      const { data, error } = await bulkGradeSubmissions(gradesToSave);
      
      if (error) throw error;
      
      toast.success(`Successfully graded ${data.totalSuccess} submissions`);
      
      // Refresh data
      const { data: refreshData, error: refreshError } = await getSubmissionsByAssignment(assignmentId);
      if (refreshError) throw refreshError;
      
      // Update students with fresh data
      setStudents(refreshData.students);
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
    }
  };

  // Filter students based on filter and search term
  const filteredStudents = students.filter(student => {
    // Apply status filter
    if (filter === 'graded' && student.submission.status !== 'graded') return false;
    if (filter === 'ungraded' && student.submission.status === 'graded') return false;
    
    // Apply search filter
    if (searchTerm) {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    }
    
    return true;
  });

  if (loading) {
    return (
      <TeacherLayout>
        <div className="loading-spinner">Loading assignment details...</div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="grading-page">
        <div className="page-header">
          <h1 className="page-title">
            {assignment ? `Grade: ${assignment.title}` : 'Grade Assignment'}
          </h1>
          <button 
            className="btn-primary save-grades-btn"
            onClick={saveGrades}
          >
            <FaSave /> Save All Grades
          </button>
        </div>
        
        <div className="back-link">
          <Link to={`/teacher/assignments/${assignment?.course_id}`}>
            <FaArrowLeft /> Back to Assignments
          </Link>
        </div>
        
        <div className="assignment-details-card">
          <h2>Assignment Details</h2>
          {assignment && (
            <>
              <p><strong>Course:</strong> {assignment.courses.code} - {assignment.courses.name}</p>
              <p><strong>Title:</strong> {assignment.title}</p>
              <p><strong>Type:</strong> {assignment.type}</p>
              <p><strong>Due Date:</strong> {new Date(assignment.due_date).toLocaleString()}</p>
              <p><strong>Max Score:</strong> {assignment.max_score}</p>
            </>
          )}
        </div>
        
        <div className="grading-filters">
          <div className="filter-group">
            <label><FaFilter /> Filter:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Students</option>
              <option value="graded">Graded</option>
              <option value="ungraded">Ungraded</option>
            </select>
          </div>
          
          <div className="search-group">
            <FaSearch />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="submission-stats">
          <div className="stat-item">
            <span className="stat-label">Total Students:</span>
            <span className="stat-value">{students.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Graded:</span>
            <span className="stat-value">
              {students.filter(s => s.submission.status === 'graded').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Ungraded:</span>
            <span className="stat-value">
              {students.filter(s => s.submission.status !== 'graded').length}
            </span>
          </div>
        </div>
        
        <div className="grading-table-container">
          <table className="grading-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Score</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="4" className="no-results">No students match the current filters</td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.first_name} {student.last_name}</td>
                    <td>
                      <span className={`status-badge status-${student.submission.status}`}>
                        {student.submission.status === 'graded' ? 'Graded' : 
                         student.submission.status === 'submitted' ? 'Submitted' : 'Not Submitted'}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={assignment?.max_score || 100}
                        value={grades[student.id]?.score || ''}
                        onChange={(e) => handleScoreChange(student.id, e.target.value)}
                        className="score-input"
                      />
                      <span className="max-score">/ {assignment?.max_score || 100}</span>
                    </td>
                    <td>
                      <textarea
                        value={grades[student.id]?.feedback || ''}
                        onChange={(e) => handleFeedbackChange(student.id, e.target.value)}
                        placeholder="Add feedback..."
                        className="feedback-input"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="save-button-container">
          <button 
            className="btn-primary save-grades-btn"
            onClick={saveGrades}
          >
            <FaSave /> Save All Grades
          </button>
        </div>
      </div>
    </TeacherLayout>
  );
};

export default GradeAssignment; 