import React from 'react'
import { FaArrowLeft, FaDownload, FaPrint } from 'react-icons/fa'

const GuardianReportViewer = ({ report, student, onBack }) => {
  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Convert to PDF or save functionality
    window.print()
  }

  const calculateGradeStats = () => {
    const grades = report.student_grades || []
    if (grades.length === 0) return { totalSubjects: 0, highestScore: 0, lowestScore: 0 }

    const scores = grades.map(g => g.total_score || 0)
    return {
      totalSubjects: grades.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores)
    }
  }

  const getGradeRemark = (score) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Very Good'
    if (score >= 70) return 'Good'
    if (score >= 60) return 'Satisfactory'
    if (score >= 50) return 'Fair'
    return 'Poor'
  }

  const getGradeLetter = (score) => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  const stats = calculateGradeStats()

  return (
    <div className="guardian-report-viewer">
      {/* Header - Hidden when printing */}
      <div className="report-header no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--gray-200)'
      }}>
        <button 
          onClick={onBack}
          style={{
            background: 'var(--gray-200)',
            border: 'none',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--gray-700)',
            transition: 'all 0.2s ease'
          }}
        >
          <FaArrowLeft /> Back
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: 'var(--gray-900)', margin: '0 0 0.25rem 0', fontSize: '1.5rem' }}>Student Report</h1>
          <p style={{ color: 'var(--gray-600)', margin: 0, fontSize: '0.875rem' }}>
            {student?.first_name} {student?.last_name} - {report.term} {report.academic_year}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleDownload}
            style={{
              background: 'var(--gray-600)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            <FaDownload /> Download
          </button>
          <button 
            onClick={handlePrint}
            style={{
              background: 'var(--wine)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            <FaPrint /> Print
          </button>
        </div>
      </div>

      {/* Report Content - Print-friendly */}
      <div className="report-content" style={{ 
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid var(--gray-200)',
        fontFamily: 'Arial, sans-serif'
      }}>
        {/* School Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '2px solid var(--gray-200)'
        }}>
          <img 
            src={logo} 
            alt="Life International College" 
            style={{ width: '80px', height: '80px' }}
          />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--wine)', margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
              Life International College
            </h2>
            <p style={{ color: 'var(--lime)', margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.9rem' }}>
              Knowledge • Excellence • Christ
            </p>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
              Private Mail Bag, 252 Tema. / Tel: 024 437 7584
            </p>
            <h3 style={{ color: 'var(--wine)', margin: 0, fontSize: '1.1rem', fontWeight: '600', letterSpacing: '1px' }}>
              TERMINAL REPORT
            </h3>
          </div>
        </div>

        {/* Student Information */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            background: 'var(--gray-50)',
            padding: '0.75rem 1rem',
            borderLeft: '4px solid var(--wine)',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '1rem', fontWeight: '600' }}>
              STUDENT INFORMATION
            </h4>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--gray-50)',
            borderRadius: '6px'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                NAME:
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>
                {student?.first_name} {student?.last_name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                STUDENT ID:
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>
                {student?.students?.student_id || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                GENDER:
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>
                {student?.sex ? student.sex.charAt(0).toUpperCase() + student.sex.slice(1) : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                CLASS:
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>
                {report.class_year || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                TERM:
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>
                {report.term}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                ACADEMIC YEAR:
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>
                {report.academic_year}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                ATTENDANCE:
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>
                {report.attendance || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                POSITION HELD:
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>
                {report.position_held || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                INTEREST:
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>
                {report.interest || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Subject Grades */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            background: 'var(--gray-50)',
            padding: '0.75rem 1rem',
            borderLeft: '4px solid var(--wine)',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '1rem', fontWeight: '600' }}>
              SUBJECT GRADES
            </h4>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
              border: '1px solid var(--gray-200)'
            }}>
              <thead>
                <tr style={{ background: 'var(--gray-100)' }}>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--gray-200)', fontWeight: '600', color: 'var(--gray-900)' }}>
                    SUBJECT
                  </th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'center', borderBottom: '1px solid var(--gray-200)', fontWeight: '600', color: 'var(--gray-900)' }}>
                    CLASS SCORE
                  </th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'center', borderBottom: '1px solid var(--gray-200)', fontWeight: '600', color: 'var(--gray-900)' }}>
                    EXAM SCORE
                  </th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'center', borderBottom: '1px solid var(--gray-200)', fontWeight: '600', color: 'var(--gray-900)' }}>
                    TOTAL SCORE
                  </th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'center', borderBottom: '1px solid var(--gray-200)', fontWeight: '600', color: 'var(--gray-900)' }}>
                    GRADE
                  </th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'center', borderBottom: '1px solid var(--gray-200)', fontWeight: '600', color: 'var(--gray-900)' }}>
                    POSITION
                  </th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--gray-200)', fontWeight: '600', color: 'var(--gray-900)' }}>
                    REMARK
                  </th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'center', borderBottom: '1px solid var(--gray-200)', fontWeight: '600', color: 'var(--gray-900)' }}>
                    TEACHER SIGNATURE
                  </th>
                </tr>
              </thead>
              <tbody>
                {(report.student_grades || []).map((grade, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: '500', color: 'var(--gray-900)' }}>
                      {grade.courses?.course_name || `Subject ${index + 1}`}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', color: 'var(--gray-800)' }}>
                      {grade.class_score || 0}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', color: 'var(--gray-800)' }}>
                      {grade.exam_score || 0}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: '600', color: 'var(--gray-900)' }}>
                      {grade.total_score || 0}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: '600', color: 'var(--wine)' }}>
                      {getGradeLetter(grade.total_score || 0)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', color: 'var(--gray-800)' }}>
                      {grade.position || '-'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontStyle: 'italic', color: 'var(--gray-700)' }}>
                      {grade.remark || getGradeRemark(grade.total_score || 0)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                      {grade.teacher_signature || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Summary */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            background: 'var(--gray-50)',
            padding: '0.75rem 1rem',
            borderLeft: '4px solid var(--wine)',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '1rem', fontWeight: '600' }}>
              PERFORMANCE SUMMARY
            </h4>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--gray-50)',
            borderRadius: '6px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                TOTAL SUBJECTS:
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gray-900)' }}>
                {stats.totalSubjects}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                OVERALL AVERAGE:
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--wine)' }}>
                {report.total_score?.toFixed(1) || '0.0'}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                OVERALL GRADE:
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--wine)' }}>
                {report.overall_grade || 'N/A'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                HIGHEST SCORE:
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--lime-dark)' }}>
                {stats.highestScore}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                LOWEST SCORE:
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gray-600)' }}>
                {stats.lowestScore || 0}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                CONDUCT:
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--gray-900)' }}>
                {report.conduct || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            background: 'var(--gray-50)',
            padding: '0.75rem 1rem',
            borderLeft: '4px solid var(--wine)',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '1rem', fontWeight: '600' }}>
              REMARKS
            </h4>
          </div>
          
          <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: 'var(--gray-900)', fontSize: '0.875rem' }}>Teacher's Remarks:</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--gray-700)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                {report.teacher_remarks || 'No remarks provided'}
              </p>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: 'var(--gray-900)', fontSize: '0.875rem' }}>Headmaster's Remarks:</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--gray-700)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                {report.headmaster_remarks || 'No remarks provided'}
              </p>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: 'var(--gray-900)', fontSize: '0.875rem' }}>House Report:</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--gray-700)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                {report.house_report || 'No house report provided'}
              </p>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: 'var(--gray-900)', fontSize: '0.875rem' }}>Next Class:</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--gray-700)', fontSize: '0.875rem' }}>
                {report.next_class || 'Not specified'}
              </p>
            </div>
            
            <div>
              <strong style={{ color: 'var(--gray-900)', fontSize: '0.875rem' }}>Reopening Date:</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--gray-700)', fontSize: '0.875rem' }}>
                {report.reopening_date || 'Not specified'}
              </p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '2rem', 
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--gray-200)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid var(--gray-400)', height: '40px', marginBottom: '0.5rem' }}></div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>CLASS TEACHER</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid var(--gray-400)', height: '40px', marginBottom: '0.5rem' }}></div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>PRINCIPAL</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid var(--gray-400)', height: '40px', marginBottom: '0.5rem' }}></div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-900)' }}>PARENT/GUARDIAN</div>
          </div>
        </div>

        {/* Generation Date */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--gray-200)',
          fontSize: '0.75rem',
          color: 'var(--gray-500)'
        }}>
          Generated on {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          .report-content { 
            border: none !important; 
            border-radius: 0 !important; 
            padding: 1rem !important;
          }
          body { 
            font-size: 12px !important; 
            line-height: 1.3 !important;
          }
        }
      `}</style>
    </div>
  )
}

export default GuardianReportViewer 