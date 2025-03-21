import { supabase } from '../../lib/supabase';

/**
 * Save a student's report for a specific term and academic year
 * @param {Object} reportData - Report data containing student_id, term, academic_year, total_score, overall_grade
 * @param {Array} gradesData - Array of grade objects with subject_id, score, grade
 * @returns {Promise<Object>} - Object containing the saved report data or error
 */
export const saveStudentReport = async (reportData, gradesData) => {
  try {
    // Validate required fields
    if (!reportData.student_id || !reportData.term || !reportData.academic_year) {
      throw new Error('Missing required fields: student_id, term, and academic_year are required');
    }

    // Start a database transaction
    const { data: report, error: reportError } = await supabase
      .from('student_reports')
      .upsert(
        {
          student_id: reportData.student_id,
          term: reportData.term,
          academic_year: reportData.academic_year,
          total_score: reportData.total_score || 0,
          overall_grade: reportData.overall_grade || 'N/A',
          // Use the existing timestamps for created_at if it's an update operation
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'student_id, term, academic_year',
          returning: 'representation'
        }
      )
      .select()
      .single();

    if (reportError) throw reportError;

    // If we have grades data, save them linked to this report
    if (gradesData && gradesData.length > 0 && report) {
      // First, ensure all grades have the report_id
      const gradesWithReportId = gradesData.map(grade => ({
        ...grade,
        report_id: report.id,
        updated_at: new Date().toISOString()
      }));

      // Get existing grades for this report
      const { data: existingGrades, error: existingGradesError } = await supabase
        .from('student_grades')
        .select('id, subject_id')
        .eq('report_id', report.id);

      if (existingGradesError) throw existingGradesError;

      // Create a map of existing grades by subject_id for quick lookup
      const existingGradesMap = {};
      existingGrades?.forEach(grade => {
        existingGradesMap[grade.subject_id] = grade.id;
      });

      // Separate grades into those that need to be updated and those that need to be inserted
      const gradesToUpdate = [];
      const gradesToInsert = [];

      gradesWithReportId.forEach(grade => {
        if (existingGradesMap[grade.subject_id]) {
          // This grade exists, update it
          gradesToUpdate.push({
            ...grade,
            id: existingGradesMap[grade.subject_id]
          });
        } else {
          // This is a new grade
          gradesToInsert.push(grade);
        }
      });

      // Perform updates if needed
      if (gradesToUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from('student_grades')
          .upsert(gradesToUpdate);

        if (updateError) throw updateError;
      }

      // Perform inserts if needed
      if (gradesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('student_grades')
          .insert(gradesToInsert);

        if (insertError) throw insertError;
      }
    }

    // Get the complete report with grades
    const { data: completeReport, error: completeReportError } = await getStudentReport(report.id);
    
    if (completeReportError) throw completeReportError;

    return { data: completeReport, error: null };
  } catch (error) {
    console.error('Error saving student report:', error);
    return { data: null, error };
  }
};

/**
 * Get a specific student report by ID
 * @param {string} reportId - The report ID
 * @returns {Promise<Object>} - Object containing the report data with grades or error
 */
