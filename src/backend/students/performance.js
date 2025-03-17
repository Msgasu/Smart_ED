import { supabase } from '../../lib/supabase';

/**
 * Get chart data for a course
 * @param {string} courseId - The course ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - The chart data
 */
export const getChartData = async (courseId, studentId) => {
  try {
    if (!courseId || !studentId) {
      throw new Error('Course ID and Student ID are required');
    }
    
    // Get assignments for this course
    const { data: courseAssignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId);
      
    if (assignmentsError) throw assignmentsError;
    
    if (!courseAssignments || courseAssignments.length === 0) {
      return { 
        data: {
          labels: ['No assignments yet'],
          datasets: [{
            label: 'Assessment Scores',
            data: [0],
            borderColor: '#0ea5e9',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(14, 165, 233, 0.1)'
          }]
        }, 
        error: null 
      };
    }
    
    // Get submissions for this student
    const { data: submissions, error: submissionsError } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('student_id', studentId);
      
    if (submissionsError) throw submissionsError;
    
    // Filter for assignments in this course
    const assignmentIds = courseAssignments.map(a => a.id);
    const courseSubmissions = submissions.filter(
      submission => assignmentIds.includes(submission.assignment_id)
    );
    
    // Get graded submissions
    const gradedSubmissions = courseSubmissions.filter(
      s => s.status === 'graded' && s.score !== null
    );
    
    // If no graded submissions, return default data
    if (gradedSubmissions.length === 0) {
      return { 
        data: {
          labels: ['No graded assignments yet'],
          datasets: [{
            label: 'Assessment Scores',
            data: [0],
            borderColor: '#0ea5e9',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(14, 165, 233, 0.1)'
          }]
        }, 
        error: null 
      };
    }
    
    // Sort submissions by assignment due date
    const sortedSubmissions = [...gradedSubmissions].sort((a, b) => {
      const assignmentA = courseAssignments.find(assignment => assignment.id === a.assignment_id);
      const assignmentB = courseAssignments.find(assignment => assignment.id === b.assignment_id);
      return new Date(assignmentA?.due_date || 0) - new Date(assignmentB?.due_date || 0);
    });
    
    // Get assignment names and scores
    const labels = sortedSubmissions.map(submission => {
      const assignment = courseAssignments.find(a => a.id === submission.assignment_id);
      return assignment?.title || 'Assignment';
    });
    
    const scores = sortedSubmissions.map(submission => submission.score);
    
    return { 
      data: {
        labels,
        datasets: [{
          label: 'Assessment Scores',
          data: scores,
          borderColor: '#0ea5e9',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(14, 165, 233, 0.1)'
        }]
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error generating chart data:', error);
    return { data: null, error };
  }
};

/**
 * Calculate overall grade for a course
 * @param {string} courseId - The course ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - The grade data
 */
export const calculateCourseGrade = async (courseId, studentId) => {
  try {
    if (!courseId || !studentId) {
      throw new Error('Course ID and Student ID are required');
    }
    
    // Get assignments for this course
    const { data: courseAssignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId);
      
    if (assignmentsError) throw assignmentsError;
    
    // Get submissions for this student
    const { data: submissions, error: submissionsError } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('student_id', studentId);
      
    if (submissionsError) throw submissionsError;
    
    // Filter for assignments in this course
    const assignmentIds = courseAssignments.map(a => a.id);
    const courseSubmissions = submissions.filter(
      submission => assignmentIds.includes(submission.assignment_id)
    );
    
    // Get graded submissions
    const gradedSubmissions = courseSubmissions.filter(
      s => s.status === 'graded' && s.score !== null
    );
    
    // Calculate overall grade
    let overallGrade = 0;
    let letterGrade = 'N/A';
    
    if (gradedSubmissions.length > 0) {
      const totalScore = gradedSubmissions.reduce((sum, submission) => sum + submission.score, 0);
      overallGrade = Math.round(totalScore / gradedSubmissions.length);
      
      // Determine letter grade
      if (overallGrade >= 90) letterGrade = 'A';
      else if (overallGrade >= 80) letterGrade = 'B';
      else if (overallGrade >= 70) letterGrade = 'C';
      else if (overallGrade >= 60) letterGrade = 'D';
      else letterGrade = 'F';
      
      // Add +/- modifiers
      if (letterGrade !== 'F') {
        const remainder = overallGrade % 10;
        if (remainder >= 7 && letterGrade !== 'A') letterGrade += '+';
        else if (remainder <= 2 && letterGrade !== 'F') letterGrade += '-';
      }
    }
    
    return { 
      data: {
        overallGrade,
        letterGrade,
        gradedAssignments: gradedSubmissions.length,
        totalAssignments: courseAssignments.length
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error calculating course grade:', error);
    return { data: null, error };
  }
}; 