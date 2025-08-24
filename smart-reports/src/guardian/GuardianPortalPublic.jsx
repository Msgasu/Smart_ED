import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import GuardianReportViewer from './GuardianReportViewer';
import '../styles/guardian.css';

const GuardianPortalPublic = () => {
  const [studentId, setStudentId] = useState('');
  const [uniqueCode, setUniqueCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [termsAgendaOpen, setTermsAgendaOpen] = useState(true);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [importantInfoOpen, setImportantInfoOpen] = useState(true);

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
        
        // Student grades with proper structure
        student_grades: gradesData.map(grade => ({
          courses: { course_name: grade.courses.name },
          class_score: grade.class_score || 0,
          exam_score: grade.exam_score || 0,
          total_score: grade.total_score || 0,
          position: grade.position || 'N/A',
          remark: grade.remark || 'N/A',
          teacher_signature: grade.teacher_signature || 'N/A'
        }))
      };

      // Student data for GuardianReportViewer
      const studentDataForViewer = {
        first_name: studentData.profiles.first_name,
        last_name: studentData.profiles.last_name,
        sex: studentData.sex || 'N/A',
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
    <div className="guardian-portal-public">
      <div className="guardian-portal-container">
        {/* Header */}
        <div className="guardian-portal-header">
          <h1 className="guardian-portal-title">
            Guardian Portal
          </h1>
          <p className="guardian-portal-description">Access your ward's academic reports and school information</p>
        </div>

        <div className={`guardian-portal-grid ${reportData ? 'report-active' : ''}`}>
          {/* Main Content */}
          <div className="guardian-portal-main">
            {!reportData && (
              <div className="report-lookup-card">
                <h2 className="report-lookup-title">
                  🔍 View Student Report (Term 3)
                </h2>
                
                <form onSubmit={handleReportLookup} className="report-lookup-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        Student ID
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Student ID (e.g., STU001)"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Unique Code
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Unique Code (e.g., ABC123)"
                        value={uniqueCode}
                        onChange={(e) => setUniqueCode(e.target.value)}
                        required
                        className="form-input"
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <div className="error-message">
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading}
                    className={`submit-button ${loading ? 'loading' : ''}`}
                  >
                    {loading ? '⏳ Looking up report...' : '🔍 View Report'}
                  </button>
                </form>

                {/* Instructions */}
                <div className="instructions-box">
                  <p className="instructions-text">
                    <strong>Instructions:</strong> Enter your ward's Student ID and Unique Code exactly as provided by the school. These credentials are case-sensitive.
                  </p>
                </div>
              </div>
            )}

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
          {!reportData && (
            <div className="guardian-portal-sidebar">
              {/* Terms Agenda */}
              <div className="sidebar-card">
                <h3 
                  className="sidebar-card-title toggleable" 
                  onClick={() => setTermsAgendaOpen(!termsAgendaOpen)}
                >
                  📅 Terms Agenda
                  <span className={`toggle-arrow ${termsAgendaOpen ? 'open' : ''}`}>▼</span>
                </h3>
                {termsAgendaOpen && (
                  <div className="agenda-list">
                    {dummyTermsAgenda.map((item, index) => (
                      <div key={index} className="agenda-item">
                        <span className="agenda-date">{item.date}</span>
                        <span className="agenda-event">{item.event}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Welcome Message */}
              <div className="sidebar-card">
                <h3 
                  className="sidebar-card-title toggleable" 
                  onClick={() => setWelcomeOpen(!welcomeOpen)}
                >
                  🔔 Welcome
                  <span className={`toggle-arrow ${welcomeOpen ? 'open' : ''}`}>▼</span>
                </h3>
                {welcomeOpen && (
                  <div className="announcements-list">
                    {dummyAnnouncements.map((announcement, index) => (
                      <div key={index} className="announcement-item">
                        <p>{announcement}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Important Information */}
              <div className="sidebar-card">
                <h3 
                  className="sidebar-card-title toggleable" 
                  onClick={() => setImportantInfoOpen(!importantInfoOpen)}
                >
                  📞 Important Information
                  <span className={`toggle-arrow ${importantInfoOpen ? 'open' : ''}`}>▼</span>
                </h3>
                {importantInfoOpen && (
                  <div className="contact-info">
                    <p><strong>School Contact:</strong> +233 123 456 789</p>
                    <p><strong>Email:</strong> info@lifeinternational.edu.gh</p>
                    <p><strong>Office Hours:</strong> Mon-Fri 8:00 AM - 4:00 PM</p>
                    <p><strong>Emergency Contact:</strong> +233 987 654 321</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuardianPortalPublic;
