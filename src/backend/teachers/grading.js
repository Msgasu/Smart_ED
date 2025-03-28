import { supabase } from '../../lib/supabase';

/**
 * Get all submissions for a teacher
 * @param {string} teacherId - The teacher ID
 * @returns {Promise<Object>} - The submissions data
 */
export const getSubmissions = async (teacherId) => {
  try {
    if (!teacherId) {
      throw new Error('Teacher ID is required');
    }
    
    // Get courses taught by this teacher
    const { data: facultyCourses, error: coursesError } = await supabase
      .from('faculty_courses')
      .select('course_id')
      .eq('faculty_id', teacherId);
      
    if (coursesError) throw coursesError;
    
    const courseIds = facultyCourses?.map(fc => fc.course_id) || [];
    
    if (courseIds.length === 0) {
      return { data: [], error: null };
    }
    
    // Get assignments for these courses
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, course_id')
      .in('course_id', courseIds);
      
    if (assignmentsError) throw assignmentsError;
    
    const assignmentIds = assignments?.map(a => a.id) || [];
    
    if (assignmentIds.length === 0) {
      return { data: [], error: null };
    }
    
    // Get submissions for these assignments
    const { data: submissions, error: submissionsError } = await supabase
      .from('student_assignments')
      .select(`
        id,
        submitted_at,
        score,
        status,
        assignment_id,
        student_id,
        assignments(title, course_id),
        profiles:student_id(first_name, last_name)
      `)
      .in('assignment_id', assignmentIds)
      .order('submitted_at', { ascending: false });
      
    if (submissionsError) throw submissionsError;
    
    return { data: submissions || [], error: null };
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return { data: null, error };
  }
};

/**
 * Get submissions for a specific assignment
 * @param {string} assignmentId - The assignment ID
 * @returns {Promise<Object>} - The submissions data
 */
export const getSubmissionsByAssignment = async (assignmentId) => {
  try {
    if (!assignmentId) {
      throw new Error('Assignment ID is required');
    }
    
    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        *,
        courses (
          id,
          code,
          name
        )
      `)
      .eq('id', assignmentId)
      .single();
      
    if (assignmentError) throw assignmentError;
    
    // Get students enrolled in this course
    const { data: enrolledStudents, error: enrollmentError } = await supabase
      .from('student_courses')
      .select(`
        student_id,
        profiles:student_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('course_id', assignment.course_id);
      
    if (enrollmentError) throw enrollmentError;
    
    // Get existing grades for this assignment
    const { data: existingGrades, error: gradesError } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('assignment_id', assignmentId);
      
    if (gradesError) throw gradesError;
    
    // Combine student data with their submissions
    const studentsWithSubmissions = enrolledStudents.map(student => {
      const submission = existingGrades?.find(grade => grade.student_id === student.student_id);
      
      return {
        id: student.student_id,
        first_name: student.profiles.first_name,
        last_name: student.profiles.last_name,
        email: student.profiles.email,
        submission: submission || {
          id: null,
          status: 'not_submitted',
          score: null,
          submitted_at: null,
          feedback: null
        }
      };
    });
    
    return { 
      data: {
        assignment,
        students: studentsWithSubmissions
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching submissions by assignment:', error);
    return { data: null, error };
  }
};

/**
 * Grade a submission
 * @param {string} studentId - The student ID
 * @param {string} assignmentId - The assignment ID
 * @param {Object} gradeData - The grade data
 * @returns {Promise<Object>} - The graded submission
 */
export const gradeSubmission = async (studentId, assignmentId, gradeData) => {
  try {
    if (!studentId || !assignmentId) {
      throw new Error('Student ID and Assignment ID are required');
    }
    
    // Check if submission already exists
    const { data: existingSubmission, error: checkError } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .maybeSingle();
      
    if (checkError) throw checkError;
    
    let result;
    
    if (existingSubmission) {
      // Update existing submission - remove graded_at if the column doesn't exist
      const { data, error } = await supabase
        .from('student_assignments')
        .update({
          score: gradeData.score,
          status: 'graded',
          // Remove graded_at until you add it to the schema
          // graded_at: new Date().toISOString() 
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();
        
      if (error) throw error;
      result = { data, error: null, isUpdate: true };
    } else {
      // Create new submission record with grade
      const { data, error } = await supabase
        .from('student_assignments')
        .insert([{
          assignment_id: assignmentId,
          student_id: studentId,
          score: gradeData.score,
          status: 'graded',
          // Remove graded_at until you add it to the schema
          // graded_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (error) throw error;
      result = { data, error: null, isUpdate: false };
    }
    
    return result;
  } catch (error) {
    console.error('Error grading submission:', error);
    return { data: null, error };
  }
};

/**
 * Bulk grade submissions
 * @param {Array} grades - Array of grade objects with studentId, assignmentId, and gradeData
 * @returns {Promise<Object>} - The result of the bulk grading
 */
export const bulkGradeSubmissions = async (grades) => {
  try {
    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      throw new Error('Grades array is required');
    }
    
    const results = [];
    
    // Process each grade
    for (const grade of grades) {
      const { studentId, assignmentId, gradeData } = grade;
      
      if (!studentId || !assignmentId) {
        results.push({
          studentId,
          assignmentId,
          success: false,
          error: 'Student ID and Assignment ID are required'
        });
        continue;
      }
      
      // Grade the submission
      const result = await gradeSubmission(studentId, assignmentId, gradeData);
      
      results.push({
        studentId,
        assignmentId,
        success: !result.error,
        error: result.error ? result.error.message : null,
        data: result.data
      });
    }
    
    return { 
      data: {
        results,
        totalSuccess: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error bulk grading submissions:', error);
    return { data: null, error };
  }
}; 