export const getStudentReport = async (reportId) => {
  try {
    // Get the report
    const { data: report, error: reportError } = await supabase
      .from('student_reports')
      .select(`
        *,
        student:student_id (
          profile_id,
          student_id,
          profiles:profile_id (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('id', reportId)
      .single();

    if (reportError) throw reportError;
    if (!report) return { data: null, error: null };

    // Get the grades for this report
    const { data: grades, error: gradesError } = await supabase
      .from('student_grades')
      .select(`
        *,
        subject:subject_id (
          code,
          name
        )
      `)
      .eq('report_id', reportId);

    if (gradesError) throw gradesError;

    // Combine report with grades
    return {
      data: {
        ...report,
        grades: grades || []
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching student report:', error);
    return { data: null, error };
  }
};

/**
 * Get student reports by academic year, optionally filtered by term
 * @param {string} academicYear - The academic year (e.g., 2023-2024)
 * @param {string} term - Optional term (e.g., 'Term 1', 'Term 2', 'Term 3')
 * @returns {Promise<Object>} - Object containing the reports data or error
 */
export const getReportsByAcademicYear = async (academicYear, term = null) => {
  try {
    let query = supabase
      .from('student_reports')
      .select(`
        *,
        student:student_id (
          profile_id,
          student_id,
          profiles:profile_id (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('academic_year', academicYear);

    // Apply term filter if provided
    if (term) {
      query = query.eq('term', term);
    }

    const { data: reports, error: reportsError } = await query;

    if (reportsError) throw reportsError;

    // If no reports found, return empty array
    if (!reports || reports.length === 0) {
      return { data: [], error: null };
    }

    // Get all report IDs
    const reportIds = reports.map(report => report.id);

    // Get all grades for these reports in a single query
    const { data: allGrades, error: gradesError } = await supabase
      .from('student_grades')
      .select(`
        *,
        subject:subject_id (
          code,
          name
        )
      `)
      .in('report_id', reportIds);

    if (gradesError) throw gradesError;

    // Group grades by report_id
    const gradesByReportId = {};
    allGrades?.forEach(grade => {
      if (!gradesByReportId[grade.report_id]) {
        gradesByReportId[grade.report_id] = [];
      }
      gradesByReportId[grade.report_id].push(grade);
    });

    // Combine reports with their grades
    const reportsWithGrades = reports.map(report => ({
      ...report,
      grades: gradesByReportId[report.id] || []
    }));

    return { data: reportsWithGrades, error: null };
  } catch (error) {
    console.error('Error fetching reports by academic year:', error);
    return { data: null, error };
  }
};

/**
 * Get reports for a specific student
 * @param {string} studentId - The student ID
 * @param {string} academicYear - Optional academic year filter
 * @returns {Promise<Object>} - Object containing the reports data or error
 */
export const getStudentReports = async (studentId, academicYear = null) => {
  try {
    let query = supabase
      .from('student_reports')
      .select(`
        *,
        student:student_id (
          profile_id,
          student_id,
          profiles:profile_id (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('student_id', studentId);

    // Apply academic year filter if provided
    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    // Order by academic year and term
    query = query.order('academic_year', { ascending: false }).order('term');

    const { data: reports, error: reportsError } = await query;

    if (reportsError) throw reportsError;

    // If no reports found, return empty array
    if (!reports || reports.length === 0) {
      return { data: [], error: null };
    }

    // Get all report IDs
    const reportIds = reports.map(report => report.id);

    // Get all grades for these reports in a single query
    const { data: allGrades, error: gradesError } = await supabase
      .from('student_grades')
      .select(`
        *,
        subject:subject_id (
          code,
          name
        )
      `)
      .in('report_id', reportIds);

    if (gradesError) throw gradesError;

    // Group grades by report_id
    const gradesByReportId = {};
    allGrades?.forEach(grade => {
      if (!gradesByReportId[grade.report_id]) {
        gradesByReportId[grade.report_id] = [];
      }
      gradesByReportId[grade.report_id].push(grade);
    });

    // Combine reports with their grades
    const reportsWithGrades = reports.map(report => ({
      ...report,
      grades: gradesByReportId[report.id] || []
    }));

    return { data: reportsWithGrades, error: null };
  } catch (error) {
    console.error('Error fetching student reports:', error);
    return { data: null, error };
  }
};

/**
 * Search for student reports by student name or ID
 * @param {string} searchTerm - Student name or ID to search for
 * @param {string} academicYear - Optional academic year filter
 * @returns {Promise<Object>} - Object containing the reports data or error
 */
export const searchStudentReports = async (searchTerm, academicYear = null) => {
  try {
    // First, search for students matching the search term
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        students!inner (
          profile_id,
          student_id
        )
      `)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
      .eq('role', 'student');

    if (studentsError) throw studentsError;

    // Also search by student ID
    const { data: studentsByID, error: studentsByIDError } = await supabase
      .from('students')
      .select(`
        profile_id,
        student_id,
        profiles:profile_id (
          id,
          first_name,
          last_name
        )
      `)
      .ilike('student_id', `%${searchTerm}%`);

    if (studentsByIDError) throw studentsByIDError;

    // Combine unique students from both searches
    const uniqueStudentIds = new Set();
    const allStudents = [];

    // Add students found by name
    students?.forEach(student => {
      const studentId = student.id;
      if (!uniqueStudentIds.has(studentId)) {
        uniqueStudentIds.add(studentId);
        allStudents.push({
          id: studentId,
          student_id: student.students[0].student_id,
          first_name: student.first_name,
          last_name: student.last_name
        });
      }
    });

    // Add students found by ID
    studentsByID?.forEach(student => {
      const studentId = student.profile_id;
      if (!uniqueStudentIds.has(studentId)) {
        uniqueStudentIds.add(studentId);
        allStudents.push({
          id: studentId,
          student_id: student.student_id,
          first_name: student.profiles.first_name,
          last_name: student.profiles.last_name
        });
      }
    });

    // If no students found, return empty array
    if (allStudents.length === 0) {
      return { data: [], error: null };
    }

    // Get reports for these students
    const studentIds = Array.from(uniqueStudentIds);
    let query = supabase
      .from('student_reports')
      .select(`
        *,
        student:student_id (
          profile_id,
          student_id,
          profiles:profile_id (
            first_name,
            last_name,
            email
          )
        )
      `)
      .in('student_id', studentIds);

    // Apply academic year filter if provided
    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    // Order by academic year and term
    query = query.order('academic_year', { ascending: false }).order('term');

    const { data: reports, error: reportsError } = await query;

    if (reportsError) throw reportsError;

    // If no reports found, return students without reports
    if (!reports || reports.length === 0) {
      return { 
        data: { 
          students: allStudents,
          reports: []
        }, 
        error: null 
      };
    }

    // Get all report IDs
    const reportIds = reports.map(report => report.id);

    // Get all grades for these reports in a single query
    const { data: allGrades, error: gradesError } = await supabase
      .from('student_grades')
      .select(`
        *,
        subject:subject_id (
          code,
          name
        )
      `)
      .in('report_id', reportIds);

    if (gradesError) throw gradesError;

    // Group grades by report_id
    const gradesByReportId = {};
    allGrades?.forEach(grade => {
      if (!gradesByReportId[grade.report_id]) {
        gradesByReportId[grade.report_id] = [];
      }
      gradesByReportId[grade.report_id].push(grade);
    });

    // Combine reports with their grades
    const reportsWithGrades = reports.map(report => ({
      ...report,
      grades: gradesByReportId[report.id] || []
    }));

    return { 
      data: {
        students: allStudents,
        reports: reportsWithGrades
      },
      error: null 
    };
  } catch (error) {
    console.error('Error searching student reports:', error);
    return { data: null, error };
  }
};

/**
 * Generate a report from student data and assignments
 * @param {string} studentId - The student ID
 * @param {string} courseId - The course ID
 * @param {string} term - The term (e.g., 'Term 1', 'Term 2', 'Term 3')
 * @param {string} academicYear - The academic year (e.g., '2023-2024')
 * @returns {Promise<Object>} - Object containing the generated report data or error
 */
export const generateStudentReport = async (studentId, courseId, term, academicYear) => {
  try {
    // Get student details
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        profile_id,
        student_id,
        profiles:profile_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq('profile_id', studentId)
      .single();

    if (studentError) throw studentError;
    if (!student) throw new Error('Student not found');

    // Get assignments and student submissions for this course
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select(`
        id,
        code,
        name,
        assignments (
          id,
          title,
          type,
          max_score,
          student_assignments!inner (
            id,
            student_id,
            score,
            status
          )
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;
    if (!courseData) throw new Error('Course not found');

    // Filter assignments for this specific student
    const studentAssignments = [];
    courseData.assignments.forEach(assignment => {
      const studentSubmission = assignment.student_assignments.find(
        submission => submission.student_id === studentId
      );
      
      if (studentSubmission && studentSubmission.status === 'graded') {
        studentAssignments.push({
          ...assignment,
          studentScore: studentSubmission.score
        });
      }
    });

    // Calculate total and average scores
    let totalScore = 0;
    let totalMaxScore = 0;

    studentAssignments.forEach(assignment => {
      totalScore += assignment.studentScore;
      totalMaxScore += assignment.max_score;
    });

    // Calculate percentage and determine grade
    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    let grade = 'N/A';
    
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';
    else if (percentage > 0) grade = 'F';

    // Prepare report data
    const reportData = {
      student_id: studentId,
      term: term,
      academic_year: academicYear,
      total_score: percentage,
      overall_grade: grade
    };

    // Prepare grade data for this subject
    const gradesData = [
      {
        subject_id: courseId,
        score: percentage,
        grade: grade
      }
    ];

    // Save the report
    const { data: savedReport, error: saveError } = await saveStudentReport(reportData, gradesData);
    
    if (saveError) throw saveError;

    return { data: savedReport, error: null };
  } catch (error) {
    console.error('Error generating student report:', error);
    return { data: null, error };
  }
};