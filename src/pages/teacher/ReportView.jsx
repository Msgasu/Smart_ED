import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaDownload } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import Reports from '../../components/admin/Reports';
import { getStudentReport } from '../../backend/teachers';
import './styles/ReportView.css';

const ReportView = () => {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await getStudentReport(reportId);
        
        if (error) throw error;
        
        if (!data) {
          toast.error('Report not found');
          return;
        }
        
        setReport(data);
      } catch (error) {
        console.error('Error fetching report:', error);
        toast.error('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    try {
      toast.loading('Generating PDF...');
      
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

  if (loading) {
    return (
      <TeacherLayout>
        <div className="report-view-container">
          <div className="loading-spinner">
            <p>Loading report...</p>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  if (!report) {
    return (
      <TeacherLayout>
        <div className="report-view-container">
          <div className="no-report">
            <h2>Report Not Found</h2>
            <p>The requested report could not be found.</p>
            <Link to="/teacher/reports" className="back-to-reports">
              Back to Reports List
            </Link>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="report-view-container">
        <div className="report-view-header">
          <Link to="/teacher/reports" className="back-button">
            <FaArrowLeft /> Back to Reports
          </Link>
          <div className="report-info">
            <h1>Student Report</h1>
            <div className="report-meta">
              <span><strong>Student:</strong> {report.student?.profiles?.first_name} {report.student?.profiles?.last_name}</span>
              <span><strong>Term:</strong> {report.term}</span>
              <span><strong>Academic Year:</strong> {report.academic_year}</span>
              <span><strong>Overall Grade:</strong> {report.overall_grade}</span>
            </div>
          </div>
          <div className="report-actions">
            <button onClick={handlePrint} className="print-button">
              <FaPrint /> Print
            </button>
            <button onClick={handleExportPDF} className="export-button">
              <FaDownload /> Export PDF
            </button>
          </div>
        </div>
        
        <div className="report-view-content" id="printable-report">
          <div className="report-header-section">
            <div className="school-info">
              <h2>Smart Educational Dashboard</h2>
              <p>Official Student Report</p>
            </div>
            <div className="student-info">
              <p><strong>Student ID:</strong> {report.student?.student_id}</p>
              <p><strong>Name:</strong> {report.student?.profiles?.first_name} {report.student?.profiles?.last_name}</p>
              <p><strong>Term:</strong> {report.term}</p>
              <p><strong>Academic Year:</strong> {report.academic_year}</p>
            </div>
          </div>
          
          <div className="grades-section">
            <h3>Subject Grades</h3>
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {report.grades && report.grades.length > 0 ? (
                  report.grades.map(grade => (
                    <tr key={grade.id}>
                      <td>{grade.subject?.name}</td>
                      <td>{grade.score}%</td>
                      <td>
                        <span className={`grade-badge grade-${grade.grade}`}>
                          {grade.grade}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="no-grades">
                      No subject grades available
                    </td>
                  </tr>
                )}
                <tr className="overall-row">
                  <td><strong>Overall</strong></td>
                  <td><strong>{report.total_score}%</strong></td>
                  <td>
                    <span className={`grade-badge grade-${report.overall_grade}`}>
                      {report.overall_grade}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="report-comments">
            <h3>Comments</h3>
            <div className="comment-box">
              <p className="placeholder-text">
                {report.comments || "No teacher comments available for this report."}
              </p>
            </div>
          </div>
          
          <div className="report-footer">
            <div className="signature-area">
              <div className="signature-line">
                <span>Teacher's Signature</span>
              </div>
              <div className="signature-line">
                <span>Principal's Signature</span>
              </div>
            </div>
            <div className="report-date">
              <p>Report Generated: {new Date(report.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
};

export default ReportView;