import React, { useState, useEffect } from 'react';
import { FaBook, FaUserGraduate, FaClipboardList, FaFileAlt } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import { getTeacherDashboardStats } from '../../backend/teachers/profile';
import './styles/TeacherDashboard.css';


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
      <div className="dashboard-page">
        <div className="page-header">
          <h1 className="page-title">Teacher Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's an overview of your teaching activities.</p>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaBook />
                </div>
                <div className="stat-content">
                  <h3>{stats.courses}</h3>
                  <p>Active Courses</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUserGraduate />
                </div>
                <div className="stat-content">
                  <h3>{stats.students}</h3>
                  <p>Total Students</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FaClipboardList />
                </div>
                <div className="stat-content">
                  <h3>{stats.assignments}</h3>
                  <p>Active Assignments</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FaFileAlt />
                </div>
                <div className="stat-content">
                  <h3>{stats.submissions}</h3>
                  <p>Recent Submissions</p>
                </div>
              </div>
            </div>

            <div className="recent-submissions-card">
              <h2>Recent Submissions</h2>
              {recentSubmissions.length === 0 ? (
                <div className="no-submissions">
                  <FaFileAlt className="no-submissions-icon" />
                  <p>No recent submissions to display</p>
                </div>
              ) : (
                <div className="submissions-list">
                  {recentSubmissions.map(submission => (
                    <div key={submission.id} className="submission-item">
                      <div className="submission-info">
                        <div className="student-name">
                          {submission.profiles.first_name} {submission.profiles.last_name}
                        </div>
                        <div className="assignment-title">
                          {submission.assignments.title}
                        </div>
                      </div>
                      <div className="submission-meta">
                        <span className={`status-badge status-${submission.status.toLowerCase()}`}>
                          {submission.status}
                        </span>
                        <span className="submission-date">
                          {new Date(submission.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherDashboard;