import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import { getAssignmentDetails } from '../../backend/teachers/assignments';
import { getSubmissionsByAssignment, bulkGradeSubmissions, getStudentSubmissionFiles } from '../../backend/teachers/grading';
import { FaSave, FaArrowLeft, FaFilter, FaSearch, FaCheck, FaTimes, FaClock, FaFile, FaFileAlt, FaFilePdf, FaFileImage, FaFileWord, FaFileExcel, FaDownload, FaTimes as FaClose } from 'react-icons/fa';
import './styles/GradeAssignment.css';

const GradeAssignment = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState({});
  const [feedback, setFeedback] = useState({});
  const [filter, setFilter] = useState('all'); // 'all', 'graded', 'ungraded'
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState({ saving: false, saved: false });
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

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
        const feedbackObj = {};
        
        submissionsData.students.forEach(student => {
          gradesObj[student.id] = {
            score: student.submission.score,
            status: student.submission.status,
            id: student.submission.id
          };
          
          feedbackObj[student.id] = student.submission.feedback || '';
        });
        
        setGrades(gradesObj);
        setFeedback(feedbackObj);
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
    
    // Clear saved status when changes are made
    setSaveStatus({ saving: false, saved: false });
  };

  const handleFeedbackChange = (studentId, value) => {
    setFeedback(prev => ({
      ...prev,
      [studentId]: value
    }));
    
    // Clear saved status when changes are made
    setSaveStatus({ saving: false, saved: false });
  };

  const saveGrades = async () => {
    try {
      setSaveStatus({ saving: true, saved: false });
      
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
              feedback: feedback[studentId] || ''
            }
          });
        }
      }
      
      // Use the backend service to bulk grade submissions
      const { data, error } = await bulkGradeSubmissions(gradesToSave);
      
      if (error) throw error;
      
      toast.success(`Successfully graded ${data.totalSuccess} submissions`);
      setSaveStatus({ saving: false, saved: true });
      
      // Hide the saved indicator after a delay
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, saved: false }));
      }, 3000);
      
      // Refresh data
      const { data: refreshData, error: refreshError } = await getSubmissionsByAssignment(assignmentId);
      if (refreshError) throw refreshError;
      
      // Update students with fresh data
      setStudents(refreshData.students);
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
      setSaveStatus({ saving: false, saved: false });
    }
  };

  // View student submission files
  const viewStudentFiles = async (student) => {
    try {
      setLoadingFiles(true);
      setSelectedStudent(student);
      setShowFilesModal(true);
      
      const { data, error } = await getStudentSubmissionFiles(assignmentId, student.id);
      if (error) throw error;
      
      setSubmissionFiles(data || []);
    } catch (error) {
      console.error('Error fetching student files:', error);
      toast.error('Failed to load submission files');
    } finally {
      setLoadingFiles(false);
    }
  };

  // Close the files modal
  const closeFilesModal = () => {
    setShowFilesModal(false);
    setSelectedStudent(null);
    setSubmissionFiles([]);
  };

  // Helper function to get the appropriate file icon based on file type
  const getFileIcon = (fileType) => {
    if (!fileType) return <FaFileAlt />;
    if (fileType.includes('pdf')) return <FaFilePdf />;
    if (fileType.includes('image')) return <FaFileImage />;
    if (fileType.includes('word') || fileType.includes('document')) return <FaFileWord />;
    if (fileType.includes('sheet') || fileType.includes('excel')) return <FaFileExcel />;
    return <FaFileAlt />;
  };

  // Helper function to format file size
  const formatFileSize = (size) => {
    if (!size) return 'Unknown size';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Calculate class statistics
  const calculateStats = () => {
    const stats = {
      total: students.length,
      graded: students.filter(s => s.submission.status === 'graded').length,
      submitted: students.filter(s => s.submission.status === 'submitted' && s.submission.status !== 'graded').length,
      notSubmitted: students.filter(s => s.submission.status === 'not_submitted').length,
      average: 0,
      highest: 0,
      lowest: 100
    };
    
    // Calculate scores for graded submissions
    const scores = students
      .filter(s => s.submission.status === 'graded' && s.submission.score !== null)
      .map(s => s.submission.score);
    
    if (scores.length > 0) {
      stats.average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      stats.highest = Math.max(...scores);
      stats.lowest = Math.min(...scores);
    } else {
      stats.lowest = 0;
    }
    
    return stats;
  };

  // Filter students based on filter and search term
  const filteredStudents = students.filter(student => {
    // Apply status filter
    if (filter === 'graded' && student.submission.status !== 'graded') return false;
    if (filter === 'ungraded' && student.submission.status === 'graded') return false;
    if (filter === 'submitted' && !(student.submission.status === 'submitted' && student.submission.status !== 'graded')) return false;
    if (filter === 'not_submitted' && student.submission.status !== 'not_submitted') return false;
    
    // Apply search filter
    if (searchTerm) {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    }
    
    return true;
  });

  const stats = calculateStats();

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
          <div className="title-section">
          <h1 className="page-title">
            {assignment ? `Grade: ${assignment.title}` : 'Grade Assignment'}
          </h1>
            <div className="back-link">
              <Link to={`/teacher/assignments/${assignment?.course_id}`}>
                <FaArrowLeft /> Back to Assignments
              </Link>
            </div>
          </div>
          <button 
            className={`save-grades-btn ${saveStatus.saving ? 'saving' : ''} ${saveStatus.saved ? 'saved' : ''}`}
            onClick={saveGrades}
            disabled={saveStatus.saving}
          >
            {saveStatus.saving ? (
              <>Saving Grades...</>
            ) : saveStatus.saved ? (
              <><FaCheck /> Grades Saved</>
            ) : (
              <><FaSave /> Save All Grades</>
            )}
          </button>
        </div>
        
        <div className="assignment-details-card">
          <h2>Assignment Details</h2>
          {assignment && (
            <div className="assignment-details-grid">
              <div className="detail-item">
                <span className="label">Course:</span>
                <span className="value">{assignment.courses.code} - {assignment.courses.name}</span>
              </div>
              <div className="detail-item">
                <span className="label">Title:</span>
                <span className="value">{assignment.title}</span>
              </div>
              <div className="detail-item">
                <span className="label">Type:</span>
                <span className="value">
                  <span className={`type-badge type-${assignment.type.toLowerCase()}`}>
                    {assignment.type}
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Due Date:</span>
                <span className="value due-date">
                  <FaClock /> {new Date(assignment.due_date).toLocaleString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Max Score:</span>
                <span className="value max-points">{assignment.max_score} points</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="grading-stats-card">
          <h2>Class Statistics</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.submitted}</div>
              <div className="stat-label">Submitted</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.graded}</div>
              <div className="stat-label">Graded</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.notSubmitted}</div>
              <div className="stat-label">Not Submitted</div>
            </div>
            {stats.graded > 0 && (
              <>
                <div className="stat-item">
                  <div className="stat-value">{stats.average}</div>
                  <div className="stat-label">Average Score</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{stats.highest}</div>
                  <div className="stat-label">Highest Score</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{stats.lowest}</div>
                  <div className="stat-label">Lowest Score</div>
                </div>
              </>
            )}
          </div>
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
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
              <option value="ungraded">Ungraded</option>
              <option value="not_submitted">Not Submitted</option>
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
        
        <div className="grading-table-container">
          <table className="grading-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Files</th>
                <th>Score</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-results">No students match the current filters</td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className={`${student.submission.status}`}>
                    <td className="student-name">
                      <div className="student-info">
                        <span className="student-full-name">{student.first_name} {student.last_name}</span>
                        <span className="student-email">{student.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${student.submission.status}`}>
                        {student.submission.status === 'graded' ? 'Graded' : 
                         student.submission.status === 'submitted' ? 'Submitted' : 'Not Submitted'}
                      </span>
                    </td>
                    <td>
                      {student.submission.status !== 'not_submitted' && (
                        <button 
                          className="view-files-btn"
                          onClick={() => viewStudentFiles(student)}
                        >
                          <FaFile /> View Files
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="score-field">
                      <input
                        type="number"
                        min="0"
                        max={assignment?.max_score || 100}
                        value={grades[student.id]?.score || ''}
                        onChange={(e) => handleScoreChange(student.id, e.target.value)}
                        className="score-input"
                          placeholder="Score"
                          disabled={student.submission.status === 'not_submitted'}
                      />
                      <span className="max-score">/ {assignment?.max_score || 100}</span>
                      </div>
                    </td>
                    <td>
                      <textarea
                        value={feedback[student.id] || ''}
                        onChange={(e) => handleFeedbackChange(student.id, e.target.value)}
                        className="feedback-input"
                        placeholder="Enter feedback"
                        rows="2"
                        disabled={student.submission.status === 'not_submitted'}
                      ></textarea>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="save-button-container">
          <button 
            className={`save-grades-btn ${saveStatus.saving ? 'saving' : ''} ${saveStatus.saved ? 'saved' : ''}`}
            onClick={saveGrades}
            disabled={saveStatus.saving}
          >
            {saveStatus.saving ? (
              <>Saving Grades...</>
            ) : saveStatus.saved ? (
              <><FaCheck /> Grades Saved</>
            ) : (
              <><FaSave /> Save All Grades</>
            )}
          </button>
        </div>
        
        {/* Submission Files Modal */}
        {showFilesModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>
                  {selectedStudent?.first_name} {selectedStudent?.last_name}'s Submission
                </h2>
                <button className="close-modal-btn" onClick={closeFilesModal}>
                  <FaClose />
                </button>
              </div>
              
              <div className="modal-body">
                {loadingFiles ? (
                  <div className="loading-files">Loading submission files...</div>
                ) : submissionFiles.length === 0 ? (
                  <div className="no-files">
                    <p>No files have been uploaded for this submission.</p>
                    {selectedStudent?.submission?.description && (
                      <div className="submission-notes">
                        <h3>Submission Notes:</h3>
                        <p>{selectedStudent.submission.description}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="files-container">
                    {selectedStudent?.submission?.description && (
                      <div className="submission-notes">
                        <h3>Submission Notes:</h3>
                        <p>{selectedStudent.submission.description}</p>
                      </div>
                    )}
                    <h3>Submitted Files:</h3>
                    <div className="files-list">
                      {submissionFiles.map(file => (
                        <div key={file.id} className="submission-file-item">
                          <div className="file-icon">
                            {getFileIcon(file.file_type)}
                          </div>
                          <div className="file-details">
                            <div className="file-name">{file.filename}</div>
                            <div className="file-meta">
                              {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleString()}
                            </div>
                          </div>
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="download-file-btn"
                          >
                            <FaDownload /> Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button className="close-btn" onClick={closeFilesModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default GradeAssignment; 