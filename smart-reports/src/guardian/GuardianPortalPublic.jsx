import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentAcademicPeriod } from '../lib/academicPeriod';
import GuardianReportViewer from './GuardianReportViewer';
import './GuardianPortalPublic.css';

const GuardianPortalPublic = () => {
  const [studentId, setStudentId] = useState('');
  const [uniqueCode, setUniqueCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [currentAcademicYear, setCurrentAcademicYear] = useState('');
  const [termsAgendaOpen, setTermsAgendaOpen] = useState(true);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [importantInfoOpen, setImportantInfoOpen] = useState(true);

  // Fetch current term and academic year from system settings on component mount
  useEffect(() => {
    const loadCurrentPeriod = async () => {
      try {
        const period = await getCurrentAcademicPeriod();
        setSelectedTerm(period.term);
        setCurrentAcademicYear(period.academicYear);
      } catch (error) {
        console.error('Error loading current academic period:', error);
        // Keep default 'Term 1' if fetch fails
      }
    };
    loadCurrentPeriod();
  }, []);

  // Dummy data for demonstration
  const dummyTermsAgenda = [
    { date: '10-01-2026', event: 'Term 1 Begins (2025/2026 academic year)' },
 
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

      // Step 2: Get selected term report for this student
      let reportQuery = supabase
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
        .eq('term', selectedTerm);
      
      // Also filter by academic year if available
      if (currentAcademicYear) {
        reportQuery = reportQuery.eq('academic_year', currentAcademicYear);
      }
      
      const { data: reportData, error: reportError } = await reportQuery
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (reportError || !reportData) {
        setError(`No ${selectedTerm} report found for this student.`);
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
        student_id: studentData.profile_id, // Add student_id for chart comparison
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
        id: studentData.profile_id, // Add id for chart comparison
        first_name: studentData.profiles.first_name,
        last_name: studentData.profiles.last_name,
        sex: studentData.profiles.sex || 'N/A',
        students: { student_id: studentData.student_id },
        profile: { // Add profile structure that chart logic expects
          first_name: studentData.profiles.first_name,
          last_name: studentData.profiles.last_name
        }
      };

      setReportData({ report: formattedReport, student: studentDataForViewer });
    } catch (error) {
      setError(`An error occurred while looking up the report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="guardian-portal-public" style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div className="guardian-portal-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
                  🔍 View Student Report
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
                    <strong>Instructions:</strong> Enter your ward's Student ID and Unique Code exactly as provided by the school. These credentials are case-sensitive. Also, ensure there are no spaces.
                  </p>
                </div>
              </div>
            )}

            {/* Report Display */}
            {reportData && (
              <div style={{ marginTop: '20px' }}>
                <GuardianReportViewer 
                  report={reportData.report} 
                  student={reportData.student}
                  onBack={() => setReportData(null)}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="guardian-portal-sidebar" style={{ display: reportData ? 'none' : 'block' }}>
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
                  📞 Contact Information
                  <span className={`toggle-arrow ${importantInfoOpen ? 'open' : ''}`}>▼</span>
                </h3>
                {importantInfoOpen && (
                  <div className="contact-info">
         
                    <p><strong>Email:</strong> lifeinternationalcollege@gmail.com</p>
                    <p><strong>Emergency Contact:</strong> +233 208 156 742 (Mr. Gasu)</p>
                    <p><strong>Emergency Contact:</strong> +233 249 642 785 (Mr. Tamakloe)</p>
                    <p><strong>Emergency Contact:</strong> +233 244 377 584 (Mrs. Danso)</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardianPortalPublic;
