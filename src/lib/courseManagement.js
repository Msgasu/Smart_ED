import { supabase } from './supabase'
import toast from 'react-hot-toast'

/**
 * Get the current academic year string (e.g., "2025-2026")
 * @returns {string}
 */
export const getCurrentAcademicYear = () => {
  const now = new Date()
  const year = now.getFullYear()
  // Academic year typically starts in September
  const month = now.getMonth() + 1 // 1-indexed
  if (month >= 9) {
    return `${year}-${year + 1}`
  }
  return `${year - 1}-${year}`
}

/**
 * Determine the current term based on the date.
 * Adjust these date ranges to match your school's calendar.
 * @returns {string} - 'Term 1', 'Term 2', or 'Term 3'
 */
export const getCurrentTerm = () => {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-indexed
  // Sept-Dec = Term 1, Jan-Mar = Term 2, Apr-Aug = Term 3
  if (month >= 9 && month <= 12) return 'Term 1'
  if (month >= 1 && month <= 3) return 'Term 2'
  return 'Term 3'
}

/**
 * Get all terms that are current or future within the academic year
 * @param {string} currentTerm
 * @returns {string[]}
 */
const getCurrentAndFutureTerms = (currentTerm) => {
  const allTerms = ['Term 1', 'Term 2', 'Term 3']
  const currentIndex = allTerms.indexOf(currentTerm)
  return allTerms.slice(currentIndex)
}

/**
 * Add a course to a student's course list with term-versioned enrollment tracking.
 * Creates enrollment records for the specified term (and optionally future terms).
 * Also maintains the legacy student_courses table for backward compatibility.
 * 
 * @param {string} studentId - The student profile ID
 * @param {string} courseId - The course ID
 * @param {Object} options - Optional term/year context
 * @param {string} options.term - Specific term (defaults to current term)
 * @param {string} options.academicYear - Specific academic year (defaults to current)
 * @param {boolean} options.includeAllTerms - If true, enroll for all 3 terms (default: true for backward compat)
 * @returns {Promise<Object>} - Object containing success status and any errors
 */
