import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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

const AdminLayout = ({ children, activeTab, setActiveTab, user, profile }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isDashboard = activeTab !== undefined && setActiveTab !== undefined
  const activeKey = isDashboard ? activeTab : getActiveKeyFromPath(location.pathname)

  const handleNavSelect = (key) => {
    if (key === 'report-bank') {
      navigate('/admin/report-bank')
      return
    }
    if (key === 'dashboard') {
      navigate('/')
      return
    }
    if (isDashboard) {
      setActiveTab(key)
      navigate(`/?tab=${key}`, { replace: true })
      return
    }
    navigate(`/?tab=${key}`)
  }

  return (
    <div className="admin-layout">
      <AdminSidebar
        profile={profile}
        activeKey={activeKey}
        onNavSelect={handleNavSelect}
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
