import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import LogoutButton from '../auth/logoutbutton.jsx';
import './styles/AdminLayout.css';

const Sidebar = () => {
  const location = useLocation();
  const path = location.pathname;
  
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/path/to/logo.png" alt="LIC" height="40" />
      </div>
      <nav className="sidebar-nav">
        <div className="nav-item">
          <Link 
            className={`nav-link ${path === "/admin/dashboard" ? "active" : ""}`}
            to="/admin/dashboard"
          >
            <i className="bi bi-house-door"></i>
            Dashboard
          </Link>
        </div>
        <div className="nav-item">
          <Link 
            className={`nav-link ${path === "/admin/Students" ? "active" : ""}`}
            to="/admin/Students"
          >
            <i className="bi bi-people"></i>
            Students
          </Link>
        </div>
        {/* <div className="nav-item">
          <Link 
            className={`nav-link ${path.startsWith("/teacher") ? "active" : ""}`}
            to="/teacher/dashboard"
          >
            <i className="bi bi-person-workspace"></i>
            Teacher Dashboard
          </Link>
        </div> */}
        <div className="nav-item">
          <Link 
            className={`nav-link ${path === "/admin/reports" ? "active" : ""}`}
            to="/admin/reports"
          >
            <i className="bi bi-file-text"></i>
            Reports
          </Link>
        </div>
        <div className="nav-item">
          <Link 
            className={`nav-link ${path === "/admin/settings" ? "active" : ""}`}
            to="/admin/settings"
          >
            <i className="bi bi-gear"></i>
            Settings
          </Link>
        </div>
        <div className="nav-item logout-container">
          <LogoutButton />
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
