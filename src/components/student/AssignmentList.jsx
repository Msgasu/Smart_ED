import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { FaCheck, FaClock, FaFileUpload, FaCalendarAlt, FaTrophy, FaBook, FaExclamationTriangle, FaEye } from 'react-icons/fa';
import { submitAssignment } from '../../backend/students/assignments';
import { useNavigate, useLocation } from 'react-router-dom';
import './styles/AssignmentList.css';

const AssignmentList = ({ assignments, onSubmissionUpdate, studentId }) => {
  const [userId, setUserId] = useState(studentId || null);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [assignmentStatuses, setAssignmentStatuses] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for filter parameter in URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const filterParam = queryParams.get('filter');
    
    if (filterParam && ['all', 'pending', 'overdue', 'submitted', 'graded'].includes(filterParam)) {
      setFilter(filterParam);
    }
  }, [location.search]);

  useEffect(() => {
    if (studentId) {
      setUserId(studentId);
    } else {
      const getUserId = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserId(user.id);
          }
        } catch (error) {
          console.error('Error getting user ID:', error);
        }
      };
      getUserId();
    }
  }, [studentId]);

  // Update URL when filter changes
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    
    // Update URL without page reload
    const queryParams = new URLSearchParams(location.search);
    if (newFilter === 'all') {
      queryParams.delete('filter');
    } else {
      queryParams.set('filter', newFilter);
    }
    
    navigate({
      pathname: location.pathname,
      search: queryParams.toString()
    }, { replace: true });
  };

  // Fetch all assignment statuses when userId or assignments change
  useEffect(() => {
    const fetchAssignmentStatuses = async () => {
      if (!userId || !assignments || assignments.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const assignmentIds = assignments.map(a => a.id);
        
        const { data, error } = await supabase
          .from('student_assignments')
          .select('assignment_id, status, score, submitted_at')
          .eq('student_id', userId)
          .in('assignment_id', assignmentIds);
        
        if (error) throw error;
        
        // Create a map of assignment statuses
        const statusMap = {};
        data.forEach(item => {
          statusMap[item.assignment_id] = {
            status: item.status,
            score: item.score,
            submitted_at: item.submitted_at
          };
        });
        
        setAssignmentStatuses(statusMap);
      } catch (error) {
        console.error('Error fetching assignment statuses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignmentStatuses();
  }, [userId, assignments]);
  
  // Apply filters when assignments or filter change
  useEffect(() => {
    if (!assignments) return;
    
    // Sort assignments by due date (most recent first) and apply filters
    const sortedAssignments = [...assignments].sort((a, b) => 
      new Date(a.due_date) - new Date(b.due_date)
    );
    
    if (filter === 'all') {
      setFilteredAssignments(sortedAssignments);
    } else if (filter === 'overdue') {
      setFilteredAssignments(sortedAssignments.filter(assignment => {
        const status = assignmentStatuses[assignment.id]?.status || 'pending';
        return status === 'pending' && isOverdue(assignment.due_date);
      }));
    } else {
      setFilteredAssignments(sortedAssignments.filter(assignment => {
        const status = assignmentStatuses[assignment.id]?.status || 'pending';
        return status === filter;
      }));
    }
  }, [assignments, assignmentStatuses, filter]);

  const handleSubmit = async (assignmentId) => {
    try {
      if (!userId) {
        throw new Error('Student ID is not available');
      }

      // Navigate to detailed view for file upload
      navigate(`/student/assignments/${assignmentId}`);
    } catch (error) {
      console.error('Error navigating to assignment submission:', error);
      toast.error('Failed to navigate to assignment submission: ' + error.message);
    }
  };

  // Calculate progress for the progress bar
  const calculateProgress = () => {
    if (!assignments || assignments.length === 0) return 0;
    
    const submittedCount = assignments.filter(assignment => {
      const status = assignmentStatuses[assignment.id]?.status;
      return status === 'submitted' || status === 'graded';
    }).length;
    
    return Math.round((submittedCount / assignments.length) * 100);
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  // Check if a submission was late
  const isLateSubmission = (dueDate, submissionDate) => {
    if (!dueDate || !submissionDate) return false;
    return new Date(submissionDate) > new Date(dueDate);
  };

  const getStatusColor = (status, dueDate, submittedAt) => {
    if (status === 'graded') return '#4CAF50'; // Green for graded
    if (status === 'submitted') {
      // Check if submission was late
      if (isLateSubmission(dueDate, submittedAt)) {
        return '#FF9800'; // Orange for late submission
      }
      return '#2196F3'; // Blue for on-time submission
    }
    if (status === 'pending' && isOverdue(dueDate)) return '#F44336'; // Red for overdue
    return '#FF9800'; // Orange for pending
  };

  const getStatusIcon = (status, dueDate, submittedAt) => {
    if (status === 'graded') return <FaCheck />;
    if (status === 'submitted') return <FaCheck />;
    if (status === 'pending' && isOverdue(dueDate)) return <FaExclamationTriangle />;
    return <FaClock />;
  };

  const getStatusText = (status, dueDate, submittedAt) => {
    if (status === 'graded') return 'Graded';
    if (status === 'submitted') {
      if (isLateSubmission(dueDate, submittedAt)) {
        return 'Submitted Late';
      }
      return 'Submitted';
    }
    if (status === 'pending' && isOverdue(dueDate)) return 'Overdue';
    return 'Pending';
  };

  const progress = calculateProgress();

  return (
    <div className="assignments-container">
      <div className="assignments-header">
        <h2>My Assignments</h2>
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button 
            className={filter === 'pending' ? 'active' : ''} 
            onClick={() => handleFilterChange('pending')}
          >
            Pending
          </button>
          <button 
            className={filter === 'overdue' ? 'active' : ''} 
            onClick={() => handleFilterChange('overdue')}
          >
            Overdue
          </button>
          <button 
            className={filter === 'submitted' ? 'active' : ''} 
            onClick={() => handleFilterChange('submitted')}
          >
            Submitted
          </button>
          <button 
            className={filter === 'graded' ? 'active' : ''} 
            onClick={() => handleFilterChange('graded')}
          >
            Graded
          </button>
        </div>
      </div>

      <div className="progress-container">
        <div className="progress-info">
          <div>
            <h3>Assignment Progress</h3>
            <p>{assignments.filter(a => {
              const status = assignmentStatuses[a.id]?.status;
              return status === 'submitted' || status === 'graded';
            }).length} of {assignments.length} completed</p>
          </div>
          <div className="progress-percentage">{progress}%</div>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {loading ? (
        <div className="loading-assignments">
          <p>Loading assignments...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="no-assignments">
          <p>No {filter !== 'all' ? filter : ''} assignments found</p>
        </div>
      ) : (
        <div className="assignment-grid">
          {filteredAssignments.map((assignment) => {
            const assignmentStatus = assignmentStatuses[assignment.id];
            const status = assignmentStatus?.status || 'pending';
            const dueDate = assignment.due_date;
            const statusColor = getStatusColor(status, dueDate, assignmentStatus?.submitted_at);
            
            return (
              <div 
                key={assignment.id} 
                className="assignment-card"
              >
                <div className="card-status-indicator" style={{ backgroundColor: statusColor }}></div>
                <div className="card-content">
                  <div className="card-header">
                    <h3>{assignment.title}</h3>
                    <div className="status-badge" style={{ backgroundColor: statusColor }}>
                      {getStatusIcon(status, dueDate, assignmentStatus?.submitted_at)}
                      <span>{getStatusText(status, dueDate, assignmentStatus?.submitted_at)}</span>
                    </div>
                  </div>
                  
                  <div className="card-details">
                    <div className="detail-item">
                      <FaBook />
                      <span>{assignment.courses?.name || 'Biology'}</span>
                    </div>
                    <div className="detail-item">
                      <FaCalendarAlt />
                      <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <FaTrophy />
                      <span>Max Score: {assignment.max_score || 100}</span>
                    </div>
                    {assignmentStatus?.score && (
                      <div className="detail-item score">
                        <FaTrophy />
                        <span>Your Score: {assignmentStatus.score}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="card-actions">
                    {status === 'pending' && (
                      <button 
                        className="submit-button"
                        onClick={() => handleSubmit(assignment.id)}
                      >
                        <FaFileUpload /> Submit Now
                      </button>
                    )}
                    
                    {(status === 'submitted' || status === 'graded') && (
                      <button 
                        className="view-button"
                        onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                      >
                        <FaEye /> View Submission
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
