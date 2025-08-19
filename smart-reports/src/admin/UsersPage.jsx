import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { FaUsers, FaGraduationCap, FaChalkboardTeacher, FaUserFriends, FaUserCheck, FaPlus, FaSearch, FaEdit, FaEllipsisV, FaTimes, FaSave, FaUser, FaIdCard, FaCode, FaVenusMars } from 'react-icons/fa'
import './UsersPage.css'

const UsersPage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    faculty: 0,
    guardians: 0,
    admins: 0,
    active: 0,
    inactive: 0
  })

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    sex: '',
    program: '',
    studentId: '',
    uniqueCode: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          students(class_year),
          faculty(department, position)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
      
      // Calculate statistics
      const stats = data.reduce((acc, user) => {
        acc.total++
        acc[user.role]++
        acc[user.status]++
        return acc
      }, {
        total: 0,
        student: 0,
        faculty: 0,
        guardian: 0,
        admin: 0,
        active: 0,
        inactive: 0,
        suspended: 0
      })

      setStats(stats)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Error loading users')
    } finally {
      setLoading(false)
    }
  }

  const updateUserStatus = async (userId, newStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId)

      if (error) throw error

      toast.success(`User status updated to ${newStatus}`)
      fetchUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Error updating user status')
    }
  }

  // Generate unique code for student
  const generateUniqueCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substr(2, 6).toUpperCase()
    return `LIC-${timestamp}-${random}`
  }

  // Generate student ID (using timestamp to ensure uniqueness)
  const generateStudentId = async (program) => {
    try {
      const currentYear = new Date().getFullYear()
      const programCode = program === 'science' ? 'SCI' : program === 'business' ? 'BUS' : 'ARTS'
      
      // Use timestamp and random number to ensure uniqueness
      const timestamp = Date.now().toString().slice(-6)
      const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0')
      const uniqueNumber = `${timestamp}${randomSuffix}`.slice(-3)
      
      return `LIC/${currentYear}/${programCode}/${uniqueNumber}`
    } catch (error) {
      console.error('Error generating student ID:', error)
      return `LIC/${new Date().getFullYear()}/SCI/001`
    }
  }

  // Handle add user button click
  const handleAddUser = async () => {
    const uniqueCode = generateUniqueCode()
    setNewUser({
      firstName: '',
      lastName: '',
      sex: '',
      program: '',
      studentId: '',
      uniqueCode: uniqueCode
    })
    setShowAddUserModal(true)
  }

  // Handle program change
  const handleProgramChange = async (program) => {
    setNewUser(prev => ({ ...prev, program }))
    if (program) {
      const studentId = await generateStudentId(program)
      setNewUser(prev => ({ ...prev, studentId }))
    }
  }

  // Handle user creation using AJAX approach (no auth state changes)
  const handleCreateUser = async () => {
    try {
      setAddUserLoading(true)
      
      // Set flag to prevent auth state changes from causing redirects
      if (window.setIsCreatingUser) {
        window.setIsCreatingUser(true)
      }

      console.log('=== USER CREATION STARTED (AJAX) ===')
      console.log('Form data (newUser):', newUser)

      // Validation - email will be auto-generated
      if (!newUser.firstName || !newUser.lastName || !newUser.sex || !newUser.program || !newUser.studentId) {
        console.log('Validation failed - missing required fields:')
        console.log('firstName:', newUser.firstName)
        console.log('lastName:', newUser.lastName)
        console.log('sex:', newUser.sex)
        console.log('program:', newUser.program)
        console.log('studentId:', newUser.studentId)
        toast.error('Please fill in all required fields')
        
        // Clear flag on validation error
        if (window.setIsCreatingUser) {
          window.setIsCreatingUser(false)
        }
        return
      }

      // Auto-generate email from student ID
      const generatedEmail = `${newUser.studentId.toLowerCase()}@student.smarted.com`

      console.log('Validation passed ✓')

      // Check if email already exists in profiles
      console.log('Checking if email already exists:', generatedEmail)
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('email, id')
        .eq('email', generatedEmail)

      if (checkError) {
        console.error('Error checking existing users:', checkError)
        toast.error('Error checking user existence')
        if (window.setIsCreatingUser) window.setIsCreatingUser(false)
        return
      }

      if (existingUsers && existingUsers.length > 0) {
        console.log('❌ Email already exists in profiles:', generatedEmail)
        toast.error('A user with this email already exists')
        if (window.setIsCreatingUser) window.setIsCreatingUser(false)
        return
      }

      // Check if student ID already exists
      const { data: existingStudentIds, error: studentIdError } = await supabase
        .from('students')
        .select('student_id')
        .eq('student_id', newUser.studentId)

      if (studentIdError) {
        console.error('Error checking student ID:', studentIdError)
        toast.error('Error checking student ID')
        if (window.setIsCreatingUser) window.setIsCreatingUser(false)
        return
      }

      if (existingStudentIds && existingStudentIds.length > 0) {
        console.log('❌ Student ID already exists:', newUser.studentId)
        toast.error('A student with this ID already exists')
        if (window.setIsCreatingUser) window.setIsCreatingUser(false)
        return
      }

      // Store current session to restore afterwards
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('Error getting current session:', sessionError)
        toast.error('Session error')
        if (window.setIsCreatingUser) window.setIsCreatingUser(false)
        return
      }

      console.log('Current session user:', currentSession?.user?.email)

      // Create auth user with minimal session disruption
      console.log('Creating auth user...')
      const tempPassword = 'TempPassword123!'
      
      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: generatedEmail,
        password: tempPassword
      })

      if (authError) {
        console.error('❌ Error creating auth user:', authError)
        toast.error(`Error creating user account: ${authError.message}`)
        if (window.setIsCreatingUser) window.setIsCreatingUser(false)
        return
      }

      if (!authData.user) {
        console.error('❌ No user data returned from auth creation')
        toast.error('Failed to create user account')
        if (window.setIsCreatingUser) window.setIsCreatingUser(false)
        return
      }

      console.log('✅ Auth user created:', authData.user.id)

      // Immediately restore the original session to prevent redirects
      if (currentSession) {
        console.log('Restoring original session...')
        await supabase.auth.setSession(currentSession)
        console.log('Session restored')
      }

      // Create profile record
      const profileData = {
        id: authData.user.id,
        email: generatedEmail,
        first_name: newUser.firstName,
        last_name: newUser.lastName,
        role: 'student',
        status: 'active',
        unique_code: newUser.uniqueCode,
        program: newUser.program,
        sex: newUser.sex,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('Creating profile with data:', profileData)

      const { data: profileInsertData, error: profileError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()

      if (profileError) {
        console.error('❌ Error creating profile:', profileError)
        
        // Handle case where profile might already exist from signup trigger
        if (profileError.code === '23505') {
          console.log('Profile already exists, updating it...')
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
              first_name: newUser.firstName,
              last_name: newUser.lastName,
              unique_code: newUser.uniqueCode,
              program: newUser.program,
              sex: newUser.sex,
              updated_at: new Date().toISOString()
            })
            .eq('id', authData.user.id)
            .select()
            
          if (updateError) {
            console.error('❌ Error updating profile:', updateError)
            toast.error(`Error updating profile: ${updateError.message}`)
            if (window.setIsCreatingUser) window.setIsCreatingUser(false)
            return
          }
          
          console.log('✅ Profile updated successfully:', updatedProfile)
        } else {
          toast.error(`Error creating user profile: ${profileError.message}`)
          if (window.setIsCreatingUser) window.setIsCreatingUser(false)
          return
        }
      } else {
        console.log('✅ Profile created successfully:', profileInsertData)
      }

      // Create student record
      const studentData = {
        profile_id: authData.user.id,
        student_id: newUser.studentId,
        program: newUser.program,
        sex: newUser.sex,
        unique_code: newUser.uniqueCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('Creating student record with data:', studentData)

      const { data: studentInsertData, error: studentError } = await supabase
        .from('students')
        .insert([studentData])
        .select()

      if (studentError) {
        console.error('❌ Error creating student:', studentError)
        toast.error(`Error creating student record: ${studentError.message}`)
        if (window.setIsCreatingUser) window.setIsCreatingUser(false)
        return
      }

      console.log('✅ Student record created successfully:', studentInsertData)

      console.log('=== USER CREATION COMPLETED SUCCESSFULLY (AJAX) ===')
      console.log('Profile created:', profileInsertData)
      console.log('Student created:', studentInsertData)

      // Add a small delay to ensure session is fully restored
      await new Promise(resolve => setTimeout(resolve, 500))

      toast.success(`Student created successfully! Email: ${generatedEmail}`)
      
      // Refresh the users list
      await fetchUsers()
      
      // Reset form
      setNewUser({
        firstName: '',
        lastName: '',
        sex: '',
        program: '',
        studentId: '',
        uniqueCode: ''
      })
      
      // Close modal after everything is done
      setShowAddUserModal(false)

    } catch (error) {
      console.error('❌ FATAL ERROR in user creation:', error)
      console.error('Error stack:', error.stack)
      toast.error('Failed to create user')
    } finally {
      setAddUserLoading(false)
      
      // Always clear the flag regardless of success or error
      if (window.setIsCreatingUser) {
        window.setIsCreatingUser(false)
      }
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentUsers = filteredUsers.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter, statusFilter])

  // Memoized search handler to prevent re-renders
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value)
  }, [])

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
    )

    // First page + ellipsis
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          className={`pagination-btn ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      )
      
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="pagination-ellipsis">...</span>)
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      )
    }

    // Last page + ellipsis
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="pagination-ellipsis">...</span>)
      }
      
      pages.push(
        <button
          key={totalPages}
          className={`pagination-btn ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      )
    }

    // Next button
    pages.push(
      <button
        key="next"
        className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    )

    return (
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
        </div>
        <div className="pagination-buttons">
          {pages}
        </div>
      </div>
    )
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'danger'
      case 'faculty': return 'primary'
      case 'student': return 'success'
      case 'guardian': return 'warning'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'secondary'
      case 'suspended': return 'danger'
      default: return 'secondary'
    }
  }

  const StatCard = ({ type, icon: IconComponent, number, label }) => (
    <div className={`stats-card ${type}`}>
      <div className="stats-icon" style={{ fontSize: '1.25rem' }}>
        <IconComponent />
      </div>
      <div className="stats-content">
        <div className="stats-number">{number}</div>
        <div className="stats-label">{label}</div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="users-page">
        <div className="page-header">
          <div className="header-content">
            <h1>Users Management</h1>
            <p className="page-description">Manage all system users, roles, and permissions</p>
          </div>
        </div>
        <div className="loading-container">
          <div className="spinner-border text-primary" />
          <p>Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="users-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Users Management</h1>
          <p className="page-description">Manage all system users, roles, and permissions</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleAddUser}>
            <FaPlus style={{ marginRight: '0.5rem' }} />
            Add New User
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard 
          type="primary" 
          icon={FaUsers} 
          number={stats.total} 
          label="Total Users" 
        />
        <StatCard 
          type="success" 
          icon={FaGraduationCap} 
          number={stats.student || 0} 
          label="Students" 
        />
        <StatCard 
          type="info" 
          icon={FaChalkboardTeacher} 
          number={stats.faculty || 0} 
          label="Faculty" 
        />
        <StatCard 
          type="warning" 
          icon={FaUserFriends} 
          number={stats.guardian || 0} 
          label="Guardians" 
        />
        <StatCard 
          type="danger" 
          icon={FaUserCheck} 
          number={stats.active || 0} 
          label="Active" 
        />
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
            <option value="guardian">Guardians</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <div className="table-header">
          <h3>Users ({filteredUsers.length})</h3>
        </div>
        <div className="users-table">
          <div className="table-header-row">
            <div className="table-cell">User</div>
            <div className="table-cell">Role</div>
            <div className="table-cell">Status</div>
            <div className="table-cell">Details</div>
            <div className="table-cell">Joined</div>
            <div className="table-cell">Actions</div>
          </div>
          
          {currentUsers.map(user => (
            <div key={user.id} className="table-row">
              <div className="table-cell user-cell">
                <div className="user-avatar">
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </div>
                <div className="user-info">
                  <div className="user-name">{user.first_name} {user.last_name}</div>
                  <div className="user-email">{user.email}</div>
                </div>
              </div>
              
              <div className="table-cell">
                <span className={`badge badge-${getRoleColor(user.role)}`}>
                  {user.role.toUpperCase()}
                </span>
              </div>
              
              <div className="table-cell">
                <span className={`status-badge status-${user.status}`}>
                  {user.status.toUpperCase()}
                </span>
              </div>
              
              <div className="table-cell">
                {user.role === 'student' && user.students && (
                  <span className="detail-info">Class: {user.students.class_year || 'N/A'}</span>
                )}
                {user.role === 'faculty' && user.faculty && (
                  <span className="detail-info">{user.faculty.department || 'N/A'}</span>
                )}
                {user.phone_number && (
                  <span className="detail-info">Phone: {user.phone_number}</span>
                )}
              </div>
              
              <div className="table-cell">
                <span className="date-info">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="table-cell actions-cell">
                <div className="action-buttons">
                  <button 
                    className="action-btn edit"
                    title="Edit User"
                  >
                    <FaEdit />
                  </button>
                  <div className="dropdown">
                    <button className="action-btn dropdown-toggle">
                      <FaEllipsisV />
                    </button>
                    <div className="dropdown-menu">
                      {user.status !== 'active' && (
                        <button 
                          onClick={() => updateUserStatus(user.id, 'active')}
                          className="dropdown-item"
                        >
                          ACTIVATE
                        </button>
                      )}
                      {user.status !== 'suspended' && (
                        <button 
                          onClick={() => updateUserStatus(user.id, 'suspended')}
                          className="dropdown-item"
                        >
                          SUSPEND
                        </button>
                      )}
                      {user.status !== 'inactive' && (
                        <button 
                          onClick={() => updateUserStatus(user.id, 'inactive')}
                          className="dropdown-item"
                        >
                          DEACTIVATE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>No users found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}
        
        {filteredUsers.length > 0 && renderPagination()}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {addUserLoading && (
              <div className="modal-loading-overlay">
                <div className="modal-loading-spinner">
                  <div className="spinner"></div>
                  <p>Creating student account...</p>
                </div>
              </div>
            )}
            <div className="modal-header">
              <h2>Add New Student</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowAddUserModal(false)}
                disabled={addUserLoading}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label><FaUser className="form-icon" /> First Name *</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </div>

                <div className="form-group">
                  <label><FaUser className="form-icon" /> Last Name *</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>



                <div className="form-group">
                  <label><FaVenusMars className="form-icon" /> Sex *</label>
                  <select
                    value={newUser.sex}
                    onChange={(e) => setNewUser(prev => ({ ...prev, sex: e.target.value }))}
                  >
                    <option value="">Select sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label><FaUser className="form-icon" /> Program *</label>
                  <select
                    value={newUser.program}
                    onChange={(e) => handleProgramChange(e.target.value)}
                  >
                    <option value="">Select program</option>
                    <option value="science">Science</option>
                    <option value="business">Business</option>
                    <option value="general-arts">General Arts</option>
                  </select>
                </div>

                <div className="form-group">
                  <label><FaIdCard className="form-icon" /> Student ID *</label>
                  <input
                    type="text"
                    value={newUser.studentId}
                    onChange={(e) => setNewUser(prev => ({ ...prev, studentId: e.target.value }))}
                    placeholder="Student ID will be generated"
                  />
                </div>

                <div className="form-group full-width">
                  <label><FaCode className="form-icon" /> Unique Code (Auto-generated)</label>
                  <input
                    type="text"
                    value={newUser.uniqueCode}
                    readOnly
                    className="readonly-input"
                    placeholder="Unique code will be generated"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAddUserModal(false)}
                disabled={addUserLoading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateUser}
                disabled={addUserLoading}
              >
                {addUserLoading ? (
                  'Creating...'
                ) : (
                  <>
                    <FaSave style={{ marginRight: '0.5rem' }} />
                    Create Student
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage 