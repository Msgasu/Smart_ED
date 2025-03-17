import { supabase } from '../../lib/supabase';

/**
 * Get all courses for a teacher
 * @param {string} teacherId - The teacher ID
 * @returns {Promise<Object>} - The courses data
 */
export const getTeacherCourses = async (teacherId) => {
  try {
    if (!teacherId) {
      throw new Error('Teacher ID is required');
    }
    
    const { data, error } = await supabase
      .from('faculty_courses')
      .select(`
        course_id,
        courses (
          id,
          code,
          name,
          description
        )
      `)
      .eq('faculty_id', teacherId);
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    return { data: null, error };
  }
};

/**
 * Get course details
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - The course details
 */
export const getCourseDetails = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error('Course ID is required');
    }
    
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching course details:', error);
    return { data: null, error };
  }
};

/**
 * Get course statistics
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - The course statistics
 */
export const getCourseStats = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error('Course ID is required');
    }
    
    // Get count of students enrolled in this course
    const { count: studentsCount, error: studentsError } = await supabase
      .from('student_courses')
      .select('student_id', { count: 'exact', head: true })
      .eq('course_id', courseId);
      
    if (studentsError) throw studentsError;
    
    // Get count of assignments for this course
    const { count: assignmentsCount, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId);
      
    if (assignmentsError) throw assignmentsError;
    
    // Get assignments for this course
    const { data: assignments, error: assignmentsDataError } = await supabase
      .from('assignments')
      .select('id')
      .eq('course_id', courseId);
      
    if (assignmentsDataError) throw assignmentsDataError;
    
    // Get count of submissions for these assignments
    const assignmentIds = assignments?.map(a => a.id) || [];
    let submissionsCount = 0;
    
    if (assignmentIds.length > 0) {
      const { count: subCount, error: submissionsError } = await supabase
        .from('student_assignments')
        .select('id', { count: 'exact', head: true })
        .in('assignment_id', assignmentIds);
        
      if (submissionsError) throw submissionsError;
      submissionsCount = subCount || 0;
    }
    
    return { 
      data: {
        students: studentsCount || 0,
        assignments: assignmentsCount || 0,
        submissions: submissionsCount
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching course statistics:', error);
    return { data: null, error };
  }
};

/**
 * Create a new course
 * @param {Object} courseData - The course data
 * @param {string} teacherId - The teacher ID
 * @returns {Promise<Object>} - The created course
 */
export const createCourse = async (courseData, teacherId) => {
  try {
    if (!courseData || !teacherId) {
      throw new Error('Course data and Teacher ID are required');
    }
    
    // Create the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert([courseData])
      .select()
      .single();
      
    if (courseError) throw courseError;
    
    // Associate the teacher with the course
    const { error: facultyError } = await supabase
      .from('faculty_courses')
      .insert([{
        faculty_id: teacherId,
        course_id: course.id
      }]);
      
    if (facultyError) throw facultyError;
    
    return { data: course, error: null };
  } catch (error) {
    console.error('Error creating course:', error);
    return { data: null, error };
  }
}; 