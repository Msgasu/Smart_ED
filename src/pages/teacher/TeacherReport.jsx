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

  // Calculate student age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    
    const dob = new Date(dateOfBirth);
    const today = new Date();
    
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    // If birthday hasn't occurred yet this year, subtract one year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  };

  // Helper function to calculate class score (60% of total)
  const calculateClassScore = async (studentId, courseId) => {
    try {
      // Get all assignments for this course
      const { data: assignments, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId);
      
      if (assignmentError) throw assignmentError;
      
      if (!assignments || assignments.length === 0) return 0;
      
      // Get student submissions for these assignments
      const { data: submissions, error: submissionError } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('student_id', studentId)
        .in('assignment_id', assignments.map(a => a.id));
      
      if (submissionError) throw submissionError;
      
      if (!submissions || submissions.length === 0) return 0;
      
      // Calculate total points earned and total possible points
      const gradedSubmissions = submissions.filter(s => s.status === 'graded' && s.score !== null);
      
      if (gradedSubmissions.length === 0) return 0;
      
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
        return parseFloat((percentageScore * 0.6).toFixed(2)); // 60% of total score
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating class score:', error);
      return 0;
    }
  };

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
        
        // Calculate student age from date of birth and set in state
        let age = '';
        if (studentData.date_of_birth) {
          age = calculateAge(studentData.date_of_birth);
          console.log('Student age calculated:', age);
        }
        
        // Update student data state with calculated age
        setStudentData({
          name: `${studentData.first_name} ${studentData.last_name}`,
          dateOfBirth: studentData.date_of_birth,
          age: age
        });
        
        // Set the age field directly for immediate display
        const ageInput = document.getElementById('studentAge');
        if (ageInput) {
          ageInput.value = age;
          console.log('Setting age field directly to:', age);
        }
        
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
      
      // Populate student age field if available
      if (studentData.age) {
        const ageInput = document.getElementById('studentAge');
        if (ageInput) {
          ageInput.value = studentData.age;
        }
      }
      
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
  }, [loading, student, studentGrade, studentData]);

  // Update subjects when they change to ensure proper formatting
  useEffect(() => {
    if (subjects && subjects.length > 0) {
      // Check if any subjects have non-string score values that need conversion
      const hasNonStringValues = subjects.some(subject => 
        (subject.classScore !== undefined && subject.classScore !== null && typeof subject.classScore !== 'string') ||
        (subject.examScore !== undefined && subject.examScore !== null && typeof subject.examScore !== 'string') ||
        (subject.totalScore !== undefined && subject.totalScore !== null && typeof subject.totalScore !== 'string')
      );
      
      // Only update if there are actually non-string values to fix
      if (hasNonStringValues) {
        console.log('Converting non-string score values to strings');
        
        // Format all numeric values as strings
        const formattedSubjects = subjects.map(subject => ({
          ...subject,
          classScore: subject.classScore !== undefined && subject.classScore !== null ? 
            subject.classScore.toString() : '',
          examScore: subject.examScore !== undefined && subject.examScore !== null ? 
            subject.examScore.toString() : '',
          totalScore: subject.totalScore !== undefined && subject.totalScore !== null ? 
            subject.totalScore.toString() : ''
        }));
        
        setSubjects(formattedSubjects);
      }
    }
  }, []);  // Only run once on mount

  const handlePrint = () => {
    window.print();
  };

  // Handle term selection change
  const handleTermChange = () => {
    loadSavedReport();
  };

  // Handle academic year change
  const handleAcademicYearChange = () => {
    loadSavedReport();
  };

  // Calculate overall grade based on total score
  const calculateOverallGrade = (score) => {
    if (!score) return 'F9';
    
    const totalScore = parseFloat(score);
    if (isNaN(totalScore)) return 'F9';

    if (totalScore >= 95) return 'A1';
    if (totalScore >= 90) return 'A2';
    if (totalScore >= 85) return 'B2';
    if (totalScore >= 80) return 'B3';
    if (totalScore >= 75) return 'B4';
    if (totalScore >= 70) return 'C4';
    if (totalScore >= 65) return 'C5';
    if (totalScore >= 60) return 'C6';
    if (totalScore >= 55) return 'D7';
    if (totalScore >= 50) return 'D8';
    if (totalScore >= 45) return 'E8';
    if (totalScore >= 40) return 'E9';
    return 'F9';
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
    
    // Calculate grade using the new format
    const grade = calculateOverallGrade(totalScore);
    console.log(`Saving grade: classScore=${classScore}, examScore=${examScore}, totalScore=${totalScore}, grade=${grade}`);

    const gradeData = {
      report_id: reportId, // Use the updated report ID
      subject_id: row.dataset.courseId,
      class_score: classScore,
      exam_score: examScore,
      total_score: totalScore,
      position: parseInt(row.querySelector('input[placeholder="Position"]')?.value) || 0,
      grade: grade, // Use the new grade format
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
      console.log("Loading report for student:", studentId);
      
      // First, get any existing saved report
      const { data: existingReport, error: reportError } = await supabase
        .from('student_reports')
        .select('*')
        .eq('student_id', studentId)
        .eq('term', termSelectRef.current.value)
        .eq('academic_year', academicYearRef.current.value)
        .single();

      if (reportError && reportError.code !== 'PGRST116') throw reportError;

      // Get student's assigned courses
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
      
      const coursesWithGrades = [];
      
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
        
        // Get saved grades for this report
        const { data: grades, error: gradesError } = await supabase
          .from('student_grades')
          .select('*')
          .eq('report_id', existingReport.id);
          
        if (gradesError) throw gradesError;
        
        // Process each assigned course
        for (const course of assignedCourses) {
          const existingGrade = grades?.find(grade => grade.subject_id === course.course_id);
          
          coursesWithGrades.push({
            id: Date.now() + Math.random(), // Temporary unique ID for the UI
            courseId: course.course_id,
            name: course.courses.name,
            code: course.courses.code,
            classScore: existingGrade?.class_score || '',
            examScore: existingGrade?.exam_score || '',
            totalScore: existingGrade?.total_score || '',
            position: existingGrade?.position || '',
            grade: existingGrade?.grade || '',
            remark: existingGrade?.remark || '',
            teacherSignature: existingGrade?.teacher_signature || ''
          });
        }
        
        // Update the average score display
        if (averageInputRef.current && existingReport.total_score) {
          averageInputRef.current.value = `${existingReport.total_score}%`;
        }
      } else {
        // No existing report, calculate class scores for each course
        console.log("No existing report found. Calculating scores for each course...");
        
        for (const course of assignedCourses) {
          try {
            // Calculate the 60% score directly from assignments
            console.log(`Calculating score for course: ${course.courses.name} (${course.course_id})`);
            const result = await calculateClassScoreFromAssignments(studentId, course.course_id);
            const score = result.data;
            
            console.log(`Course ${course.courses.name} (${course.course_id}): Calculated 60% score = ${score}`);
            
            // Always convert to string (even if 0)
            const scoreAsString = score.toString();
            
            // Create the subject grade object with the calculated score
            const subjectGrade = {
              id: Date.now() + Math.random(),
              courseId: course.course_id,
              name: course.courses.name,
              code: course.courses.code,
              classScore: scoreAsString,
              examScore: '',
              totalScore: scoreAsString, // Default total to class score if no exam score yet
              position: '',
              grade: calculateOverallGrade(score),
              remark: '',
              teacherSignature: ''
            };
            
            console.log(`Adding subject with 60% score: ${JSON.stringify(subjectGrade)}`);
            coursesWithGrades.push(subjectGrade);
          } catch (error) {
            console.error(`Error calculating 60% score for course ${course.course_id}:`, error);
            coursesWithGrades.push({
              id: Date.now() + Math.random(),
              courseId: course.course_id,
              name: course.courses.name,
              code: course.courses.code,
              classScore: '',
              examScore: '',
              totalScore: '',
              position: '',
              grade: '',
              remark: '',
              teacherSignature: ''
            });
          }
        }
      }
      
      console.log('Setting subjects with calculated grades:', coursesWithGrades);
      
      // Log individual subjects to see their values
      coursesWithGrades.forEach((subject, index) => {
        console.log(`Subject ${index}: ${subject.name}, Class Score: ${subject.classScore}`);
      });
      
      setSubjects(coursesWithGrades);
      
      // Set a timeout to check if the subjects are properly set in state
      setTimeout(() => {
        console.log('Current subjects in state:', subjects);
      }, 1000);
    } catch (error) {
      console.error('Error loading saved report:', error);
      toast.error('Failed to load saved report');
    }
  };

  // Call loadSavedReport when term or academic year changes
  useEffect(() => {
    if (termSelectRef.current?.value && academicYearRef.current?.value) {
      loadSavedReport();
    }
  }, [termSelectRef.current?.value, academicYearRef.current?.value]);

  // Helper function to calculate class score from assignments
  const calculateClassScoreFromAssignments = async (studentId, courseId) => {
    try {
      console.log(`Calculating class score for student ${studentId}, course ${courseId}`);
      
      // Get all assignments for this course
      const { data: assignments } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId);
      
      if (!assignments || assignments.length === 0) {
        console.log(`No assignments found for course ${courseId}`);
        return { data: 0 };
      }
      
      console.log(`Found ${assignments.length} assignments for course ${courseId}`);
      
      // Get student submissions for these assignments
      const { data: submissions } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('student_id', studentId)
        .in('assignment_id', assignments.map(a => a.id));
      
      if (!submissions || submissions.length === 0) {
        console.log(`No submissions found for student ${studentId} in course ${courseId}`);
        return { data: 0 };
      }
      
      console.log(`Found ${submissions.length} submissions for student ${studentId} in course ${courseId}`);
      
      // Calculate total points earned and total possible points
      const gradedSubmissions = submissions.filter(s => s.status === 'graded' && s.score !== null);
      
      if (gradedSubmissions.length === 0) {
        console.log(`No graded submissions found for student ${studentId} in course ${courseId}`);
        return { data: 0 };
      }
      
      console.log(`Found ${gradedSubmissions.length} graded submissions`);
      
      let totalScore = 0;
      let maxPossibleScore = 0;
      
      for (const submission of gradedSubmissions) {
        const assignment = assignments.find(a => a.id === submission.assignment_id);
        if (assignment) {
          totalScore += submission.score;
          maxPossibleScore += assignment.max_score;
        }
      }
      
      console.log(`Total score: ${totalScore}/${maxPossibleScore}`);
      
      // Calculate percentage and convert to 60% scale
      if (maxPossibleScore > 0) {
        const percentageScore = (totalScore / maxPossibleScore) * 100;
        const score60Percent = (percentageScore * 0.6);
        
        // Round to 2 decimal places, and return as a number
        const roundedScore = Math.round(score60Percent * 100) / 100;
        
        console.log(`Student ${studentId}, Course ${courseId}: Raw 60% score = ${score60Percent}, Rounded = ${roundedScore}`);
        
        return { data: roundedScore };
      }
      
      console.log(`MaxPossibleScore is 0, returning 0`);
      return { data: 0 };
    } catch (error) {
      console.error('Error calculating class score:', error);
      return { data: 0 };
    }
  };

  const handleSaveReport = async () => {
    try {
      setSaving(true);
      console.log('Starting save process...');

      // First, ensure we have a valid report (either existing or new)
      let reportId;
      
      // Check if there's an existing report
      const { data: existingReport, error: fetchError } = await supabase
        .from('student_reports')
        .select('id')
        .eq('student_id', studentId)
        .eq('term', termSelectRef.current.value)
        .eq('academic_year', academicYearRef.current.value)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing report:', fetchError);
        throw fetchError;
      }
      
      // Prepare report details
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
        reopening_date: document.getElementById('reopeningDate')?.value || null,
        principal_signature: document.getElementById('principalSignature')?.value || '',
        attendance: document.getElementById('attendance')?.value || ''
      };

      console.log('Report details:', reportDetails);

      if (existingReport) {
        // Update existing report
        reportId = existingReport.id;
        console.log('Updating existing report ID:', reportId);
        
        const { error: updateError } = await supabase
          .from('student_reports')
          .update(reportDetails)
          .eq('id', reportId);

        if (updateError) {
          console.error('Error updating report:', updateError);
          throw updateError;
        }
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
        
        if (!newReport?.id) {
          throw new Error('Failed to get report ID from new report');
        }
        
        reportId = newReport.id;
        console.log('Created new report with ID:', reportId);
      }

      // Now save the grades for each subject using the confirmed report ID
      const grades = subjects.map(subject => {
        const classScore = parseFloat(subject.classScore) || 0;
        const examScore = parseFloat(subject.examScore) || 0;
        const totalScore = classScore + examScore;
        const grade = calculateOverallGrade(totalScore);

        return {
          report_id: reportId, // Use the validated report ID
          subject_id: subject.courseId,
          class_score: classScore,
          exam_score: examScore,
          total_score: totalScore,
          position: parseInt(subject.position) || null,
          grade: grade,
          remark: subject.remark || '',
          teacher_signature: subject.teacherSignature || ''
        };
      });

      console.log('Grades to save:', grades);

      // First, delete any existing grades for this report
      const { error: deleteError } = await supabase
        .from('student_grades')
        .delete()
        .eq('report_id', reportId);

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
        .eq('id', reportId);

      if (updateError) {
        console.error('Error updating report total:', updateError);
        throw updateError;
      }

      console.log('Successfully saved grades and updated report total');

      // Fetch the complete updated report
      const { data: updatedReport, error: getReportError } = await supabase
        .from('student_reports')
        .select('*')
        .eq('id', reportId)
        .single();
        
      if (getReportError) {
        console.error('Error fetching updated report:', getReportError);
      } else {
        // Update the reportData state with the current report
        setReportData(updatedReport);
        // Reload the report to get the latest data
        await loadSavedReport();
      }
      
      setSaved(true);
      toast.success('Report saved successfully');
      
      // Reset saved state after 3 seconds
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

  // Helper functions for calculations
  const calculateTotalScore = () => {
    if (!subjects.length) return 0;
    const totalScores = subjects.reduce((sum, subject) => 
      sum + (parseFloat(subject.totalScore) || 0), 0);
    return (totalScores / subjects.length).toFixed(2);
  };

  // For direct input and rendering of class scores
  useEffect(() => {
    // This runs after subjects have been set in state
    if (subjects && subjects.length > 0) {
      console.log('Subjects are now in state, checking for rendering issues');
      
      // Check if there are any subjects with numeric class scores that need to be converted to strings
      const hasNumericScores = subjects.some(
        subject => subject.classScore !== undefined && 
                  subject.classScore !== null && 
                  typeof subject.classScore !== 'string'
      );
      
      if (hasNumericScores) {
        console.log('Found numeric scores, converting to strings for display');
        
        // Convert numeric scores to strings for proper display
        const updatedSubjects = subjects.map(subject => ({
          ...subject,
          classScore: subject.classScore !== undefined && subject.classScore !== null ? 
            subject.classScore.toString() : '',
          examScore: subject.examScore !== undefined && subject.examScore !== null ? 
            subject.examScore.toString() : '',
          totalScore: subject.totalScore !== undefined && subject.totalScore !== null ? 
            subject.totalScore.toString() : ''
        }));
        
        // Update subjects with string values
        setSubjects(updatedSubjects);
      }
      
      // Look for subjects with missing values in the DOM and force update them
      setTimeout(() => {
        const rows = document.querySelectorAll('tr[data-subject-id]');
        rows.forEach(row => {
          const subjectId = row.dataset.subjectId;
          const subject = subjects.find(s => s.courseId === subjectId);
          
          if (subject) {
            // Get the class score input field
            const classScoreInput = row.querySelector('input[placeholder="Score"]');
            if (classScoreInput && classScoreInput.value === '' && subject.classScore) {
              console.log(`Forcing update for subject ${subject.name}: setting class score to ${subject.classScore}`);
              classScoreInput.value = subject.classScore;
            }
          }
        });
      }, 500);
    }
  }, [subjects]);

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
                <select 
                  id="termSelect" 
                  ref={termSelectRef} 
                  className="form-control"
                  onChange={() => loadSavedReport()}
                >
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
                  onChange={() => loadSavedReport()}
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
            studentAge={studentData.age}
          />
        </div>
      </div>
    </TeacherLayout>
  );
};

export default TeacherReport;