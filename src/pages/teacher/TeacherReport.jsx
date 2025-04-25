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
  deleteSubjectGrade,
  saveStudentReport, 
  getStudentReport, 
  calculateClassScoreFromAssignments
} from '../../backend/teachers';
import './styles/TeacherReport.css';
import { supabase } from '../../lib/supabase';
import { calculateGrade, getGradeColor } from '../../utils/gradeUtils';

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
  const [subjects, setSubjects] = useState([]);

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
    if (!score) return 'F9';
    
    const totalScore = parseFloat(score);
    if (isNaN(totalScore)) return 'F9';

    return calculateGrade(totalScore);
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

  const handleSaveSubjectGrade = async (row) => {
  try {
    let reportId = reportData?.id;

    // 1. Ensure the report exists
    if (!reportId) {
      const { data: newReport, error: reportError } = await supabase
        .from('student_reports')
        .insert({
          student_id: studentId,
          term: termSelectRef.current.value,
          academic_year: academicYearRef.current.value,
          class_year: document.getElementById('studentClass')?.value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (reportError) throw reportError;
      setReportData(newReport);
      reportId = newReport.id;
    }

    // 2. Prepare grade data
    const classScore = parseFloat(row.querySelector('input[placeholder="Score"]')?.value) || 0;
    const examScore = parseFloat(row.querySelector('input[placeholder="Score"]:nth-child(2)')?.value) || 0;
    const totalScore = classScore + examScore;

    const gradeData = {
      report_id: reportId, // Use the updated report ID
      subject_id: row.dataset.courseId,
      class_score: classScore,
      exam_score: examScore,
      total_score: totalScore,
      position: parseInt(row.querySelector('input[placeholder="Position"]')?.value) || 0,
      grade: row.querySelector('input[placeholder="Grade"]')?.value,
      remark: row.querySelector('input[placeholder="Remark"]')?.value,
      teacher_signature: row.querySelector('input[placeholder="Sign"]')?.value,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 3. Save to student_grades table
    const { data: savedGrade, error: gradeError } = await supabase
      .from('student_grades')
      .upsert(gradeData, {
        onConflict: 'report_id,subject_id',
        returning: 'minimal'
      });

    if (gradeError) throw gradeError;

    // 4. Fetch updated student grades
    const { data: reportGrades, error: reportGradesError } = await supabase
      .from('student_grades')
      .select('total_score')
      .eq('report_id', reportId);

    if (reportGradesError) throw reportGradesError;

    // 5. Calculate new total and update report
    const totalScores = reportGrades.map(g => g.total_score).filter(score => score != null);
    const overallTotal = totalScores.reduce((sum, score) => sum + score, 0);
    const average = totalScores.length > 0 ? overallTotal / totalScores.length : 0;

    const { error: updateReportError } = await supabase
      .from('student_reports')
      .update({
        total_score: overallTotal,
        overall_grade: calculateOverallGrade(average),
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (updateReportError) throw updateReportError;

    // 6. Update UI
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

  const fetchStudentCourses = async (studentId) => {
    try {
      // First get student's assigned courses
      const { data: assignedCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select(`
          course_id,
          courses (
            id,
            name,
            code
          )
        `)
        .eq('student_id', studentId);

      if (coursesError) throw coursesError;

      // Then get any existing grades for these courses
      const { data: grades, error: gradesError } = await supabase
        .from('student_grades')
        .select('*')
        .in('subject_id', assignedCourses.map(course => course.course_id));

      if (gradesError) throw gradesError;

      // Map the courses with their grades and calculated class scores
      const coursesWithGrades = [];
      
      for (const course of assignedCourses) {
        const existingGrade = grades?.find(grade => grade.subject_id === course.course_id);
        
        // Calculate class score directly here
        let classScore = '';
        
        // Get all assignments for this course
        const { data: assignments } = await supabase
          .from('assignments')
          .select('*')
          .eq('course_id', course.course_id);
        
        if (assignments && assignments.length > 0) {
          // Get student submissions for these assignments
          const { data: submissions } = await supabase
            .from('student_assignments')
            .select('*')
            .eq('student_id', studentId)
            .in('assignment_id', assignments.map(a => a.id));
          
          if (submissions && submissions.length > 0) {
            // Calculate total points earned and total possible points
            const gradedSubmissions = submissions.filter(s => s.status === 'graded' && s.score !== null);
            
            if (gradedSubmissions.length > 0) {
              let totalScore = 0;
              let maxPossibleScore = 0;
              
              for (const submission of gradedSubmissions) {
                const assignment = assignments.find(a => a.id === submission.assignment_id);
                if (assignment) {
                  totalScore += submission.score;
                  maxPossibleScore += assignment.max_score;
                }
              }
              
              // Calculate percentage and convert to 60% scale
              if (maxPossibleScore > 0) {
                const percentageScore = (totalScore / maxPossibleScore) * 100;
                classScore = (percentageScore * 0.6).toFixed(2); // 60% of total score
              }
            }
          }
        }
        
        coursesWithGrades.push({
          id: Date.now() + Math.random(), // Temporary unique ID for the UI
          courseId: course.course_id,
          name: course.courses.name,
          code: course.courses.code,
          classScore: existingGrade?.class_score || classScore || '', // Use calculated score if no existing grade
          examScore: existingGrade?.exam_score || '',
          totalScore: existingGrade?.total_score || '',
          position: existingGrade?.position || '',
          grade: existingGrade?.grade || '',
          remark: existingGrade?.remark || '',
          teacherSignature: existingGrade?.teacher_signature || ''
        });
      }
      
      return coursesWithGrades;
    } catch (error) {
      console.error('Error fetching student courses:', error);
      return [];
    }
  };

  const loadSavedReport = async () => {
    if (!studentId || !termSelectRef.current?.value || !academicYearRef.current?.value) return;

    try {
      // First, get any existing saved report
      const { data: existingReport, error: reportError } = await supabase
        .from('student_reports')
        .select('*')
        .eq('student_id', studentId)
        .eq('term', termSelectRef.current.value)
        .eq('academic_year', academicYearRef.current.value)
        .single();

      if (reportError && reportError.code !== 'PGRST116') throw reportError;

      // Get student's assigned courses with any existing grades
      const assignedCourses = await fetchStudentCourses(studentId);

      if (existingReport) {
        setReportData(existingReport);
        
        // Populate report fields
        document.getElementById('studentClass').value = existingReport.class_year || '';
        document.getElementById('conduct').value = existingReport.conduct || '';
        document.getElementById('nextClass').value = existingReport.next_class || '';
        document.getElementById('reopeningDate').value = existingReport.reopening_date || '';
        document.getElementById('teacherRemarks').value = existingReport.teacher_remarks || '';
        document.getElementById('principalSignature').value = existingReport.principal_signature || '';
        document.getElementById('attendance').value = existingReport.attendance || '';
      }

      // Set the subjects regardless of whether there's an existing report
      setSubjects(assignedCourses);

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

  // Add effect to listen for term and academic year changes and reload report
  useEffect(() => {
    if (!termSelectRef?.current || !academicYearRef?.current) return;
    
    const handleTermChange = async () => {
      if (termSelectRef.current && academicYearRef.current) {
        const term = termSelectRef.current.value;
        const year = academicYearRef.current.value;
        
        if (term && year) {
          await loadSavedReport();
        }
      }
    };
    
    termSelectRef.current.addEventListener('change', handleTermChange);
    academicYearRef.current.addEventListener('change', handleTermChange);
    academicYearRef.current.addEventListener('blur', handleTermChange);
    
    return () => {
      if (termSelectRef.current) {
        termSelectRef.current.removeEventListener('change', handleTermChange);
      }
      if (academicYearRef.current) {
        academicYearRef.current.removeEventListener('change', handleTermChange);
        academicYearRef.current.removeEventListener('blur', handleTermChange);
      }
    };
  }, [termSelectRef?.current, academicYearRef?.current]);

  const handleSaveReport = async () => {
    try {
      setSaving(true);
      console.log('Starting save process...');

      const reportDetails = {
        student_id: studentId,
        term: termSelectRef.current.value,
        academic_year: academicYearRef.current.value,
        total_score: calculateTotalScore(),
        overall_grade: calculateOverallGrade(calculateTotalScore()),
        teacher_remarks: document.getElementById('teacherRemarks')?.value || '',
        class_year: document.getElementById('studentClass')?.value || '',
        conduct: document.getElementById('conduct')?.value || '',
        next_class: document.getElementById('nextClass')?.value || '',
        reopening_date: document.getElementById('reopeningDate')?.value || '',
        principal_signature: document.getElementById('principalSignature')?.value || '',
        attendance: document.getElementById('attendance')?.value || ''
      };

      console.log('Report details:', reportDetails);

      // First, try to get existing report
      const { data: existingReport, error: fetchError } = await supabase
        .from('student_reports')
        .select('*')
        .eq('student_id', studentId)
        .eq('term', termSelectRef.current.value)
        .eq('academic_year', academicYearRef.current.value)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing report:', fetchError);
        throw fetchError;
      }

      let savedReport;
      if (existingReport) {
        // Update existing report
        const { data: updatedReport, error: updateError } = await supabase
          .from('student_reports')
          .update(reportDetails)
          .eq('id', existingReport.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating report:', updateError);
          throw updateError;
        }
        savedReport = updatedReport;
      } else {
        // Insert new report
        const { data: newReport, error: insertError } = await supabase
          .from('student_reports')
          .insert([reportDetails])
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting report:', insertError);
          throw insertError;
        }
        savedReport = newReport;
      }

      console.log('Saved report:', savedReport);

      if (!savedReport?.id) {
        console.error('No report ID received:', savedReport);
        throw new Error('Failed to get report ID');
      }

      console.log('Got report ID:', savedReport.id);

      // Now save the grades for each subject
      const grades = subjects.map(subject => {
        const classScore = parseFloat(subject.classScore) || 0;
        const examScore = parseFloat(subject.examScore) || 0;
        const totalScore = classScore + examScore;
        const grade = calculateOverallGrade(totalScore); // This ensures we get a valid 2-character grade

        return {
          report_id: savedReport.id,
          subject_id: subject.courseId,
          class_score: classScore,
          exam_score: examScore,
          total_score: totalScore,
          position: parseInt(subject.position) || null,
          grade: grade, // This will be A, B, C, D, or F
          remark: subject.remark || '',
          teacher_signature: subject.teacherSignature || ''
        };
      });

      console.log('Grades to save:', grades);

      // First, delete any existing grades for this report
      const { error: deleteError } = await supabase
        .from('student_grades')
        .delete()
        .eq('report_id', savedReport.id);

      if (deleteError) {
        console.error('Error deleting existing grades:', deleteError);
        throw deleteError;
      }

      // Then insert the new grades
      const { error: insertError } = await supabase
        .from('student_grades')
        .insert(grades);

      if (insertError) {
        console.error('Error inserting grades:', insertError);
        throw insertError;
      }

      // Calculate and update the overall report total score
      const totalScores = grades.map(g => g.total_score).filter(score => !isNaN(score));
      const averageScore = totalScores.length > 0 
        ? totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length 
        : 0;

      // Update the report with the calculated average
      const { error: updateError } = await supabase
        .from('student_reports')
        .update({
          total_score: averageScore.toFixed(2),
          overall_grade: calculateOverallGrade(averageScore)
        })
        .eq('id', savedReport.id);

      if (updateError) {
        console.error('Error updating report total:', updateError);
        throw updateError;
      }

      console.log('Successfully saved grades and updated report total');

      // Update the reportData state with the current report
      setReportData({
        ...savedReport,
        total_score: averageScore.toFixed(2),
        overall_grade: calculateOverallGrade(averageScore)
      });
      setSaved(true);
      toast.success('Report saved successfully');
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for calculations
  const calculateTotalScore = () => {
    if (!subjects.length) return 0;
    const totalScores = subjects.reduce((sum, subject) => 
      sum + (parseFloat(subject.totalScore) || 0), 0);
    return (totalScores / subjects.length).toFixed(2);
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
            subjects={subjects}
            onSubjectsChange={setSubjects}
            studentId={studentId}
            termRef={termSelectRef}
            academicYearRef={academicYearRef}
          />
        </div>
      </div>
    </TeacherLayout>
  );
};

export default TeacherReport;