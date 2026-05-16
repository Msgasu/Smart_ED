import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  FaBell,
  FaClipboardList,
  FaExclamationTriangle,
  FaSearch,
  FaSync,
  FaPaperPlane,
  FaTimes,
} from 'react-icons/fa'
import {
  fetchAssignmentsOverview,
  sendAdminNotifications,
  buildGradingReminderTemplate,
  buildNoAssignmentsReminderTemplate,
} from '../lib/assignmentsAdmin'
import './AssignmentsOverviewPage.css'

const FILTER_OPTIONS = [
  { id: 'all', label: 'All assignments' },
  { id: 'needs_grading', label: 'Needs grading' },
  { id: 'overdue', label: 'Overdue grading' },
  { id: 'complete', label: 'Fully graded' },
]

const AssignmentsOverviewPage = () => {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [coursesWithoutAssignments, setCoursesWithoutAssignments] = useState([])
  const [summary, setSummary] = useState({
    totalAssignments: 0,
    needsGradingCount: 0,
    overdueGradingCount: 0,
    coursesWithoutAssignmentsCount: 0,
  })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [reminder, setReminder] = useState(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchAssignmentsOverview()
      setAssignments(data.assignments)
      setCoursesWithoutAssignments(data.coursesWithoutAssignments)
      setSummary(data.summary)
    } catch (err) {
      console.error('Assignments overview load error:', err)
      toast.error(err.message || 'Failed to load assignments')
      setAssignments([])
      setCoursesWithoutAssignments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredAssignments = useMemo(() => {
    let rows = assignments
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (a) =>
          (a.title || '').toLowerCase().includes(q) ||
          (a.course_code || '').toLowerCase().includes(q) ||
          (a.course_name || '').toLowerCase().includes(q) ||
          (a.type || '').toLowerCase().includes(q)
      )
    }
    if (filter === 'needs_grading') rows = rows.filter((a) => a.needsGrading)
    if (filter === 'overdue') rows = rows.filter((a) => a.gradingOverdue)
    if (filter === 'complete') rows = rows.filter((a) => a.enrolled > 0 && a.graded >= a.enrolled)
    return rows
  }, [assignments, search, filter])

  const openGradingReminder = (assignment) => {
    const template = buildGradingReminderTemplate(assignment)
    const teacherIds = (assignment.teachers || []).map((t) => t.id)
    setReminder({
      kind: 'grading',
      contextLabel: `${assignment.title} (${assignment.course_code})`,
      recipientIds: teacherIds,
      teachers: assignment.teachers || [],
      title: template.title,
      message: template.message,
    })
  }

  const openNoAssignmentsReminder = (course) => {
    const template = buildNoAssignmentsReminderTemplate(course)
    const teacherIds = (course.teachers || []).map((t) => t.id)
    setReminder({
      kind: 'no_assignments',
      contextLabel: `${course.course_code} – ${course.course_name}`,
      recipientIds: teacherIds,
      teachers: course.teachers || [],
      title: template.title,
      message: template.message,
    })
  }

  const closeReminder = () => setReminder(null)

  const handleSendReminder = async () => {
    if (!reminder) return
    if (!reminder.title?.trim() || !reminder.message?.trim()) {
      toast.error('Title and message are required')
      return
    }
    if (!reminder.recipientIds?.length) {
      toast.error('No teacher assigned to this course — cannot send reminder')
      return
    }
    try {
      setSending(true)
      const count = await sendAdminNotifications(
        reminder.recipientIds,
        reminder.title,
        reminder.message
      )
      toast.success(`Reminder sent to ${count} teacher(s)`)
      closeReminder()
    } catch (err) {
      console.error('Send reminder error:', err)
      toast.error(err.message || 'Failed to send reminder')
    } finally {
      setSending(false)
    }
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const progressPercent = (graded, enrolled) => {
    if (!enrolled) return 0
    return Math.min(100, Math.round((graded / enrolled) * 100))
  }

  return (
    <div className="assignments-overview-page">
      <div className="ao-header">
        <div>
          <h2>
            <FaClipboardList /> Assignments overview
          </h2>
          <p>
            Track created assignments, grading progress per class, and send reminders to teachers.
          </p>
        </div>
        <button type="button" className="ao-btn" onClick={loadData} disabled={loading}>
          <FaSync /> Refresh
        </button>
      </div>

      <div className="ao-stats">
        <div className="ao-stat-card">
          <span className="ao-stat-value">{summary.totalAssignments}</span>
          <span className="ao-stat-label">Total assignments</span>
        </div>
        <div className="ao-stat-card ao-stat-warn">
          <span className="ao-stat-value">{summary.needsGradingCount}</span>
          <span className="ao-stat-label">Need grading</span>
        </div>
        <div className="ao-stat-card ao-stat-danger">
          <span className="ao-stat-value">{summary.overdueGradingCount}</span>
          <span className="ao-stat-label">Overdue (past due)</span>
        </div>
        <div className="ao-stat-card ao-stat-muted">
          <span className="ao-stat-value">{summary.coursesWithoutAssignmentsCount}</span>
          <span className="ao-stat-label">Courses with no assignments</span>
        </div>
      </div>

      <div className="ao-toolbar">
        <div className="ao-search">
          <FaSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, course, or type…"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="ao-filter">
          {FILTER_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ao-section">
        <h3>Assignments & grading</h3>
        {loading ? (
          <div className="ao-empty">Loading assignments…</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="ao-empty">No assignments match your filters.</div>
        ) : (
          <div className="ao-table-wrap">
            <table className="ao-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Course</th>
                  <th>Teacher(s)</th>
                  <th>Due</th>
                  <th>Enrolled</th>
                  <th>Graded</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((a) => {
                  const pct = progressPercent(a.graded, a.enrolled)
                  const teacherLabel =
                    a.teachers?.length > 0
                      ? a.teachers.map((t) => `${t.first_name} ${t.last_name}`).join(', ')
                      : '—'
                  return (
                    <tr key={a.id} className={a.gradingOverdue ? 'ao-row-overdue' : ''}>
                      <td>
                        <strong>{a.title}</strong>
                        <small>
                          {a.type}
                          {a.submission_mode === 'paper' ? ' · On paper' : ' · Online'}
                        </small>
                      </td>
                      <td>
                        <strong>{a.course_code}</strong>
                        <small>{a.course_name}</small>
                      </td>
                      <td className="ao-teachers">{teacherLabel}</td>
                      <td>{formatDate(a.due_date)}</td>
                      <td>{a.enrolled}</td>
                      <td>
                        <strong>{a.graded}</strong>
                        {a.enrolled > 0 && (
                          <small>
                            {' '}
                            / {a.enrolled}
                          </small>
                        )}
                      </td>
                      <td>
                        <div className="ao-progress">
                          <div className="ao-progress-bar" style={{ width: `${pct}%` }} />
                        </div>
                        <small>{pct}%</small>
                      </td>
                      <td>
                        {a.enrolled === 0 ? (
                          <span className="ao-badge ao-badge-muted">No students</span>
                        ) : a.graded >= a.enrolled ? (
                          <span className="ao-badge ao-badge-ok">Complete</span>
                        ) : a.gradingOverdue ? (
                          <span className="ao-badge ao-badge-danger">
                            <FaExclamationTriangle /> Overdue
                          </span>
                        ) : (
                          <span className="ao-badge ao-badge-warn">Needs grading</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ao-btn ao-btn-sm"
                          title="Send grading reminder"
                          disabled={!a.teachers?.length || !a.needsGrading}
                          onClick={() => openGradingReminder(a)}
                        >
                          <FaBell /> Remind
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {coursesWithoutAssignments.length > 0 && (
        <div className="ao-section ao-section-alt">
          <h3>
            <FaExclamationTriangle /> Courses without assignments
          </h3>
          <p className="ao-section-desc">
            These courses have an assigned teacher but no homework or classwork has been created yet.
          </p>
          <div className="ao-table-wrap">
            <table className="ao-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Teacher(s)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {coursesWithoutAssignments.map((c) => (
                  <tr key={c.course_id}>
                    <td>
                      <strong>{c.course_code}</strong>
                      <small>{c.course_name}</small>
                    </td>
                    <td className="ao-teachers">
                      {c.teachers?.length
                        ? c.teachers.map((t) => `${t.first_name} ${t.last_name}`).join(', ')
                        : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ao-btn ao-btn-sm ao-btn-warn"
                        disabled={!c.teachers?.length}
                        onClick={() => openNoAssignmentsReminder(c)}
                      >
                        <FaBell /> Remind to add assignments
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reminder && (
        <div className="ao-modal-backdrop" role="presentation" onClick={closeReminder}>
          <div
            className="ao-modal"
            role="dialog"
            aria-labelledby="ao-reminder-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ao-modal-header">
              <h3 id="ao-reminder-title">
                <FaPaperPlane /> Send reminder
              </h3>
              <button type="button" className="ao-modal-close" onClick={closeReminder} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            <p className="ao-modal-context">
              {reminder.kind === 'grading'
                ? 'Grading reminder for: '
                : 'No assignments reminder for: '}
              <strong>{reminder.contextLabel}</strong>
            </p>

            {reminder.teachers?.length > 0 ? (
              <p className="ao-modal-recipients">
                To:{' '}
                {reminder.teachers.map((t) => `${t.first_name} ${t.last_name}`).join(', ')}
              </p>
            ) : (
              <p className="ao-modal-recipients ao-modal-recipients-warn">
                No teacher is linked to this course in faculty assignments.
              </p>
            )}

            <label className="ao-field">
              <span>Notification title</span>
              <input
                type="text"
                value={reminder.title}
                onChange={(e) => setReminder((r) => ({ ...r, title: e.target.value }))}
              />
            </label>

            <label className="ao-field">
              <span>Message</span>
              <textarea
                rows={8}
                value={reminder.message}
                onChange={(e) => setReminder((r) => ({ ...r, message: e.target.value }))}
              />
            </label>

            <p className="ao-modal-hint">
              This sends an in-app notification (same as the Notifications page). Teachers will see it in their portal.
            </p>

            <div className="ao-modal-actions">
              <button type="button" className="ao-btn" onClick={closeReminder} disabled={sending}>
                Cancel
              </button>
              <button
                type="button"
                className="ao-btn ao-btn-primary"
                onClick={handleSendReminder}
                disabled={sending || !reminder.recipientIds?.length}
              >
                <FaPaperPlane />
                {sending ? 'Sending…' : 'Send notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssignmentsOverviewPage
