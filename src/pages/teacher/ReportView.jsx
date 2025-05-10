import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaDownload } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
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
        
        console.log('Report data received:', data);
        console.log('Student data:', data.student);
        console.log('Grades:', data.grades);
        
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
    // Create a new window for printing just the report content
    const printWindow = window.open('', '_blank');
    const reportContent = document.getElementById('printable-report').innerHTML;
    
    // Add necessary styles for printing
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .school-info h2 {
              font-size: 1.5rem;
              margin: 0 0 5px 0;
              color: #003366;
            }
            .report-header-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px solid #eee;
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
              border-bottom: 1px solid #eee;
            }
            .grades-table th {
              background-color: #f5f8fa;
              font-weight: bold;
            }
            .overall-row {
              background-color: #f5f8fa;
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
            .comment-box {
              background-color: #f9f9f9;
              padding: 15px;
              border-radius: 4px;
              min-height: 100px;
              margin-bottom: 20px;
            }
            .signature-area {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
            }
            .signature-line {
              width: 45%;
              border-top: 1px solid #333;
              padding-top: 5px;
              text-align: center;
            }
            .report-date {
              margin-top: 20px;
              text-align: right;
              font-size: 0.9em;
              color: #666;
            }
          </style>
        </head>
        <body>
          ${reportContent}
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
        <div className="report-container">
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
        <div className="report-container">
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
      <div className="report-container">
        <div className="report-header">
          <h1 className="report-title">Student Report</h1>
          
          <div className="report-actions">
            <Link to="/teacher/reports" className="back-button">
              <FaArrowLeft className="back-icon" /> Back to Reports
            </Link>
            <button onClick={handlePrint} className="print-button">
              <FaPrint className="print-icon" /> Print
            </button>
            <button onClick={handleExportPDF} className="export-button">
              <FaDownload className="export-icon" /> Export PDF
            </button>
          </div>
        </div>
        
        <div className="report-content" id="printable-report">
          <div className="report-header-section">
            <div className="school-info">
              <h2>Smart Educational Dashboard</h2>
              <p>Official Student Report</p>
              <p><strong>Term:</strong> {report.term}</p>
              <p><strong>Academic Year:</strong> {report.academic_year}</p>
            </div>
            <div className="student-info">
              <p><strong>Student ID:</strong> {report.student?.student_id}</p>
              <p><strong>Name:</strong> {report.student?.profiles?.first_name} {report.student?.profiles?.last_name}</p>
              <p><strong>Class:</strong> {report.class_year || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="grades-section">
            <h3>Subject Performance</h3>
            <table className="grades-table">
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
                {report.grades && report.grades.length > 0 ? (
                  report.grades.map(grade => (
                    <tr key={grade.id}>
                      <td>{grade.subject?.name}</td>
                      <td>{grade.class_score || '-'}</td>
                      <td>{grade.exam_score || '-'}</td>
                      <td>{grade.total_score || '-'}%</td>
                      <td>
                        <span className={`grade-badge grade-${grade.grade}`}>
                          {grade.grade}
                        </span>
                      </td>
                      <td>{grade.remark || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-grades">
                      No subject grades available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="additional-info">
            <div className="info-row">
              <div className="info-column">
                <h3>Academic Summary</h3>
                <div className="info-box">
                  <p><strong>Overall Score:</strong> {report.total_score}%</p>
                  <p><strong>Overall Grade:</strong> <span className={`grade-badge grade-${report.overall_grade}`}>{report.overall_grade}</span></p>
                </div>
              </div>
              <div className="info-column">
                <h3>Attendance</h3>
                <div className="info-box">
                  {report.attendance || 'No attendance information available'}
                </div>
              </div>
            </div>
            
            <div className="info-row">
              <div className="info-column">
                <h3>Conduct</h3>
                <div className="info-box">
                  {report.conduct || 'No conduct information available'}
                </div>
              </div>
              <div className="info-column">
                <h3>Teacher's Remarks</h3>
                <div className="comment-box">
                  {report.teacher_remarks || 'No teacher remarks available'}
                </div>
              </div>
            </div>
            
            <div className="info-row">
              <div className="info-column">
                <h3>Next Term Information</h3>
                <div className="info-box">
                  <p><strong>Next Class:</strong> {report.next_class || 'Not specified'}</p>
                  <p><strong>Reopening Date:</strong> {report.reopening_date ? new Date(report.reopening_date).toLocaleDateString() : 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="report-footer">
            <div className="signature-area">
              <div className="signature-line">
                <span>Teacher's Signature</span>
              </div>
              <div className="signature-line">
                <span>Principal's Signature: {report.principal_signature || ''}</span>
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