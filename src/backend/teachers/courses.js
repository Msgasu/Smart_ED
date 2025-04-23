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

/**
 * Upload a course syllabus
 * @param {Object} syllabusData - The syllabus data including file information
 * @returns {Promise<Object>} - The created syllabus record
 */
export const uploadCourseSyllabus = async (syllabusData) => {
  try {
    if (!syllabusData || !syllabusData.course_id || !syllabusData.faculty_id) {
      throw new Error('Course ID, Faculty ID, and file information are required');
    }
    
    // Create the syllabus record
    const { data, error } = await supabase
      .from('course_syllabi')
      .insert([syllabusData])
      .select()
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error uploading syllabus:', error);
    return { data: null, error };
  }
};

/**
 * Get course syllabus
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - The course syllabus
 */
export const getCourseSyllabus = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error('Course ID is required');
    }
    
    const { data, error } = await supabase
      .from('course_syllabi')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is the "no rows returned" error
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching course syllabus:', error);
    return { data: null, error };
  }
};

/**
 * Create a course to-do item
 * @param {Object} todoData - The to-do data
 * @returns {Promise<Object>} - The created to-do
 */
export const createCourseTodo = async (todoData) => {
  try {
    if (!todoData || !todoData.course_id || !todoData.faculty_id) {
      throw new Error('Course ID, Faculty ID and to-do details are required');
    }
    
    // Create the to-do
    const { data, error } = await supabase
      .from('course_todos')
      .insert([todoData])
      .select()
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error creating course to-do:', error);
    return { data: null, error };
  }
};

/**
 * Get course to-dos
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - The course to-dos
 */
export const getCourseTodos = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error('Course ID is required');
    }
    
    const { data, error } = await supabase
      .from('course_todos')
      .select('*')
      .eq('course_id', courseId)
      .order('week_number', { ascending: true });
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching course to-dos:', error);
    return { data: null, error };
  }
};

/**
 * Update a course to-do item
 * @param {string} todoId - The to-do ID
 * @param {Object} todoData - The updated to-do data
 * @returns {Promise<Object>} - The updated to-do
 */
export const updateCourseTodo = async (todoId, todoData) => {
  try {
    if (!todoId) {
      throw new Error('To-do ID is required');
    }
    
    // Update the to-do
    const { data, error } = await supabase
      .from('course_todos')
      .update(todoData)
      .eq('id', todoId)
      .select()
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating course to-do:', error);
    return { data: null, error };
  }
};

/**
 * Delete a course to-do item
 * @param {string} todoId - The to-do ID
 * @returns {Promise<Object>} - The result of the deletion
 */
export const deleteCourseTodo = async (todoId) => {
  try {
    if (!todoId) {
      throw new Error('To-do ID is required');
    }
    
    // Delete the to-do
    const { error } = await supabase
      .from('course_todos')
      .delete()
      .eq('id', todoId);
      
    if (error) throw error;
    
    return { data: true, error: null };
  } catch (error) {
    console.error('Error deleting course to-do:', error);
    return { data: null, error };
  }
}; 