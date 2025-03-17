import { supabase } from '../../lib/supabase';

/**
 * Get all students for a course
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - The students data
 */
export const getStudents = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error('Course ID is required');
    }
    
    const { data, error } = await supabase
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
      .eq('course_id', courseId);
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching students:', error);
    return { data: null, error };
  }
};

/**
 * Get student details
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - The student details
 */
export const getStudentDetails = async (studentId) => {
  try {
    if (!studentId) {
      throw new Error('Student ID is required');
    }
    
    // Fetch student profile details
    const { data: studentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single();
      
    if (profileError) throw profileError;
      
    // Fetch student-specific details
    const { data: studentDetails, error: detailsError } = await supabase
      .from('students')
      .select('*')
      .eq('profile_id', studentId)
      .single();
      
    // Combine the data (even if studentDetails is null)
    const combinedStudentData = {
      ...studentProfile,
      ...(studentDetails || {})
    };
    
    return { data: combinedStudentData, error: null };
  } catch (error) {
    console.error('Error fetching student details:', error);
    return { data: null, error };
  }
};

/**
 * Get student analytics
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - The student analytics data
 */
export const getStudentAnalytics = async (studentId) => {
  try {
    if (!studentId) {
      throw new Error('Student ID is required');
    }
    
    // Fetch student profile details
    const { data: studentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single();
      
    if (profileError) throw profileError;
    
    // Fetch student-specific details
    const { data: studentDetails, error: detailsError } = await supabase
      .from('students')
      .select('*')
      .eq('profile_id', studentId)
      .single();
    
    // Fetch assignments and scores
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('student_assignments')
      .select(`
        *,
        assignments (*)
      `)
      .eq('student_id', studentId);
      
    if (assignmentError) throw assignmentError;
    
    // Calculate overall grade
    let overallGrade = 'N/A';
    let gradePercentage = 0;
    
    if (assignmentData && assignmentData.length > 0) {
      const gradedAssignments = assignmentData.filter(a => a.status === 'graded' && a.score !== null);
      
      if (gradedAssignments.length > 0) {
        const total = gradedAssignments.reduce((sum, a) => sum + (a.score || 0), 0);
        const max = gradedAssignments.reduce((sum, a) => sum + a.assignments.max_score, 0);
        gradePercentage = Math.round((total / max) * 100);
        
        // Determine letter grade
        if (gradePercentage >= 90) overallGrade = 'A';
        else if (gradePercentage >= 80) overallGrade = 'B';
        else if (gradePercentage >= 70) overallGrade = 'C';
        else if (gradePercentage >= 60) overallGrade = 'D';
        else overallGrade = 'F';
        
        // Add +/- modifiers
        if (overallGrade !== 'F') {
          const remainder = gradePercentage % 10;
          if (remainder >= 7 && overallGrade !== 'A') overallGrade += '+';
          else if (remainder <= 2 && overallGrade !== 'F') overallGrade += '-';
        }
      }
    }
    
    // Combine the data
    const combinedStudentData = {
      ...studentProfile,
      ...(studentDetails || {}),
      assignments: assignmentData || [],
      overallGrade,
      gradePercentage
    };
    
    return { data: combinedStudentData, error: null };
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    return { data: null, error };
  }
};

/**
 * Get all students with their performance for a course
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - The students with performance data
 */
export const getStudentsWithPerformance = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error('Course ID is required');
    }
    
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
      .eq('course_id', courseId);
      
    if (enrollmentError) throw enrollmentError;
    
    if (!enrolledStudents || enrolledStudents.length === 0) {
      return { data: [], error: null };
    }
    
    // Get assignments for this course
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId);
      
    if (assignmentsError) throw assignmentsError;
    
    // Get all submissions for these assignments
    const assignmentIds = assignments?.map(a => a.id) || [];
    const studentIds = enrolledStudents.map(s => s.student_id);
    
    let submissions = [];
    
    if (assignmentIds.length > 0) {
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('student_assignments')
        .select('*')
        .in('assignment_id', assignmentIds)
        .in('student_id', studentIds);
        
      if (submissionsError) throw submissionsError;
      submissions = submissionsData || [];
    }
    
    // Calculate performance metrics for each student
    const studentsWithPerformance = enrolledStudents.map(student => {
      const studentSubmissions = submissions.filter(s => s.student_id === student.student_id);
      const totalAssignments = assignments?.length || 0;
      const completedAssignments = studentSubmissions.filter(s => 
        s.status === 'submitted' || s.status === 'graded'
      ).length;
      
      // Calculate grade
      let overallGrade = 'N/A';
      let gradePercentage = 0;
      
      const gradedSubmissions = studentSubmissions.filter(s => s.status === 'graded' && s.score !== null);
      
      if (gradedSubmissions.length > 0) {
        const totalScore = gradedSubmissions.reduce((sum, s) => sum + s.score, 0);
        const maxPossibleScore = gradedSubmissions.length * 100; // Assuming max score is 100
        gradePercentage = Math.round((totalScore / maxPossibleScore) * 100);
        
        // Determine letter grade
        if (gradePercentage >= 90) overallGrade = 'A';
        else if (gradePercentage >= 80) overallGrade = 'B';
        else if (gradePercentage >= 70) overallGrade = 'C';
        else if (gradePercentage >= 60) overallGrade = 'D';
        else overallGrade = 'F';
      }
      
      return {
        id: student.student_id,
        first_name: student.profiles.first_name,
        last_name: student.profiles.last_name,
        email: student.profiles.email,
        completedAssignments,
        totalAssignments,
        completionRate: totalAssignments ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
        overallGrade,
        gradePercentage
      };
    });
    
    return { data: studentsWithPerformance, error: null };
  } catch (error) {
    console.error('Error fetching students with performance:', error);
    return { data: null, error };
  }
}; 