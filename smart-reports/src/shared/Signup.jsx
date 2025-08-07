import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import logo from '../assets/logo_nbg.png'

const Signup = () => {
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    date_of_birth: '',
    address: '',
    // Role-specific fields
    student_id: '',
    class_year: '',
    department: '',
    position: '',
    // Guardian-specific fields
    selected_student_id: '',
    relationship_type: 'Parent'
  })

  // Fetch students when guardian role is selected
  useEffect(() => {
    if (selectedRole === 'guardian') {
      fetchStudents()
    }
  }, [selectedRole])

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true)
      const { data: studentsData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          students (
            student_id,
            class_year
          )
        `)
        .eq('role', 'student')
        .eq('status', 'active')

      if (error) throw error
      setStudents(studentsData || [])
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students list')
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    setFormData(prev => ({ ...prev, role }))
  }

  const validateForm = () => {
    if (!selectedRole) {
      toast.error('Please select a role')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return false
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return false
    }

    if (selectedRole === 'guardian' && !formData.selected_student_id) {
      toast.error('Please select a student to link as guardian')
      return false
    }

    if (selectedRole === 'student' && !formData.student_id) {
      toast.error('Student ID is required')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password
      })

      if (authError) throw authError

      if (authData.user) {
        // Create profile data
        const profileData = {
          id: authData.user.id,
          email: formData.email.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          role: selectedRole,
          phone_number: formData.phone_number ? formData.phone_number.replace(/\D/g, '') : null,
          date_of_birth: formData.date_of_birth || null,
          address: formData.address ? formData.address.trim() : null,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([profileData], {
            onConflict: 'id',
            returning: 'minimal'
          })

        if (profileError) throw profileError

        // Add role-specific data
        if (selectedRole === 'student') {
          const studentData = {
            profile_id: authData.user.id,
            student_id: formData.student_id.trim(),
            class_year: formData.class_year ? formData.class_year.trim() : null
          }
          
          const { error: studentError } = await supabase
            .from('students')
            .upsert([studentData], {
              onConflict: 'profile_id',
              returning: 'minimal'
            })
            
          if (studentError) throw studentError
        } 
        else if (selectedRole === 'faculty') {
          const facultyData = {
            profile_id: authData.user.id,
            department: formData.department ? formData.department.trim() : null,
            position: formData.position ? formData.position.trim() : null
          }
          
          const { error: facultyError } = await supabase
            .from('faculty')
            .upsert([facultyData], {
              onConflict: 'profile_id',
              returning: 'minimal'
            })
            
          if (facultyError) throw facultyError
        } 
        else if (selectedRole === 'guardian') {
          const guardianData = {
            profile_id: authData.user.id
          }
          
          const { error: guardianError } = await supabase
            .from('guardians')
            .upsert([guardianData], {
              onConflict: 'profile_id',
              returning: 'minimal'
            })
            
          if (guardianError) throw guardianError

          // Create guardian-student relationship
          const guardianStudentData = {
            guardian_id: authData.user.id,
            student_id: formData.selected_student_id,
            relationship: formData.relationship_type,
            is_primary: true
          }

          const { error: relationshipError } = await supabase
            .from('guardian_students')
            .insert([guardianStudentData])

          if (relationshipError) throw relationshipError
        }

        // Sign out the user after successful registration
        await supabase.auth.signOut()
        
        toast.success('Registration successful! Please check your email to verify your account, then sign in.')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Registration failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const renderRoleSelection = () => {
    const roles = [
      // { id: 'student', name: 'Student', icon: '🎓', desc: 'Access your academic reports and grades' },
      { id: 'faculty', name: 'Teacher', icon: '👨‍🏫', desc: 'Create and manage student reports' },
      // { id: 'guardian', name: 'Guardian', icon: '👨‍👩‍👧‍👦', desc: 'View your children\'s academic progress' },
      // { id: 'admin', name: 'Administrator', icon: '⚙️', desc: 'Manage system and oversee reports' }
    ]

    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          color: '#722F37', 
          fontSize: '1.1rem', 
          fontWeight: '600', 
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          Select Your Role
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '0.75rem' 
        }}>
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              style={{
                padding: '1rem',
                border: selectedRole === role.id ? '2px solid #8BC34A' : '2px solid #E5E7EB',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: selectedRole === role.id ? 'rgba(139, 195, 74, 0.1)' : '#F9FAFB',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                if (selectedRole !== role.id) {
                  e.target.style.borderColor = '#D1D5DB'
                  e.target.style.background = 'white'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRole !== role.id) {
                  e.target.style.borderColor = '#E5E7EB'
                  e.target.style.background = '#F9FAFB'
                }
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{role.icon}</div>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '0.9rem', 
                color: '#722F37',
                marginBottom: '0.25rem'
              }}>
                {role.name}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#666',
                lineHeight: '1.3'
              }}>
                {role.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderRoleFields = () => {
    if (selectedRole === 'student') {
      return (
        <div style={{ 
          background: 'linear-gradient(135deg, #F8FDF9 0%, #F1F8E9 100%)',
          border: '2px solid #E8F5E8',
          borderRadius: '12px',
          padding: '1.5rem',
          marginTop: '1rem'
        }}>
          <h4 style={{ color: '#722F37', fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', textAlign: 'center' }}>
            Student Information
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#722F37', fontSize: '0.9rem' }}>
                Student ID <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="text"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  background: '#F9FAFB'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8BC34A'
                  e.target.style.background = 'white'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB'
                  e.target.style.background = '#F9FAFB'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#722F37', fontSize: '0.9rem' }}>
                Class Year
              </label>
              <input
                type="text"
                name="class_year"
                value={formData.class_year}
                onChange={handleChange}
                placeholder="e.g., Grade 10"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  background: '#F9FAFB'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8BC34A'
                  e.target.style.background = 'white'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB'
                  e.target.style.background = '#F9FAFB'
                }}
              />
            </div>
          </div>
        </div>
      )
    } else if (selectedRole === 'faculty') {
      return (
        <div style={{ 
          background: 'linear-gradient(135deg, #F8FDF9 0%, #F1F8E9 100%)',
          border: '2px solid #E8F5E8',
          borderRadius: '12px',
          padding: '1.5rem',
          marginTop: '1rem'
        }}>
          <h4 style={{ color: '#722F37', fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', textAlign: 'center' }}>
            Faculty Information
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#722F37', fontSize: '0.9rem' }}>
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Mathematics"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  background: '#F9FAFB'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8BC34A'
                  e.target.style.background = 'white'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB'
                  e.target.style.background = '#F9FAFB'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#722F37', fontSize: '0.9rem' }}>
                Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="e.g., Senior Teacher"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  background: '#F9FAFB'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8BC34A'
                  e.target.style.background = 'white'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB'
                  e.target.style.background = '#F9FAFB'
                }}
              />
            </div>
          </div>
        </div>
      )
    } else if (selectedRole === 'guardian') {
      return (
        <div style={{ 
          background: 'linear-gradient(135deg, #F8FDF9 0%, #F1F8E9 100%)',
          border: '2px solid #E8F5E8',
          borderRadius: '12px',
          padding: '1.5rem',
          marginTop: '1rem'
        }}>
          <h4 style={{ color: '#722F37', fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', textAlign: 'center' }}>
            Guardian Information
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#722F37', fontSize: '0.9rem' }}>
                Select Student <span style={{ color: '#dc3545' }}>*</span>
              </label>
              {loadingStudents ? (
                <div style={{
                  padding: '0.75rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  background: '#F9FAFB',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(139,195,74,0.2)',
                    borderTop: '2px solid #8BC34A',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ fontSize: '0.9rem', color: '#666' }}>Loading students...</span>
                </div>
              ) : (
                <select
                  name="selected_student_id"
                  value={formData.selected_student_id}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    background: '#F9FAFB',
                    appearance: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8BC34A'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.background = '#F9FAFB'
                  }}
                >
                  <option value="">-- Select a Student --</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                      {student.students?.[0]?.student_id && ` (ID: ${student.students[0].student_id})`}
                      {student.students?.[0]?.class_year && ` - ${student.students[0].class_year}`}
                    </option>
                  ))}
                </select>
              )}
              {!loadingStudents && students.length === 0 && (
                <small style={{ color: '#6c757d', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                  No students available. Contact administrator to add students first.
                </small>
              )}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#722F37', fontSize: '0.9rem' }}>
                Relationship Type
              </label>
              <select
                name="relationship_type"
                value={formData.relationship_type}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  background: '#F9FAFB',
                  appearance: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8BC34A'
                  e.target.style.background = 'white'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB'
                  e.target.style.background = '#F9FAFB'
                }}
              >
                <option value="Parent">Parent</option>
                <option value="Guardian">Legal Guardian</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Uncle/Aunt">Uncle/Aunt</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem' 
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 2px, transparent 2px)',
        backgroundSize: '50px 50px',
        zIndex: 0
      }} />
      
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 20px rgba(139,195,74,0.2)',
        width: '100%',
        maxWidth: '600px',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header with Logo */}
        <div style={{
          background: 'linear-gradient(135deg, #722F37 0%, #5A252A 100%)',
          padding: '2rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Decorative Elements */}
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '40px',
            height: '40px',
            background: 'rgba(139,195,74,0.2)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            left: '-5px',
            width: '25px',
            height: '25px',
            background: 'rgba(139,195,74,0.3)',
            borderRadius: '50%'
          }} />
          
          {/* Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1rem',
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            <img 
              src={logo} 
              alt="Life International College" 
              style={{ width: '70px', height: '70px' }}
            />
          </div>
          
          <h1 style={{
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            Life International College
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.9rem',
            margin: 0,
            fontWeight: '500'
          }}>
            Create Your Reports Portal Account
          </p>
        </div>

        <div style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{
              color: '#722F37',
              fontSize: '1.3rem',
              fontWeight: '600',
              margin: '0 0 0.5rem 0'
            }}>
              Join Our Community
            </h2>
            <p style={{
              color: '#666',
              fontSize: '0.9rem',
              margin: 0
            }}>
              Create an account to access academic reports and progress tracking
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {renderRoleSelection()}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#722F37',
                  fontSize: '0.9rem'
                }}>
                  First Name <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8BC34A'
                    e.target.style.boxShadow = '0 0 0 3px rgba(139,195,74,0.1)'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                    e.target.style.background = '#F9FAFB'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#722F37',
                  fontSize: '0.9rem'
                }}>
                  Last Name <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8BC34A'
                    e.target.style.boxShadow = '0 0 0 3px rgba(139,195,74,0.1)'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                    e.target.style.background = '#F9FAFB'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#722F37',
                fontSize: '0.9rem'
              }}>
                Email Address <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  background: '#F9FAFB'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8BC34A'
                  e.target.style.boxShadow = '0 0 0 3px rgba(139,195,74,0.1)'
                  e.target.style.background = 'white'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = '#F9FAFB'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#722F37',
                  fontSize: '0.9rem'
                }}>
                  Password <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8BC34A'
                    e.target.style.boxShadow = '0 0 0 3px rgba(139,195,74,0.1)'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                    e.target.style.background = '#F9FAFB'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#722F37',
                  fontSize: '0.9rem'
                }}>
                  Confirm Password <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8BC34A'
                    e.target.style.boxShadow = '0 0 0 3px rgba(139,195,74,0.1)'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                    e.target.style.background = '#F9FAFB'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#722F37',
                  fontSize: '0.9rem'
                }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8BC34A'
                    e.target.style.boxShadow = '0 0 0 3px rgba(139,195,74,0.1)'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                    e.target.style.background = '#F9FAFB'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#722F37',
                  fontSize: '0.9rem'
                }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    background: '#F9FAFB'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8BC34A'
                    e.target.style.boxShadow = '0 0 0 3px rgba(139,195,74,0.1)'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                    e.target.style.background = '#F9FAFB'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#722F37',
                fontSize: '0.9rem'
              }}>
                Address (optional)
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  background: '#F9FAFB'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8BC34A'
                  e.target.style.boxShadow = '0 0 0 3px rgba(139,195,74,0.1)'
                  e.target.style.background = 'white'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = '#F9FAFB'
                }}
              />
            </div>

            {renderRoleFields()}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#94A3B8' : 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(139,195,74,0.3)',
                transform: loading ? 'none' : 'translateY(0)',
                marginTop: '1.5rem'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(139,195,74,0.4)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 15px rgba(139,195,74,0.3)'
                }
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div style={{
            textAlign: 'center',
            marginTop: '2rem',
            padding: '1rem',
            background: '#F3F4F6',
            borderRadius: '10px',
            border: '1px solid #E5E7EB'
          }}>
            <p style={{
              color: '#666',
              fontSize: '0.9rem',
              margin: 0
            }}>
              Already have an account?{' '}
              <Link 
                to="/login" 
                style={{
                  color: '#8BC34A',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Signup