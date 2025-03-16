import React from 'react';
import { FaUsers, FaGraduationCap, FaBook, FaChartLine, FaBell, FaUserPlus, FaFileAlt, FaPaperPlane, FaCalendarPlus, FaHistory, FaUserGraduate, FaClipboardCheck, FaBookOpen } from 'react-icons/fa';
import './styles/Dashboard.css';
import './styles/AdminLayout.css';

const Dashboard = () => {
  return (
    <div>
      <h1 className="page-title">Admin Dashboard</h1>
      
      {/* Statistics Cards */}
      <div className="dashboard-container">
        <div className="stats-card">
          <div className="stats-header">
            <h3 className="stats-title">Total Students</h3>
            <div className="stats-icon students">
              <FaUsers />
            </div>
          </div>
          <div className="stats-value">450</div>
          <div className="stats-description">Enrolled students</div>
          <div className="stats-trend positive">
            <FaChartLine /> 12% increase from last month
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-header">
            <h3 className="stats-title">Active Courses</h3>
            <div className="stats-icon courses">
              <FaBook />
            </div>
          </div>
          <div className="stats-value">24</div>
          <div className="stats-description">Across all departments</div>
          <div className="stats-trend positive">
            <FaChartLine /> 4 new courses this semester
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-header">
            <h3 className="stats-title">Faculty Members</h3>
            <div className="stats-icon teachers">
              <FaGraduationCap />
            </div>
          </div>
          <div className="stats-value">32</div>
          <div className="stats-description">Active teachers</div>
          <div className="stats-trend positive">
            <FaChartLine /> 3 new hires this month
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-header">
            <h3 className="stats-title">Assignments</h3>
            <div className="stats-icon assignments">
              <FaClipboardCheck />
            </div>
          </div>
          <div className="stats-value">156</div>
          <div className="stats-description">Active assignments</div>
          <div className="stats-trend positive">
            <FaChartLine /> 85% completion rate
          </div>
        </div>
      </div>
      
      <div className="row">
        {/* Recent Activities */}
        <div className="col-md-6">
          <div className="recent-activity">
            <div className="activity-header">
              <h2><FaHistory /> Recent Activities</h2>
              <button className="btn btn-secondary">View All</button>
            </div>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon login">
                  <FaUserGraduate />
                </div>
                <div className="activity-content">
                  <div className="activity-title">New Student Registration</div>
                  <div>John Doe enrolled in Computer Science</div>
                  <div className="activity-time">2 mins ago</div>
                </div>
              </div>
              
              <div className="activity-item">
                <div className="activity-icon enrollment">
                  <FaBookOpen />
                </div>
                <div className="activity-content">
                  <div className="activity-title">Course Update</div>
                  <div>Mathematics 101 syllabus updated</div>
                  <div className="activity-time">1 hour ago</div>
                </div>
              </div>
              
              <div className="activity-item">
                <div className="activity-icon assignment">
                  <FaClipboardCheck />
                </div>
                <div className="activity-content">
                  <div className="activity-title">New Assignment Created</div>
                  <div>Physics 202: Quantum Mechanics Lab Report</div>
                  <div className="activity-time">3 hours ago</div>
                </div>
              </div>
              
              <div className="activity-item">
                <div className="activity-icon grade">
                  <FaChartLine />
                </div>
                <div className="activity-content">
                  <div className="activity-title">Grades Updated</div>
                  <div>Computer Science 101: Midterm Exam</div>
                  <div className="activity-time">Yesterday</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="col-md-6">
          <div className="quick-actions">
            <div className="actions-header">
              <h2><FaBell /> Quick Actions</h2>
            </div>
            <div className="actions-grid">
              <button className="action-button">
                <div className="action-icon add-student">
                  <FaUserPlus />
                </div>
                <div className="action-text">Add New Student</div>
              </button>
              
              <button className="action-button">
                <div className="action-icon add-course">
                  <FaBook />
                </div>
                <div className="action-text">Create Course</div>
              </button>
              
              <button className="action-button">
                <div className="action-icon generate-report">
                  <FaFileAlt />
                </div>
                <div className="action-text">Generate Report</div>
              </button>
              
              <button className="action-button">
                <div className="action-icon send-notification">
                  <FaPaperPlane />
                </div>
                <div className="action-text">Send Notification</div>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Upcoming Events */}
      <div className="card mt-4">
        <div className="card-header">
          <div className="card-title">
            <FaCalendarPlus /> Upcoming Events
          </div>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Parent-Teacher Meeting</td>
                  <td>May 15, 2024</td>
                  <td>10:00 AM</td>
                  <td>Main Hall</td>
                  <td><span className="badge badge-info">Upcoming</span></td>
                </tr>
                <tr>
                  <td>Annual Sports Day</td>
                  <td>May 20, 2024</td>
                  <td>9:00 AM</td>
                  <td>Sports Complex</td>
                  <td><span className="badge badge-warning">Planning</span></td>
                </tr>
                <tr>
                  <td>Graduation Ceremony</td>
                  <td>June 10, 2024</td>
                  <td>2:00 PM</td>
                  <td>Auditorium</td>
                  <td><span className="badge badge-success">Confirmed</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
