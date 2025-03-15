import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import './StudentDashboard.css';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaHome, FaBook, FaChartLine, FaCalendarAlt, FaCog, FaCheckCircle, FaTimes } from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const StudentDashboard = () => {
  const [showCoursesSidebar, setShowCoursesSidebar] = useState(false);
  
  // Sample data for chart
  const chartData = {
    labels: ['Quiz 1', 'Assignment 1', 'Midterm', 'Quiz 2', 'Assignment 2', 'Final'],
    datasets: [{
      label: 'Assessment Scores',
      data: [85, 88, 82, 90, 87, 85],
      borderColor: '#0ea5e9',
      tension: 0.4,
      fill: true,
      backgroundColor: 'rgba(14, 165, 233, 0.1)'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.06)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const sidebar = document.getElementById('coursesSidebar');
      const coursesButton = document.getElementById('coursesButton');
      
      if (sidebar && coursesButton && 
          !sidebar.contains(e.target) && 
          !coursesButton.contains(e.target) && 
          showCoursesSidebar) {
        setShowCoursesSidebar(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showCoursesSidebar]);

  return (
    <div className="wrapper">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="LIC" height="40" />
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item">
            <a className="nav-link active" href="#">
              <FaHome /> Dashboard
            </a>
          </div>
          <div className="nav-item">
            <a 
              className="nav-link" 
              href="#" 
              id="coursesButton"
              onClick={(e) => {
                e.preventDefault();
                setShowCoursesSidebar(true);
              }}
            >
              <FaBook /> Courses
            </a>
          </div>
          <div className="nav-item">
            <a className="nav-link" href="#">
              <FaChartLine /> Grade Projection
            </a>
          </div>
          <div className="nav-item">
            <a className="nav-link" href="#">
              <FaCalendarAlt /> Schedule
            </a>
          </div>
          <div className="nav-item">
            <a className="nav-link" href="#">
              <FaCog /> Settings
            </a>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* User profile section */}
        <div className="user-profile">
          <div className="user-info">
            <div className="user-name">John Doe</div>
            <div className="user-role">Student</div>
          </div>
          <img src="/profile.jpg" alt="Profile" />
        </div>

        <div className="container-fluid">
          {/* Course Performance Cards */}
          <div className="course-performance">
            <div className="course-header">
              <h4>Mathematics (MATH101)</h4>
              <div className="course-grade">A-</div>
            </div>
            <div className="course-stats">
              <div className="stat-card">
                <div className="h3 mb-0">85%</div>
                <small>Overall Grade</small>
              </div>
              <div className="stat-card">
                <div className="h3 mb-0">90%</div>
                <small>Attendance</small>
              </div>
              <div className="stat-card">
                <div className="h3 mb-0">8/10</div>
                <small>Assignments</small>
              </div>
            </div>
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Additional course card example */}
          <div className="course-performance">
            <div className="course-header">
              <h4>Computer Science (CS101)</h4>
              <div className="course-grade">B+</div>
            </div>
            <div className="course-stats">
              <div className="stat-card">
                <div className="h3 mb-0">78%</div>
                <small>Overall Grade</small>
              </div>
              <div className="stat-card">
                <div className="h3 mb-0">95%</div>
                <small>Attendance</small>
              </div>
              <div className="stat-card">
                <div className="h3 mb-0">7/10</div>
                <small>Assignments</small>
              </div>
            </div>
            <div className="chart-container">
              {/* You can create another chart instance here */}
            </div>
          </div>
        </div>
      </main>

      {/* Courses sidebar popup */}
      <div className={`courses-sidebar ${showCoursesSidebar ? 'active' : ''}`} id="coursesSidebar">
        <div className="courses-header">
          <h3>Courses</h3>
          <button 
            className="close-btn" 
            onClick={() => setShowCoursesSidebar(false)}
          >
            <FaTimes />
          </button>
        </div>
        <div className="courses-search">
          <input type="text" placeholder="Search courses..." className="form-control" />
        </div>
        <div className="courses-list">
          <div className="course-item">
            <h4>Mathematics</h4>
            <p className="course-code">MATH101</p>
            <div className="course-meta">
              <span>Term: 24-25-SEM1</span>
              <span className="completion-status">
                <FaCheckCircle />
                1 completed item
              </span>
            </div>
          </div>
          
          <div className="course-item">
            <h4>Computer Science</h4>
            <p className="course-code">CS101</p>
            <div className="course-meta">
              <span>Term: 24-25-SEM1</span>
              <span className="completion-status">
                <FaCheckCircle />
                2 completed items
              </span>
            </div>
          </div>
          
          <div className="course-item">
            <h4>Physics</h4>
            <p className="course-code">PHYS101</p>
            <div className="course-meta">
              <span>Term: 24-25-SEM1</span>
              <span className="completion-status">
                <FaCheckCircle />
                0 completed items
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard; 