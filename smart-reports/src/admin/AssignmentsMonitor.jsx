import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FaClipboardCheck, FaSync, FaSearch } from 'react-icons/fa'
import './AssignmentsMonitor.css'

const STATUS_FILTERS = ['all', 'complete', 'in-progress', 'not-started']

const AssignmentsMonitor = () => {
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchAssignments = async () => {
    try {
      setLoading(true)

      const [{ data: assignmentsData, error: assignmentsError }, { data: enrollmentsData, error: enrollmentsError }] = await Promise.all([
        supabase
          .from('assignments')
          .select(`
            id,
            title,
            due_date,
            created_at,
            course_id,
            courses (
              code,
              name
            ),
            student_assignments (
              id,
              status,
              score
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('student_courses')
          .select('course_id, student_id')
          .eq('status', 'enrolled')
      ])

      if (assignmentsError) throw assignmentsError
      if (enrollmentsError) throw enrollmentsError

      const studentsByCourse = new Map()
      ;(enrollmentsData || []).forEach((row) => {
        const key = row.course_id
        if (!studentsByCourse.has(key)) studentsByCourse.set(key, new Set())
        studentsByCourse.get(key).add(row.student_id)
      })

      const processed = (assignmentsData || []).map((assignment) => {
        const expected = studentsByCourse.get(assignment.course_id)?.size || 0
        const submissions = assignment.student_assignments?.length || 0
        const graded = (assignment.student_assignments || []).filter((s) => s.status === 'graded').length
        const submitted = (assignment.student_assignments || []).filter((s) => s.status === 'submitted').length
        const notSubmitted = Math.max(expected - submissions, 0)

        let monitorStatus = 'not-started'
        if (expected > 0 && graded >= expected) {
          monitorStatus = 'complete'
        } else if (submissions > 0 || graded > 0 || submitted > 0) {
          monitorStatus = 'in-progress'
        }

        const gradingProgress = expected > 0 ? Math.min(100, Math.round((graded / expected) * 100)) : 0

        return {
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.due_date,
          createdAt: assignment.created_at,
          courseCode: assignment.courses?.code || 'N/A',
          courseName: assignment.courses?.name || 'Unknown Course',
          expectedStudents: expected,
          submissions,
          submitted,
          graded,
          notSubmitted,
          monitorStatus,
          gradingProgress
        }
      })

      setAssignments(processed)
    } catch (error) {
      console.error('Error loading assignments monitor:', error)
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignments()
  }, [])

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const statusOk = statusFilter === 'all' || assignment.monitorStatus === statusFilter
      const q = searchTerm.trim().toLowerCase()
      const searchOk =
        !q ||
        assignment.title.toLowerCase().includes(q) ||
        assignment.courseCode.toLowerCase().includes(q) ||
        assignment.courseName.toLowerCase().includes(q)
      return statusOk && searchOk
    })
  }, [assignments, statusFilter, searchTerm])

  const summary = useMemo(() => {
    const total = assignments.length
    const complete = assignments.filter((a) => a.monitorStatus === 'complete').length
    const inProgress = assignments.filter((a) => a.monitorStatus === 'in-progress').length
    const notStarted = assignments.filter((a) => a.monitorStatus === 'not-started').length
    return { total, complete, inProgress, notStarted }
  }, [assignments])

  return (
    <div className="assignments-monitor-page">
      <div className="assignments-monitor-header">
        <div>
          <h2>Assignments Monitor</h2>
          <p>Track assignment creation, submissions, and grading completion.</p>
        </div>
        <button type="button" className="assignments-monitor-refresh" onClick={fetchAssignments}>
          <FaSync />
          Refresh
        </button>
      </div>

      <div className="assignments-monitor-cards">
        <div className="assignments-monitor-card">
          <p className="label">Total Assignments</p>
          <p className="value">{summary.total}</p>
        </div>
        <div className="assignments-monitor-card">
          <p className="label">All Graded</p>
          <p className="value">{summary.complete}</p>
        </div>
        <div className="assignments-monitor-card">
          <p className="label">In Progress</p>
          <p className="value">{summary.inProgress}</p>
        </div>
        <div className="assignments-monitor-card">
          <p className="label">Not Started</p>
          <p className="value">{summary.notStarted}</p>
        </div>
      </div>

      <div className="assignments-monitor-toolbar">
        <div className="assignments-monitor-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search by assignment or course"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map((f) => (
            <option key={f} value={f}>
              {f === 'all' ? 'All Statuses' : f}
            </option>
          ))}
        </select>
      </div>

      <div className="assignments-monitor-table-wrap">
        {loading ? (
          <div className="assignments-monitor-empty">Loading assignments...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="assignments-monitor-empty">No assignments match your filters.</div>
        ) : (
          <table className="assignments-monitor-table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Course</th>
                <th>Expected</th>
                <th>Submitted</th>
                <th>Graded</th>
                <th>Progress</th>
                <th>All Graded</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <div className="title-cell">
                      <strong>{assignment.title}</strong>
                      <small>
                        Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
                      </small>
                    </div>
                  </td>
                  <td>{assignment.courseCode} - {assignment.courseName}</td>
                  <td>{assignment.expectedStudents}</td>
                  <td>{assignment.submissions}</td>
                  <td>{assignment.graded}</td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${assignment.gradingProgress}%` }} />
                      </div>
                      <span>{assignment.gradingProgress}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${assignment.monitorStatus}`}>
                      {assignment.monitorStatus === 'complete' ? (
                        <>
                          <FaClipboardCheck /> Yes
                        </>
                      ) : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default AssignmentsMonitor
