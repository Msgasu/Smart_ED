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
 * Get course details including instructor information
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - The course details
 */
export const getCourseDetails = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error('Course ID is required');
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
    
    return { 
      data: { 
        course: courseData, 
        instructor: instructorData 
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
    
    return { data, error: null, alreadyEnrolled: false };
  } catch (error) {
    console.error('Error enrolling in course:', error);
    return { data: null, error };
  }
}; 