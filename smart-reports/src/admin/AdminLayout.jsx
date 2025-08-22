import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { FaHome, FaUsers, FaChartBar, FaCog, FaSignOutAlt, FaBars, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import '../styles/report-enhancements.css'

const AdminLayout = ({ children, activeTab, setActiveTab, user, profile }) => {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const success = await window.handleGlobalLogout()
    toast.success('Logged out successfully')
  }

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: FaHome,
      description: 'Overview & Statistics'
    },
    {
      id: 'users',
      label: 'Users',
      icon: FaUsers,
      description: 'Manage Users & Roles'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FaChartBar,
      description: 'Generate & View Reports'
    },
    {
      id: 'classes',
      label: 'Classes',
      icon: FaUsers,
      description: 'Manage Student Classes'
    },
    {
      id: 'courses',
      label: 'Courses',
      icon: FaChartBar,
      description: 'Assign Courses'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: FaCog,
      description: 'System Configuration'
    }
  ]

  return (
    <div className="admin-layout">
      {/* Mobile Sidebar Toggle */}
      <button 
        className="mobile-sidebar-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <FaBars />
      </button>

      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-icon"></span>
            <span className="brand-text">Life International College</span>
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>

        {/* User Profile */}
        <div className="sidebar-profile">
          <div className="profile-avatar">
            {profile?.first_name?.[0] || 'U'}{profile?.last_name?.[0] || 'S'}
          </div>
          <div className="profile-info">
            <div className="profile-name">
              {profile?.first_name || 'Unknown'} {profile?.last_name || 'User'}
            </div>
            <div className="profile-role">
              {profile?.role === 'admin' ? 'Administrator' : (profile?.role || 'User')}
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

      {/* Main Content */}
      <div className="admin-main">
        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  )
}

export default AdminLayout 