import React, { useState, useRef } from 'react'
import ReportViewer from '../admin/ReportViewer'
import { FaDownload, FaFileAlt, FaChartBar, FaSpinner } from 'react-icons/fa'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const GuardianReportViewer = ({ report, student, onBack }) => {
  console.log('GuardianReportViewer received:', { report, student });
  const reportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  // Fallback print function
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    const reportContent = reportRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${student.first_name} ${student.last_name} - Report - ${report.term} ${report.academic_year}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.4;
          }
          .download-controls, .chart-download-section, .no-print, button { 
            display: none !important; 
          }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .chart-container { page-break-inside: avoid; }
          .school-info h2 { 
            color: #1a202c !important; 
            background: transparent !important;
            font-weight: bold;
            font-size: 1.8rem;
            margin: 0 0 5px 0;
          }
          .school-info h3 { 
            color: #1a202c !important; 
            background: transparent !important;
            font-weight: bold;
            font-size: 1.4rem;
            letter-spacing: 1px;
            margin: 0;
          }
          .school-info p { 
            background: transparent !important;
          }
       
            .school-info * {
              background: transparent !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${reportContent}
      </body>
      </html>
    `);
    
    // printWindow.document.close();
    // printWindow.focus();
    
    // setTimeout(() => {
    //   printWindow.print();
    //   printWindow.close();
    // }, 500);
  };

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

  // Download full report as PDF with preserved styling
  const downloadReport = async () => {
    setDownloading(true);
    setDownloadProgress('Preparing report...');
    
    try {
      const reportElement = reportRef.current;
      if (!reportElement) {
        throw new Error('Report content not found');
      }

      setDownloadProgress('Preparing elements...');
      
      // Temporarily hide download UI elements during capture
      const downloadControls = document.querySelector('.download-controls');
      const chartDownloadSection = document.querySelector('.chart-download-section');
      
      if (downloadControls) downloadControls.style.display = 'none';
      if (chartDownloadSection) chartDownloadSection.style.display = 'none';

      setDownloadProgress('Capturing report content...');
      

      // Wait a moment for any lazy-loaded content
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simplified html2canvas configuration for better compatibility
      const canvas = await html2canvas(reportElement, {
        scale: 1.2, // Reduced scale to avoid memory issues
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: true, // Enable logging for debugging
        removeContainer: true,
        foreignObjectRendering: false,
        imageTimeout: 15000, // 15 second timeout for images
        onclone: (clonedDoc) => {
          console.log('Cloning document for PDF generation...');
          
          // Clean up the cloned document
          const elementsToRemove = clonedDoc.querySelectorAll(
            '.download-controls, .chart-download-section, .no-print, button[class*="download"]'
          );
          console.log('Removing', elementsToRemove.length, 'UI elements from PDF');
          elementsToRemove.forEach(el => el.remove());
          
          // Fix color rendering issues
          const schoolInfo = clonedDoc.querySelector('.school-info');
          if (schoolInfo) {
            const h2 = schoolInfo.querySelector('h2');
            const h3 = schoolInfo.querySelector('h3');
            const paragraphs = schoolInfo.querySelectorAll('p');
            
            if (h2) {
              h2.style.color = '#1a202c';
              h2.style.background = 'transparent';
            }
            if (h3) {
              h3.style.color = '#1a202c';
              h3.style.background = 'transparent';
            }
            paragraphs.forEach(p => {
              p.style.background = 'transparent';
            });
          }
        }
      });


      // Restore UI elements
      if (downloadControls) downloadControls.style.display = 'flex';
      if (chartDownloadSection) chartDownloadSection.style.display = 'block';

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to capture report content');
      }

      setDownloadProgress('Creating PDF...');
      
      // Create PDF with error handling
      const imgData = canvas.toDataURL('image/png', 0.95); // Slightly compressed
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Calculate dimensions to fit A4 with margins
      const imgWidth = 190; // A4 width minus margins
      const pageHeight = 277; // A4 height minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // Top margin

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10; // Account for margin
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      setDownloadProgress('Saving PDF...');
      
      // Generate filename and save
      const fileName = `${student.first_name}_${student.last_name}_Report_${report.term}_${report.academic_year.replace('/', '-')}.pdf`;
      pdf.save(fileName);

      setDownloadProgress('Complete!');

    } catch (error) {
      console.error('Detailed PDF error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Offer fallback option
      const useFallback = confirm(`Advanced PDF generation failed: ${errorMessage}\n\nWould you like to use the print dialog instead? (Click OK for print dialog, Cancel to retry)`);
      
      if (useFallback) {
        try {
          printReport();
          setDownloadProgress('Opening print dialog...');
        } catch (printError) {
          console.error('Print fallback error:', printError);
          alert('Both PDF generation methods failed. Please try refreshing the page and ensure the report is fully loaded.');
        }
      } else {
        alert('PDF generation cancelled. Please ensure the report is fully loaded and try again.');
      }
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress('');
      }, 1000);
    }
  };



  try {
    return (
      <div className="guardian-report-container">
        {/* Download Controls */}
        <div className="download-controls no-print" style={{ 
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
            <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
              Download options available below
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={downloadReport}
              disabled={downloading}
              style={{
                padding: '10px 15px',
                backgroundColor: downloading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: downloading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '14px',
                opacity: downloading ? 0.7 : 1
              }}
            >
              {downloading ? <FaSpinner className="fa-spin" /> : <FaFileAlt />}
              {downloading ? downloadProgress || 'Generating PDF...' : 'Download as PDF'}
            </button>
            

            
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
        </div>

        {/* Report Content - Only this section will be included in PDF */}
        <div ref={reportRef} className="pdf-content">
          <ReportViewer 
            report={transformedReport}
            customNavigate={customNavigate}
            isGuardianView={true}
          />
        </div>

        {/* Chart Download Section */}
        <div className="chart-download-section no-print" style={{ 
          marginTop: '30px', 
          padding: '20px', 
          backgroundColor: '#fff', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ marginBottom: '20px', color: '#495057' }}>
            <FaChartBar style={{ marginRight: '8px' }} />
            Performance Charts - Download Options
          </h4>
          
          <p style={{ marginBottom: '20px', color: '#6c757d', fontSize: '14px' }}>
            The charts below are the same as shown in the report above. You can download them individually as high-quality PNG images.
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px' 
          }}>
            {/* Class Comparison Chart Download */}
            <div style={{ 
              padding: '15px', 
              border: '1px solid #e9ecef', 
              borderRadius: '5px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <h5 style={{ margin: '0 0 10px 0' }}>📊 Class Comparison Chart</h5>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#6c757d' }}>
                Compare your performance with classmates
              </p>
              <button 
                onClick={async () => {
                  try {
                    // Find the chart in the report content
                    const reportElement = reportRef.current;
                    const chartCanvases = reportElement?.querySelectorAll('.chart-container canvas');
                    const classChart = chartCanvases?.[0]; // First chart
                    
                    if (classChart) {
                      // Use html2canvas for better quality if needed
                      const canvas = await html2canvas(classChart, {
                        scale: 2,
                        backgroundColor: '#ffffff'
                      });
                      
                      const link = document.createElement('a');
                      link.download = `${student.first_name}_${student.last_name}_Class_Comparison_${report.term}_${report.academic_year}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    } else {
                      alert('Class comparison chart not found. Please wait for the charts to load completely.');
                    }
                  } catch (error) {
                    console.error('Error downloading chart:', error);
                    alert('Failed to download chart. Please try again.');
                  }
                }}
                style={{
                  padding: '8px 15px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '13px'
                }}
              >
                <FaDownload />
                Download Chart
              </button>
            </div>

            {/* Subject Performance Chart Download */}
            <div style={{ 
              padding: '15px', 
              border: '1px solid #e9ecef', 
              borderRadius: '5px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <h5 style={{ margin: '0 0 10px 0' }}>📈 Subject Performance Chart</h5>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#6c757d' }}>
                Individual subject breakdown and scores
              </p>
              <button 
                onClick={async () => {
                  try {
                    // Find the second chart in the report content
                    const reportElement = reportRef.current;
                    const chartCanvases = reportElement?.querySelectorAll('.chart-container canvas');
                    const subjectChart = chartCanvases?.[1]; // Second chart
                    
                    if (subjectChart) {
                      // Use html2canvas for better quality if needed
                      const canvas = await html2canvas(subjectChart, {
                        scale: 2,
                        backgroundColor: '#ffffff'
                      });
                      
                      const link = document.createElement('a');
                      link.download = `${student.first_name}_${student.last_name}_Subject_Performance_${report.term}_${report.academic_year}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    } else {
                      alert('Subject chart not found. Please wait for the charts to load completely.');
                    }
                  } catch (error) {
                    console.error('Error downloading chart:', error);
                    alert('Failed to download chart. Please try again.');
                  }
                }}
                style={{
                  padding: '8px 15px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '13px'
                }}
              >
                <FaDownload />
                Download Chart
              </button>
            </div>
          </div>
          
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#e7f3ff', 
            borderRadius: '5px',
            border: '1px solid #b3d9ff'
          }}>
            <h6 style={{ margin: '0 0 5px 0', color: '#0066cc' }}>💡 Download Options:</h6>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#004499', fontSize: '13px' }}>
              <li><strong>Download as PDF:</strong> High-quality PDF with all styling preserved (recommended)</li>
              <li><strong>Charts:</strong> Individual charts saved as PNG images</li>
              <li><strong>Auto-naming:</strong> Files automatically named with student name and term</li>

            </ul>
          </div>
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