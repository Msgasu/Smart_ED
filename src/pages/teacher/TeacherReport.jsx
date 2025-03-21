import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaSave, FaCheck } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import Reports from '../../components/admin/Reports';
import { 
  getStudentDetails, 
  getStudentAnalytics, 
  getClassPerformanceStats,
  generateStudentReport 
} from '../../backend/teachers';
import './styles/TeacherReport.css';

const TeacherReport = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [studentGrade, setStudentGrade] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const studentNameInputRef = useRef(null);
  const averageInputRef = useRef(null);
  const termSelectRef = useRef(null);
  const academicYearRef = useRef(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        
        // Get basic student details
        const { data: studentData, error: studentError } = await getStudentDetails(studentId);
        if (studentError) throw studentError;
        
        // Get student analytics for grade information
        const { data: analyticsData, error: analyticsError } = await getStudentAnalytics(studentId);
        if (analyticsError) throw analyticsError;
        
        setStudent(studentData);
        
        // If we have assignments, we can get the course ID and fetch grade information
        if (analyticsData && analyticsData.assignments && analyticsData.assignments.length > 0) {
          const firstAssignment = analyticsData.assignments[0];
          const courseId = firstAssignment.assignments.course_id;
          setCourseId(courseId);
          
          // Get class performance stats to find student's position
          const { data: classData, error: classError } = await getClassPerformanceStats(courseId);
          if (classError) throw classError;
          
          // Find this student's grade info
          const studentStats = classData.students.find(s => s.id === studentId);
          if (studentStats) {
            setStudentGrade(studentStats);
          }
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
        toast.error('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  // Auto-populate student information after component renders and data is loaded
  useEffect(() => {
    if (!loading && student && studentNameInputRef.current) {
      // Populate student name field
      studentNameInputRef.current.value = `${student.first_name} ${student.last_name}`;
      
      // If we have grade information, populate the average field
      if (studentGrade && averageInputRef.current) {
        averageInputRef.current.value = `${studentGrade.gradePercentage}%`;
      }
      
      // Set default values for term and academic year
      if (termSelectRef.current && academicYearRef.current) {
        // Get current month to determine term
        const currentMonth = new Date().getMonth() + 1; // January is 0
        let currentTerm = 'Term 1';
        
        if (currentMonth >= 9 && currentMonth <= 12) {
          currentTerm = 'Term 1';
        } else if (currentMonth >= 1 && currentMonth <= 4) {
          currentTerm = 'Term 2';
        } else {
          currentTerm = 'Term 3';
        }
        
        termSelectRef.current.value = currentTerm;
        
        // Set academic year (e.g., "2023-2024")
        const currentYear = new Date().getFullYear();
        const academicYear = currentMonth >= 9 
          ? `${currentYear}-${currentYear + 1}` 
          : `${currentYear - 1}-${currentYear}`;
        
        academicYearRef.current.value = academicYear;
      }
      
      // Focus on the first input after populating
      studentNameInputRef.current.focus();
    }
  }, [loading, student, studentGrade]);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveReport = async () => {
    if (!courseId || !studentId) {
      toast.error('Missing course or student information');
      return;
    }

    try {
      setSaving(true);
      
      // Get the term and academic year from the form
      const term = termSelectRef.current.value;
      const academicYear = academicYearRef.current.value;
      
      if (!term || !academicYear) {
        toast.error('Please select a term and academic year');
        return;
      }
      
      // Generate and save the report
      const { data, error } = await generateStudentReport(
        studentId,
        courseId,
        term,
        academicYear
      );
      
      if (error) throw error;
      
      toast.success('Report saved successfully');
      setSaved(true);
      
      // Reset saved status after 3 seconds
      setTimeout(() => {
        setSaved(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="report-container">
          <div className="loading-spinner">
            <p>Loading student data...</p>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="report-container">
        <div className="report-header">
          <Link to={`/teacher/students/${studentId}`} className="back-button">
            <FaArrowLeft /> Back to Student Analysis
          </Link>
          <h1 className="report-title">Student Report</h1>
          <div className="report-actions">
            <div className="report-meta-controls">
              <div className="form-group">
                <label htmlFor="termSelect">Term:</label>
                <select id="termSelect" ref={termSelectRef} className="form-control">
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="academicYear">Academic Year:</label>
                <input 
                  type="text" 
                  id="academicYear" 
                  ref={academicYearRef} 
                  className="form-control" 
                  placeholder="e.g. 2023-2024" 
                />
              </div>
            </div>
            <button 
              onClick={handleSaveReport} 
              className="save-button"
              disabled={saving || saved}
            >
              {saved ? <FaCheck className="save-icon" /> : <FaSave className="save-icon" />} 
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save Report'}
            </button>
            <button 
              onClick={handlePrint} 
              className="print-button"
            >
              <FaPrint className="print-icon" /> Print Report
            </button>
          </div>
        </div>
        
        <div className="report-content" id="printable-report">
          <Reports 
            studentNameRef={studentNameInputRef}
            averageRef={averageInputRef}
          />
        </div>
      </div>
    </TeacherLayout>
  );
};

export default TeacherReport;