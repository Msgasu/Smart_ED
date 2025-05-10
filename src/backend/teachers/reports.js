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
    console.log('Starting getStudentReport for report ID:', reportId);
    
    // Step 1: Get the report
    const { data: report, error: reportError } = await supabase
      .from('student_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError) {
      console.error('Error fetching report:', reportError);
      throw reportError;
    }
    
    if (!report) {
      console.log('No report found with ID:', reportId);
      return { data: null, error: null };
    }
    
    console.log('Report fetched successfully');

    // Step 2: Get the student information
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('profile_id, student_id')
      .eq('profile_id', report.student_id)
      .single();
      
    if (studentError) {
      console.error('Error fetching student:', studentError);
      throw studentError;
    }
    
    // Step 3: Get the profile information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', report.student_id)
      .single();
      
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }
    
    // Step 4: Get the grades for this report
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

    if (gradesError) {
      console.error('Error fetching grades:', gradesError);
      throw gradesError;
    }
    
    console.log('Fetched', grades?.length || 0, 'grades for report');

    // Step 5: Combine all the data
    const reportWithData = {
      ...report,
      student: {
        profile_id: student.profile_id,
        student_id: student.student_id,
        profiles: profile
      },
      grades: grades || []
    };
    
    console.log('Returning complete report with student data and grades');
    return {
      data: reportWithData,
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
    console.log('Starting getReportsByAcademicYear with:', { academicYear, term });
    
    if (!academicYear) {
      throw new Error('Academic year is required');
    }

    // Step 1: Fetch reports with basic student information
    console.log('Executing query for reports...');
    let query = supabase
      .from('student_reports')
      .select('*')
      .eq('academic_year', academicYear);

    // Apply term filter if provided
    if (term) {
      query = query.eq('term', term);
    }

    const { data: reports, error: reportsError } = await query;

    if (reportsError) {
      console.error('Error fetching reports:', reportsError);
      throw reportsError;
    }

    console.log('Reports fetched:', reports?.length || 0);

    // If no reports found, return empty array
    if (!reports || reports.length === 0) {
      return { data: [], error: null };
    }

    // Step 2: Fetch student information for each report
    const studentIds = [...new Set(reports.map(report => report.student_id))];
    
    console.log('Fetching student information for:', studentIds.length, 'students');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('profile_id, student_id')
      .in('profile_id', studentIds);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw studentsError;
    }

    // Step 3: Fetch profiles for these students
    const profileIds = students.map(student => student.profile_id);
    
    console.log('Fetching profiles for:', profileIds.length, 'students');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', profileIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Step 4: Get all report IDs
    const reportIds = reports.map(report => report.id);

    console.log('Fetching grades for reports:', reportIds.length);
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

    if (gradesError) {
      console.error('Error fetching grades:', gradesError);
      throw gradesError;
    }

    console.log('Grades fetched:', allGrades?.length || 0);

    // Step 5: Group grades by report_id
    const gradesByReportId = {};
    allGrades?.forEach(grade => {
      if (!gradesByReportId[grade.report_id]) {
        gradesByReportId[grade.report_id] = [];
      }
      gradesByReportId[grade.report_id].push(grade);
    });

    // Step 6: Build a map of profiles by ID for quick lookup
    const profilesById = {};
    profiles.forEach(profile => {
      profilesById[profile.id] = profile;
    });

    // Step 7: Build a map of students by profile_id for quick lookup
    const studentsByProfileId = {};
    students.forEach(student => {
      studentsByProfileId[student.profile_id] = student;
    });

    // Step 8: Combine reports with student and profile information
    const reportsWithData = reports.map(report => {
      const student = {
        id: report.student_id,
        student_id: studentsByProfileId[report.student_id]?.student_id || 'Unknown',
        profiles: profilesById[report.student_id] || { first_name: 'Unknown', last_name: 'Student' }
      };

      return {
        ...report,
        student,
        grades: gradesByReportId[report.id] || []
      };
    });

    console.log('Returning reports with student data and grades');
    return { data: reportsWithData, error: null };
  } catch (error) {
    console.error('Error in getReportsByAcademicYear:', error);
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
 * Save or update basic report information
 * @param {Object} reportData - Basic report information
 * @returns {Promise<Object>} - Object containing the saved report data or error
 */
export const saveReportDetails = async (reportData) => {
  try {
    const {
      student_id,
      term,
      academic_year,
      class_year,
      total_score,
      overall_grade,
      conduct,
      next_class,
      reopening_date,
      teacher_remarks,
      principal_signature,
      attendance
    } = reportData;

    // Start a transaction
    const { data: report, error: reportError } = await supabase
      .from('student_reports')
      .upsert({
        student_id,
        term,
        academic_year,
        class_year,
        total_score,
        overall_grade,
        conduct,
        next_class,
        reopening_date,
        teacher_remarks,
        principal_signature,
        attendance,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,term,academic_year'
      })
      .select()
      .single();

    if (reportError) throw reportError;
    if (!report) throw new Error('Failed to save report details');

    // Broadcast the update
    await supabase
      .channel('student_reports')
      .send({
        type: 'broadcast',
        event: 'report_details_updated',
        payload: { report_id: report.id }
      });

    return {
      data: report,
      error: null
    };
  } catch (error) {
    console.error('Error saving report details:', error);
    return {
      data: null,
      error: error.message
    };
  }
};

/**
 * Save or update a single subject grade
 * @param {Object} gradeData - Grade information for a single subject
 * @returns {Promise<Object>} - Object containing the saved grade data or error
 */
export const saveSubjectGrade = async (gradeData) => {
  try {
    const {
      report_id,
      subject_id,
      class_score,
      exam_score,
      total_score,
      position,
      grade,
      remark,
      teacher_signature
    } = gradeData;

    // Validate required fields
    if (!report_id || !subject_id) {
      throw new Error('Missing required fields: report_id and subject_id are required');
    }

    // Save or update the grade
    const { data: savedGrade, error: gradeError } = await supabase
      .from('student_grades')
      .upsert({
        report_id,
        subject_id,
        class_score,
        exam_score,
        total_score,
        position,
        grade,
        remark,
        teacher_signature,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'report_id,subject_id'
      })
      .select()
      .single();

    if (gradeError) throw gradeError;
    if (!savedGrade) throw new Error('Failed to save grade');

    // Broadcast the update
    await supabase
      .channel('student_reports')
      .send({
        type: 'broadcast',
        event: 'grade_updated',
        payload: { 
          report_id,
          subject_id,
          grade: savedGrade
        }
      });

    return {
      data: savedGrade,
      error: null
    };
  } catch (error) {
    console.error('Error saving subject grade:', error);
    return {
      data: null,
      error: error.message
    };
  }
};

/**
 * Delete a subject grade
 * @param {string} reportId - The report ID
 * @param {string} subjectId - The subject ID
 * @returns {Promise<Object>} - Object containing success status or error
 */
export const deleteSubjectGrade = async (reportId, subjectId) => {
  try {
    const { error: deleteError } = await supabase
      .from('student_grades')
      .delete()
      .eq('report_id', reportId)
      .eq('subject_id', subjectId);

    if (deleteError) throw deleteError;

    // Broadcast the deletion
    await supabase
      .channel('student_reports')
      .send({
        type: 'broadcast',
        event: 'grade_deleted',
        payload: { 
          report_id: reportId,
          subject_id: subjectId
        }
      });

    return {
      data: { success: true },
      error: null
    };
  } catch (error) {
    console.error('Error deleting subject grade:', error);
    return {
      data: null,
      error: error.message
    };
  }
};

/**
 * Generates and saves a student report
 * @param {Object} reportData - The complete report data including all fields and grades
 * @returns {Promise<Object>} - Object containing the saved report data or error
 */
export const generateStudentReport = async (reportData) => {
  try {
    // First save the report details
    const { data: report, error: reportError } = await saveReportDetails(reportData);
    if (reportError) throw reportError;

    // Then save each grade individually
    if (reportData.grades && reportData.grades.length > 0) {
      const gradePromises = reportData.grades.map(grade => 
        saveSubjectGrade({
          ...grade,
          report_id: report.id
        })
      );

      const gradeResults = await Promise.all(gradePromises);
      const gradeErrors = gradeResults.filter(result => result.error);
      
      if (gradeErrors.length > 0) {
        throw new Error('Some grades failed to save: ' + gradeErrors.map(e => e.error).join(', '));
      }
    }

    // Fetch the complete report with grades
    const { data: completeReport, error: fetchError } = await supabase
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
      .eq('id', report.id)
      .single();

    if (fetchError) throw fetchError;

    return {
      data: completeReport,
      error: null
    };

  } catch (error) {
    console.error('Error generating student report:', error);
    return {
      data: null,
      error: error.message
    };
  }
};

/**
 * Calculate a student's class score for a course based on assignment submissions
 * @param {string} studentId - The student ID
 * @param {string} courseId - The course ID
 * @param {string} term - Optional term filter
 * @param {string} academicYear - Optional academic year filter
 * @returns {Promise<number|null>} - The calculated class score or null if error
 */
export const calculateClassScoreFromAssignments = async (studentId, courseId, term = null, academicYear = null) => {
  try {
    if (!studentId || !courseId) {
      throw new Error('Student ID and Course ID are required');
    }
    
    console.log(`Calculating class score for student ${studentId} in course ${courseId}`);
    
    // Get all assignments for this course
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId);
    
    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      throw assignmentsError;
    }
    
    if (!assignments || assignments.length === 0) {
      console.log('No assignments found for this course');
      return null;
    }
    
    console.log(`Found ${assignments.length} assignments for course ${courseId}`);
    
    // Get student submissions for these assignments
    const { data: submissions, error: submissionsError } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('student_id', studentId)
      .in('assignment_id', assignments.map(a => a.id));
    
    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      throw submissionsError;
    }
    
    // Calculate the score based on submissions
    const gradedSubmissions = submissions?.filter(s => s.status === 'graded' && s.score !== null) || [];
    
    if (gradedSubmissions.length === 0) {
      console.log('No graded submissions found');
      return 0; // Default to 0 if no graded submissions
    }
    
    console.log(`Found ${gradedSubmissions.length} graded submissions`);
    
    // Calculate total points earned and total possible points
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    for (const submission of gradedSubmissions) {
      const assignment = assignments.find(a => a.id === submission.assignment_id);
      if (assignment) {
        totalScore += submission.score;
        maxPossibleScore += assignment.max_score;
      }
    }
    
    // Calculate percentage and convert to 60% scale (class score is typically 60% of total grade)
    if (maxPossibleScore > 0) {
      const percentageScore = (totalScore / maxPossibleScore) * 100;
      const classScore = (percentageScore * 0.6).toFixed(2); // 60% of total score
      console.log(`Calculated class score: ${classScore} (based on ${gradedSubmissions.length} graded assignments)`);
      return parseFloat(classScore);
    } else {
      console.log('Max possible score is 0, defaulting to 0');
      return 0;
    }
  } catch (error) {
    console.error('Error calculating class score:', error);
    return null;
  }
};