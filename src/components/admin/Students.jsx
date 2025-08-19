// src/components/admin/Students.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import DataTable from 'react-data-table-component';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import './styles/Students.css';

const Students = () => {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  
  // Bulk assignment states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkSelectedCourses, setBulkSelectedCourses] = useState([]);
  const [bulkCourseSearchTerm, setBulkCourseSearchTerm] = useState('');
  const [bulkStudentSearchTerm, setBulkStudentSearchTerm] = useState('');
  
  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    faculty: 0,
    guardians: 0
  });

  // Pagination and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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

      // If we're assigning courses to a student, set up default report entries
      if (selectedUser.role === 'student') {
        await createDefaultReportEntries(selectedUser.id, selectedCourses);
      }

      toast.success(`Courses assigned successfully to ${selectedUser.first_name}`);
      setShowAssignModal(false);
      fetchUsers(); // Refresh the data
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error assigning courses: ' + error.message);
    }
  };

  // Bulk assign multiple courses to multiple students
  const handleBulkAssignCourses = async () => {
    try {
      if (!selectedStudents.length || !bulkSelectedCourses.length) {
        toast.error('Please select students and courses');
        return;
      }

      setLoading(true);
      
      // Create assignments for all student-course combinations
      const assignments = [];
      const reportEntries = [];
      
      for (const studentId of selectedStudents) {
        for (const courseId of bulkSelectedCourses) {
          // Check if assignment already exists
          const { data: existing } = await supabase
            .from('student_courses')
            .select('id')
            .eq('student_id', studentId)
            .eq('course_id', courseId)
            .single();
            
          if (!existing) {
            assignments.push({
              student_id: studentId,
              course_id: courseId,
              status: 'enrolled'
            });
            
            reportEntries.push({ studentId, courseId });
          }
        }
      }

      if (assignments.length === 0) {
        toast.error('All selected students already have these courses');
        setLoading(false);
        return;
      }

      // Insert all assignments
      const { error: assignError } = await supabase
        .from('student_courses')
        .insert(assignments);

      if (assignError) throw assignError;

      // Create default report entries for new assignments
      for (const { studentId, courseId } of reportEntries) {
        await createDefaultReportEntries(studentId, [courseId]);
      }

      toast.success(`Successfully assigned ${bulkSelectedCourses.length} courses to ${selectedStudents.length} students`);
      setShowBulkModal(false);
      setSelectedStudents([]);
      setBulkSelectedCourses([]);
      setBulkCourseSearchTerm('');
      setBulkStudentSearchTerm('');
      fetchUsers(); // Refresh the data
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error bulk assigning courses: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create default report entries for assigned courses
  const createDefaultReportEntries = async (studentId, courseIds) => {
    try {
      console.log(`Creating default report entries for student ${studentId} and courses:`, courseIds);
      
      // Get student profile information to access profile_id (needed for student_reports)
      const { data: studentProfile, error: profileError } = await supabase
        .from('students')
        .select('profile_id, class_year')
        .eq('profile_id', studentId)
        .single();
        
      if (profileError) throw profileError;
      if (!studentProfile) throw new Error('Student profile not found');
      
      // Get current academic year and term
      const currentDate = new Date();
      const academicYear = `${currentDate.getFullYear()}-${currentDate.getFullYear() + 1}`;
      
      // Just use the first term
      const term = 'Term 1';
      
      // Fetch course details for all courses at once
      const { data: courseDetails, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, code')
        .in('id', courseIds);
        
      if (coursesError) throw coursesError;
      
      // Check if a report already exists for this student, term, and academic year
      const { data: existingReport, error: reportCheckError } = await supabase
        .from('student_reports')
        .select('id')
        .eq('student_id', studentProfile.profile_id)
        .eq('term', term)
        .eq('academic_year', academicYear);
        
      if (reportCheckError) throw reportCheckError;
      
      let reportId;
      
      // If no report exists, create one
      if (!existingReport || existingReport.length === 0) {
        const { data: newReport, error: createReportError } = await supabase
          .from('student_reports')
          .insert({
            student_id: studentProfile.profile_id,
            term: term,
            academic_year: academicYear,
            class_year: studentProfile.class_year,
            total_score: 0,
            overall_grade: 'F'
          })
          .select('id')
          .single();
          
        if (createReportError) throw createReportError;
        reportId = newReport.id;
      } else {
        reportId = existingReport[0].id;
      }
      
      // Prepare grade entries for all courses in a single batch
      const gradeEntries = [];
      
      // For each course, ensure a grade entry exists
      for (const courseId of courseIds) {
        // Check if a grade already exists for this report and course
        const { data: existingGrade, error: gradeCheckError } = await supabase
          .from('student_grades')
          .select('id')
          .eq('report_id', reportId)
          .eq('subject_id', courseId);
          
        if (gradeCheckError) throw gradeCheckError;
        
        // If no grade exists, add to the batch
        if (!existingGrade || existingGrade.length === 0) {
          const courseDetail = courseDetails.find(c => c.id === courseId);
          
          gradeEntries.push({
            report_id: reportId,
            subject_id: courseId,
            class_score: 0,
            exam_score: 0,
            total_score: 0,
            grade: 'F',
            remark: 'Not yet assessed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
      
      // Insert all grade entries in a single operation if there are any to add
      if (gradeEntries.length > 0) {
        const { error: createGradesError } = await supabase
          .from('student_grades')
          .insert(gradeEntries);
          
        if (createGradesError) throw createGradesError;
      }
      
      console.log('Successfully created default report entries for Term 1');
    } catch (error) {
      console.error('Error creating default report entries:', error);
      throw error;
    }
  };

  // Filter courses based on search term
  const filteredCourses = courses.filter(course => 
    course.name.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(courseSearchTerm.toLowerCase())
  );

  // Filter courses for bulk assignment
  const filteredBulkCourses = courses.filter(course => 
    course.name.toLowerCase().includes(bulkCourseSearchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(bulkCourseSearchTerm.toLowerCase())
  );

  // Filter students for bulk assignment
  const filteredBulkStudents = users.filter(user => {
    if (user.role !== 'student') return false;
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const searchTerm = bulkStudentSearchTerm.toLowerCase();
    return fullName.includes(searchTerm) || 
           (user.email || '').toLowerCase().includes(searchTerm) ||
           (user.class_year || '').toString().includes(searchTerm);
  });

  // Handle select all students
  const handleSelectAllStudents = (checked) => {
    if (checked) {
      setSelectedStudents(filteredBulkStudents.map(student => student.id));
    } else {
      setSelectedStudents([]);
    }
  };

  // Filter and paginate users
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const roleMatch = roleFilter ? user.role === roleFilter : true;
    const yearMatch = yearFilter && roleFilter === 'student' ? user.class_year === yearFilter : true;
    
    return matchesSearch && roleMatch && yearMatch;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, yearFilter]);

  // Memoized search handler to prevent re-renders
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        className={`btn btn-outline-primary ${currentPage === 1 ? 'disabled' : ''}`}
        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
    );

    // First page + ellipsis
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          className={`btn ${currentPage === 1 ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );
      
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="pagination-ellipsis">...</span>);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`btn ${currentPage === i ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    // Last page + ellipsis
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="pagination-ellipsis">...</span>);
      }
      
      pages.push(
        <button
          key={totalPages}
          className={`btn ${currentPage === totalPages ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        className={`btn btn-outline-primary ${currentPage === totalPages ? 'disabled' : ''}`}
        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    );

    return (
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
        </div>
        <div className="pagination-buttons">
          {pages}
        </div>
      </div>
    );
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
              setCourseSearchTerm('');
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

      {/* Search and Filters */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row align-items-center mb-3">
            <div className="col-md-12">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </div>
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
              <div className="d-flex align-items-center justify-content-end gap-3">
                {roleFilter === 'student' && (
                  <select 
                    className="form-select w-auto"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                  >
                    <option value="">All Years</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                  </select>
                )}
                {roleFilter === 'student' && (
                  <Button
                    variant="success"
                    onClick={() => setShowBulkModal(true)}
                  >
                    Bulk Assign Courses
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card shadow-sm">
        <div className="card-body">
          <DataTable
            columns={columns}
            data={currentUsers}
            progressPending={loading}
            responsive
            highlightOnHover
            pointerOnHover
            theme="default"
            pagination={false}
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
          {renderPagination()}
        </div>
      </div>

      {/* Course Assignment Modal */}
      <Modal show={showAssignModal} onHide={() => {
        setShowAssignModal(false);
        setCourseSearchTerm('');
      }}>
        <Modal.Header closeButton>
          <Modal.Title>
            Assign Courses to {selectedUser?.first_name} {selectedUser?.last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Search Courses</label>
            <input
              type="text"
              className="form-control mb-3"
              placeholder="Search by course name or code..."
              value={courseSearchTerm}
              onChange={(e) => setCourseSearchTerm(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Select Courses ({filteredCourses.length} found)</label>
            <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
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
                ))
              ) : (
                <p className="text-muted">No courses found matching your search.</p>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowAssignModal(false);
            setCourseSearchTerm('');
          }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAssignCourses}>
            Assign Courses
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Course Assignment Modal */}
      <Modal 
        show={showBulkModal} 
        onHide={() => {
          setShowBulkModal(false);
          setSelectedStudents([]);
          setBulkSelectedCourses([]);
          setBulkCourseSearchTerm('');
          setBulkStudentSearchTerm('');
        }}
        size="xl"
        backdrop="static"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'none'
        }}
        dialogClassName="modal-dialog-solid"
      >
        <Modal.Header closeButton style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', opacity: 1 }}>
          <Modal.Title style={{ color: '#000000', opacity: 1 }}>
            Bulk Course Assignment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#ffffff', maxHeight: '70vh', overflowY: 'auto', opacity: 1 }}>
          <div className="row">
            {/* Course Selection */}
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label fw-bold">Select Courses</label>
                <input
                  type="text"
                  className="form-control mb-3"
                  placeholder="Search courses..."
                  value={bulkCourseSearchTerm}
                  onChange={(e) => setBulkCourseSearchTerm(e.target.value)}
                />
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  {filteredBulkCourses.length > 0 ? (
                    filteredBulkCourses.map(course => (
                      <div key={course.id} className="form-check mb-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`bulk-course-${course.id}`}
                          checked={bulkSelectedCourses.includes(course.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkSelectedCourses([...bulkSelectedCourses, course.id]);
                            } else {
                              setBulkSelectedCourses(bulkSelectedCourses.filter(id => id !== course.id));
                            }
                          }}
                        />
                        <label className="form-check-label" htmlFor={`bulk-course-${course.id}`}>
                          <strong>{course.code}</strong> - {course.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">No courses found</p>
                  )}
                </div>
                <small className="text-muted">
                  {bulkSelectedCourses.length} course(s) selected
                </small>
              </div>
            </div>

            {/* Student Selection */}
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label fw-bold">Select Students</label>
                <input
                  type="text"
                  className="form-control mb-3"
                  placeholder="Search students..."
                  value={bulkStudentSearchTerm}
                  onChange={(e) => setBulkStudentSearchTerm(e.target.value)}
                />
                
                {/* Select All Checkbox */}
                <div className="form-check mb-3" style={{ backgroundColor: '#f8f9fa', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="select-all-students"
                    checked={filteredBulkStudents.length > 0 && selectedStudents.length === filteredBulkStudents.length}
                    onChange={(e) => handleSelectAllStudents(e.target.checked)}
                  />
                  <label className="form-check-label fw-bold" htmlFor="select-all-students">
                    Select All Students ({filteredBulkStudents.length} found)
                  </label>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  {filteredBulkStudents.length > 0 ? (
                    filteredBulkStudents.map(student => (
                      <div key={student.id} className="form-check mb-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`bulk-student-${student.id}`}
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, student.id]);
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                            }
                          }}
                        />
                        <label className="form-check-label" htmlFor={`bulk-student-${student.id}`}>
                          <strong>{student.first_name} {student.last_name}</strong>
                          <br />
                          <small className="text-muted">
                            {student.email} | Year {student.class_year || 'N/A'}
                          </small>
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">No students found</p>
                  )}
                </div>
                <small className="text-muted">
                  {selectedStudents.length} student(s) selected
                </small>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb', opacity: 1 }}>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowBulkModal(false);
              setSelectedStudents([]);
              setBulkSelectedCourses([]);
              setBulkCourseSearchTerm('');
              setBulkStudentSearchTerm('');
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleBulkAssignCourses}
            disabled={!selectedStudents.length || !bulkSelectedCourses.length || loading}
          >
            {loading ? 'Assigning...' : `Assign ${bulkSelectedCourses.length} Course(s) to ${selectedStudents.length} Student(s)`}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Students;