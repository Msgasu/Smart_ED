import { supabase } from '../../lib/supabase';

/**
 * Get all assignments for a student
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - The assignments data
 */
export const getStudentAssignments = async (studentId) => {
  try {
    if (!studentId) {
      throw new Error('Student ID is required');
    }
    
    // First get the courses the student is enrolled in
    const { data: studentCourses, error: coursesError } = await supabase
      .from('student_courses')
      .select('course_id')
      .eq('student_id', studentId);
      
    if (coursesError) throw coursesError;
    
    if (!studentCourses || studentCourses.length === 0) {
      return { data: [], error: null };
    }
    
    // Get course IDs
    const courseIds = studentCourses.map(sc => sc.course_id);
    
    // Fetch all assignments for these courses
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        *,
        courses (
          code,
          name
        ),
        student_assignments (
          id,
          score,
          status,
          submitted_at
        )
      `)
      .in('course_id', courseIds)
      .order('due_date', { ascending: false });
      
    if (assignmentsError) throw assignmentsError;
    
    // Process assignments to include student submission status
    const processedAssignments = assignmentsData.map(assignment => {
      // Find student's submission for this assignment
      const studentSubmission = assignment.student_assignments.find(
        sa => sa.student_id === studentId
      );
      
      // If no submission exists, create a placeholder
      if (!studentSubmission) {
        assignment.student_submission = {
          status: 'not_submitted',
          score: null,
          submitted_at: null
        };
      } else {
        assignment.student_submission = studentSubmission;
      }
      
      return assignment;
    });
    
    return { data: processedAssignments, error: null };
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    return { data: null, error };
  }
};

/**
 * Get details of a specific assignment
 * @param {string} assignmentId - The assignment ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - The assignment details
 */
export const getAssignmentDetails = async (assignmentId, studentId) => {
  try {
    if (!assignmentId || !studentId) {
      throw new Error('Assignment ID and Student ID are required');
    }
    
    // Fetch assignment details
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
    
    // Fetch student's submission for this assignment
    const { data: submission, error: submissionError } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .maybeSingle();
      
    if (submissionError) throw submissionError;
    
    // Combine assignment with submission data
    const assignmentWithSubmission = {
      ...assignment,
      submission: submission || {
        status: 'not_submitted',
        score: null,
        submitted_at: null
      }
    };
    
    return { data: assignmentWithSubmission, error: null };
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    return { data: null, error };
  }
};

/**
 * Submit an assignment
 * @param {string} assignmentId - The assignment ID
 * @param {string} studentId - The student ID
 * @param {Object} submissionData - The submission data
 * @returns {Promise<Object>} - The submission result
 */
export const submitAssignment = async (assignmentId, studentId, submissionData) => {
  try {
    if (!assignmentId || !studentId) {
      throw new Error('Assignment ID and Student ID are required');
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
      // Update existing submission
      const { data, error } = await supabase
        .from('student_assignments')
        .update({
          ...submissionData,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();
        
      if (error) throw error;
      result = { data, error: null, isUpdate: true };
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from('student_assignments')
        .insert([{
          assignment_id: assignmentId,
          student_id: studentId,
          ...submissionData,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (error) throw error;
      result = { data, error: null, isUpdate: false };
    }
    
    return result;
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return { data: null, error };
  }
}; 