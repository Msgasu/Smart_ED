import { supabase } from './supabase'
import toast from 'react-hot-toast'

/**
 * Add a course to a student's course list in the database
 * @param {string} studentId - The student ID
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - Object containing success status and any errors
 */
export const addCourseToStudent = async (studentId, courseId) => {
  try {
    // First check if the course is already assigned to this student
    const { data: existingAssignment, error: checkError } = await supabase
      .from('student_courses')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing assignment:', checkError)
      return {
        success: false,
        errors: [checkError.message],
        message: `Error checking existing assignment: ${checkError.message}`
      }
    }

    if (existingAssignment) {
      return {
        success: true,
        errors: [],
        message: 'Course is already assigned to this student',
        alreadyExists: true
      }
    }

    // Add the course to the student's course list
    const { error: insertError } = await supabase
      .from('student_courses')
      .insert([{
        student_id: studentId,
        course_id: courseId,
        status: 'enrolled'
      }])

    if (insertError) {
      console.error('Error adding course to student:', insertError)
      return {
        success: false,
        errors: [insertError.message],
        message: `Error adding course to student: ${insertError.message}`
      }
    }

    return {
      success: true,
      errors: [],
      message: 'Course successfully added to student',
      alreadyExists: false
    }

  } catch (error) {
    console.error('Error in addCourseToStudent:', error)
    return {
      success: false,
      errors: [error.message],
      message: `Error adding course to student: ${error.message}`
    }
  }
}

/**
 * Delete a course assignment and all related data from the database
 * @param {string} studentId - The student ID
 * @param {string} courseId - The course ID
 * @param {string} assignmentId - The assignment ID (optional, for direct assignment deletion)
 * @returns {Promise<Object>} - Object containing success status and any errors
 */
export const deleteCourseAssignment = async (studentId, courseId, assignmentId = null) => {
  try {
    let errors = []

    // 1. Delete from student_courses table
    let deleteQuery = supabase
      .from('student_courses')
      .delete()

    if (assignmentId) {
      // If we have the assignment ID, use it for more precise deletion
      deleteQuery = deleteQuery.eq('id', assignmentId)
    } else {
      // Otherwise, delete by student and course
      deleteQuery = deleteQuery
        .eq('student_id', studentId)
        .eq('course_id', courseId)
    }

    const { error: courseError } = await deleteQuery

    if (courseError) {
      console.error('Error deleting course assignment:', courseError)
      errors.push(`Course assignment: ${courseError.message}`)
    }

    // 2. Delete grades from all reports for this student and course
    const { data: reports, error: reportsError } = await supabase
      .from('student_reports')
      .select('id')
      .eq('student_id', studentId)

    if (reportsError) {
      console.error('Error fetching reports:', reportsError)
      errors.push(`Reports fetch: ${reportsError.message}`)
    } else if (reports && reports.length > 0) {
      const reportIds = reports.map(report => report.id)
      
      const { error: gradesError } = await supabase
        .from('student_grades')
        .delete()
        .in('report_id', reportIds)
        .eq('subject_id', courseId)

      if (gradesError) {
        console.error('Error deleting grades:', gradesError)
        errors.push(`Grades: ${gradesError.message}`)
      }
    }

    // 3. Delete any assignment submissions for this course
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id')
      .eq('course_id', courseId)

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      errors.push(`Assignments fetch: ${assignmentsError.message}`)
    } else if (assignments && assignments.length > 0) {
      const assignmentIds = assignments.map(assignment => assignment.id)
      
      const { error: submissionsError } = await supabase
        .from('student_assignments')
        .delete()
        .eq('student_id', studentId)
        .in('assignment_id', assignmentIds)

      if (submissionsError) {
        console.error('Error deleting assignment submissions:', submissionsError)
        errors.push(`Submissions: ${submissionsError.message}`)
      }
    }

    // 4. Delete any assignment files for this course
    if (assignments && assignments.length > 0) {
      const assignmentIds = assignments.map(assignment => assignment.id)
      
      // First get the file paths
      const { data: files, error: filesError } = await supabase
        .from('assignment_files')
        .select('path')
        .eq('student_id', studentId)
        .in('assignment_id', assignmentIds)

      if (filesError) {
        console.error('Error fetching assignment files:', filesError)
        errors.push(`Files fetch: ${filesError.message}`)
      } else if (files && files.length > 0) {
        // Delete from storage
        const filePaths = files.map(file => file.path)
        const { error: storageError } = await supabase
          .storage
          .from('assignments')
          .remove(filePaths)

        if (storageError) {
          console.error('Error deleting files from storage:', storageError)
          errors.push(`Storage: ${storageError.message}`)
        }

        // Delete file records from database
        const { error: filesDeleteError } = await supabase
          .from('assignment_files')
          .delete()
          .eq('student_id', studentId)
          .in('assignment_id', assignmentIds)

        if (filesDeleteError) {
          console.error('Error deleting file records:', filesDeleteError)
          errors.push(`File records: ${filesDeleteError.message}`)
        }
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        message: `Course deleted with some errors: ${errors.join(', ')}`
      }
    }

    return {
      success: true,
      errors: [],
      message: 'Course and all related data deleted successfully'
    }

  } catch (error) {
    console.error('Error in deleteCourseAssignment:', error)
    return {
      success: false,
      errors: [error.message],
      message: `Error deleting course: ${error.message}`
    }
  }
}

/**
 * Delete a course from a specific report only
 * @param {string} reportId - The report ID
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - Object containing success status and any errors
 */
export const deleteCourseFromReport = async (reportId, courseId) => {
  try {
    const { error } = await supabase
      .from('student_grades')
      .delete()
      .eq('report_id', reportId)
      .eq('subject_id', courseId)

    if (error) {
      console.error('Error deleting grade from report:', error)
      return {
        success: false,
        errors: [error.message],
        message: `Error deleting grade: ${error.message}`
      }
    }

    return {
      success: true,
      errors: [],
      message: 'Grade deleted from report successfully'
    }

  } catch (error) {
    console.error('Error in deleteCourseFromReport:', error)
    return {
      success: false,
      errors: [error.message],
      message: `Error deleting grade: ${error.message}`
    }
  }
}

/**
 * Delete a course assignment from the course assignment page
 * @param {string} assignmentId - The assignment ID
 * @returns {Promise<Object>} - Object containing success status and any errors
 */
export const deleteCourseAssignmentById = async (assignmentId) => {
  try {
    // First, get the assignment details
    const { data: assignment, error: fetchError } = await supabase
      .from('student_courses')
      .select('student_id, course_id')
      .eq('id', assignmentId)
      .single()

    if (fetchError) {
      console.error('Error fetching assignment:', fetchError)
      return {
        success: false,
        errors: [fetchError.message],
        message: `Error fetching assignment: ${fetchError.message}`
      }
    }

    if (!assignment) {
      return {
        success: false,
        errors: ['Assignment not found'],
        message: 'Assignment not found'
      }
    }

    // Use the comprehensive deletion function
    return await deleteCourseAssignment(assignment.student_id, assignment.course_id, assignmentId)

  } catch (error) {
    console.error('Error in deleteCourseAssignmentById:', error)
    return {
      success: false,
      errors: [error.message],
      message: `Error deleting assignment: ${error.message}`
    }
  }
}
