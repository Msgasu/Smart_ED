import React from 'react'

const StudentDashboard = ({ user, profile }) => {
  const name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Student'
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Student Dashboard</h1>
      <p>Welcome, {name || 'Student'}.</p>
      <p>Your reports and progress are managed by your teachers. Contact your school for access to report cards.</p>
    </div>
  )
}

export default StudentDashboard
