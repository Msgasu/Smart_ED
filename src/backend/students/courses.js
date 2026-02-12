import { supabase } from '../../lib/supabase';
import { getCurrentAcademicYear, getCurrentTerm } from '../../lib/courseManagement';

/**
 * Get all courses for a student
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - The courses data
 */
export const getStudentCourses = async (studentId) => {
  try {
    if (!studentId) {
      throw new Error('Student ID is required');
    }
    
    const { data, error } = await supabase
      .from('student_courses')
      .select(`
        course_id,
        courses (
          id,
          code,
          name,
          description
        )
      `)
      .eq('student_id', studentId);
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching student courses:', error);
    return { data: null, error };
  }
};

/**
 * Get courses for a student in a specific term (term-versioned).
 * This returns only courses that are enrolled for the given term+year.
 * @param {string} studentId - The student profile ID
 * @param {string} term - The term ('Term 1', 'Term 2', 'Term 3')
 * @param {string} academicYear - The academic year (e.g., '2025-2026')
 * @returns {Promise<Object>}
 */
export const getStudentCoursesForTerm = async (studentId, term, academicYear) => {
  try {
    if (!studentId || !term || !academicYear) {
      throw new Error('Student ID, term, and academic year are required');
    }

    const { data, error } = await supabase
      .from('student_course_enrollments')
      .select(`
        id,
        course_id,
        term,
        academic_year,
        status,
        enrolled_at,
        courses (
          id,
          code,
          name,
          description
        )
      `)
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('academic_year', academicYear)
      .eq('status', 'enrolled');

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching term-specific courses:', error);
    return { data: null, error };
  }
};

/**
 * Get course details including instructor information and assignments
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - The course details
 */
