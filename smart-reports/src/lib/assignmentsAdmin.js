import { supabase } from './supabase'

const GRADED_STATUS = 'graded'
const ENROLLED_STATUS = 'enrolled'

export async function fetchAssignmentsOverview() {
  const [
    { data: assignments, error: assignmentsError },
    { data: enrollments, error: enrollmentsError },
    { data: studentAssignments, error: saError },
    { data: facultyCourses, error: fcError },
  ] = await Promise.all([
    supabase
      .from('assignments')
      .select(`
        id,
        title,
        type,
        due_date,
        max_score,
        created_at,
        course_id,
        courses ( id, code, name )
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('student_courses')
      .select('course_id, student_id')
      .eq('status', ENROLLED_STATUS),
    supabase
      .from('student_assignments')
      .select('assignment_id, student_id, status'),
    supabase
      .from('faculty_courses')
      .select(`
        course_id,
        faculty_id,
        status,
        profiles:faculty_id ( id, first_name, last_name, email )
      `)
      .eq('status', 'active'),
  ])

  if (assignmentsError) throw assignmentsError
  if (enrollmentsError) throw enrollmentsError
  if (saError) throw saError
  if (fcError) throw fcError

  const enrolledByCourse = {}
  for (const row of enrollments || []) {
    enrolledByCourse[row.course_id] = (enrolledByCourse[row.course_id] || 0) + 1
  }

  const gradedByAssignment = {}
  const submittedByAssignment = {}
  for (const row of studentAssignments || []) {
    if (row.status === GRADED_STATUS) {
      gradedByAssignment[row.assignment_id] = (gradedByAssignment[row.assignment_id] || 0) + 1
    }
    if (row.status === 'submitted' || row.status === GRADED_STATUS) {
      submittedByAssignment[row.assignment_id] = (submittedByAssignment[row.assignment_id] || 0) + 1
    }
  }

  const teachersByCourse = {}
  for (const fc of facultyCourses || []) {
    if (!fc.profiles) continue
    if (!teachersByCourse[fc.course_id]) teachersByCourse[fc.course_id] = []
    const exists = teachersByCourse[fc.course_id].some((t) => t.id === fc.profiles.id)
    if (!exists) {
      teachersByCourse[fc.course_id].push({
        id: fc.profiles.id,
        first_name: fc.profiles.first_name,
        last_name: fc.profiles.last_name,
        email: fc.profiles.email,
      })
    }
  }

  const now = Date.now()
  const assignmentRows = (assignments || []).map((a) => {
    const enrolled = enrolledByCourse[a.course_id] || 0
    const graded = gradedByAssignment[a.id] || 0
    const submitted = submittedByAssignment[a.id] || 0
    const dueMs = a.due_date ? new Date(a.due_date).getTime() : null
    const isPastDue = dueMs != null && dueMs < now
    const needsGrading = enrolled > 0 && graded < enrolled
    const gradingOverdue = isPastDue && needsGrading

    return {
      id: a.id,
      title: a.title,
      type: a.type,
      due_date: a.due_date,
      max_score: a.max_score,
      created_at: a.created_at,
      submission_mode: a.submission_mode || 'online',
      course_id: a.course_id,
      course_code: a.courses?.code || '—',
      course_name: a.courses?.name || '—',
      enrolled,
      graded,
      submitted,
      ungraded: Math.max(0, enrolled - graded),
      teachers: teachersByCourse[a.course_id] || [],
      isPastDue,
      needsGrading,
      gradingOverdue,
    }
  })

  const assignmentsByCourse = {}
  for (const a of assignmentRows) {
    assignmentsByCourse[a.course_id] = (assignmentsByCourse[a.course_id] || 0) + 1
  }

  const coursesWithoutAssignments = []
  const seenCourseIds = new Set()
  for (const fc of facultyCourses || []) {
    if (seenCourseIds.has(fc.course_id)) continue
    seenCourseIds.add(fc.course_id)
    if ((assignmentsByCourse[fc.course_id] || 0) > 0) continue
    const courseAssignments = (assignments || []).filter((x) => x.course_id === fc.course_id)
    const sample = courseAssignments[0]?.courses
    coursesWithoutAssignments.push({
      course_id: fc.course_id,
      course_code: sample?.code || '—',
      course_name: sample?.name || '—',
      teachers: teachersByCourse[fc.course_id] || [],
    })
  }

  // Enrich course names for courses with no assignments (courses not in assignments list)
  const missingCourseIds = coursesWithoutAssignments
    .filter((c) => c.course_code === '—')
    .map((c) => c.course_id)

  if (missingCourseIds.length > 0) {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, code, name')
      .in('id', missingCourseIds)
    const courseMap = Object.fromEntries((courses || []).map((c) => [c.id, c]))
    for (const row of coursesWithoutAssignments) {
      const c = courseMap[row.course_id]
      if (c) {
        row.course_code = c.code
        row.course_name = c.name
      }
    }
  }

  return {
    assignments: assignmentRows,
    coursesWithoutAssignments,
    summary: {
      totalAssignments: assignmentRows.length,
      needsGradingCount: assignmentRows.filter((a) => a.needsGrading).length,
      overdueGradingCount: assignmentRows.filter((a) => a.gradingOverdue).length,
      coursesWithoutAssignmentsCount: coursesWithoutAssignments.length,
    },
  }
}

export async function sendAdminNotifications(recipientIds, title, message) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!recipientIds?.length) throw new Error('No recipients selected')

  const now = new Date().toISOString()
  const records = recipientIds.map((recipientId) => ({
    sender_id: user.id,
    recipient_id: recipientId,
    title: title.trim(),
    message: message.trim(),
    is_read: false,
    created_at: now,
    updated_at: now,
  }))

  const { error } = await supabase.from('notifications').insert(records)
  if (error) throw error
  return records.length
}

export function buildGradingReminderTemplate(assignment) {
  const due = assignment.due_date
    ? new Date(assignment.due_date).toLocaleString()
    : 'N/A'

  return {
    title: `Reminder: Grade "${assignment.title}"`,
    message: `Hello,\n\nThis is a reminder that grading is incomplete for the assignment "${assignment.title}" (${assignment.course_code} – ${assignment.course_name}).\n\nDue date: ${due}\nGraded: ${assignment.graded} of ${assignment.enrolled} enrolled student(s)\nUngraded: ${assignment.ungraded}\n\nPlease complete grading in SmartED as soon as possible.\n\n— SmartED Admin`,
  }
}

export function buildNoAssignmentsReminderTemplate(course) {
  const courseLabel = `${course.course_code} – ${course.course_name}`
  return {
    title: `Reminder: Post assignments for ${course.course_code}`,
    message: `Hello,\n\nOur records show that ${courseLabel} currently has no assignments created for students.\n\nPlease add homework, classwork, or other assignments in SmartED so students can submit work and receive grades.\n\n— SmartED Admin`,
  }
}
