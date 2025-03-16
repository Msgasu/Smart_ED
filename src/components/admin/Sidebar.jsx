import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FaHome, FaUsers, FaChartBar, FaCog, FaSignOutAlt } from 'react-icons/fa';
import './styles/AdminLayout.css';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };
  
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/logo.png" alt="LIC" height="40" />
      </div>
      <nav className="sidebar-nav">
        <div className="nav-item">
          <Link 
            className={`nav-link ${path === "/admin/dashboard" ? "active" : ""}`}
            to="/admin/dashboard"
          >
            <FaHome /> <span>Dashboard</span>
          </Link>
        </div>
        <div className="nav-item">
          <Link 
            className={`nav-link ${path === "/admin/Students" ? "active" : ""}`}
            to="/admin/Students"
          >
            <FaUsers /> <span>Students</span>
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
            <FaChartBar /> <span>Reports</span>
          </Link>
        </div>
        <div className="nav-item">
          <Link 
            className={`nav-link ${path === "/admin/settings" ? "active" : ""}`}
            to="/admin/settings"
          >
            <FaCog /> <span>Settings</span>
          </Link>
        </div>
        <div className="nav-item logout-container">
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> <span>Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
