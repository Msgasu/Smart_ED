import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { FaUsers, FaGraduationCap, FaChalkboardTeacher, FaUserFriends, FaUserCheck, FaPlus, FaSearch, FaEdit, FaEllipsisV } from 'react-icons/fa'

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
          <button className="btn btn-primary">
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
    </div>
  )
}

export default UsersPage 