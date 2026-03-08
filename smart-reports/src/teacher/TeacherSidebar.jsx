import React from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FaHome,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaBars,
} from 'react-icons/fa'
import './TeacherSidebar.css'

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: FaHome },
  { id: 'reports', label: 'Reports', icon: FaChartBar },
  { id: 'classes', label: 'Class Reports', icon: FaUsers },
  { id: 'students', label: 'Students', icon: FaUsers },
]

function getTo(id) {
  if (id === 'dashboard') return { pathname: '/' }
  return { pathname: '/', search: `?tab=${id}` }
}

const TeacherSidebar = ({
  profile,
  activeKey,
  onLogout,
  mobileOpen = false,
  onMobileToggle,
  onMobileClose,
}) => {
  const handleLinkClick = () => onMobileClose?.()

  const handleLogout = async () => {
    const fn = onLogout || (() => window.handleGlobalLogout?.())
    await fn()
    toast.success('Logged out successfully')
  }

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'
    : 'User'
  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'T'
    : 'T'

  return (
    <>
      <button
        type="button"
        className="teacher-sidebar-mobile-toggle"
        onClick={onMobileToggle}
        aria-label="Toggle menu"
      >
        <FaBars aria-hidden />
      </button>

      <div
        className={`teacher-sidebar-wrap ${mobileOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Teacher navigation"
      >
        <div className="teacher-sidebar-inner">
          {/* Brand - same structure as admin, no collapse control */}
          <div className="teacher-sidebar-brand">
            <div className="teacher-sidebar-logo">L</div>
            <div className="teacher-sidebar-brand-text">
              <h1 className="teacher-sidebar-title">Life International</h1>
              <p className="teacher-sidebar-subtitle">College Portal</p>
            </div>
          </div>

          {/* Nav - same font/icon sizes as admin */}
          <nav className="teacher-sidebar-nav">
            {MENU_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = activeKey === id
              return (
                <Link
                  key={id}
                  to={getTo(id)}
                  className={`teacher-sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={handleLinkClick}
                  title={label}
                >
                  <Icon className="teacher-sidebar-nav-icon" aria-hidden />
                  <span className="teacher-sidebar-nav-label">{label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Profile & Logout - same as admin */}
          <div className="teacher-sidebar-footer">
            <div className="teacher-sidebar-profile">
              <div className="teacher-sidebar-avatar">{initials}</div>
              <div className="teacher-sidebar-profile-text">
                <p className="teacher-sidebar-profile-name">{displayName}</p>
                <p className="teacher-sidebar-profile-role">Teacher</p>
              </div>
            </div>
            <button
              type="button"
              className="teacher-sidebar-logout"
              onClick={handleLogout}
              title="Logout"
            >
              <FaSignOutAlt className="teacher-sidebar-logout-icon" aria-hidden />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="teacher-sidebar-backdrop"
          onClick={onMobileClose}
          onKeyDown={(e) => e.key === 'Escape' && onMobileClose()}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}
    </>
  )
}

export default TeacherSidebar