export const getCourseDetails = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error('Course ID is required');
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Fetch course details with instructor information
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        faculty_courses (
          faculty_id
        )
      `)
      .eq('id', courseId)
      .single();
      
    if (courseError) throw courseError;
    
    // Fetch instructor details if available
    let instructorData = null;
    if (courseData.faculty_courses && courseData.faculty_courses.length > 0) {
      const facultyId = courseData.faculty_courses[0].faculty_id;
      
      const { data: instructor, error: instructorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', facultyId)
        .single();
        
      if (!instructorError) {
        instructorData = instructor;
      }
    }
    
    // Fetch assignments for this course and student submissions in parallel
    const [assignmentsResponse, submissionsResponse] = await Promise.all([
      supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('due_date', { ascending: true }),
      supabase
        .from('student_assignments')
        .select('*')
        .eq('student_id', user.id)
    ]);
    
    if (assignmentsResponse.error) throw assignmentsResponse.error;
    if (submissionsResponse.error) throw submissionsResponse.error;
    
    // Combine assignments with their submissions
    const assignmentsWithSubmissions = assignmentsResponse.data.map(assignment => {
      const submission = submissionsResponse.data.find(
        sub => sub.assignment_id === assignment.id
      );
      
      return {
        ...assignment,
        student_assignments: submission ? [submission] : [{
          status: 'not_submitted',
          score: null,
          submitted_at: null
        }]
      };
    });
    
    return { 
      data: { 
        course: courseData, 
        instructor: instructorData,
        assignments: assignmentsWithSubmissions
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching course details:', error);
    return { data: null, error };
  }
};

/**
 * Enroll a student in a course.
 * Now creates term-versioned enrollment records alongside legacy student_courses.
 * @param {string} studentId - The student ID
 * @param {string} courseId - The course ID
 * @param {Object} options - Optional term context
 * @param {string} options.term - Specific term (defaults to current)
 * @param {string} options.academicYear - Specific academic year (defaults to current)
 * @returns {Promise<Object>} - The enrollment result
 */
export const enrollInCourse = async (studentId, courseId, options = {}) => {
  try {
    if (!studentId || !courseId) {
      throw new Error('Student ID and Course ID are required');
    }

    const academicYear = options.academicYear || getCurrentAcademicYear();
    const currentTerm = options.term || getCurrentTerm();
    
    // Check if already enrolled in legacy table
    const { data: existingEnrollment, error: checkError } = await supabase
      .from('student_courses')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId);
      
    if (checkError) throw checkError;
    
    let legacyData;
    if (existingEnrollment && existingEnrollment.length > 0) {
      legacyData = existingEnrollment[0];
    } else {
      // Enroll in legacy table
      const { data, error } = await supabase
        .from('student_courses')
        .insert([
          { student_id: studentId, course_id: courseId }
        ])
        .select()
        .single();
        
      if (error) throw error;
      legacyData = data;
    }

    // Create term-versioned enrollment records for current + future terms only
    const allTerms = ['Term 1', 'Term 2', 'Term 3'];
    const currentTermIndex = allTerms.indexOf(currentTerm);
    const termsToEnroll = allTerms.slice(currentTermIndex);
    for (const term of termsToEnroll) {
      const { data: existingTermEnroll, error: termCheckError } = await supabase
        .from('student_course_enrollments')
        .select('id, status')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('term', term)
        .eq('academic_year', academicYear)
        .single();

      if (termCheckError && termCheckError.code !== 'PGRST116') {
        console.error(`Error checking term enrollment for ${term}:`, termCheckError);
        continue;
      }

      if (existingTermEnroll) {
        // If previously dropped, re-enroll
        if (existingTermEnroll.status === 'dropped') {
          await supabase
            .from('student_course_enrollments')
            .update({
              status: 'enrolled',
              dropped_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTermEnroll.id);
        }
        continue;
      }

      // Create new term enrollment
      await supabase
        .from('student_course_enrollments')
        .insert([{
          student_id: studentId,
          course_id: courseId,
          term: term,
          academic_year: academicYear,
          status: 'enrolled'
        }]);
    }
    
    // Create default report entries only for the terms we actually enrolled in
    await createDefaultReportEntries(studentId, courseId, academicYear, termsToEnroll);
    
    return { 
      data: legacyData, 
      error: null, 
      alreadyEnrolled: !!(existingEnrollment && existingEnrollment.length > 0) 
    };
  } catch (error) {
    console.error('Error enrolling in course:', error);
    return { data: null, error };
  }
};

/**
 * Create default report entries for an enrolled course.
 * Only creates entries for the specified terms (not past terms).
 * @param {string} studentId - The student ID (profile ID)
 * @param {string} courseId - The course ID
 * @param {string} academicYear - The academic year (optional, defaults to current)
 * @param {string[]} termsToCreate - Which terms to create entries for (defaults to current+future)
 * @returns {Promise<void>}
 */
const createDefaultReportEntries = async (studentId, courseId, academicYear = null, termsToCreate = null) => {
  try {
    // Get student profile information
    const { data: studentProfile, error: profileError } = await supabase
      .from('students')
      .select('profile_id')
      .eq('profile_id', studentId)
      .single();
      
    if (profileError) throw profileError;
    if (!studentProfile) throw new Error('Student profile not found');
    
    const resolvedAcademicYear = academicYear || getCurrentAcademicYear();
    
    // Only create entries for specified terms, or current+future by default
    const allTerms = ['Term 1', 'Term 2', 'Term 3'];
    const currentTermIndex = allTerms.indexOf(getCurrentTerm());
    const terms = termsToCreate || allTerms.slice(currentTermIndex);
    
    // For each term, ensure a report entry exists
    for (const term of terms) {
      // Check if a report already exists for this student, term, and academic year
      const { data: existingReport, error: reportCheckError } = await supabase
        .from('student_reports')
        .select('id')
        .eq('student_id', studentProfile.profile_id)
        .eq('term', term)
        .eq('academic_year', resolvedAcademicYear);
        
      if (reportCheckError) throw reportCheckError;
      
      let reportId;
      
      // If no report exists, create one
      if (!existingReport || existingReport.length === 0) {
        const { data: newReport, error: createReportError } = await supabase
          .from('student_reports')
          .insert({
            student_id: studentProfile.profile_id,
            term: term,
            academic_year: resolvedAcademicYear,
            total_score: 0,
            overall_grade: null
          })
          .select('id')
          .single();
          
        if (createReportError) throw createReportError;
        reportId = newReport.id;
      } else {
        reportId = existingReport[0].id;
      }
      
      // Check if a grade already exists for this report and course
      const { data: existingGrade, error: gradeCheckError } = await supabase
        .from('student_grades')
        .select('id')
        .eq('report_id', reportId)
        .eq('subject_id', courseId);
        
      if (gradeCheckError) throw gradeCheckError;
      
      // If no grade exists, create a default one
      if (!existingGrade || existingGrade.length === 0) {
        const { error: createGradeError } = await supabase
          .from('student_grades')
          .insert({
            report_id: reportId,
            subject_id: courseId,
            class_score: 0,
            exam_score: 0,
            total_score: 0
          });
          
        if (createGradeError) throw createGradeError;
      }
    }
  } catch (error) {
    console.error('Error creating default report entries:', error);
    throw error;
  }
};
