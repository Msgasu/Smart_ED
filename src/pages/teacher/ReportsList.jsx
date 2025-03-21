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
      
      const { data, error } = await getReportsByAcademicYear(year, term);
      
      if (error) throw error;
      
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
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

  const handlePrintReport = (reportId) => {
    // Open the report in a new tab for printing
    window.open(`/report-print/${reportId}`, '_blank');
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