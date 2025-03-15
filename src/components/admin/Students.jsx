// src/components/admin/Students.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import DataTable from 'react-data-table-component';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

const Students = () => {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    faculty: 0,
    guardians: 0
  });

  // Fetch all users data (excluding admins)
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          student_courses(course_id, status),
          faculty_courses(course_id, status)
        `)
        .neq('role', 'admin');

      if (error) throw error;

      const validUsers = data || [];
      setUsers(validUsers);
      
      // Calculate totals from actual data
      const totals = {
        total: validUsers.length,
        students: validUsers.filter(u => u.role === 'student').length,
        faculty: validUsers.filter(u => u.role === 'faculty').length,
        guardians: validUsers.filter(u => u.role === 'guardian').length
      };
      setStats(totals);
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error fetching users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch courses
  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error fetching courses: ' + error.message);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCourses();
  }, []);

  const handleAssignCourses = async () => {
    try {
      if (!selectedUser || !selectedCourses.length) return;

      const table = selectedUser.role === 'student' ? 'student_courses' : 'faculty_courses';
      const assignments = selectedCourses.map(courseId => ({
        [`${selectedUser.role}_id`]: selectedUser.id,
        course_id: courseId,
        status: selectedUser.role === 'student' ? 'enrolled' : 'active'
      }));

      const { error } = await supabase
        .from(table)
        .upsert(assignments, { onConflict: [`${selectedUser.role}_id,course_id`] });

      if (error) throw error;

      toast.success(`Courses assigned successfully to ${selectedUser.first_name}`);
      setShowAssignModal(false);
      fetchUsers(); // Refresh the data
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error assigning courses: ' + error.message);
    }
  };

  const columns = [
    {
      name: 'Full Name',
      selector: row => `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'N/A',
      sortable: true,
    },
    {
      name: 'Email',
      selector: row => row.email || 'N/A',
      sortable: true,
    },
    {
      name: 'Role',
      selector: row => row.role || 'N/A',
      sortable: true,
    },
    {
      name: 'Year',
      selector: row => row.class_year || 'N/A',
      sortable: true,
      hide: roleFilter !== '' && roleFilter !== 'student',
    },
    {
      name: 'Assigned Courses',
      cell: row => {
        const coursesList = row.role === 'student' 
          ? row.student_courses 
          : row.role === 'faculty' 
            ? row.faculty_courses 
            : [];
        return coursesList?.length || 0;
      },
      hide: !['student', 'faculty'].includes(roleFilter),
    },
    {
      name: 'Actions',
      cell: row => (
        ['student', 'faculty'].includes(row.role) && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedUser(row);
              setSelectedCourses([]);
              setShowAssignModal(true);
            }}
          >
            Assign Courses
          </Button>
        )
      ),
      hide: !['student', 'faculty'].includes(roleFilter),
    }
  ];

  return (
    <div className="container-fluid">
      <h1>Users</h1>
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Total Users</h5>
              <h2>{stats.total}</h2>
            </div>
          </div>
        </div>
        {/* Overview Stats */}
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <h4 className="card-title mb-4 text-dark">Users Overview</h4>
            <div className="row g-4">
              <div className="col-md-3">
                <div className="p-3 bg-primary bg-opacity-10 rounded-3 text-center">
                  <h3 className="text-primary">{stats.total}</h3>
                  <p className="text-dark mb-0">Total Users</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="p-3 bg-success bg-opacity-10 rounded-3 text-center">
                  <h3 className="text-success">{stats.students}</h3>
                  <p className="text-dark mb-0">Students</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="p-3 bg-info bg-opacity-10 rounded-3 text-center">
                  <h3 className="text-info">{stats.faculty}</h3>
                  <p className="text-dark mb-0">Faculty</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="p-3 bg-warning bg-opacity-10 rounded-3 text-center">
                  <h3 className="text-warning">{stats.guardians}</h3>
                  <p className="text-dark mb-0">Guardians</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex gap-3">
                <button 
                  className={`btn ${roleFilter === '' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setRoleFilter('')}
                >
                  All
                </button>
                <button 
                  className={`btn ${roleFilter === 'student' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setRoleFilter('student')}
                >
                  Students
                </button>
                <button 
                  className={`btn ${roleFilter === 'faculty' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setRoleFilter('faculty')}
                >
                  Faculty
                </button>
                <button 
                  className={`btn ${roleFilter === 'guardian' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setRoleFilter('guardian')}
                >
                  Guardians
                </button>
              </div>
            </div>
            <div className="col-md-6">
              {roleFilter === 'student' && (
                <select 
                  className="form-select w-auto ms-auto"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="">All Years</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card shadow-sm">
        <div className="card-body">
          <DataTable
            columns={columns}
            data={users.filter(user => {
              const roleMatch = roleFilter ? user.role === roleFilter : true;
              const yearMatch = yearFilter && roleFilter === 'student' ? user.class_year === yearFilter : true;
              return roleMatch && yearMatch;
            })}
            pagination
            progressPending={loading}
            responsive
            highlightOnHover
            pointerOnHover
            theme="default"
            customStyles={{
              header: {
                style: {
                  fontSize: '1.2rem',
                  color: '#333',
                  fontWeight: '600',
                },
              },
              headRow: {
                style: {
                  backgroundColor: '#f8f9fa',
                  color: '#333',
                },
              },
              rows: {
                style: {
                  fontSize: '0.875rem',
                  color: '#333',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Course Assignment Modal */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            Assign Courses to {selectedUser?.first_name} {selectedUser?.last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Select Courses</label>
            <div className="d-flex flex-wrap gap-2">
              {courses.map(course => (
                <div key={course.id} className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`course-${course.id}`}
                    checked={selectedCourses.includes(course.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCourses([...selectedCourses, course.id]);
                      } else {
                        setSelectedCourses(selectedCourses.filter(id => id !== course.id));
                      }
                    }}
                  />
                  <label className="form-check-label" htmlFor={`course-${course.id}`}>
                    {course.code} - {course.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAssignCourses}>
            Assign Courses
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Students;