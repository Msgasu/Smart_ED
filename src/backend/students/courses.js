import { supabase } from '../../lib/supabase';

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
 * Enroll a student in a course
 * @param {string} studentId - The student ID
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - The enrollment result
 */
export const enrollInCourse = async (studentId, courseId) => {
  try {
    if (!studentId || !courseId) {
      throw new Error('Student ID and Course ID are required');
    }
    
    // Check if already enrolled
    const { data: existingEnrollment, error: checkError } = await supabase
      .from('student_courses')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId);
      
    if (checkError) throw checkError;
    
    if (existingEnrollment && existingEnrollment.length > 0) {
      return { data: existingEnrollment[0], error: null, alreadyEnrolled: true };
    }
    
    // Enroll in course
    const { data, error } = await supabase
      .from('student_courses')
      .insert([
        { student_id: studentId, course_id: courseId }
      ])
      .select()
      .single();
      
    if (error) throw error;
    
    // Create default report entries for the enrolled course
    await createDefaultReportEntries(studentId, courseId);
    
    return { data, error: null, alreadyEnrolled: false };
  } catch (error) {
    console.error('Error enrolling in course:', error);
    return { data: null, error };
  }
};

/**
 * Create default report entries for an enrolled course
 * @param {string} studentId - The student ID (profile ID)
 * @param {string} courseId - The course ID
 * @returns {Promise<void>}
 */
const createDefaultReportEntries = async (studentId, courseId) => {
  try {
    // Get student profile information to access profile_id (needed for student_reports)
    const { data: studentProfile, error: profileError } = await supabase
      .from('students')
      .select('profile_id')
      .eq('profile_id', studentId)
      .single();
      
    if (profileError) throw profileError;
    if (!studentProfile) throw new Error('Student profile not found');
    
    // Get current academic year and term
    const currentDate = new Date();
    const academicYear = `${currentDate.getFullYear()}-${currentDate.getFullYear() + 1}`;
    
    // Default terms
    const terms = ['Term 1', 'Term 2', 'Term 3'];
    
    // For each term, ensure a report entry exists
    for (const term of terms) {
      // Check if a report already exists for this student, term, and academic year
      const { data: existingReport, error: reportCheckError } = await supabase
        .from('student_reports')
        .select('id')
        .eq('student_id', studentProfile.profile_id)
        .eq('term', term)
        .eq('academic_year', academicYear);
        
      if (reportCheckError) throw reportCheckError;
      
      let reportId;
      
      // If no report exists, create one
      if (!existingReport || existingReport.length === 0) {
        const { data: newReport, error: createReportError } = await supabase
          .from('student_reports')
          .insert({
            student_id: studentProfile.profile_id,
            term: term,
            academic_year: academicYear,
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