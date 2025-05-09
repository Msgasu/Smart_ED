import { supabase } from '../../lib/supabase';

/**
 * Get the teacher profile data
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The teacher profile data
 */
export const getTeacherProfile = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    return { data: null, error };
  }
};

/**
 * Update the teacher profile
 * @param {string} userId - The user ID
 * @param {Object} profileData - The profile data to update
 * @returns {Promise<Object>} - The updated profile data
 */
export const updateTeacherProfile = async (userId, profileData) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    return { data: null, error };
  }
};

/**
 * Get dashboard statistics for  teacher
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The dashboard statistics
 */
export const getTeacherDashboardStats = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Fetch faculty courses
    const { data: facultyCourses, error: coursesError } = await supabase
      .from('faculty_courses')
      .select('course_id')
      .eq('faculty_id', userId);
      
    if (coursesError) throw coursesError;
    
    const courseIds = facultyCourses?.map(fc => fc.course_id) || [];
    
    if (courseIds.length === 0) {
      return { 
        data: {
          courses: 0,
          students: 0,
          assignments: 0,
          submissions: 0,
          recentSubmissions: []
        }, 
        error: null 
      };
    }
    
    // Get count of students enrolled in these courses
    const { count: studentsCount, error: studentsError } = await supabase
      .from('student_courses')
      .select('student_id', { count: 'exact', head: true })
      .in('course_id', courseIds);
      
    if (studentsError) throw studentsError;
    
    // Get count of assignments for these courses
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id')
      .in('course_id', courseIds);
      
    if (assignmentsError) throw assignmentsError;
    
    // Get count of submissions for these assignments
    const assignmentIds = assignments?.map(a => a.id) || [];
    const { count: submissionsCount, error: submissionsError } = await supabase
      .from('student_assignments')
      .select('id', { count: 'exact', head: true })
      .in('assignment_id', assignmentIds);
      
    if (submissionsError) throw submissionsError;
    
    // Get recent submissions
    const { data: recent, error: recentError } = await supabase
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
      .order('submitted_at', { ascending: false })
      .limit(5);
      
    if (recentError) throw recentError;
    
    return { 
      data: {
        courses: courseIds.length,
        students: studentsCount || 0,
        assignments: assignments?.length || 0,
        submissions: submissionsCount || 0,
        recentSubmissions: recent || []
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching teacher dashboard stats:', error);
    return { data: null, error };
  }
}; 