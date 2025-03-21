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

/**
 * Get class performance statistics for a course
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - Class performance statistics
 */
export const getClassPerformanceStats = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error('Course ID is required');
    }
    
    // Get all assignments for this course
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId);
      
    if (assignmentsError) throw assignmentsError;
    
    if (!assignments || assignments.length === 0) {
      return { 
        data: { 
          totalPossibleScore: 0, 
          thresholdScore: 0, 
          totalAssignments: 0,
          students: []
        }, 
        error: null 
      };
    }
    
    // Calculate the total possible score for all assignments
    const totalPossibleScore = assignments.reduce((sum, assignment) => {
      return sum + assignment.max_score;
    }, 0);
    
    // Calculate the 60% threshold
    const thresholdScore = Math.round(totalPossibleScore * 0.6);
    
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
      return { 
        data: { 
          totalPossibleScore, 
          thresholdScore, 
          totalAssignments: assignments.length,
          students: []
        }, 
        error: null 
      };
    }
    
    // Get all student assignments for this course
    const assignmentIds = assignments.map(a => a.id);
    const studentIds = enrolledStudents.map(s => s.student_id);
    
    const { data: studentAssignments, error: studentAssignmentsError } = await supabase
      .from('student_assignments')
      .select(`
        *,
        assignments (*)
      `)
      .in('assignment_id', assignmentIds)
      .in('student_id', studentIds);
      
    if (studentAssignmentsError) throw studentAssignmentsError;
    
    // Calculate performance for each student
    const studentsWithPerformance = enrolledStudents.map(enrollment => {
      const studentSubmissions = studentAssignments?.filter(sa => sa.student_id === enrollment.student_id) || [];
      
      // Calculate total score earned by the student
      const totalEarnedScore = studentSubmissions.reduce((sum, sa) => {
        return sa.status === 'graded' && sa.score !== null ? sum + sa.score : sum;
      }, 0);
      
      // Calculate grade percentage
      const gradePercentage = totalPossibleScore > 0 
        ? Math.round((totalEarnedScore / totalPossibleScore) * 100) 
        : 0;
      
      // Calculate percentage of the 60% threshold
      const percentOfThreshold = totalPossibleScore > 0
        ? Math.round((totalEarnedScore / totalPossibleScore) * 60)
        : 0;
      
      // Determine if student is passing based on 60% threshold
      const isPassing = totalEarnedScore >= thresholdScore;
      
      // Determine letter grade
      let letterGrade = 'N/A';
      if (gradePercentage >= 90) letterGrade = 'A';
      else if (gradePercentage >= 80) letterGrade = 'B';
      else if (gradePercentage >= 70) letterGrade = 'C';
      else if (gradePercentage >= 60) letterGrade = 'D';
      else letterGrade = 'F';
      
      return {
        id: enrollment.student_id,
        name: `${enrollment.profiles.first_name} ${enrollment.profiles.last_name}`,
        email: enrollment.profiles.email,
        totalEarnedScore,
        gradePercentage,
        percentOfThreshold,
        letterGrade,
        isPassing
      };
    });
    
    return { 
      data: {
        totalPossibleScore,
        thresholdScore,
        totalAssignments: assignments.length,
        students: studentsWithPerformance
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching class performance stats:', error);
    return { data: null, error };
  }
}; 