import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { FaHome, FaUser, FaFileAlt, FaSignOutAlt, FaBars, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import '../styles/guardian.css'
import '../styles/report-enhancements.css'

const GuardianLayout = ({ children, activeTab, setActiveTab, user, profile }) => {
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
      description: 'Overview & Ward Info'
    },
    {
      id: 'ward-profile',
      label: 'Ward Profile',
      icon: FaUser,
      description: 'Student Information'
    },
    {
      id: 'reports',
      label: 'Academic Reports',
      icon: FaFileAlt,
      description: 'View Ward Reports'
    }
  ]

  return (
    <div className="guardian-layout">
      {/* Mobile Sidebar Toggle */}
      <button 
        className="mobile-sidebar-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <FaBars />
      </button>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`guardian-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'open' : ''}`}>
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
            {profile?.first_name?.[0] || 'G'}{profile?.last_name?.[0] || 'U'}
          </div>
          <div className="profile-info">
            <div className="profile-name">
              {profile?.first_name || 'Unknown'} {profile?.last_name || 'User'}
            </div>
            <div className="profile-role">
              Guardian
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

        {/* Guardian Info Box */}
        <div className="guardian-info-box">
          <div className="info-header">
            <span className="info-icon">👪</span>
            <span className="info-title">Guardian Portal</span>
          </div>
          <p className="info-text">Access your ward's academic progress and reports</p>
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

      {/* Main Content */}
      <div className="guardian-main">
        <div className="guardian-content">
          {children}
        </div>
      </div>
    </div>
  )
}

export default GuardianLayout 