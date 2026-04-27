import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { FaEdit, FaPlus, FaSave, FaSearch, FaSync, FaTrash } from 'react-icons/fa'
import './NotificationsPage.css'

const RECIPIENT_MODES = [
  { id: 'all_students', label: 'All students' },
  { id: 'specific_students', label: 'Specific students' },
  { id: 'all_teachers', label: 'All teachers' },
  { id: 'specific_teachers', label: 'Specific teachers' },
]

const NotificationsPage = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [notifications, setNotifications] = useState([])

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // { id, title, message }

  const [compose, setCompose] = useState({
    recipientMode: 'all_students',
    studentIds: [],
    teacherIds: [],
    title: '',
    message: '',
  })

  const fetchData = async () => {
    try {
      setLoading(true)

      const [
        { data: studentRows, error: studentsError },
        { data: teacherRows, error: teachersError },
        { data: notifRows, error: notifError },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role')
          .eq('role', 'student')
          .order('first_name'),
        supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role')
          .eq('role', 'faculty')
          .order('first_name'),
        supabase
          .from('notifications')
          .select(`
            id,
            sender_id,
            recipient_id,
            title,
            message,
            is_read,
            created_at,
            updated_at,
            sender:sender_id(id, first_name, last_name, email),
            recipient:recipient_id(id, first_name, last_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(300),
      ])

      if (studentsError) throw studentsError
      if (teachersError) throw teachersError
      if (notifError) throw notifError

      setStudents(studentRows || [])
      setTeachers(teacherRows || [])
      setNotifications(notifRows || [])
    } catch (err) {
      console.error('Notifications page load error:', err)
      toast.error('Failed to load notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notifications

    return notifications.filter((n) => {
      const senderName = `${n.sender?.first_name || ''} ${n.sender?.last_name || ''}`.trim().toLowerCase()
      const recipientName = `${n.recipient?.first_name || ''} ${n.recipient?.last_name || ''}`.trim().toLowerCase()
      const recipientEmail = (n.recipient?.email || '').toLowerCase()
      return (
        (n.title || '').toLowerCase().includes(q) ||
        (n.message || '').toLowerCase().includes(q) ||
        senderName.includes(q) ||
        recipientName.includes(q) ||
        recipientEmail.includes(q)
      )
    })
  }, [notifications, search])

  const selectedRecipientsLabel = useMemo(() => {
    if (compose.recipientMode === 'specific_students') {
      if (compose.studentIds.length === 0) return 'No students selected'
      return `${compose.studentIds.length} student(s) selected`
    }
    if (compose.recipientMode === 'specific_teachers') {
      if (compose.teacherIds.length === 0) return 'No teachers selected'
      return `${compose.teacherIds.length} teacher(s) selected`
    }
    return ''
  }, [compose.recipientMode, compose.studentIds.length, compose.teacherIds.length])

  const sendNotificationRecords = async (recipientIds, title, message) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const records = recipientIds.map((recipientId) => ({
      sender_id: user.id,
      recipient_id: recipientId,
      title,
      message,
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('notifications').insert(records)
    if (error) throw error
  }

  const handleSend = async () => {
    try {
      if (!compose.title.trim() || !compose.message.trim()) {
        toast.error('Title and message are required')
        return
      }

      let recipientIds = []
      if (compose.recipientMode === 'all_students') {
        recipientIds = students.map((s) => s.id)
      } else if (compose.recipientMode === 'specific_students') {
        recipientIds = compose.studentIds
      } else if (compose.recipientMode === 'all_teachers') {
        recipientIds = teachers.map((t) => t.id)
      } else {
        recipientIds = compose.teacherIds
      }

      if (!recipientIds.length) {
        toast.error('Select at least one recipient')
        return
      }

      setSaving(true)
      await sendNotificationRecords(recipientIds, compose.title.trim(), compose.message.trim())

      toast.success(`Sent to ${recipientIds.length} recipient(s)`)
      setCompose((c) => ({
        ...c,
        title: '',
        message: '',
        studentIds: c.recipientMode === 'specific_students' ? [] : c.studentIds,
        teacherIds: c.recipientMode === 'specific_teachers' ? [] : c.teacherIds,
      }))
      await fetchData()
    } catch (err) {
      console.error('Send notification error:', err)
      toast.error('Failed to send notification')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (n) => {
    setEditing({ id: n.id, title: n.title || '', message: n.message || '' })
  }

  const cancelEdit = () => setEditing(null)

  const saveEdit = async () => {
    try {
      if (!editing?.id) return
      if (!editing.title.trim() || !editing.message.trim()) {
        toast.error('Title and message are required')
        return
      }
      setSaving(true)
      const { error } = await supabase
        .from('notifications')
        .update({
          title: editing.title.trim(),
          message: editing.message.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id)

      if (error) throw error
      toast.success('Notification updated')
      setEditing(null)
      await fetchData()
    } catch (err) {
      console.error('Update notification error:', err)
      toast.error('Failed to update notification')
    } finally {
      setSaving(false)
    }
  }

  const deleteNotification = async (id) => {
    try {
      setDeletingId(id)
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
      toast.success('Notification deleted')
      await fetchData()
    } catch (err) {
      console.error('Delete notification error:', err)
      toast.error('Failed to delete notification')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h2>Notifications</h2>
          <p>Send in-app notifications to students/teachers and manage message history.</p>
        </div>
        <button type="button" className="notifications-btn" onClick={fetchData} disabled={loading}>
          <FaSync />
          Refresh
        </button>
      </div>

      <div className="notifications-compose">
        <div className="notifications-compose-header">
          <h3>
            <FaPlus /> Send Notification
          </h3>
        </div>

        <div className="notifications-compose-grid">
          <label className="field">
            <span>Recipients</span>
            <select
              value={compose.recipientMode}
              onChange={(e) =>
                setCompose((c) => ({
                  ...c,
                  recipientMode: e.target.value,
                  studentIds: [],
                  teacherIds: [],
                }))
              }
            >
              {RECIPIENT_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {compose.recipientMode === 'specific_students' && (
            <label className="field">
              <span>Students</span>
              <select
                multiple
                value={compose.studentIds}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions).map((o) => o.value)
                  setCompose((c) => ({ ...c, studentIds: values }))
                }}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} ({s.email})
                  </option>
                ))}
              </select>
              <small className="hint">{selectedRecipientsLabel}</small>
            </label>
          )}

          {compose.recipientMode === 'specific_teachers' && (
            <label className="field">
              <span>Teachers</span>
              <select
                multiple
                value={compose.teacherIds}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions).map((o) => o.value)
                  setCompose((c) => ({ ...c, teacherIds: values }))
                }}
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name} ({t.email})
                  </option>
                ))}
              </select>
              <small className="hint">{selectedRecipientsLabel}</small>
            </label>
          )}

          <label className="field span2">
            <span>Title</span>
            <input
              type="text"
              value={compose.title}
              onChange={(e) => setCompose((c) => ({ ...c, title: e.target.value }))}
              placeholder="Enter title"
            />
          </label>

          <label className="field span2">
            <span>Message</span>
            <textarea
              rows={4}
              value={compose.message}
              onChange={(e) => setCompose((c) => ({ ...c, message: e.target.value }))}
              placeholder="Enter message"
            />
          </label>
        </div>

        <div className="notifications-compose-actions">
          <button type="button" className="notifications-btn primary" onClick={handleSend} disabled={saving || loading}>
            <FaSave />
            Send
          </button>
        </div>
      </div>

      <div className="notifications-list">
        <div className="notifications-list-header">
          <h3>History</h3>
          <div className="notifications-search">
            <FaSearch />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notifications" />
          </div>
        </div>

        {loading ? (
          <div className="notifications-empty">Loading...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty">No notifications found.</div>
        ) : (
          <div className="notifications-table-wrap">
            <table className="notifications-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Created</th>
                  <th>Read</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((n) => {
                  const isEditing = editing?.id === n.id
                  return (
                    <tr key={n.id}>
                      <td>
                        <div className="recipient-cell">
                          <strong>
                            {n.recipient?.first_name || ''} {n.recipient?.last_name || ''}
                          </strong>
                          <small>{n.recipient?.email || ''}</small>
                        </div>
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="edit-input"
                            value={editing.title}
                            onChange={(e) => setEditing((v) => ({ ...v, title: e.target.value }))}
                          />
                        ) : (
                          n.title
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <textarea
                            className="edit-textarea"
                            rows={3}
                            value={editing.message}
                            onChange={(e) => setEditing((v) => ({ ...v, message: e.target.value }))}
                          />
                        ) : (
                          <span className="message-cell">{n.message}</span>
                        )}
                      </td>
                      <td>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</td>
                      <td>{n.is_read ? 'Yes' : 'No'}</td>
                      <td>
                        <div className="row-actions">
                          {isEditing ? (
                            <>
                              <button type="button" className="icon-btn" onClick={saveEdit} disabled={saving}>
                                <FaSave />
                              </button>
                              <button type="button" className="icon-btn" onClick={cancelEdit} disabled={saving}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="icon-btn" onClick={() => startEdit(n)} title="Edit">
                                <FaEdit />
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger"
                                onClick={() => deleteNotification(n.id)}
                                disabled={deletingId === n.id}
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage

