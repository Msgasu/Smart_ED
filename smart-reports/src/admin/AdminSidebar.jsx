import React from 'react'
import toast from 'react-hot-toast'
import {
  FaThLarge,
  FaUsers,
  FaChartBar,
  FaBook,
  FaSchool,
  FaBookOpen,
  FaCog,
  FaSignOutAlt,
  FaBars,
} from 'react-icons/fa'
import './AdminSidebar.css'

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: FaThLarge },
  { id: 'users', label: 'Users', icon: FaUsers },
  { id: 'reports', label: 'Reports', icon: FaChartBar },
  { id: 'report-bank', label: 'Report Bank', icon: FaBook },
  { id: 'classes', label: 'Classes', icon: FaSchool },
  { id: 'courses', label: 'Courses', icon: FaBookOpen },
  { id: 'settings', label: 'Settings', icon: FaCog },
]

const AdminSidebar = ({
  profile,
  activeKey,
  onNavSelect,
  onLogout,
  collapsed = false,
  mobileOpen = false,
  onMobileToggle,
  onMobileClose,
}) => {
  const handleNav = (id) => {
    onNavSelect?.(id)
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
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : 'U'
  const roleLabel = profile?.role === 'admin' ? 'System Admin' : (profile?.role || 'User')

  return (
    <>
      <button
        type="button"
        className="admin-sidebar-mobile-toggle"
        onClick={onMobileToggle}
        aria-label="Toggle menu"
      >
        <FaBars />
      </button>

      <div
        className={`admin-sidebar-wrap ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Admin navigation"
      >
        <div className="admin-sidebar-inner">
          {/* Brand */}
          <div className="admin-sidebar-brand">
            <div className="admin-sidebar-logo">L</div>
            {!collapsed && (
              <div className="admin-sidebar-brand-text">
                <h1 className="admin-sidebar-title">Life International</h1>
                <p className="admin-sidebar-subtitle">College Portal</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="admin-sidebar-nav">
            {MENU_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = activeKey === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`admin-sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNav(id)}
                  title={label}
                >
                  <Icon className="admin-sidebar-nav-icon" aria-hidden />
                  {!collapsed && <span className="admin-sidebar-nav-label">{label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Profile & Logout */}
          <div className="admin-sidebar-footer">
            {!collapsed && (
              <div className="admin-sidebar-profile">
                <div className="admin-sidebar-avatar">{initials}</div>
                <div className="admin-sidebar-profile-text">
                  <p className="admin-sidebar-profile-name">{displayName}</p>
                  <p className="admin-sidebar-profile-role">{roleLabel}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              className="admin-sidebar-logout"
              onClick={handleLogout}
              title="Logout"
            >
              <FaSignOutAlt className="admin-sidebar-logout-icon" aria-hidden />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="admin-sidebar-backdrop"
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

export default AdminSidebar
