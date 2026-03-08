import React, { useState, useRef, useEffect } from 'react'
import TeacherSidebar from './TeacherSidebar'
import '../styles/teacher.css'
import '../styles/report-enhancements.css'

const TeacherLayout = ({ children, activeTab: activeTabProp, setActiveTab: setActiveTabProp, user, profile }) => {
  const mainRef = useRef(null)
  const [internalTab, setInternalTab] = useState('dashboard')
  const activeTab = activeTabProp ?? internalTab
  const setActiveTab = setActiveTabProp ?? setInternalTab

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [activeTab])

  return (
    <div className="teacher-layout">
      <TeacherSidebar
        profile={profile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
