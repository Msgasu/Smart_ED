import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { FaHome, FaUsers, FaFileAlt, FaChartBar, FaSignOutAlt, FaBars, FaChevronLeft, FaChevronRight, FaPlus, FaEye } from 'react-icons/fa'

const TeacherLayout = ({ children, activeTab, setActiveTab, user, profile }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error logging out')
    }
  }

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: FaHome,
      description: 'Overview & Statistics'
    },
    {
      id: 'reports',
      label: 'Grade Entry',
      icon: FaFileAlt,
      description: 'Enter Student Grades'
    },
    {
      id: 'manage-reports',
      label: 'Report Cards',
      icon: FaEye,
      description: 'View Complete Reports'
    },
    {
      id: 'students',
      label: 'Students',
      icon: FaUsers,
      description: 'View Student Lists'
    }
  ]

  return (
    <div className="teacher-layout">
      {/* Mobile Header */}
      <div className="mobile-header d-lg-none">
        <button 
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <FaBars />
        </button>
        <div className="mobile-title">
          <h4 className="mb-0">Smart Reports - Teacher</h4>
        </div>
        <div className="mobile-user">
          <span>{profile?.first_name || 'Teacher'}</span>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo">
              <span className="logo-icon">📚</span>
              <span className="logo-text">Smart Reports</span>
            </div>
            <button 
              className="sidebar-toggle d-none d-lg-block"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>
          
          {/* User Info */}
          <div className="user-info">
            <div className="user-avatar">
              {profile?.first_name?.charAt(0) || 'T'}
            </div>
            <div className="user-details">
              <div className="user-name">{profile?.first_name} {profile?.last_name}</div>
              <div className="user-role">Teacher</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id)
                setMobileMenuOpen(false) // Close mobile menu when item is clicked
              }}
              title={sidebarCollapsed ? item.label : ''}
            >
              <item.icon className="nav-icon" />
              <div className="nav-content">
                <span className="nav-label">{item.label}</span>
                <span className="nav-description">{item.description}</span>
              </div>
            </button>
          ))}
        </nav>

        {/* Quick Actions */}
        <div className="sidebar-actions">
          <div className="actions-title">Quick Actions</div>
          <button 
            className="action-btn"
            onClick={() => {
              setActiveTab('reports')
              setMobileMenuOpen(false)
            }}
            title="Create New Report"
          >
            <FaPlus className="action-icon" />
            <span className="action-text">New Report</span>
          </button>
        </div>

        {/* Logout */}
        <div className="sidebar-footer">
          <button 
            className="logout-btn"
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Logout' : ''}
          >
            <FaSignOutAlt className="logout-icon" />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* Main Content */}
      <div className="teacher-main">
        <div className="teacher-content">
          {children}
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .teacher-layout {
          display: flex;
          min-height: 100vh;
          background-color: #f8f9fa;
        }

        /* Mobile Header */
        .mobile-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: var(--wine, #722f37);
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
          z-index: 1001;
        }

        .mobile-menu-toggle {
          background: none;
          border: none;
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
        }

        .mobile-title h4 {
          color: white;
          font-size: 1rem;
        }

        .mobile-user {
          font-size: 0.9rem;
        }

        /* Sidebar */
        .sidebar {
          width: 280px;
          background: var(--wine, #722f37);
          color: white;
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          left: 0;
          top: 0;
          z-index: 1000;
          transition: all 0.3s ease;
          transform: translateX(-100%);
        }

        .sidebar.collapsed {
          width: 70px;
        }

        .sidebar.mobile-open {
          transform: translateX(0);
        }

        /* Desktop sidebar always visible */
        @media (min-width: 992px) {
          .sidebar {
            position: relative;
            transform: translateX(0);
          }
        }

        /* Sidebar Header */
        .sidebar-header {
          padding: 1.5rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logo-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-icon {
          font-size: 1.5rem;
        }

        .logo-text {
          font-weight: 700;
          font-size: 1.1rem;
          white-space: nowrap;
          transition: opacity 0.3s ease;
        }

        .sidebar.collapsed .logo-text {
          opacity: 0;
          width: 0;
          overflow: hidden;
        }

        .sidebar-toggle {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .sidebar-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* User Info */
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.1rem;
        }

        .user-details {
          flex: 1;
          min-width: 0;
          transition: opacity 0.3s ease;
        }

        .sidebar.collapsed .user-details {
          opacity: 0;
          width: 0;
          overflow: hidden;
        }

        .user-name {
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .user-role {
          font-size: 0.75rem;
          opacity: 0.8;
          white-space: nowrap;
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          padding: 1rem 0;
          overflow-y: auto;
        }

        .nav-item {
          width: 100%;
          background: none;
          border: none;
          color: white;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .nav-item.active {
          background: rgba(255, 255, 255, 0.15);
          border-right: 3px solid white;
        }

        .nav-icon {
          font-size: 1.1rem;
          width: 20px;
          flex-shrink: 0;
        }

        .nav-content {
          flex: 1;
          min-width: 0;
          transition: opacity 0.3s ease;
        }

        .sidebar.collapsed .nav-content {
          opacity: 0;
          width: 0;
          overflow: hidden;
        }

        .nav-label {
          display: block;
          font-weight: 500;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .nav-description {
          display: block;
          font-size: 0.75rem;
          opacity: 0.7;
          white-space: nowrap;
        }

        /* Quick Actions */
        .sidebar-actions {
          padding: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .actions-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.7;
          margin-bottom: 0.75rem;
          transition: opacity 0.3s ease;
        }

        .sidebar.collapsed .actions-title {
          opacity: 0;
          height: 0;
          margin: 0;
          overflow: hidden;
        }

        .action-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.85rem;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .action-icon {
          font-size: 0.9rem;
        }

        .action-text {
          transition: opacity 0.3s ease;
        }

        .sidebar.collapsed .action-text {
          opacity: 0;
          width: 0;
          overflow: hidden;
        }

        /* Logout */
        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logout-btn {
          width: 100%;
          background: none;
          border: none;
          color: white;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 6px;
        }

        .logout-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .logout-icon {
          font-size: 1rem;
        }

        .logout-text {
          font-weight: 500;
          transition: opacity 0.3s ease;
        }

        .sidebar.collapsed .logout-text {
          opacity: 0;
          width: 0;
          overflow: hidden;
        }

        /* Mobile Overlay */
        .mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
          display: none;
        }

        @media (max-width: 991px) {
          .mobile-overlay {
            display: block;
          }
        }

        /* Main Content */
        .teacher-main {
          flex: 1;
          margin-left: 0;
          margin-top: 60px;
        }

        @media (min-width: 992px) {
          .teacher-main {
            margin-left: 0;
            margin-top: 0;
          }
        }

        .teacher-content {
          min-height: calc(100vh - 60px);
        }

        @media (min-width: 992px) {
          .teacher-content {
            min-height: 100vh;
          }
        }

        /* CSS Variables for theming */
        :root {
          --wine: #722f37;
          --wine-light: #8b4049;
          --wine-dark: #5a252a;
        }
      `}</style>
    </div>
  )
}

export default TeacherLayout 