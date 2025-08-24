import React from 'react'
import ReportViewer from '../admin/ReportViewer'

const GuardianReportViewer = ({ report, student, onBack }) => {
  // Transform the data to match what ReportViewer expects
  const transformedReport = {
    ...report,
    student: student, // ReportViewer expects report.student
    student_id: student?.id || student?.students?.id
  }

  // Create a custom navigation function that calls onBack
  const customNavigate = (path) => {
    if (path === -1 || path === '/admin/classes') {
      onBack()
    }
  }

  return (
    <div className="guardian-report-container">
      <ReportViewer 
        report={transformedReport}
        customNavigate={customNavigate}
        isGuardianView={true}
      />
    </div>
  )
}

export default GuardianReportViewer 