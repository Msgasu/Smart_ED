import React from 'react'
import ReportViewer from '../admin/ReportViewer'

const GuardianReportViewer = ({ report, student, onBack }) => {
  console.log('GuardianReportViewer received:', { report, student });

  if (!report || !student) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
        <p><strong>Error:</strong> Missing report or student data</p>
        <button onClick={onBack} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          ← Back 
        </button>
      </div>
    );
  }

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

  try {
    return (
      <div className="guardian-report-container">
        {/* Header with Back Button */}
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px', 
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: '#495057' }}>
              {student.first_name} {student.last_name} - {report.term} {report.academic_year}
            </h3>
          </div>
          
          <button 
            onClick={onBack}
            style={{
              padding: '10px 15px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '14px'
            }}
          >
            ← Back to Search
          </button>
        </div>

        {/* Report Content */}
        <div className="pdf-content">
          <ReportViewer 
            report={transformedReport}
            customNavigate={customNavigate}
            isGuardianView={true}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error rendering GuardianReportViewer:', error);
    return (
      <div style={{ padding: '20px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px' }}>
        <p><strong>Error:</strong> Failed to load report viewer</p>
        <p>{error.message}</p>
        <button onClick={onBack} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          ← Back to Search
        </button>
      </div>
    );
  }
}

export default GuardianReportViewer 