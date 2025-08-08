import React, { useState, useEffect } from 'react'
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

  // Handle user creation
  const handleCreateUser = async () => {
    try {
      setAddUserLoading(true)

      console.log('=== USER CREATION STARTED ===')
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

      console.log('Email check result:', { existingUsers, checkError })

      if (existingUsers && existingUsers.length > 0) {
        console.log('❌ Email already exists in profiles:', generatedEmail)
        toast.error('A user with this email already exists')
        return
      }

      // Create auth user - we'll handle the session issue after creation
      const tempPassword = 'TempPassword123!'
      
      // Store current admin session before creating new user
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      console.log('Current admin session:', currentSession?.user?.email)
      
      console.log('Creating auth user with email:', generatedEmail)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: generatedEmail,
        password: tempPassword
      })
      
      // Immediately restore admin session to prevent redirect
      if (currentSession && authData.user) {
        console.log('Restoring admin session...')
        await supabase.auth.setSession(currentSession)
        console.log('Admin session restored')
      }

      if (authError) {
        console.error('❌ Error creating auth user:', authError)
        toast.error('Error creating user account')
        return
      }

      if (!authData.user) {
        console.error('❌ No user data returned from auth creation')
        toast.error('Failed to create user account')
        return
      }

      console.log('✅ Auth user created successfully:', authData.user.id)

      // Prepare profile data
      const profileData = {
        id: authData.user.id,
        email: generatedEmail,
        first_name: newUser.firstName,
        last_name: newUser.lastName,
        role: 'student',
        status: 'active',
        unique_code: newUser.uniqueCode,
        program: newUser.program,
        sex: newUser.sex
      }

      console.log('Creating profile with data:', profileData)

      // Create profile record (using the schema fields)
      const { data: profileInsertData, error: profileError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()

      if (profileError) {
        console.error('❌ Error creating profile:', profileError)
        console.error('Profile data that failed:', profileData)
        
        // Handle specific error cases
        if (profileError.code === '23505') {
          // Unique constraint violation - profile might already exist
          console.log('Profile might already exist, checking...')
          
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single()
            
          if (existingProfile) {
            console.log('✅ Profile already exists:', existingProfile)
            
            // Check if profile needs to be updated with missing data
            if (!existingProfile.first_name || !existingProfile.last_name) {
              console.log('Updating profile with missing name data...')
              
              const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update({
                  first_name: newUser.firstName,
                  last_name: newUser.lastName,
                  unique_code: newUser.uniqueCode,
                  program: newUser.program,
                  sex: newUser.sex
                })
                .eq('id', authData.user.id)
                .select()
                
              if (updateError) {
                console.error('❌ Error updating profile:', updateError)
                toast.error(`Error updating profile: ${updateError.message}`)
                return
              }
              
              console.log('✅ Profile updated successfully:', updatedProfile)
            }
            // Continue with student creation
          } else {
            toast.error(`Profile creation failed: ${profileError.message}`)
            return
          }
        } else {
          toast.error(`Error creating user profile: ${profileError.message}`)
          return
        }
      } else {
        console.log('✅ Profile created successfully:', profileInsertData)
      }

      // Prepare student data
      const studentData = {
        profile_id: authData.user.id,
        student_id: newUser.studentId,
        program: newUser.program,
        sex: newUser.sex,
        unique_code: newUser.uniqueCode
      }

      console.log('Creating student record with data:', studentData)

      // Check if student record already exists
      const { data: existingStudent, error: studentCheckError } = await supabase
        .from('students')
        .select('profile_id')
        .eq('profile_id', authData.user.id)
        .single()

      console.log('Student check result:', { existingStudent, studentCheckError })

      let studentInsertData = null
      let studentError = null

      if (existingStudent) {
        console.log('✅ Student record already exists for profile_id:', authData.user.id)
        
        // Update existing student record instead
        const { data: updatedStudent, error: updateStudentError } = await supabase
          .from('students')
          .update({
            student_id: newUser.studentId,
            program: newUser.program,
            sex: newUser.sex,
            unique_code: newUser.uniqueCode
          })
          .eq('profile_id', authData.user.id)
          .select()
          
        studentInsertData = updatedStudent
        studentError = updateStudentError
        
        if (!updateStudentError) {
          console.log('✅ Student record updated successfully:', updatedStudent)
        }
      } else {
        // Create new student record
        const { data: newStudentData, error: newStudentError } = await supabase
          .from('students')
          .insert([studentData])
          .select()
          
        studentInsertData = newStudentData
        studentError = newStudentError
      }

      if (studentError) {
        console.error('❌ Error creating student:', studentError)
        console.error('Student data that failed:', studentData)
        console.error('Error details:', studentError.details)
        console.error('Error hint:', studentError.hint)
        console.error('Error code:', studentError.code)
        toast.error(`Error creating student record: ${studentError.message}`)
        return
      }

      console.log('✅ Student record created successfully:', studentInsertData)

      console.log('=== USER CREATION COMPLETED SUCCESSFULLY ===')
      console.log('Auth ID:', authData.user.id)
      console.log('Profile created:', profileInsertData)
      console.log('Student created:', studentInsertData)

      toast.success('Student created successfully!')
      setShowAddUserModal(false)
      fetchUsers() // Refresh the users list

      // Reset form
      setNewUser({
        firstName: '',
        lastName: '',
        sex: '',
        program: '',
        studentId: '',
        uniqueCode: ''
      })

    } catch (error) {
      console.error('❌ FATAL ERROR in user creation:', error)
      console.error('Error stack:', error.stack)
      toast.error('Failed to create user')
    } finally {
      setAddUserLoading(false)
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
          
          {filteredUsers.map(user => (
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
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Student</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowAddUserModal(false)}
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