import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import TeacherSidebar from './TeacherSidebar'
import '../styles/teacher.css'
import '../styles/report-enhancements.css'

const TEACHER_TABS = ['dashboard', 'reports', 'classes', 'students']

function getActiveKeyFromLocation(pathname, search) {
  if (pathname === '/' || pathname === '/dashboard') {
    const tab = new URLSearchParams(search).get('tab')
    return tab && TEACHER_TABS.includes(tab) ? tab : 'dashboard'
  }
  return 'dashboard'
}

const TeacherLayout = ({ children, user, profile }) => {
  const location = useLocation()
  const mainRef = useRef(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const activeKey = getActiveKeyFromLocation(location.pathname, location.search)

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname, location.search])

  return (
    <div className="teacher-layout">
      <TeacherSidebar
        profile={profile}
        activeKey={activeKey}
        onLogout={window.handleGlobalLogout}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen((o) => !o)}
        onMobileClose={() => setMobileMenuOpen(false)}
        onCollapseToggle={() => setSidebarCollapsed((c) => !c)}
      />
      <main ref={mainRef} className="teacher-main">
        <div className="teacher-content">{children}</div>
      </main>
    </div>
  )
}

export default TeacherLayout
