import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlus, FaUsers, FaExchangeAlt, FaEdit, FaTrash, FaGraduationCap, FaFileAlt } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import './ClassManagement.css'

const ClassManagement = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('classes')
  const [students, setStudents] = useState([])
  const [unassignedStudents, setUnassignedStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [transferToClass, setTransferToClass] = useState('')
  const [showTransferModal, setShowTransferModal] = useState(false)

  // Predefined class structure
  const classStructure = [
    'Form 1 Loyalty', 'Form 1 Integrity', 'Form 1 Faith',
    'Form 2 Loyalty', 'Form 2 Integrity', 'Form 2 Faith',
    'Form 3 Loyalty', 'Form 3 Integrity', 'Form 3 Faith'
  ]

  useEffect(() => {
    fetchAllStudents()
    generateClassStats()
  }, [])

  // Fetch students WITH class assignments (for statistics)
  const fetchStudents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          students!inner (
            profile_id,
            student_id,
            class_year
          )
        `)
        .eq('role', 'student')
        .order('first_name')

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Error loading students')
    } finally {
      setLoading(false)
    }
  }

  // Fetch ALL students (for showing unassigned ones)
  const fetchAllStudents = async () => {
    try {
      setLoading(true)
      
      // First get assigned students
      const { data: assignedData, error: assignedError } = await supabase
        .from('profiles')
        .select(`
          *,
          students!inner (
            profile_id,
            student_id,
            class_year
          )
        `)
        .eq('role', 'student')
        .order('first_name')

      if (assignedError) throw assignedError

      // Then get ALL students to find unassigned ones
      const { data: allStudentsData, error: allStudentsError } = await supabase
        .from('profiles')
        .select(`
          *,
          students (
            profile_id,
            student_id,
            class_year
          )
        `)
        .eq('role', 'student')
        .order('first_name')

      if (allStudentsError) throw allStudentsError

      // Set assigned students for statistics
      setStudents(assignedData || [])
      
      // Find unassigned students (those without student records or without class_year)
      const assignedStudentIds = (assignedData || []).map(s => s.id)
      const unassigned = (allStudentsData || []).filter(student => 
        !assignedStudentIds.includes(student.id)
      )
      
      // Store unassigned students in state
      setUnassignedStudents(unassigned)
      
      console.log('Assigned students:', assignedData?.length || 0)
      console.log('Unassigned students:', unassigned.length)
      
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Error loading students')
    } finally {
      setLoading(false)
    }
  }

  const generateClassStats = () => {
    console.log('Students data for stats:', students) // Debug log
    const classStats = classStructure.map(className => {
      const studentsInClass = students.filter(
        student => student.students?.class_year === className
      )
      console.log(`Students in ${className}:`, studentsInClass.length) // Debug log
      return {
        name: className,
        studentCount: studentsInClass.length,
        students: studentsInClass
      }
    })
    setClasses(classStats)
    console.log('Generated class stats:', classStats) // Debug log
  }

  useEffect(() => {
    generateClassStats()
  }, [students])

  const assignStudentToClass = async (studentId, newClass) => {
    try {
      // First check if student record exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('profile_id')
        .eq('profile_id', studentId)
        .single()

      if (existingStudent) {
        // Update existing record
        const { error } = await supabase
          .from('students')
          .update({ 
            class_year: newClass,
            updated_at: new Date().toISOString()
          })
          .eq('profile_id', studentId)

        if (error) throw error
      } else {
        // Create new student record
        const { error } = await supabase
          .from('students')
          .insert([{
            profile_id: studentId,
            student_id: `STU${Date.now()}`, // Generate a temporary student ID
            class_year: newClass
          }])

        if (error) throw error
      }

      toast.success(`Student assigned to ${newClass}`)
      fetchAllStudents()
    } catch (error) {
      console.error('Error assigning student to class:', error)
      toast.error('Error assigning student to class')
    }
  }

  const transferSelectedStudents = async () => {
    if (!transferToClass || selectedStudents.length === 0) {
      toast.error('Please select students and target class')
      return
    }

    try {
      setLoading(true)
      
      // Process each student individually to handle upsert
      for (const studentId of selectedStudents) {
        const { data: existingStudent } = await supabase
          .from('students')
          .select('profile_id')
          .eq('profile_id', studentId)
          .single()

        if (existingStudent) {
          // Update existing record
          await supabase
            .from('students')
            .update({ 
              class_year: transferToClass,
              updated_at: new Date().toISOString()
            })
            .eq('profile_id', studentId)
        } else {
          // Create new student record
          await supabase
            .from('students')
            .insert([{
              profile_id: studentId,
              student_id: `STU${Date.now()}${Math.random().toString(36).substr(2, 5)}`, // Generate unique student ID
              class_year: transferToClass
            }])
        }
      }

      toast.success(`${selectedStudents.length} students transferred to ${transferToClass}`)
      setSelectedStudents([])
      setTransferToClass('')
      setShowTransferModal(false)
      fetchAllStudents()
    } catch (error) {
      console.error('Error transferring students:', error)
      toast.error('Error transferring students')
    } finally {
      setLoading(false)
    }
  }

  const removeStudentFromClass = async (studentId) => {
    try {
      // Check if student record exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('profile_id')
        .eq('profile_id', studentId)
        .single()

      if (existingStudent) {
        const { error } = await supabase
          .from('students')
          .update({ 
            class_year: null,
            updated_at: new Date().toISOString()
          })
          .eq('profile_id', studentId)

        if (error) throw error
        toast.success('Student removed from class')
      } else {
        toast.error('Student record not found')
      }

      fetchAllStudents()
    } catch (error) {
      console.error('Error removing student from class:', error)
      toast.error('Error removing student from class')
    }
  }

  const handleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const ClassOverview = () => (
    <div className="class-overview">
      <div className="overview-header">
        <h2>Class Overview</h2>
        <div className="overview-stats">
          <div className="stat-card">
            <FaUsers className="stat-icon" />
            <div>
              <div className="stat-number">{students.length}</div>
              <div className="stat-label">Total Students</div>
            </div>
          </div>
          <div className="stat-card">
            <FaGraduationCap className="stat-icon" />
            <div>
              <div className="stat-number">{classes.filter(c => c.studentCount > 0).length}</div>
              <div className="stat-label">Active Classes</div>
            </div>
          </div>
        </div>
      </div>

      <div className="classes-grid">
        {classes.map(classData => (
          <div key={classData.name} className="class-card">
            <div className="class-header">
              <h3 
                className="class-name-clickable"
                onClick={() => navigate(`/admin/class-reports/${encodeURIComponent(classData.name)}`)}
                title="Click to view class reports"
              >
                {classData.name}
              </h3>
              <span className="student-count">{classData.studentCount} students</span>
            </div>
            <div className="class-students">
              {classData.students.slice(0, 3).map(student => (
                <div key={student.id} className="student-preview">
                  {student.first_name} {student.last_name}
                </div>
              ))}
              {classData.studentCount > 3 && (
                <div className="more-students">+{classData.studentCount - 3} more</div>
              )}
            </div>
            <button 
              className="view-class-btn"
              onClick={() => {
                setSelectedClass(classData.name)
                setActiveTab('students')
              }}
            >
              View Students
            </button>
            <button 
              className="view-reports-btn"
              onClick={() => navigate(`/admin/class-reports/${encodeURIComponent(classData.name)}`)}
            >
              View Reports
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  const StudentManagement = () => {
    const classStudents = selectedClass 
      ? students.filter(student => student.students?.class_year === selectedClass)
      : []

    return (
      <div className="student-management">
        <div className="management-header">
          <h2>Student Management</h2>
          <div className="management-controls">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="class-selector"
            >
              <option value="">All Students</option>
              {classStructure.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
            
            {selectedStudents.length > 0 && (
              <button
                className="btn btn-primary"
                onClick={() => setShowTransferModal(true)}
              >
                <FaExchangeAlt /> Transfer Selected ({selectedStudents.length})
              </button>
            )}
          </div>
        </div>

        {/* Unassigned Students Section */}
        {!selectedClass && (
          <div className="unassigned-section">
            <h3>Unassigned Students ({unassignedStudents.length})</h3>
            {unassignedStudents.length > 0 ? (
              <div className="students-table">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(unassignedStudents.map(s => s.id))
                            } else {
                              setSelectedStudents([])
                            }
                          }}
                        />
                      </th>
                      <th>Student Name</th>
                      <th>Student ID</th>
                      <th>Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedStudents.map(student => (
                      <tr key={student.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => handleStudentSelection(student.id)}
                          />
                        </td>
                        <td>{student.first_name} {student.last_name}</td>
                        <td>{student.students?.student_id || 'N/A'}</td>
                        <td>{student.email}</td>
                        <td>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                assignStudentToClass(student.id, e.target.value)
                              }
                            }}
                            defaultValue=""
                            className="assign-select"
                          >
                            <option value="">Assign to Class</option>
                            {classStructure.map(className => (
                              <option key={className} value={className}>{className}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-students">
                <p>All students have been assigned to classes!</p>
              </div>
            )}
          </div>
        )}

        {/* Selected Class Students */}
        {selectedClass && (
          <div className="class-students-section">
            <h3>{selectedClass} Students ({classStudents.length})</h3>
            <div className="students-table">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents(classStudents.map(s => s.id))
                          } else {
                            setSelectedStudents([])
                          }
                        }}
                      />
                    </th>
                    <th>Student Name</th>
                    <th>Student ID</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map(student => (
                    <tr key={student.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleStudentSelection(student.id)}
                        />
                      </td>
                      <td>{student.first_name} {student.last_name}</td>
                      <td>{student.students?.student_id || 'N/A'}</td>
                      <td>{student.email}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeStudentFromClass(student.id)}
                          title="Remove from class"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Students View */}
        {!selectedClass && (
          <div className="all-students-section">
            <h3>All Students by Class</h3>
            <div className="students-by-class">
              {classes.filter(c => c.studentCount > 0).map(classData => (
                <div key={classData.name} className="class-group">
                  <h4>{classData.name} ({classData.studentCount})</h4>
                  <div className="class-student-list">
                    {classData.students.map(student => (
                      <div key={student.id} className="student-item">
                        <span>{student.first_name} {student.last_name}</span>
                        <small>{student.students?.student_id}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const TransferModal = () => (
    showTransferModal && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Transfer Students</h3>
          <p>Transfer {selectedStudents.length} selected students to:</p>
          
          <select
            value={transferToClass}
            onChange={(e) => setTransferToClass(e.target.value)}
            className="form-control"
          >
            <option value="">Select Target Class</option>
            {classStructure.map(className => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>

          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowTransferModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={transferSelectedStudents}
              disabled={!transferToClass}
            >
              Transfer Students
            </button>
          </div>
        </div>
      </div>
    )
  )

  return (
    <div className="class-management">
      <div className="page-header">
        <h1>Class Management</h1>
        <p>Manage student classes and transfers</p>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
          onClick={() => setActiveTab('classes')}
        >
          <FaGraduationCap /> Class Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <FaUsers /> Student Management
        </button>
      </div>

      <div className="tab-content">
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <>
            {activeTab === 'classes' && <ClassOverview />}
            {activeTab === 'students' && <StudentManagement />}
          </>
        )}
      </div>

      <TransferModal />
    </div>
  )
}

export default ClassManagement