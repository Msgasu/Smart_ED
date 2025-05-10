import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaFileAlt, FaEye, FaPrint, FaDownload } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import { 
  getReportsByAcademicYear, 
  searchStudentReports,
  getStudentReport 
} from '../../backend/teachers';
import { supabase } from '../../lib/supabase';
import './styles/ReportsList.css';

const ReportsList = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [currentTerm, setCurrentTerm] = useState('');
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    // Set default academic year based on current date
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // January is 0
    const currentYear = currentDate.getFullYear();
    
    // Academic year is typically Sept-Aug, so if we're in Sept or later, it's currentYear-nextYear
    const defaultAcademicYear = currentMonth >= 9 
      ? `${currentYear}-${currentYear + 1}` 
      : `${currentYear - 1}-${currentYear}`;
    
    setAcademicYear(defaultAcademicYear);
    
    // Get available academic years from reports (could be from a settings API in a real app)
    const thisYear = currentDate.getFullYear();
    const availableYears = [];
    
    // Generate a list of academic years (current and previous 4 years)
    for (let i = 0; i < 5; i++) {
      const startYear = thisYear - i;
      availableYears.push(`${startYear}-${startYear + 1}`);
    }
    
    setAcademicYears(availableYears);
    
    // Initialize reports list
    fetchReports(defaultAcademicYear);
  }, []);

  const fetchReports = async (year, term = null) => {
    try {
      setLoading(true);
      
      // First check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication error: ' + authError.message);
      if (!user) throw new Error('User not authenticated');

      console.log('Fetching reports for year:', year, 'term:', term);
      const { data, error } = await getReportsByAcademicYear(year, term);
      
      if (error) {
        console.error('Error from getReportsByAcademicYear:', error);
        throw error;
      }
      
      console.log('Reports data received:', data);
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error(error.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      // If search is cleared, reset to standard view by academic year
      return fetchReports(academicYear, currentTerm || null);
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await searchStudentReports(searchTerm, academicYear);
      
      if (error) throw error;
      
      if (data) {
        setStudents(data.students || []);
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error searching reports:', error);
      toast.error('Failed to search reports');
    } finally {
      setLoading(false);
    }
  };

  const handleAcademicYearChange = (e) => {
    const year = e.target.value;
    setAcademicYear(year);
    fetchReports(year, currentTerm || null);
  };

  const handleTermChange = (e) => {
    const term = e.target.value;
    setCurrentTerm(term);
    fetchReports(academicYear, term === 'all' ? null : term);
  };

  const handlePrintReport = async (reportId) => {
    try {
      // Get the report data first
      const { data: report, error } = await getStudentReport(reportId);
      
      if (error) throw error;
      if (!report) {
        toast.error('Report not found');
        return;
      }
      
      // Create a new window for printing just the report content
      const printWindow = window.open('', '_blank');
      
      // Create HTML content for printing
      printWindow.document.write(`
        <html>
          <head>
            <title>Student Report - ${report.student?.profiles?.first_name} ${report.student?.profiles?.last_name}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
              }
              .school-info h2 {
                font-size: 1.5rem;
                margin: 0 0 5px 0;
                color: #2c3e50;
              }
              .report-header-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid #e5e7eb;
              }
              .student-info p {
                margin: 5px 0;
              }
              .grades-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              .grades-table th, .grades-table td {
                padding: 10px;
                text-align: left;
                border-bottom: 1px solid #e5e7eb;
              }
              .grades-table th {
                background-color: #f8fafc;
                font-weight: bold;
              }
              .grade-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: 600;
                text-align: center;
                min-width: 30px;
              }
              .grade-A {
                background-color: #e3f9e5;
                color: #1e7c2b;
              }
              .grade-B2, .grade-B3 {
                background-color: #e3f1f9;
                color: #1e567c;
              }
              .grade-C4, .grade-C5, .grade-C6 {
                background-color: #f9f3e3;
                color: #7c6a1e;
              }
              .grade-D7 {
                background-color: #f9e9e3;
                color: #7c4d1e;
              }
              .grade-E8 {
                background-color: #f9e3e3;
                color: #7c1e1e;
              }
              .grade-F9 {
                background-color: #f9e3e3;
                color: #7c1e1e;
              }
              .info-row {
                display: flex;
                margin-bottom: 20px;
                gap: 20px;
              }
              .info-column {
                flex: 1;
              }
              .info-column h3 {
                font-size: 1.2rem;
                margin: 0 0 10px 0;
                color: #2c3e50;
                border-bottom: 2px solid #3b82f6;
                padding-bottom: 5px;
              }
              .info-box {
                background-color: #f8fafc;
                padding: 15px;
                border-radius: 4px;
              }
              .signature-area {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
              }
              .signature-line {
                width: 45%;
                border-top: 1px solid #64748b;
                padding-top: 5px;
                text-align: center;
              }
              .report-date {
                margin-top: 20px;
                text-align: right;
                font-size: 0.9em;
                color: #64748b;
              }
            </style>
          </head>
          <body>
            <div class="report-content">
              <div class="report-header-section">
                <div class="school-info">
                  <h2>Smart Educational Dashboard</h2>
                  <p>Official Student Report</p>
                  <p><strong>Term:</strong> ${report.term}</p>
                  <p><strong>Academic Year:</strong> ${report.academic_year}</p>
                </div>
                <div class="student-info">
                  <p><strong>Student ID:</strong> ${report.student?.student_id || ''}</p>
                  <p><strong>Name:</strong> ${report.student?.profiles?.first_name || ''} ${report.student?.profiles?.last_name || ''}</p>
                  <p><strong>Class:</strong> ${report.class_year || 'Not specified'}</p>
                </div>
              </div>
              
              <div class="grades-section">
                <h3>Subject Performance</h3>
                <table class="grades-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Class Score (60%)</th>
                      <th>Exam Score (40%)</th>
                      <th>Total Score</th>
                      <th>Grade</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${report.grades && report.grades.length > 0 ? 
                      report.grades.map(grade => `
                        <tr>
                          <td>${grade.subject?.name || ''}</td>
                          <td>${grade.class_score || '-'}</td>
                          <td>${grade.exam_score || '-'}</td>
                          <td>${grade.total_score || '-'}%</td>
                          <td>${grade.grade || '-'}</td>
                          <td>${grade.remark || '-'}</td>
                        </tr>
                      `).join('') : 
                      `<tr><td colspan="6" style="text-align:center">No subject grades available</td></tr>`
                    }
                  </tbody>
                </table>
              </div>
              
              <div class="info-row">
                <div class="info-column">
                  <h3>Academic Summary</h3>
                  <div class="info-box">
                    <p><strong>Overall Score:</strong> ${report.total_score}%</p>
                    <p><strong>Overall Grade:</strong> ${report.overall_grade}</p>
                  </div>
                </div>
                <div class="info-column">
                  <h3>Attendance</h3>
                  <div class="info-box">
                    ${report.attendance || 'No attendance information available'}
                  </div>
                </div>
              </div>
              
              <div class="info-row">
                <div class="info-column">
                  <h3>Conduct</h3>
                  <div class="info-box">
                    ${report.conduct || 'No conduct information available'}
                  </div>
                </div>
                <div class="info-column">
                  <h3>Teacher's Remarks</h3>
                  <div class="info-box">
                    ${report.teacher_remarks || 'No teacher remarks available'}
                  </div>
                </div>
              </div>
              
              <div class="signature-area">
                <div class="signature-line">
                  <span>Teacher's Signature</span>
                </div>
                <div class="signature-line">
                  <span>Principal's Signature: ${report.principal_signature || ''}</span>
                </div>
              </div>
              <div class="report-date">
                <p>Report Generated: ${new Date(report.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Print after a short delay to ensure content is loaded
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
      
    } catch (error) {
      console.error('Error printing report:', error);
      toast.error('Failed to print report');
    }
  };

  const handleExportPDF = async (reportId) => {
    try {
      toast.loading('Generating PDF...');
      
      // Get the report data
      const { data, error } = await getStudentReport(reportId);
      
      if (error) throw error;
      
      // Here you would normally generate a PDF 
      // Since that requires additional libraries, we'll just simulate it
      setTimeout(() => {
        toast.dismiss();
        toast.success('PDF Generated');
        
        // In a real implementation, you would:
        // 1. Generate PDF with a library like jsPDF
        // 2. Trigger a download with the generated file
      }, 1500);
      
    } catch (error) {
      toast.dismiss();
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const getUserProfile = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user;
  };

  return (
    <TeacherLayout>
      <div className="reports-list-container">
        <div className="reports-header">
          <h1>Student Reports</h1>
          <div className="filter-controls">
            <div className="academic-year-filter">
              <label htmlFor="academicYear">Academic Year:</label>
              <select 
                id="academicYear" 
                value={academicYear} 
                onChange={handleAcademicYearChange}
                className="form-control"
              >
                {academicYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="term-filter">
              <label htmlFor="term">Term:</label>
              <select 
                id="term" 
                value={currentTerm} 
                onChange={handleTermChange}
                className="form-control"
              >
                <option value="all">All Terms</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by student name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="search-button">
            <FaSearch /> Search
          </button>
        </div>
        
        {loading ? (
          <div className="loading-spinner">
            <p>Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="no-reports">
            <FaFileAlt className="no-reports-icon" />
            <p>No reports found for the selected filters.</p>
            {searchTerm && (
              <p>
                Try searching with a different term or view all reports for this academic year.
              </p>
            )}
          </div>
        ) : (
          <div className="reports-table-container">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Term</th>
                  <th>Grade</th>
                  <th>Score</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => (
                  <tr key={report.id}>
                    <td>
                      {report.student?.profiles?.first_name} {report.student?.profiles?.last_name}
                      <div className="student-id">{report.student?.student_id}</div>
                    </td>
                    <td>
                      {report.term}
                      <div className="academic-year">{report.academic_year}</div>
                    </td>
                    <td>
                      <span className={`grade-badge grade-${report.overall_grade}`}>
                        {report.overall_grade}
                      </span>
                    </td>
                    <td>{report.total_score}%</td>
                    <td>{new Date(report.updated_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <Link 
                        to={`/teacher/report-view/${report.id}`} 
                        className="view-button"
                        title="View Report"
                      >
                        <FaEye />
                      </Link>
                      <button 
                        onClick={() => handlePrintReport(report.id)} 
                        className="print-button"
                        title="Print Report"
                      >
                        <FaPrint />
                      </button>
                      <button 
                        onClick={() => handleExportPDF(report.id)} 
                        className="export-button"
                        title="Export as PDF"
                      >
                        <FaDownload />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default ReportsList;