import React from 'react'
import toast from 'react-hot-toast'
import {
  FaHome,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaBars,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa'
import './TeacherSidebar.css'

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: FaHome, description: 'Overview & Statistics' },
  { id: 'reports', label: 'Reports', icon: FaChartBar, description: 'Generate & View Reports' },
  { id: 'classes', label: 'Class Reports', icon: FaUsers, description: 'View Class Reports' },
  { id: 'students', label: 'Students', icon: FaUsers, description: 'View Student Lists' },
]

const TeacherSidebar = ({
  profile,
  activeTab,
  onTabChange,
  onLogout,
  collapsed = false,
  mobileOpen = false,
  onMobileToggle,
  onMobileClose,
  onCollapseToggle,
}) => {
  const handleNavClick = (id) => {
    onTabChange?.(id)
    onMobileClose?.()
  }

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
        className={`teacher-sidebar-wrap ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Teacher navigation"
      >
        <div className="teacher-sidebar-inner">
          {/* Brand */}
          <div className="teacher-sidebar-brand">
            <div className="teacher-sidebar-logo">LIC</div>
            {!collapsed && (
              <div className="teacher-sidebar-brand-text">
                <h1 className="teacher-sidebar-title">Life International</h1>
                <p className="teacher-sidebar-subtitle">College Portal</p>
              </div>
            )}
            {onCollapseToggle && (
              <button
                type="button"
                className="teacher-sidebar-collapse-btn"
                onClick={onCollapseToggle}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <FaChevronRight aria-hidden /> : <FaChevronLeft aria-hidden />}
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="teacher-sidebar-nav">
            {MENU_ITEMS.map(({ id, label, icon: Icon, description }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`teacher-sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(id)}
                  title={label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="teacher-sidebar-nav-icon" aria-hidden />
                  {!collapsed && (
                    <div className="teacher-sidebar-nav-content">
                      <span className="teacher-sidebar-nav-label">{label}</span>
                      {description && (
                        <span className="teacher-sidebar-nav-description">{description}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Profile & Logout */}
          <div className="teacher-sidebar-footer">
            {!collapsed && (
              <div className="teacher-sidebar-profile">
                <div className="teacher-sidebar-avatar">{initials}</div>
                <div className="teacher-sidebar-profile-text">
                  <p className="teacher-sidebar-profile-name">{displayName}</p>
                  <p className="teacher-sidebar-profile-role">Teacher</p>
                </div>
              </div>
            )}
            <button
              type="button"
              className="teacher-sidebar-logout"
              onClick={handleLogout}
              title="Logout"
            >
              <FaSignOutAlt className="teacher-sidebar-logout-icon" aria-hidden />
              {!collapsed && <span>Logout</span>}
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
