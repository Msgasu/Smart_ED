import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const GuardianPortalPublic = () => {
  const [studentId, setStudentId] = useState('');
  const [uniqueCode, setUniqueCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);

  // Dummy data for demonstration
  const dummyTermsAgenda = [
    { date: '2024-01-15', event: 'Term 3 Begins' },
    { date: '2024-02-14', event: 'Mid-term Assessments' },
    { date: '2024-03-15', event: 'Parent-Teacher Conference' },
    { date: '2024-04-10', event: 'Term 3 Examinations' },
    { date: '2024-04-25', event: 'Term 3 Ends' },
    { date: '2024-05-01', event: 'Holiday Begins' }
  ];

  const dummyAnnouncements = [
    'Welcome to Term 3! We are excited to continue the academic journey with your wards.',
    'Parent-Teacher conferences are scheduled for March 15th. Please contact the school to book your slot.',
    'Term 3 examination schedules will be available by March 1st.',
    'School fees for Term 3 are due by January 30th.'
  ];

  // Dummy report data for successful lookup
  const dummyReportData = {
    student: {
      name: 'John Doe',
      studentId: 'STU001',
      class: 'Grade 10A',
      program: 'Science'
    },
    term: 'Term 3',
    academicYear: '2023/2024',
    totalScore: 856,
    overallGrade: 'A',
    conduct: 'Excellent',
    attendance: '95%',
    nextClass: 'Grade 11',
    reopeningDate: '2024-05-15',
    teacherRemarks: 'John has shown exceptional performance this term. He demonstrates strong understanding in all subjects and actively participates in class discussions.',
    grades: [
      { subject: 'Mathematics', classScore: 85, examScore: 90, total: 175, grade: 'A', position: 2, remark: 'Excellent work' },
      { subject: 'English Language', classScore: 82, examScore: 88, total: 170, grade: 'A', position: 3, remark: 'Very good' },
      { subject: 'Physics', classScore: 90, examScore: 85, total: 175, grade: 'A', position: 1, remark: 'Outstanding' },
      { subject: 'Chemistry', classScore: 88, examScore: 87, total: 175, grade: 'A', position: 2, remark: 'Excellent' },
      { subject: 'Biology', classScore: 75, examScore: 86, total: 161, grade: 'B+', position: 5, remark: 'Good effort' }
    ]
  };

  const handleReportLookup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReportData(null);

    try {
      // Step 1: Verify student credentials
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          student_id,
          unique_code,
          profile_id,
          class_year,
          program,
          profiles!inner(first_name, last_name)
        `)
        .eq('student_id', studentId)
        .eq('unique_code', uniqueCode)
        .single();

      if (studentError || !studentData) {
        setError('Invalid Student ID or Unique Code. Please check your credentials and try again.');
        setLoading(false);
        return;
      }

      // Step 2: Get Term 3 report for this student
      const { data: reportData, error: reportError } = await supabase
        .from('student_reports')
        .select('*')
        .eq('student_id', studentData.profile_id)
        .eq('term', 'Term 3')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (reportError || !reportData) {
        setError('No Term 3 report found for this student.');
        setLoading(false);
        return;
      }

      // Step 3: Get grades for this report
      const { data: gradesData, error: gradesError } = await supabase
        .from('student_grades')
        .select(`
          *,
          courses!inner(name)
        `)
        .eq('report_id', reportData.id);

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        setError('Error loading grade details.');
        setLoading(false);
        return;
      }

      // Step 4: Format the data for display
      const formattedReport = {
        student: {
          name: `${studentData.profiles.first_name} ${studentData.profiles.last_name}`,
          studentId: studentData.student_id,
          class: studentData.class_year || 'N/A',
          program: studentData.program || 'N/A'
        },
        term: reportData.term,
        academicYear: reportData.academic_year,
        totalScore: reportData.total_score || 0,
        overallGrade: reportData.overall_grade || 'N/A',
        conduct: reportData.conduct || 'N/A',
        attendance: reportData.attendance || 'N/A',
        nextClass: reportData.next_class || 'N/A',
        reopeningDate: reportData.reopening_date || 'N/A',
        teacherRemarks: reportData.teacher_remarks || 'No remarks available.',
        grades: gradesData.map(grade => ({
          subject: grade.courses.name,
          classScore: grade.class_score || 0,
          examScore: grade.exam_score || 0,
          total: grade.total_score || 0,
          grade: grade.grade || 'N/A',
          position: grade.position || 'N/A',
          remark: grade.remark || 'N/A'
        }))
      };

      setReportData(formattedReport);
    } catch (error) {
      console.error('Error during report lookup:', error);
      setError('An error occurred while looking up the report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ReportDisplay = ({ report }) => (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      border: '1px solid #e5e7eb',
      padding: '24px',
      marginTop: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        backgroundColor: '#dbeafe',
        padding: '16px',
        borderRadius: '8px 8px 0 0',
        marginBottom: '24px'
      }}>
        <h3 style={{ 
          textAlign: 'center', 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          color: '#1e40af',
          margin: 0
        }}>
          Student Report Card - {report.term} ({report.academicYear})
        </h3>
      </div>
      
      {/* Student Information */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <div>
          <p style={{ margin: '4px 0' }}><strong>Student Name:</strong> {report.student.name}</p>
          <p style={{ margin: '4px 0' }}><strong>Student ID:</strong> {report.student.studentId}</p>
        </div>
        <div>
          <p style={{ margin: '4px 0' }}><strong>Class:</strong> {report.student.class}</p>
          <p style={{ margin: '4px 0' }}><strong>Program:</strong> {report.student.program}</p>
        </div>
      </div>

      {/* Grades Table */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}>Subject Grades</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            border: '1px solid #d1d5db'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left' }}>Subject</th>
                <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>Class Score</th>
                <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>Exam Score</th>
                <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>Total</th>
                <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>Grade</th>
                <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>Position</th>
                <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left' }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {report.grades.map((grade, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', fontWeight: '500' }}>{grade.subject}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>{grade.classScore}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>{grade.examScore}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', fontWeight: '600' }}>{grade.total}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', fontWeight: '600' }}>{grade.grade}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>{grade.position}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{grade.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Information */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        marginBottom: '24px'
      }}>
        <div>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}>Academic Summary</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p><strong>Total Score:</strong> {report.totalScore}</p>
            <p><strong>Overall Grade:</strong> {report.overallGrade}</p>
            <p><strong>Conduct:</strong> {report.conduct}</p>
            <p><strong>Attendance:</strong> {report.attendance}</p>
          </div>
        </div>
        <div>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}>Next Term Information</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p><strong>Promoted to:</strong> {report.nextClass}</p>
            <p><strong>Reopening Date:</strong> {report.reopeningDate}</p>
          </div>
        </div>
      </div>

      {/* Teacher's Remarks */}
      <div style={{ 
        padding: '16px',
        backgroundColor: '#dbeafe',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>Teacher's Remarks</h4>
        <p style={{ fontSize: '14px', margin: 0 }}>{report.teacherRemarks}</p>
      </div>

      {/* Print Button */}
      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={() => window.print()}
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          📄 Print Report
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#7c2d12', marginBottom: '10px' }}>
            Guardian Portal
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Access your ward's academic reports and school information</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
          {/* Main Content */}
          <div>
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center'
              }}>
                🔍 View Student Report (Term 3)
              </h2>
              
              <form onSubmit={handleReportLookup} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Student ID
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Student ID (e.g., STU001)"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Unique Code
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Unique Code (e.g., ABC123)"
                      value={uniqueCode}
                      onChange={(e) => setUniqueCode(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                
                {error && (
                  <div style={{ 
                    padding: '12px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    color: '#991b1b',
                    marginBottom: '16px'
                  }}>
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#9ca3af' : '#7c2d12',
                    color: 'white',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? '⏳ Looking up report...' : '🔍 View Report'}
                </button>
              </form>

              {/* Instructions */}
              <div style={{ 
                padding: '12px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #7dd3fc',
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                <p style={{ fontSize: '14px', color: '#0c4a6e', margin: 0 }}>
                  <strong>Instructions:</strong> Enter your ward's Student ID and Unique Code exactly as provided by the school. These credentials are case-sensitive.
                </p>
              </div>
            </div>

            {/* Report Display */}
            {reportData && <ReportDisplay report={reportData} />}
          </div>

          {/* Sidebar */}
          <div>
            {/* Terms Agenda */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center'
              }}>
                📅 Terms Agenda
              </h3>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                {dummyTermsAgenda.map((item, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                    padding: '4px 0'
                  }}>
                    <span style={{ fontWeight: '500', color: '#7c2d12' }}>{item.date}</span>
                    <span style={{ marginLeft: '8px', textAlign: 'right' }}>{item.event}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Welcome Message */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center'
              }}>
                🔔 Welcome
              </h3>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                {dummyAnnouncements.map((announcement, index) => (
                  <div key={index} style={{ 
                    padding: '12px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '6px',
                    marginBottom: '10px'
                  }}>
                    <p style={{ margin: 0 }}>{announcement}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Information */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '15px' }}>
                📞 Important Information
              </h3>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <p><strong>School Contact:</strong> +233 123 456 789</p>
                <p><strong>Email:</strong> info@lifeinternational.edu.gh</p>
                <p><strong>Office Hours:</strong> Mon-Fri 8:00 AM - 4:00 PM</p>
                <p><strong>Emergency Contact:</strong> +233 987 654 321</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardianPortalPublic;
