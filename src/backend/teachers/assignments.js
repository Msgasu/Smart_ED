import { supabase } from '../../lib/supabase';

/**
 * Get all assignments for a course
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - The assignments data
 */
export const getAssignments = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error('Course ID is required');
    }
    
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId);
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return { data: null, error };
  }
};

/**
 * Get assignment details
 * @param {string} assignmentId - The assignment ID
 * @returns {Promise<Object>} - The assignment details
 */
export const getAssignmentDetails = async (assignmentId) => {
  try {
    if (!assignmentId) {
      throw new Error('Assignment ID is required');
    }
    
    const { data, error } = await supabase
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
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    return { data: null, error };
  }
};

/**
 * Create a new assignment
 * @param {Object} assignmentData - The assignment data
 * @returns {Promise<Object>} - The created assignment
 */
export const createAssignment = async (assignmentData) => {
  try {
    if (!assignmentData || !assignmentData.course_id) {
      throw new Error('Assignment data with course_id is required');
    }
    
    // Format the date properly for database storage
    if (assignmentData.due_date) {
      assignmentData.due_date = new Date(assignmentData.due_date).toISOString();
    }
    
    // Add created_at timestamp
    const assignmentWithTimestamp = {
      ...assignmentData,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('assignments')
      .insert([assignmentWithTimestamp])
      .select()
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error creating assignment:', error);
    return { data: null, error };
  }
};

/**
 * Update an assignment
 * @param {string} assignmentId - The assignment ID
 * @param {Object} assignmentData - The assignment data to update
 * @returns {Promise<Object>} - The updated assignment
 */
export const updateAssignment = async (assignmentId, assignmentData) => {
  try {
    if (!assignmentId) {
      throw new Error('Assignment ID is required');
    }
    
    // Format the date properly for database storage
    if (assignmentData.due_date) {
      assignmentData.due_date = new Date(assignmentData.due_date).toISOString();
    }
    
    // Add updated_at timestamp
    const assignmentWithTimestamp = {
      ...assignmentData,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('assignments')
      .update(assignmentWithTimestamp)
      .eq('id', assignmentId)
      .select()
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating assignment:', error);
    return { data: null, error };
  }
};

/**
 * Delete an assignment
 * @param {string} assignmentId - The assignment ID
 * @returns {Promise<Object>} - The result of the deletion
 */
export const deleteAssignment = async (assignmentId) => {
  try {
    if (!assignmentId) {
      throw new Error('Assignment ID is required');
    }
    
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);
      
    if (error) throw error;
    
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return { data: null, error };
  }
}; 