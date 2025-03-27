import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaSave, FaCheck, FaTrashAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import Reports from '../../components/admin/Reports';
import { 
  getStudentDetails, 
  getStudentAnalytics, 
  getClassPerformanceStats,
  generateStudentReport,
  saveReportDetails,
  saveSubjectGrade,
  deleteSubjectGrade
} from '../../backend/teachers';
import './styles/TeacherReport.css';
import { supabase } from '../../lib/supabase';

const TeacherReport = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [studentGrade, setStudentGrade] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reportData, setReportData] = useState(null);
  const studentNameInputRef = useRef(null);
  const averageInputRef = useRef(null);
  const termSelectRef = useRef(null);
  const academicYearRef = useRef(null);
  const [studentData, setStudentData] = useState({
    name: '',
    dateOfBirth: '',
    age: ''
  });

  // Subscribe to real-time updates for this student's report
  useEffect(() => {
    if (!studentId || !termSelectRef.current?.value || !academicYearRef.current?.value) return;

    const subscription = supabase
      .channel(`student_report_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_reports',
          filter: `student_id=eq.${studentId} AND term=eq.${termSelectRef.current.value} AND academic_year=eq.${academicYearRef.current.value}`
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            await loadSavedReport();
          }
        }
      )
      .on(
        'broadcast',
        { event: 'grade_updated' },
        (payload) => {
          const { report_id, subject_id, grade } = payload.payload;
          if (report_id === reportData?.id) {
            const row = document.querySelector(`tr[data-subject-id="${subject_id}"]`);
            if (row) {
              row.querySelector('input[placeholder="Score"]').value = grade.class_score;
              row.querySelector('input[placeholder="Score"]:nth-child(2)').value = grade.exam_score;
              row.querySelector('.total-score').textContent = grade.total_score;
              row.querySelector('input[placeholder="Position"]').value = grade.position;
              row.querySelector('input[placeholder="Grade"]').value = grade.grade;
              row.querySelector('input[placeholder="Remark"]').value = grade.remark;
              row.querySelector('input[placeholder="Sign"]').value = grade.teacher_signature;
              row.dataset.saved = 'true';
            }
          }
        }
      )
      .on(
        'broadcast',
        { event: 'grade_deleted' },
        (payload) => {
          const { report_id, subject_id } = payload.payload;
          if (report_id === reportData?.id) {
            const row = document.querySelector(`tr[data-subject-id="${subject_id}"]`);
            if (row) {
              row.remove();
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [studentId, termSelectRef.current?.value, academicYearRef.current?.value, reportData?.id]);

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

  // Calculate overall grade based on total score
  const calculateOverallGrade = (score) => {
    if (!score) return 'N/A';
    
    const totalScore = parseFloat(score);
    if (isNaN(totalScore)) return 'N/A';

    if (totalScore >= 90) return 'A';
    if (totalScore >= 80) return 'B';
    if (totalScore >= 70) return 'C';
    if (totalScore >= 60) return 'D';
    if (totalScore > 0) return 'F';
    return 'N/A';
  };

  // Handle saving report details
  const handleSaveReportDetails = async () => {
    try {
      setSaving(true);
      
      const reportData = {
        student_id: studentId,
        term: termSelectRef.current.value,
        academic_year: academicYearRef.current.value,
        class_year: document.getElementById('studentClass')?.value,
        total_score: parseFloat(document.getElementById('average')?.value) || 0,
        overall_grade: calculateOverallGrade(document.getElementById('average')?.value),
        conduct: document.getElementById('conduct')?.value,
        next_class: document.getElementById('nextClass')?.value,
        reopening_date: document.getElementById('reopeningDate')?.value,
        teacher_remarks: document.getElementById('teacherRemarks')?.value,
        principal_signature: document.getElementById('principalSignature')?.value,
        attendance: document.getElementById('attendance')?.value
      };
      
      const { data, error } = await saveReportDetails(reportData);
      
      if (error) throw error;
      
      setReportData(data);
      toast.success('Report details saved successfully');
      setSaved(true);
      
      setTimeout(() => {
        setSaved(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving report details:', error);
      toast.error('Failed to save report details');
    } finally {
      setSaving(false);
    }
  };

  // Handle grade input changes
  const handleGradeInputChange = (row) => {
    const classScore = parseFloat(row.querySelector('input[placeholder="Score"]')?.value) || 0;
    const examScore = parseFloat(row.querySelector('input[placeholder="Score"]:nth-child(2)')?.value) || 0;
    const totalScore = classScore + examScore;
    
    // Update total score display
    row.querySelector('.total-score').textContent = totalScore;
    
    // Calculate and update grade
    const grade = calculateOverallGrade(totalScore);
    row.querySelector('input[placeholder="Grade"]').value = grade;
    
    // Mark as unsaved
    row.dataset.saved = 'false';
  };

  // Handle saving a single subject grade
  const handleSaveSubjectGrade = async (row) => {
    try {
      const gradeData = {
        report_id: reportData.id,
        subject_id: row.dataset.subjectId,
        class_score: parseFloat(row.querySelector('input[placeholder="Score"]')?.value) || 0,
        exam_score: parseFloat(row.querySelector('input[placeholder="Score"]:nth-child(2)')?.value) || 0,
        total_score: parseFloat(row.querySelector('.total-score')?.textContent) || 0,
        position: parseInt(row.querySelector('input[placeholder="Position"]')?.value) || 0,
        grade: row.querySelector('input[placeholder="Grade"]')?.value,
        remark: row.querySelector('input[placeholder="Remark"]')?.value,
        teacher_signature: row.querySelector('input[placeholder="Sign"]')?.value
      };

      const { data, error } = await saveSubjectGrade(gradeData);
      
      if (error) throw error;
      
      // Update the row with saved data
      row.dataset.saved = 'true';
      toast.success('Grade saved successfully');
      
    } catch (error) {
      console.error('Error saving grade:', error);
      toast.error('Failed to save grade');
    }
  };

  const handleDeleteSubjectGrade = async (row) => {
    try {
      const { error } = await deleteSubjectGrade(reportData.id, row.dataset.subjectId);
      
      if (error) throw error;
      
      row.remove();
      toast.success('Grade removed successfully');
      
    } catch (error) {
      console.error('Error deleting grade:', error);
      toast.error('Failed to remove grade');
    }
  };

  const loadSavedReport = async () => {
    if (!studentId || !termSelectRef.current?.value || !academicYearRef.current?.value) return;

    try {
      const { data, error } = await supabase
        .from('student_reports')
        .select(`
          *,
          student_grades (
            *,
            courses (
              id,
              name,
              code
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('term', termSelectRef.current.value)
        .eq('academic_year', academicYearRef.current.value)
        .single();

      if (error) throw error;

      if (data) {
        setReportData(data);
        
        // Populate report data
        document.getElementById('studentClass').value = data.class_year || '';
        document.getElementById('conduct').value = data.conduct || '';
        document.getElementById('nextClass').value = data.next_class || '';
        document.getElementById('reopeningDate').value = data.reopening_date || '';
        document.getElementById('teacherRemarks').value = data.teacher_remarks || '';
        document.getElementById('principalSignature').value = data.principal_signature || '';
        document.getElementById('attendance').value = data.attendance || '';
        
        // Populate grades
        if (data.student_grades) {
          const gradesTable = document.querySelector('.grades-table tbody');
          gradesTable.innerHTML = ''; // Clear existing rows
          
          data.student_grades.forEach(grade => {
            const row = document.createElement('tr');
            row.dataset.subjectId = grade.subject_id;
            row.dataset.saved = 'true';
            row.innerHTML = `
              <td>${grade.courses.code}: ${grade.courses.name}</td>
              <td><input type="text" class="form-control sm" placeholder="Score" value="${grade.class_score}" /></td>
              <td><input type="text" class="form-control sm" placeholder="Score" value="${grade.exam_score}" /></td>
              <td class="total-score">${grade.total_score}</td>
              <td><input type="text" class="form-control sm" placeholder="Position" value="${grade.position}" /></td>
              <td><input type="text" class="form-control sm" placeholder="Grade" value="${grade.grade}" /></td>
              <td><input type="text" class="form-control" placeholder="Remark" value="${grade.remark}" /></td>
              <td><input type="text" class="form-control sm" placeholder="Sign" value="${grade.teacher_signature}" /></td>
              <td>
                <button class="save-grade-btn" title="Save grade">Save</button>
                <button class="delete-btn" title="Remove subject"><FaTrashAlt /></button>
              </td>
            `;

            // Add event listeners
            const inputs = row.querySelectorAll('input');
            inputs.forEach(input => {
              input.addEventListener('change', () => handleGradeInputChange(row));
            });

            // Add save button event listener
            const saveBtn = row.querySelector('.save-grade-btn');
            saveBtn.addEventListener('click', () => handleSaveSubjectGrade(row));

            // Add delete button event listener
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => handleDeleteSubjectGrade(row));

            gradesTable.appendChild(row);
          });
        }
      }
    } catch (error) {
      console.error('Error loading saved report:', error);
      toast.error('Failed to load saved report');
    }
  };

  // Add effect to load saved report when term or academic year changes
  useEffect(() => {
    if (termSelectRef.current?.value && academicYearRef.current?.value) {
      loadSavedReport();
    }
  }, [termSelectRef.current?.value, academicYearRef.current?.value]);

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
              onClick={handleSaveReportDetails} 
              className="save-button"
              disabled={saving || saved}
            >
              {saved ? <FaCheck className="save-icon" /> : <FaSave className="save-icon" />} 
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save Details'}
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