export const addCourseToStudent = async (studentId, courseId, options = {}) => {
  try {
    const term = options.term || getCurrentTerm()
    const academicYear = options.academicYear || getCurrentAcademicYear()
    const includeAllTerms = options.includeAllTerms !== undefined ? options.includeAllTerms : false

    // Determine which terms to create enrollment records for
    // Default: only current + future terms (past terms should not get new courses)
    const termsToEnroll = includeAllTerms
      ? ['Term 1', 'Term 2', 'Term 3']
      : getCurrentAndFutureTerms(term)

    // 1. Maintain legacy student_courses entry for backward compatibility
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

    if (!existingAssignment) {
      const { error: insertError } = await supabase
        .from('student_courses')
        .insert([{
          student_id: studentId,
          course_id: courseId,
          status: 'enrolled'
        }])

      if (insertError) {
        console.error('Error adding course to student_courses:', insertError)
        return {
          success: false,
          errors: [insertError.message],
          message: `Error adding course to student: ${insertError.message}`
        }
      }
    }

    // 2. Create term-versioned enrollment records
    let enrollmentErrors = []
    let enrolledCount = 0
    let alreadyExistsCount = 0

    for (const enrollTerm of termsToEnroll) {
      // Check if enrollment already exists for this term
      const { data: existing, error: existCheck } = await supabase
        .from('student_course_enrollments')
        .select('id, status')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('term', enrollTerm)
        .eq('academic_year', academicYear)
        .single()

      if (existCheck && existCheck.code !== 'PGRST116') {
        enrollmentErrors.push(`Check ${enrollTerm}: ${existCheck.message}`)
        continue
      }

      if (existing) {
        // If it was previously dropped, re-enroll it
        if (existing.status === 'dropped') {
          const { error: updateError } = await supabase
            .from('student_course_enrollments')
            .update({
              status: 'enrolled',
              dropped_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)

          if (updateError) {
            enrollmentErrors.push(`Re-enroll ${enrollTerm}: ${updateError.message}`)
          } else {
            enrolledCount++
          }
        } else {
          alreadyExistsCount++
        }
        continue
      }

      // Create new enrollment record for this term
      const { error: enrollError } = await supabase
        .from('student_course_enrollments')
        .insert([{
          student_id: studentId,
          course_id: courseId,
          term: enrollTerm,
          academic_year: academicYear,
          status: 'enrolled'
        }])

      if (enrollError) {
        enrollmentErrors.push(`Insert ${enrollTerm}: ${enrollError.message}`)
      } else {
        enrolledCount++
      }
    }

    if (enrollmentErrors.length > 0) {
      return {
        success: false,
        errors: enrollmentErrors,
        message: `Course enrollment had errors: ${enrollmentErrors.join(', ')}`
      }
    }

    if (alreadyExistsCount === termsToEnroll.length) {
      return {
        success: true,
        errors: [],
        message: 'Course is already assigned to this student for the selected term(s)',
        alreadyExists: true
      }
    }

    return {
      success: true,
      errors: [],
      message: `Course successfully enrolled for ${enrolledCount} term(s)`,
      alreadyExists: false,
      enrolledTerms: termsToEnroll
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
 * Remove a course enrollment for a specific term only.
 * This preserves historical term data — only the specified term is affected.
 * Grades in the specified term's report are removed; other terms remain untouched.
 * 
 * @param {string} studentId - The student profile ID
 * @param {string} courseId - The course ID
 * @param {Object} options - Term context for the removal
 * @param {string} options.term - The term to remove from (required)
 * @param {string} options.academicYear - The academic year (required)
 * @returns {Promise<Object>}
 */
export const removeCourseFromTerm = async (studentId, courseId, options = {}) => {
  try {
    const { term, academicYear } = options
    if (!term || !academicYear) {
      return {
        success: false,
        errors: ['Term and academic year are required for term-specific removal'],
        message: 'Term and academic year are required'
      }
    }

    let errors = []

    // 1. Mark the enrollment as 'dropped' for this specific term (don't delete it)
    const { data: enrollment, error: enrollError } = await supabase
      .from('student_course_enrollments')
      .update({
        status: 'dropped',
        dropped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('term', term)
      .eq('academic_year', academicYear)
      .select()

    if (enrollError) {
      errors.push(`Enrollment update: ${enrollError.message}`)
    }

    // 2. Remove grades from this specific term's report ONLY
    const { data: report, error: reportFetchError } = await supabase
      .from('student_reports')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('academic_year', academicYear)
      .single()

    if (reportFetchError && reportFetchError.code !== 'PGRST116') {
      errors.push(`Report fetch: ${reportFetchError.message}`)
    }

    if (report) {
      // Only remove grades from draft reports; completed reports are immutable
      if (report.status === 'completed') {
        errors.push('Cannot modify grades in a completed report. Revert to draft first.')
      } else {
        const { error: gradeError } = await supabase
          .from('student_grades')
          .delete()
          .eq('report_id', report.id)
          .eq('subject_id', courseId)

        if (gradeError) {
          errors.push(`Grade deletion: ${gradeError.message}`)
        }
      }
    }

    // 3. Check if the student has ANY remaining enrolled terms for this course
    //    If none remain, also remove from legacy student_courses
    const { data: remainingEnrollments, error: remainingError } = await supabase
      .from('student_course_enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('status', 'enrolled')

    if (!remainingError && (!remainingEnrollments || remainingEnrollments.length === 0)) {
      // No enrolled terms left — remove from legacy student_courses too
      await supabase
        .from('student_courses')
        .delete()
        .eq('student_id', studentId)
        .eq('course_id', courseId)
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        message: `Course removal had issues: ${errors.join('; ')}`
      }
    }

    return {
      success: true,
      errors: [],
      message: `Course removed from ${term} (${academicYear}). Other terms are unaffected.`
    }

  } catch (error) {
    console.error('Error in removeCourseFromTerm:', error)
    return {
      success: false,
      errors: [error.message],
      message: `Error removing course from term: ${error.message}`
    }
  }
}

/**
 * Remove a course from a student going forward.
 * - Drops enrollment for current + future terms
 * - Removes grades from current + future term draft reports
 * - Removes from legacy student_courses (student no longer takes this course)
 * - Past term enrollments and completed report grades are PRESERVED
 * 
 * @param {string} studentId - The student ID
 * @param {string} courseId - The course ID
 * @param {string} assignmentId - The assignment ID (optional)
 * @param {Object} options - Optional term context
 * @param {string} options.term - Current term (defaults to auto-detected)
 * @param {string} options.academicYear - Current academic year (defaults to auto-detected)
 * @returns {Promise<Object>} - Object containing success status and any errors
 */
export const deleteCourseAssignment = async (studentId, courseId, assignmentId = null, options = {}) => {
  try {
    let errors = []
    const currentTerm = options.term || getCurrentTerm()
    const currentAcademicYear = options.academicYear || getCurrentAcademicYear()
    const futureTerms = getCurrentAndFutureTerms(currentTerm)

    // 1. Mark enrollments as 'dropped' for current and future terms
    for (const term of futureTerms) {
      const { error: dropError } = await supabase
        .from('student_course_enrollments')
        .update({
          status: 'dropped',
          dropped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('term', term)
        .eq('academic_year', currentAcademicYear)

      if (dropError) {
        errors.push(`Drop ${term}: ${dropError.message}`)
      }
    }

    // 2. Delete grades from ONLY current and future term draft reports (past terms untouched)
    for (const term of futureTerms) {
      const { data: report, error: reportError } = await supabase
        .from('student_reports')
        .select('id, status')
        .eq('student_id', studentId)
        .eq('term', term)
        .eq('academic_year', currentAcademicYear)
        .single()

      if (reportError && reportError.code !== 'PGRST116') {
        errors.push(`Report fetch ${term}: ${reportError.message}`)
        continue
      }

      if (report && report.status !== 'completed') {
        const { error: gradeError } = await supabase
          .from('student_grades')
          .delete()
          .eq('report_id', report.id)
          .eq('subject_id', courseId)

        if (gradeError) {
          errors.push(`Grades ${term}: ${gradeError.message}`)
        }
      }
    }

    // 3. Always remove from legacy student_courses — student no longer takes this course
    let deleteQuery = supabase
      .from('student_courses')
      .delete()

    if (assignmentId) {
      deleteQuery = deleteQuery.eq('id', assignmentId)
    } else {
      deleteQuery = deleteQuery
        .eq('student_id', studentId)
        .eq('course_id', courseId)
    }

    const { error: courseError } = await deleteQuery
    if (courseError) {
      errors.push(`student_courses: ${courseError.message}`)
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        message: `Course removed with some errors: ${errors.join(', ')}`
      }
    }

    return {
      success: true,
      errors: [],
      message: `Course removed. Past term reports are preserved.`
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
 * Delete a course from a specific report only (unchanged - already term-scoped)
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
 * Delete a course assignment by its ID in student_courses.
 * Now term-aware — only affects current/future terms.
 * @param {string} assignmentId - The assignment ID
 * @param {Object} options - Optional term context
 * @returns {Promise<Object>}
 */
export const deleteCourseAssignmentById = async (assignmentId, options = {}) => {
  try {
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

    return await deleteCourseAssignment(assignment.student_id, assignment.course_id, assignmentId, options)

  } catch (error) {
    console.error('Error in deleteCourseAssignmentById:', error)
    return {
      success: false,
      errors: [error.message],
      message: `Error deleting assignment: ${error.message}`
    }
  }
}

/**
 * Get enrolled courses for a student in a specific term.
 * Used by reports to determine which courses to show for a given term.
 * 
 * @param {string} studentId - The student profile ID
 * @param {string} term - The term ('Term 1', 'Term 2', 'Term 3')
 * @param {string} academicYear - The academic year (e.g., '2025-2026')
 * @returns {Promise<Object>} - { data: courses[], error }
 */
export const getStudentCoursesForTerm = async (studentId, term, academicYear) => {
  try {
    if (!studentId || !term || !academicYear) {
      throw new Error('studentId, term, and academicYear are required')
    }

    const { data, error } = await supabase
      .from('student_course_enrollments')
      .select(`
        id,
        course_id,
        term,
        academic_year,
        status,
        enrolled_at,
        courses (
          id,
          code,
          name,
          description
        )
      `)
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('academic_year', academicYear)
      .eq('status', 'enrolled')

    if (error) throw error

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error fetching term courses:', error)
    return { data: null, error }
  }
}

/**
 * Sync legacy student_courses records into student_course_enrollments for a single student.
 * Only creates records for current + future terms from legacy data.
 * Past term records are only created if grades exist.
 * 
 * @param {string} studentId - The student profile ID
 * @param {string} academicYear - The academic year to sync for (defaults to current)
 * @returns {Promise<Object>} - { synced: number, error }
 */
export const syncLegacyEnrollments = async (studentId, academicYear = null) => {
  try {
    const resolvedYear = academicYear || getCurrentAcademicYear()
    const currentTerm = getCurrentTerm()
    const allTerms = ['Term 1', 'Term 2', 'Term 3']
    const currentTermIndex = allTerms.indexOf(currentTerm)
    const futureTerms = allTerms.slice(currentTermIndex)
    const pastTerms = allTerms.slice(0, currentTermIndex)

    const { data: legacyCourses, error: legacyError } = await supabase
      .from('student_courses')
      .select('student_id, course_id')
      .eq('student_id', studentId)
      .eq('status', 'enrolled')

    if (legacyError) throw legacyError
    if (!legacyCourses || legacyCourses.length === 0) {
      return { synced: 0, error: null }
    }

    let syncedCount = 0

    // Current + future terms: sync from legacy student_courses
    for (const enrollment of legacyCourses) {
      for (const term of futureTerms) {
        const { data: existing } = await supabase
          .from('student_course_enrollments')
          .select('id')
          .eq('student_id', enrollment.student_id)
          .eq('course_id', enrollment.course_id)
          .eq('term', term)
          .eq('academic_year', resolvedYear)
          .single()

        if (!existing) {
          const { error: insertError } = await supabase
            .from('student_course_enrollments')
            .insert([{
              student_id: enrollment.student_id,
              course_id: enrollment.course_id,
              term: term,
              academic_year: resolvedYear,
              status: 'enrolled'
            }])

          if (!insertError) syncedCount++
        }
      }
    }

    // Past terms: only create enrollments where grades actually exist
    if (pastTerms.length > 0) {
      const { data: pastReports } = await supabase
        .from('student_reports')
        .select('id, term')
        .eq('student_id', studentId)
        .eq('academic_year', resolvedYear)
        .in('term', pastTerms)

      if (pastReports && pastReports.length > 0) {
        for (const report of pastReports) {
          const { data: grades } = await supabase
            .from('student_grades')
            .select('subject_id')
            .eq('report_id', report.id)

          if (grades) {
            for (const grade of grades) {
              if (!grade.subject_id) continue

              const { data: existing } = await supabase
                .from('student_course_enrollments')
                .select('id')
                .eq('student_id', studentId)
                .eq('course_id', grade.subject_id)
                .eq('term', report.term)
                .eq('academic_year', resolvedYear)
                .single()

              if (!existing) {
                const { error: insertError } = await supabase
                  .from('student_course_enrollments')
                  .insert([{
                    student_id: studentId,
                    course_id: grade.subject_id,
                    term: report.term,
                    academic_year: resolvedYear,
                    status: 'enrolled'
                  }])

                if (!insertError) syncedCount++
              }
            }
          }
        }
      }
    }

    return { synced: syncedCount, error: null }
  } catch (error) {
    console.error('Error syncing legacy enrollments:', error)
    return { synced: 0, error }
  }
}

/**
 * Sync legacy enrollments for ALL students.
 * Only creates enrollment records for current + future terms.
 * Past term enrollments are only created if grades exist for that course/term.
 * 
 * @param {string} academicYear - The academic year to sync for
 * @returns {Promise<Object>}
 */
export const syncAllLegacyEnrollments = async (academicYear = null) => {
  try {
    const resolvedYear = academicYear || getCurrentAcademicYear()
    const currentTerm = getCurrentTerm()
    const allTerms = ['Term 1', 'Term 2', 'Term 3']
    const currentTermIndex = allTerms.indexOf(currentTerm)
    const futureTerms = allTerms.slice(currentTermIndex)
    const pastTerms = allTerms.slice(0, currentTermIndex)

    const { data: allEnrollments, error: fetchError } = await supabase
      .from('student_courses')
      .select('student_id, course_id')
      .eq('status', 'enrolled')

    if (fetchError) throw fetchError
    if (!allEnrollments || allEnrollments.length === 0) {
      return { synced: 0, error: null }
    }

    const toInsert = []

    // Current + future terms: create enrollments for all active student_courses
    for (const enrollment of allEnrollments) {
      for (const term of futureTerms) {
        toInsert.push({
          student_id: enrollment.student_id,
          course_id: enrollment.course_id,
          term: term,
          academic_year: resolvedYear,
          status: 'enrolled'
        })
      }
    }

    // Past terms: only create enrollments where grades actually exist
    if (pastTerms.length > 0) {
      const { data: pastReports, error: pastReportsError } = await supabase
        .from('student_reports')
        .select('id, student_id, term')
        .eq('academic_year', resolvedYear)
        .in('term', pastTerms)

      if (!pastReportsError && pastReports && pastReports.length > 0) {
        const reportIds = pastReports.map(r => r.id)

        const { data: pastGrades, error: pastGradesError } = await supabase
          .from('student_grades')
          .select('report_id, subject_id')
          .in('report_id', reportIds)

        if (!pastGradesError && pastGrades) {
          const reportMap = {}
          pastReports.forEach(r => { reportMap[r.id] = r })

          for (const grade of pastGrades) {
            const report = reportMap[grade.report_id]
            if (report && grade.subject_id) {
              toInsert.push({
                student_id: report.student_id,
                course_id: grade.subject_id,
                term: report.term,
                academic_year: resolvedYear,
                status: 'enrolled'
              })
            }
          }
        }
      }
    }

    if (toInsert.length === 0) {
      return { synced: 0, error: null }
    }

    const { error: upsertError } = await supabase
      .from('student_course_enrollments')
      .upsert(toInsert, {
        onConflict: 'student_id,course_id,term,academic_year',
        ignoreDuplicates: true
      })

    if (upsertError) throw upsertError

    return { synced: toInsert.length, error: null }
  } catch (error) {
    console.error('Error syncing all legacy enrollments:', error)
    return { synced: 0, error }
  }
}

/**
 * Get enrollment history for a student across all terms
 * @param {string} studentId
 * @param {string} academicYear - Optional filter
 * @returns {Promise<Object>}
 */
export const getStudentEnrollmentHistory = async (studentId, academicYear = null) => {
  try {
    let query = supabase
      .from('student_course_enrollments')
      .select(`
        *,
        courses (
          id,
          code,
          name,
          description
        )
      `)
      .eq('student_id', studentId)
      .order('academic_year', { ascending: false })
      .order('term')

    if (academicYear) {
      query = query.eq('academic_year', academicYear)
    }

    const { data, error } = await query

    if (error) throw error

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error fetching enrollment history:', error)
    return { data: null, error }
  }
}

