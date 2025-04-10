import { supabase } from '../../lib/supabase';
import { calculateGrade } from '../../utils/gradeUtils';

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
    
    // Calculate total points earned and total possible points
    let totalEarned = 0;
    let totalPossible = 0;
    
    if (gradedSubmissions.length > 0) {
      // Get assignment details to get max points
      gradedSubmissions.forEach(submission => {
        const assignment = courseAssignments.find(a => a.id === submission.assignment_id);
        if (assignment) {
          const maxPoints = assignment.max_score || 100;
          totalEarned += submission.score || 0;
          totalPossible += maxPoints;
        }
      });
      
      // Calculate as percentage
      overallGrade = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
      
      // Use the utility function to get the letter grade
      letterGrade = calculateGrade(overallGrade);
    }
    
    // Detailed grades for each assignment
    const detailedGrades = courseAssignments.map(assignment => {
      const submission = courseSubmissions.find(s => s.assignment_id === assignment.id);
      const score = submission?.score || 0;
      const maxScore = assignment.max_score || 100;
      const percentage = submission?.score !== undefined && submission?.score !== null 
        ? Math.round((score / maxScore) * 100) 
        : null;
      
      return {
        id: assignment.id,
        title: assignment.title,
        dueDate: assignment.due_date,
        maxScore: maxScore,
        score: submission?.score,
        status: submission?.status || 'pending',
        weight: assignment.weight || 1,
        percentage: percentage,
        letterGrade: percentage !== null ? calculateGrade(percentage) : 'N/A'
      };
    });
    
    return { 
      data: {
        overallGrade,
        letterGrade,
        totalEarned,
        totalPossible,
        gradedAssignments: gradedSubmissions.length,
        totalAssignments: courseAssignments.length,
        detailedGrades
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error calculating course grade:', error);
    return { data: null, error };
  }
}; 