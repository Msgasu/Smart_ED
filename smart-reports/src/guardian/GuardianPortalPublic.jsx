import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import GuardianReportViewer from './GuardianReportViewer';

const GuardianPortalPublic = () => {
  const [studentId, setStudentId] = useState('');
  const [uniqueCode, setUniqueCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);

  // Dummy data for demonstration
  const dummyTermsAgenda = [
    { date: '2025-09-06', event: 'Term 1 Begins (2025/2026 academic year)' },
 
  ];

  const dummyAnnouncements = [
    'We\'re excited to welcome all our students, parents, and staff back as we begin a new academic term! We hope everyone had a restful and enjoyable break. As we step into this new chapter, we look forward to a term filled with learning, growth, and new opportunities. Let\'s work together to make this term a successful and inspiring journey for all. Here\'s to a great start and an even greater term ahead!',
    'Welcome back!'
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
          profiles!inner(first_name, last_name, sex)
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
        .select(`
          id,
          term,
          academic_year,
          total_score,
          overall_grade,
          conduct,
          attendance,
          position_held,
          interest,
          next_class,
          reopening_date,
          teacher_remarks,
          headmaster_remarks,
          house_report,
          class_teacher_signature,
          house_master_signature,
          principal_signature
        `)
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
          id,
          class_score,
          exam_score,
          total_score,
          grade,
          position,
          remark,
          teacher_signature,
          courses!inner(name)
        `)
        .eq('report_id', reportData.id);

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        setError('Error loading grade details.');
        setLoading(false);
        return;
      }

      // Step 4: Format the data for GuardianReportViewer
      const formattedReport = {
        // Report data
        term: reportData.term,
        academic_year: reportData.academic_year,
        class_year: studentData.class_year || 'N/A',
        total_score: reportData.total_score || 0,
        overall_grade: reportData.overall_grade || 'N/A',
        conduct: reportData.conduct || 'N/A',
        attendance: reportData.attendance || 'N/A',
        position_held: reportData.position_held || 'N/A',
        interest: reportData.interest || 'N/A',
        next_class: reportData.next_class || 'N/A',
        reopening_date: reportData.reopening_date || 'N/A',
        teacher_remarks: reportData.teacher_remarks || 'No remarks available.',
        headmaster_remarks: reportData.headmaster_remarks || 'No remarks available.',
        house_report: reportData.house_report || 'No house report available.',
        class_teacher_signature: reportData.class_teacher_signature || 'N/A',
        house_master_signature: reportData.house_master_signature || 'N/A',
        principal_signature: reportData.principal_signature || 'N/A',
        
        // Student grades with proper structure
        student_grades: gradesData.map(grade => ({
          id: grade.id,
          courses: { name: grade.courses.name },
          class_score: grade.class_score || 0,
          exam_score: grade.exam_score || 0,
          total_score: grade.total_score || 0,
          grade: grade.grade || 'N/A',
          position: grade.position || 'N/A',
          remark: grade.remark || 'N/A',
          teacher_signature: grade.teacher_signature || 'N/A'
        }))
      };

      // Student data for GuardianReportViewer
      const studentDataForViewer = {
        first_name: studentData.profiles.first_name,
        last_name: studentData.profiles.last_name,
        sex: studentData.profiles.sex || 'N/A',
        students: { student_id: studentData.student_id }
      };

      setReportData({ report: formattedReport, student: studentDataForViewer });
    } catch (error) {
      console.error('Error during report lookup:', error);
      setError('An error occurred while looking up the report. Please try again.');
    } finally {
      setLoading(false);
    }
  };



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
            {reportData && (
              <GuardianReportViewer 
                report={reportData.report} 
                student={reportData.student}
                onBack={() => setReportData(null)}
              />
            )}
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
                📞 Contact Information
              </h3>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
         
                <p><strong>Email:</strong> lifeinternationalcollege@gmail.com</p>
                <p><strong>Emergency Contact:</strong> +233 208 156 742 (Mr. Gasu)</p>
                <p><strong>Emergency Contact:</strong> +233 249 642 785 (Mr. Tamakloe)</p>
                <p><strong>Emergency Contact:</strong> +233 244 377 584 (Mrs. Danso)</p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardianPortalPublic;
