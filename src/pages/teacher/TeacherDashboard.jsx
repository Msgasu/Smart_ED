import React, { useState, useEffect } from 'react';
import { FaChalkboardTeacher, FaBook, FaUserGraduate, FaClipboardList, FaChartBar, FaTasks, FaArrowRight } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import TeacherLayout from '../../components/teacher/TeacherLayout';
import { Link } from 'react-router-dom';
import { getTeacherDashboardStats } from '../../backend/teachers/profile';

const TeacherDashboard = () => {
  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    assignments: 0,
    submissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Use the backend service to get dashboard stats
        const { data, error } = await getTeacherDashboardStats(user.id);
        
        if (error) throw error;
        
        setStats({
          courses: data.courses,
          students: data.students,
          assignments: data.assignments,
          submissions: data.submissions
        });
        
        setRecentSubmissions(data.recentSubmissions || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <TeacherLayout>
      <h1 className="page-title">Teacher Dashboard</h1>
      
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">
            <FaBook />
          </div>
          <div className="stat-content">
            <h3>{stats.courses}</h3>
            <p>Courses</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FaUserGraduate />
          </div>
          <div className="stat-content">
            <h3>{stats.students}</h3>
            <p>Students</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FaTasks />
          </div>
          <div className="stat-content">
            <h3>{stats.assignments}</h3>
            <p>Active Assignments</p>
            <Link to="/teacher/assignments" className="stat-link">
              View Assignments <FaArrowRight />
            </Link>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FaChartBar />
          </div>
          <div className="stat-content">
            <h3>{stats.submissions}</h3>
            <p>Submissions</p>
          </div>
        </div>
      </div>
      
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/teacher/courses" className="action-button">
            <FaBook /> View Courses
          </Link>
          <Link to="/teacher/assignments" className="action-button">
            <FaClipboardList /> Manage Assignments
          </Link>
          <Link to="/teacher/students" className="action-button">
            <FaUserGraduate /> View Students
          </Link>
        </div>
      </div>
      
      <div className="recent-submissions">
        <h2>Recent Submissions</h2>
        {recentSubmissions.length === 0 ? (
          <p>No recent submissions</p>
        ) : (
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Assignment</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentSubmissions.map(submission => (
                <tr key={submission.id}>
                  <td>{submission.profiles.first_name} {submission.profiles.last_name}</td>
                  <td>{submission.assignments.title}</td>
                  <td>
                    <span className={`status-badge status-${submission.status}`}>
                      {submission.status}
                    </span>
                  </td>
                  <td>{new Date(submission.submitted_at).toLocaleDateString()}</td>
                  <td>{submission.score !== null ? `${submission.score}/100` : '-'}</td>
                  <td>
                    <Link to={`/teacher/grade/${submission.assignment_id}`} className="btn-small">
                      Grade
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherDashboard;