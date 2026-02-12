import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import '../styles/report-enhancements.css'

function getActiveKeyFromPath(pathname) {
  if (pathname === '/' || pathname === '/dashboard') return 'dashboard'
  if (pathname.startsWith('/admin/report-bank')) return 'report-bank'
  if (pathname.startsWith('/admin/report-view') || pathname.startsWith('/admin/report-print')) return 'report-bank'
  if (pathname.startsWith('/admin/class-reports')) return 'classes'
  const m = pathname.match(/^\/admin\/([^/]+)/)
  return m ? m[1] : 'dashboard'
}

function getActiveKeyFromLocation(pathname, search) {
  if (pathname === '/' || pathname === '/dashboard') {
    const tab = new URLSearchParams(search).get('tab')
    const valid = ['users', 'reports', 'report-bank', 'classes', 'courses', 'settings', 'analytics']
    return tab && valid.includes(tab) ? tab : 'dashboard'
  }
  return getActiveKeyFromPath(pathname)
}

const AdminLayout = ({ children, user, profile }) => {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const activeKey = getActiveKeyFromLocation(location.pathname, location.search)

  return (
    <div className="admin-layout">
      <AdminSidebar
        profile={profile}
        activeKey={activeKey}
        onLogout={window.handleGlobalLogout}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen((o) => !o)}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <main className="admin-main">
        <div className="admin-content">{children}</div>
      </main>
    </div>
  )
}

export default AdminLayout
