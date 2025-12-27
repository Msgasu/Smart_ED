import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { FaArrowLeft, FaPrint, FaDownload, FaFileAlt, FaClock, FaExclamationTriangle } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { getReportById, REPORT_STATUS } from '../lib/reportApi'
import toast from 'react-hot-toast'
import AdminLayout from './AdminLayout'
import './ReportViewer.css'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import logo from '../assets/logo_nbg.png'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

const ReportViewer = ({ report: propReport, customNavigate, isGuardianView = false, fromReportBank = false }) => {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Check if coming from Report Bank via URL parameter
  const urlParams = new URLSearchParams(location.search)
  const fromReportBankParam = urlParams.get('fromReportBank')
  const isFromReportBank = fromReportBank || fromReportBankParam === 'true'
  console.log('ReportViewer debug:', { 
    fromReportBank, 
    locationSearch: location.search, 
    urlParam: fromReportBankParam,
    isFromReportBank,
    fullUrl: window.location.href
  })
  
  // Helper function to get display percentages based on form level (text only)
  const getDisplayPercentages = (classYear) => {
    if (!classYear) return { classText: '30%', examText: '70%' }; // Default: Class 30%, Exam 70%
    
    const classYearStr = classYear.toString().toLowerCase();
    
    if (classYearStr.includes('form1') || classYearStr.includes('form 1')) {
      return { classText: '30%', examText: '70%' }; // Class 30%, Exam 70%
    } else if (classYearStr.includes('form2') || classYearStr.includes('form 2')) {
      return { classText: '30%', examText: '70%' }; // Class 30%, Exam 70%
    }
    
    // Default for other forms/grades
    return { classText: '30%', examText: '70%' }; // Class 30%, Exam 70%
  };

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [isIncomplete, setIsIncomplete] = useState(false)
  const [classComparisonData, setClassComparisonData] = useState(null)
  const [subjectPerformanceData, setSubjectPerformanceData] = useState(null)

  useEffect(() => {
    const init = async () => {
      if (isGuardianView && propReport) {
        // Guardian mode: use provided report data
        setReport(propReport)
        setLoading(false)
        if (propReport && !propReport.incomplete) {
          // For guardian mode, fetch chart data like admin view
          await fetchChartData(propReport)
        }
      } else {
        // Admin mode: fetch data normally
        await fetchUserProfile()
        if (reportId) {
          fetchReport()
        }
      }
    }
    init()
  }, [reportId, propReport, isGuardianView])
  
  useEffect(() => {
    if (userProfile && reportId && !isGuardianView) {
      fetchReport()
    }
  }, [userProfile])

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchReport = async () => {
    try {
      setLoading(true)
      
      // Use new API to fetch report with status validation
      const includeIncomplete = userProfile?.role === 'admin'
      const { data: reportData, error } = await getReportById(reportId, includeIncomplete)

      if (error) {
        toast.error(error)
        return
      }

      if (!reportData) {
        toast.error('Report not found')
        return
      }

      // Check if report is incomplete - admins can view draft reports
      if (reportData.incomplete && userProfile?.role !== 'admin') {
        setIsIncomplete(true)
        setReport(reportData)
        return
      }

      setReport(reportData)
      setIsIncomplete(false)
      
      // Fetch chart data after report is loaded
      if (reportData && !reportData.incomplete) {

        await fetchChartData(reportData)
      } else {
        console.log('Report incomplete or missing, skipping chart data')
      }
      
    } catch (error) {
      console.error('Error fetching report:', error)
      toast.error('Error loading report')
    } finally {
      setLoading(false)
    }
  }

  // Fetch data for charts
  const fetchChartData = async (reportData) => {
    try {
      // Get all students in the same class and term/year for comparison
      let classReports = []
      let classError = null
      
             // First try exact match
       const { data: exactMatch, error: exactError } = await supabase
         .from('student_reports')
         .select(`
           student_id,
           total_score,
           status,
           class_year,
           term,
           academic_year,
           student:students!student_reports_student_id_fkey (
             profile_id,
             profile:profiles!students_profile_id_fkey (
               id,
               first_name,
               last_name
             )
           )
         `)
         .eq('class_year', reportData.class_year)
         .eq('term', reportData.term)
         .eq('academic_year', reportData.academic_year)
         .not('total_score', 'is', null)
         .gt('total_score', 0)

      if (exactMatch && exactMatch.length > 0) {
        classReports = exactMatch
        console.log('Found exact class match:', reportData.class_year)
      } else {
        // Try partial match (in case there are formatting differences)
        const classYearParts = reportData.class_year.split(' ')
        if (classYearParts.length >= 2) {
          const formPart = classYearParts[0] + ' ' + classYearParts[1] // "Form 2"
          const housePart = classYearParts[2] // "Loyalty"
          
                     const { data: partialMatch, error: partialError } = await supabase
             .from('student_reports')
             .select(`
               student_id,
               total_score,
               status,
               class_year,
               term,
               academic_year,
               student:students!student_reports_student_id_fkey (
                 profile_id,
                 profile:profiles!students_profile_id_fkey (
                   id,
                   first_name,
                   last_name
                 )
               )
             `)
             .ilike('class_year', `%${formPart}%${housePart}%`)
             .eq('term', reportData.term)
             .eq('academic_year', reportData.academic_year)
             .not('total_score', 'is', null)
             .gt('total_score', 0)
          
          if (partialMatch && partialMatch.length > 0) {
            classReports = partialMatch
            console.log('Found partial class match using:', formPart, housePart)
          } else {
            classError = partialError
            console.log('No partial match found either')
          }
        } else {
          classError = exactError
        }
      }

      if (classError) {
        console.error('Error fetching class reports:', classError)
        throw classError
      }

      console.log('Class reports fetched:', classReports?.length || 0, 'reports')
      console.log('Current report data:', {
        class_year: reportData.class_year,
        term: reportData.term,
        academic_year: reportData.academic_year,
        student_id: reportData.student_id,
        total_score: reportData.total_score
      })
      console.log('Sample class report data:', classReports?.[0])
      
      // Debug: Check what class_year values exist in the database
      const { data: allClasses, error: classError2 } = await supabase
        .from('student_reports')
        .select('class_year, term, academic_year')
        .eq('term', reportData.term)
        .eq('academic_year', reportData.academic_year)
        .not('class_year', 'is', null)
      
      if (!classError2 && allClasses) {
        const uniqueClasses = [...new Set(allClasses.map(r => r.class_year))]
        console.log('Available class_year values in database:', uniqueClasses)
        console.log('Looking for class_year:', reportData.class_year)
      }

      // Generate class comparison data
      generateClassComparisonChart(reportData, classReports || [])
      
      // Generate subject performance data
      await generateSubjectPerformanceChart(reportData)

    } catch (error) {
      console.error('Error fetching chart data:', error)
    }
  }

    // Generate class average comparison chart
  const generateClassComparisonChart = (currentReport, classReports) => {
    try {
      console.log('Generating class comparison chart...')
      const currentStudentAverage = currentReport.total_score || 0
      const currentStudentId = currentReport.student_id
      
      console.log('Current student ID:', currentStudentId)
      console.log('Class reports received:', classReports?.length || 0)
      
      // Get all valid class averages including the current student
      const allStudentAverages = classReports
        .filter(r => r.total_score && r.total_score > 0 && r.student?.profile)
        .map(r => ({
          average: r.total_score,
          isCurrentStudent: r.student_id === currentStudentId,
          studentName: r.student?.profile ? `${r.student.profile.first_name} ${r.student.profile.last_name}` : 'Unknown Student',
          firstName: r.student?.profile ? r.student.profile.first_name : 'Unknown'
        }))

      console.log('All student averages:', allStudentAverages.length)

      if (allStudentAverages.length === 0) {
        console.log('No class comparison data available')
        setClassComparisonData(null)
        return
      }

      // Sort by average for better visualization (highest to lowest)
      allStudentAverages.sort((a, b) => b.average - a.average)

      // Create labels - show actual name for selected student, generic names for others
      const labels = allStudentAverages.map((student, index) => {
        if (student.isCurrentStudent) {
          return student.firstName // Show actual name for selected student
        }
        return `Student ${index + 1}` // Generic names for other students
      })
      const scores = allStudentAverages.map(student => student.average)
      
      // Color coding: Highlight current student in red, others in blue
      const backgroundColors = allStudentAverages.map(student => {
        if (student.isCurrentStudent) {
          return 'rgba(255, 99, 132, 0.8)' // Bright red for current student
        }
        return 'rgba(54, 162, 235, 0.6)' // Blue for other students
      })

      const borderColors = allStudentAverages.map(student => {
        if (student.isCurrentStudent) {
          return 'rgba(255, 99, 132, 1)'
        }
        return 'rgba(54, 162, 235, 1)'
      })

      const chartData = {
        labels,
        datasets: [
          {
            label: 'Term Average (%)',
            data: scores,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2
          }
        ]
      }

      console.log('Class comparison chart data generated with', allStudentAverages.length, 'students')
      setClassComparisonData(chartData)
    } catch (error) {
      console.error('Error generating class comparison chart:', error)
      setClassComparisonData(null)
    }
  }



  // Generate subject performance breakdown chart (student's individual scores only)
  const generateSubjectPerformanceChart = async (reportData) => {
    const subjects = reportData.student_grades || []
    
    if (subjects.length === 0) {
      console.log('No subject grades found')
      setSubjectPerformanceData(null)
      return
    }

    // Create chart data showing only the student's individual subject scores
    const labels = subjects.map(grade => grade.courses?.name || 'Unknown Subject')
    const studentScores = subjects.map(grade => grade.total_score || 0)

    // Color coding based on individual performance levels - Very distinct colors
    const backgroundColors = studentScores.map(score => {
      if (score >= 80) return 'rgba(16, 185, 129, 0.8)' // Emerald Green for excellent (A)
      if (score >= 70) return 'rgba(59, 130, 246, 0.8)' // Bright Blue for good (B)
      if (score >= 60) return 'rgba(245, 158, 11, 0.8)' // Amber Orange for average (C)
      if (score >= 50) return 'rgba(139, 69, 19, 0.8)' // Brown for below average (D)
      return 'rgba(220, 38, 127, 0.8)' // Hot Pink for poor (F)
    })

    const borderColors = studentScores.map(score => {
      if (score >= 80) return 'rgba(16, 185, 129, 1)' // Emerald Green
      if (score >= 70) return 'rgba(59, 130, 246, 1)' // Bright Blue  
      if (score >= 60) return 'rgba(245, 158, 11, 1)' // Amber Orange
      if (score >= 50) return 'rgba(139, 69, 19, 1)' // Brown
      return 'rgba(220, 38, 127, 1)' // Hot Pink
    })

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Subject Score (%)',
          data: studentScores,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2
        }
      ]
    }

    console.log('Subject performance chart generated with', subjects.length, 'subjects')
    setSubjectPerformanceData(chartData)
  }

  const handlePrint = () => {
    setPrinting(true)
    window.print()
    setTimeout(() => setPrinting(false), 1000)
  }

  const handleDownload = () => {
    // Create a blob with the report content
    const reportContent = document.querySelector('.report-content').innerHTML
    const blob = new Blob([reportContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.student.first_name}_${report.student.last_name}_${report.term}_${report.academic_year}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleNavigate = (path) => {
    console.log('handleNavigate called with:', { path, isFromReportBank, isGuardianView })
    if (isGuardianView && customNavigate) {
      customNavigate(path)
    } else if (path === -1 && (isFromReportBank || fromReportBankParam === 'true')) {
      // If coming from Report Bank, go back to Report Bank
      console.log('Navigating back to Report Bank')
      navigate('/admin/report-bank')
    } else {
      navigate(path)
    }
  }

  const calculateGradeStats = () => {
    if (!report?.student_grades) return {}
    
    const grades = report.student_grades
    const total = grades.reduce((sum, grade) => sum + (grade.total_score || 0), 0)
    const average = grades.length > 0 ? total / grades.length : 0
    const highest = Math.max(...grades.map(g => g.total_score || 0))
    const lowest = Math.min(...grades.map(g => g.total_score || 0))
    
    return {
      total: grades.length,
      average: Math.round(average * 100) / 100,
      highest,
      lowest
    }
  }

  const getGradeBadgeClass = (grade) => {
    const gradeLower = grade?.toLowerCase()
    switch(gradeLower) {
      case 'a': return 'grade-a'
      case 'b': return 'grade-b'
      case 'c': return 'grade-c'
      case 'd': return 'grade-d'
      case 'f': return 'grade-f'
      default: return 'grade-default'
    }
  }

  if (loading) {
    return (
      <AdminLayout user={null} profile={userProfile}>
        <div className="report-viewer">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading report...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // Add error boundary for debugging
  if (!report && !loading) {
    console.error('Report is null but not loading')
    return (
      <AdminLayout user={null} profile={userProfile}>
        <div className="report-viewer">
          <div className="error-container">
            <FaFileAlt className="error-icon" />
            <h2>Error Loading Report</h2>
            <p>There was an error loading the report. Please check the console for details.</p>
            <button 
              className="btn btn-primary"
              onClick={() => handleNavigate('/admin/classes')}
            >
              Back to Classes
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!report) {
    return (
      <AdminLayout user={null} profile={userProfile}>
        <div className="report-viewer">
          <div className="error-container">
            <FaFileAlt className="error-icon" />
            <h2>Report Not Found</h2>
            <p>The requested report could not be found.</p>
            <button 
              className="btn btn-primary"
              onClick={() => handleNavigate('/admin/classes')}
            >
              Back to Classes
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // Handle incomplete reports
  if (isIncomplete) {
    return (
      <AdminLayout user={null} profile={userProfile}>
        <div className="report-viewer">
          <div className="report-header no-print">
            <button 
              className="back-button"
              onClick={() => handleNavigate(-1)}
            >
              <FaArrowLeft /> Back
            </button>
            <div className="header-content">
              <h1>Report Not Finalized</h1>
              <p className="page-description">
                This report is currently in draft status
              </p>
            </div>
          </div>

          <div className="incomplete-report-container">
            <div className="incomplete-message">
              <FaExclamationTriangle className="warning-icon" />
              <h2>This report is not yet finalized</h2>
              <p>
                The report you are trying to view is still in draft status and has not been 
                completed by the administration. Please check back later or contact your administrator.
              </p>
              
              {userProfile?.role === 'admin' && (
                <div className="admin-note">
                  <p><strong>Admin Note:</strong> This report is in draft status. You can complete it from the class reports page.</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleNavigate('/admin/classes')}
                  >
                    Go to Class Management
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const stats = calculateGradeStats()

  console.log('Rendering ReportViewer:', {
    report: !!report,
    loading,
    userProfile: !!userProfile,
    classComparisonData: !!classComparisonData,
    subjectPerformanceData: !!subjectPerformanceData
  })
  
  // Debug student ID data
  if (report) {
    console.log('Student data structure:', {
      student: report.student,
      students: report.student?.students,
      studentId: report.student?.students?.student_id
    })
  }

  const ReportContent = () => (
    <div className="report-viewer">
        {/* Header - Hidden when printing */}
        <div className="report-header no-print">
          <button 
            className="back-button"
            onClick={() => handleNavigate(-1)}
          >
            <FaArrowLeft /> {(isFromReportBank || fromReportBankParam === 'true') ? 'Back to Report Bank' : 'Back'}
          </button>
          <div className="header-content">
            <h1>Student Report {report.status === 'draft' && <span className="badge bg-warning ms-2">DRAFT</span>}</h1>
            <p className="page-description">
              {report.student.first_name} {report.student.last_name} - {report.term} {report.academic_year}
            </p>
          </div>
          <div className="header-actions">
            {(isFromReportBank || fromReportBankParam === 'true') && (
              <button 
                className="btn btn-outline-secondary"
                onClick={() => navigate('/admin/report-bank')}
                style={{ marginRight: '10px' }}
              >
                ← Report Bank
              </button>
            )}
            <button 
              className="btn btn-secondary"
              onClick={handleDownload}
              disabled={printing}
            >
              <FaDownload /> Download
            </button>
            <button 
              className="btn btn-primary"
              onClick={handlePrint}
              disabled={printing}
            >
              <FaPrint /> {printing ? 'Printing...' : 'Print'}
            </button>
          </div>
        </div>

        {/* Report Content - Print-friendly */}
        <div className="report-content">
          {/* School Header */}
          <div className="school-header">
            <div className="school-logo">
              <img 
                src={logo} 
                alt="Life International College" 
                style={{ width: '80px', height: '80px' }}
              />
            </div>
                          <div className="school-info">
                <h2 style={{ color: '#1a202c', fontWeight: 'bold', fontSize: '1.8rem', margin: '0 0 5px 0' }}>Life International College</h2>
                <p style={{ color: '#2f855a', fontWeight: '600', fontSize: '1rem', margin: '0 0 5px 0' }}>Christ • Knowledge • Excellence</p>
                <p style={{ color: '#2d3748', fontSize: '0.9rem', margin: '0 0 15px 0' }}>Private Mail Bag, 252 Tema / Tel: 024 437 7584</p>
                <h3 style={{ color: '#1a202c', fontWeight: 'bold', fontSize: '1.4rem', letterSpacing: '1px', margin: '0' }}>TERMINAL REPORT</h3>
              </div>
          </div>



          {/* Student Information */}
          <div className="student-info-section">
            <div className="section-header">
              <h4>Student Information</h4>
            </div>
            <div className="student-info-grid">
              <div className="info-item">
                <span className="label">Name:</span>
                <span className="value">{report.student.first_name} {report.student.last_name}</span>
              </div>
                             <div className="info-item">
                 <span className="label">Student ID:</span>
                 <span className="value">{report.student?.students?.student_id || 'N/A'}</span>
               </div>
              <div className="info-item">
                <span className="label">Gender:</span>
                <span className="value">{report.student.sex ? report.student.sex.charAt(0).toUpperCase() + report.student.sex.slice(1) : 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Class:</span>
                <span className="value">{report.class_year || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Term:</span>
                <span className="value">{report.term}</span>
              </div>
              <div className="info-item">
                <span className="label">Academic Year:</span>
                <span className="value">{report.academic_year}</span>
              </div>
                             <div className="info-item">
                 <span className="label">Attendance:</span>
                 <span className="value">{report.attendance || 'N/A'}</span>
               </div>
               <div className="info-item">
                 <span className="label">Overall Average:</span>
                 <span className="value">{report.total_score || 0}%</span>
               </div>
            </div>
          </div>

          {/* Grades Table */}
          <div className="grades-section">
            <div className="section-header">
              <h4>Subject Grades</h4>
            </div>
            <div className="grades-table">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Class Score ({getDisplayPercentages(report?.class_year).classText})</th>
                    <th>Exam Score ({getDisplayPercentages(report?.class_year).examText})</th>
                    <th>Total Score</th>
                    <th>Grade</th>
                    <th>Position</th>
                    <th>Remark</th>
                    <th>Teacher Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {report.student_grades?.map((grade, index) => (
                    <tr key={grade.id}>
                      <td className="subject-name">
                        {grade.courses?.name || 'Unknown Subject'}
                      </td>
                      <td className="score">{grade.class_score || 0}</td>
                      <td className="score">{grade.exam_score || 0}</td>
                      <td className="score total">{grade.total_score || 0}</td>
                      <td className="grade">
                        <span className={`grade-badge ${getGradeBadgeClass(grade.grade)}`}>
                          {grade.grade || 'N/A'}
                        </span>
                      </td>
                      <td className="position">{grade.position || '-'}</td>
                      <td className="remark">{grade.remark || '-'}</td>
                      <td className="teacher-signature">{grade.teacher_signature || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="performance-section">
            <div className="section-header">
              <h4>Performance Summary</h4>
            </div>
            <div className="performance-grid">
              <div className="performance-item">
                <span className="label">Total Subjects:</span>
                <span className="value">{stats.total}</span>
              </div>
              <div className="performance-item">
                <span className="label">Overall Grade:</span>
                <span className="value">
                  <span className={`grade-badge ${getGradeBadgeClass(report.overall_grade)}`}>
                    {report.overall_grade || 'N/A'}
                  </span>
                </span>
              </div>
              <div className="performance-item">
                <span className="label">Highest Score:</span>
                <span className="value">{stats.highest || 0}%</span>
              </div>
              <div className="performance-item">
                <span className="label">Lowest Score:</span>
                <span className="value">{stats.lowest || 0}%</span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="additional-info-section">
            <div className="section-header">
              <h4>Additional Information</h4>
            </div>
            <div className="additional-info-grid">
              <div className="info-item">
                <span className="label">Position Held:</span>
                <span className="value">{report.position_held || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Conduct:</span>
                <span className="value">{report.conduct || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Next Class:</span>
                <span className="value">{report.next_class || 'Not specified'}</span>
              </div>
                             <div className="info-item">
                 <span className="label">Reopening Date:</span>
                 <span className="value">{report.reopening_date || 'Not specified'}</span>
               </div>
               <div className="info-item">
                 <span className="label">Interest:</span>
                 <span className="value">{report.interest || 'N/A'}</span>
               </div>
            </div>
          </div>

          {/* Performance Comparison Charts */}
          <div className="performance-charts-section">
            <div className="section-header">
              <h4>Performance Analysis</h4>
            </div>
            <div className="charts-grid">
              <div className="chart-container">
                <h5>Term Averages - All Students in Class</h5>
                <div className="chart-wrapper">
                  {classComparisonData ? (
                    <Bar
                      data={classComparisonData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          title: {
                            display: true,
                            text: 'Term Averages Comparison'
                          },
                          legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                                             generateLabels: function(chart) {
                                 return [
                                   {
                                     text: 'Selected Student',
                                     fillStyle: 'rgba(255, 99, 132, 0.8)',
                                     strokeStyle: 'rgba(255, 99, 132, 1)',
                                     lineWidth: 2
                                   },
                                   {
                                     text: 'Classmates',
                                     fillStyle: 'rgba(54, 162, 235, 0.6)',
                                     strokeStyle: 'rgba(54, 162, 235, 1)',
                                     lineWidth: 1
                                   }
                                 ];
                               }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            suggestedMax: 100,
                            title: {
                              display: true,
                              text: 'Term Average (%)'
                            }
                          },
                          x: {
                            title: {
                              display: true,
                              text: 'Students in Class'
                            }
                          }
                        }
                      }}
                      height={400}
                    />
                  ) : (
                    <div className="no-chart-data">
                      <p>No class comparison data available</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="chart-container">
                <h5>Individual Subject Performance</h5>
                <div className="chart-wrapper">
                  {subjectPerformanceData ? (
                    <Bar
                      data={subjectPerformanceData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          title: {
                            display: true,
                            text: 'Subject Performance Breakdown'
                          },
                          legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                              generateLabels: function(chart) {
                                return [
                                  {
                                    text: 'Excellent (80-100%)',
                                    fillStyle: 'rgba(16, 185, 129, 0.8)',
                                    strokeStyle: 'rgba(16, 185, 129, 1)',
                                    lineWidth: 1
                                  },
                                  {
                                    text: 'Good (70-79%)',
                                    fillStyle: 'rgba(59, 130, 246, 0.8)',
                                    strokeStyle: 'rgba(59, 130, 246, 1)',
                                    lineWidth: 1
                                  },
                                  {
                                    text: 'Average (60-69%)',
                                    fillStyle: 'rgba(245, 158, 11, 0.8)',
                                    strokeStyle: 'rgba(245, 158, 11, 1)',
                                    lineWidth: 1
                                  },
                                  {
                                    text: 'Below Average (50-59%)',
                                    fillStyle: 'rgba(139, 69, 19, 0.8)',
                                    strokeStyle: 'rgba(139, 69, 19, 1)',
                                    lineWidth: 1
                                  },
                                  {
                                    text: 'Poor (<50%)',
                                    fillStyle: 'rgba(220, 38, 127, 0.8)',
                                    strokeStyle: 'rgba(220, 38, 127, 1)',
                                    lineWidth: 1
                                  }
                                ];
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            suggestedMax: 100,
                            title: {
                              display: true,
                              text: 'Subject Score (%)'
                            }
                          },
                          x: {
                            title: {
                              display: true,
                              text: 'Subjects'
                            }
                          }
                        }
                      }}
                      height={400}
                    />
                  ) : (
                    <div className="no-chart-data">
                      <p>No subject performance data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Remarks Section */}
          <div className="remarks-section">
            <div className="section-header">
              <h4>Remarks & Comments</h4>
            </div>
            <div className="remarks-content">
              <div className="remark-item">
                <span className="label">Teacher's Remarks:</span>
                <p className="remark-text">{report.teacher_remarks || 'No remarks provided'}</p>
              </div>
              <div className="remark-item">
                <span className="label">Headmaster's Remarks:</span>
                <p className="remark-text">{report.headmaster_remarks || 'No remarks provided'}</p>
              </div>
              <div className="remark-item">
                <span className="label">House Report:</span>
                <p className="remark-text">{report.house_report || 'No house report provided'}</p>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="section-header">
              <h4>Signatures</h4>
            </div>
            <div className="signatures-grid">
              <div className="signature-item">
                <div className="signature-content">
                  <div className="signature-line">
                    <span className="signature-value">
                      {report.class_teacher_signature || '___________________________'}
                    </span>
                  </div>
                  <span className="signature-label">Class Teacher</span>
                 
                </div>
              </div>
              <div className="signature-item">
                <div className="signature-content">
                  <div className="signature-line">
                    <span className="signature-value">
                      {report.house_master_signature || '___________________________'}
                    </span>
                  </div>
                  <span className="signature-label">House Master/Mistress</span>
                  
                </div>
              </div>
              <div className="signature-item">
                <div className="signature-content">
                  <div className="signature-line">
                    <span className="signature-value">
                      {report.principal_signature || '___________________________'}
                    </span>
                  </div>
                  <span className="signature-label">Principal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="report-footer">
            <p>SmartED LMS © 2025</p>
          </div>
        </div>
      </div>
    )

  // Return the component with or without AdminLayout based on mode
  if (isGuardianView) {
    return <ReportContent />
  }

  return (
    <AdminLayout user={null} profile={userProfile}>
      <ReportContent />
    </AdminLayout>
  )
}

export default ReportViewer 