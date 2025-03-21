import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaTimes } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import './styles/AdminLayout.css';
import './styles/Reports.css'; // New CSS file we'll create for better styling

const Reports = ({ studentNameRef, averageRef }) => {
  const [subjects, setSubjects] = useState([
    { id: 1, name: 'Core Mathematics', classScore: '', examScore: '', position: '', grade: '', remark: '', sign: '' },
    { id: 2, name: 'English', classScore: '', examScore: '', position: '', grade: '', remark: '', sign: '' },
    { id: 3, name: 'Social Studies', classScore: '', examScore: '', position: '', grade: '', remark: '', sign: '' },
    { id: 4, name: 'Integrated Science', classScore: '', examScore: '', position: '', grade: '', remark: '', sign: '' }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch courses from the database
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        
        // Fetch courses from Supabase
        const { data, error } = await supabase
          .from('courses')
          .select('id, name, code, description');
          
        if (error) throw error;
        
        // Format courses for display
        const formattedCourses = data || [];
        setAvailableCourses(formattedCourses);
        setFilteredCourses(formattedCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
        // Fallback to mock data if error occurs
        const mockCourses = [
          { id: 1, name: 'Core Mathematics', code: 'MTH101' },
          { id: 2, name: 'English', code: 'ENG101' },
          { id: 3, name: 'Social Studies', code: 'SOC101' },
          { id: 4, name: 'Integrated Science', code: 'SCI101' },
          { id: 5, name: 'Physics', code: 'PHY101' },
          { id: 6, name: 'Chemistry', code: 'CHM101' },
          { id: 7, name: 'Biology', code: 'BIO101' },
          { id: 8, name: 'Economics', code: 'ECO101' },
          { id: 9, name: 'Geography', code: 'GEO101' },
          { id: 10, name: 'History', code: 'HIS101' },
          { id: 11, name: 'Religious Studies', code: 'REL101' },
          { id: 12, name: 'Information Technology', code: 'ICT101' },
        ];
        setAvailableCourses(mockCourses);
        setFilteredCourses(mockCourses);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourses();
  }, []);

  // Handle search input
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    // Filter courses based on search term (in both name and code)
    const filtered = availableCourses.filter(course => 
      course.name.toLowerCase().includes(term.toLowerCase()) ||
      (course.code && course.code.toLowerCase().includes(term.toLowerCase()))
    );
    setFilteredCourses(filtered);
  };

  // Add a new subject
  const addSubject = (course) => {
    // Check if course is already added
    if (subjects.some(subject => subject.name === course.name)) {
      return; // Course already exists
    }
    
    const newSubject = {
      id: Date.now(), // Use timestamp as temporary ID
      courseId: course.id,
      name: course.name,
      code: course.code,
      classScore: '',
      examScore: '',
      position: '',
      grade: '',
      remark: '',
      sign: ''
    };
    setSubjects([...subjects, newSubject]);
    setShowDropdown(false);
    setSearchTerm('');
    setFilteredCourses(availableCourses);
  };

  // Remove a subject
  const removeSubject = (id) => {
    setSubjects(subjects.filter(subject => subject.id !== id));
  };

  // Calculate total score for a subject
  const calculateTotal = (classScore, examScore) => {
    const class_score = parseFloat(classScore) || 0;
    const exam_score = parseFloat(examScore) || 0;
    return class_score + exam_score;
  };

  // Handle input changes for subjects
  const handleSubjectChange = (id, field, value) => {
    const updatedSubjects = subjects.map(subject => {
      if (subject.id === id) {
        return { ...subject, [field]: value };
      }
      return subject;
    });
    setSubjects(updatedSubjects);
  };

  return (
    <div className="report-main-container">
      {/* School Information */}
      <div className="school-info text-center">
        <div className="row">
          <div className="col-md-2">
            {/* <img src="/path/to/school-logo.png" alt="School Logo" className="img-fluid" /> */}
          </div>
          <div className="col-md-10 school-details">
            <h3>Life International College</h3>
            <p>Private mail Bag, 252 Tema. / Tel: 024 437 7584</p>
            <h4>TERMINAL REPORT</h4>
          </div>
        </div>
      </div>

      {/* Student Information */}
      <div className="student-info">
        <div className="info-section-title">Student Information</div>
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="studentName" className="form-label">Student Name</label>
              <input 
                type="text" 
                className="form-control" 
                id="studentName" 
                placeholder="Enter student name" 
                ref={studentNameRef}
              />
            </div>
          </div>
          <div className="col-md-3">
            <div className="mb-3">
              <label htmlFor="studentClass" className="form-label">Class</label>
              <input type="text" className="form-control" id="studentClass" placeholder="Enter class" />
            </div>
          </div>
          <div className="col-md-3">
            <div className="mb-3">
              <label htmlFor="studentAge" className="form-label">Age</label>
              <input type="number" className="form-control" id="studentAge" placeholder="Enter age" />
            </div>
          </div>
        </div>
        
        <div className="row mb-3">
          <div className="col-md-3">
            <div className="mb-3">
              <label htmlFor="studentSex" className="form-label">Gender</label>
              <select className="form-control" id="studentSex">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="col-md-3">
            <div className="mb-3">
              <label htmlFor="currentTerm" className="form-label">Current Term</label>
              <select className="form-control" id="currentTerm">
                <option value="">Select Term</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>
          <div className="col-md-3">
            <div className="mb-3">
              <label htmlFor="year" className="form-label">Year</label>
              <input type="text" className="form-control" id="year" placeholder="Enter year" />
            </div>
          </div>
          <div className="col-md-3">
            <div className="mb-3">
              <label htmlFor="house" className="form-label">House</label>
              <input type="text" className="form-control" id="house" placeholder="Enter house" />
            </div>
          </div>
        </div>
        
        <div className="row">
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="programOffering" className="form-label">Program Offering</label>
              <input type="text" className="form-control" id="programOffering" placeholder="Enter program" />
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="average" className="form-label">Average</label>
              <input 
                type="text" 
                className="form-control" 
                id="average" 
                placeholder="Enter average" 
                ref={averageRef}
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="attendance" className="form-label">Attendance</label>
              <input type="text" className="form-control" id="attendance" placeholder="Enter attendance" />
            </div>
          </div>
        </div>
      </div>

      {/* Report Table with Add Subject Button */}
      <div className="table-container">
        <div className="table-header">
          <div className="info-section-title">Academic Performance</div>
          <div className="add-subject-container">
            <button 
              type="button" 
              className="add-subject-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <FaPlus /> Add Subject
            </button>
            
            {showDropdown && (
              <div className="course-dropdown">
                <div className="course-search">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search for a course..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="course-search-input"
                    autoFocus
                  />
                </div>
                <div className="course-list">
                  {loading ? (
                    <div className="course-loading">Loading courses...</div>
                  ) : filteredCourses.length > 0 ? (
                    filteredCourses.map(course => (
                      <div 
                        key={course.id} 
                        className="course-item"
                        onClick={() => addSubject(course)}
                      >
                        {course.code ? `${course.code} - ${course.name}` : course.name}
                      </div>
                    ))
                  ) : (
                    <div className="no-courses">No matching courses found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <table className="grades-table">
          <thead>
            <tr>
              <th>Subjects</th>
              <th>Class Score</th>
              <th>Exam Score</th>
              <th>Total</th>
              <th>Position</th>
              <th>Grade</th>
              <th>Remark</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(subject => (
              <tr key={subject.id}>
                <td>{subject.code ? `${subject.code} - ${subject.name}` : subject.name}</td>
                <td>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter score" 
                    value={subject.classScore}
                    onChange={(e) => handleSubjectChange(subject.id, 'classScore', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter score" 
                    value={subject.examScore}
                    onChange={(e) => handleSubjectChange(subject.id, 'examScore', e.target.value)}
                  />
                </td>
                <td className="total-score">
                  {calculateTotal(subject.classScore, subject.examScore)}
                </td>
                <td>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter position" 
                    value={subject.position}
                    onChange={(e) => handleSubjectChange(subject.id, 'position', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter grade" 
                    value={subject.grade}
                    onChange={(e) => handleSubjectChange(subject.id, 'grade', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter remark" 
                    value={subject.remark}
                    onChange={(e) => handleSubjectChange(subject.id, 'remark', e.target.value)}
                  />
                </td>
                <td>
                  <button 
                    className="remove-subject-btn" 
                    onClick={() => removeSubject(subject.id)}
                    title="Remove subject"
                  >
                    <FaTimes />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Teachers remarks and next semesters data */}
        <div className="remarks-info">
          <div className="info-section-title">Final Assessment</div>
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="conduct" className="form-label">Conduct</label>
                <input type="text" className="form-control" id="conduct" placeholder="Enter Conduct here" />
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="nextClass" className="form-label">Class</label>
                <input type="text" className="form-control" id="nextClass" placeholder="Enter class" />
              </div>
            </div>
          </div>
          
          {/* Additional fields for teacher remarks */}
          <div className="row mb-3">
            <div className="col-md-12">
              <div className="mb-3">
                <label htmlFor="teacherRemarks" className="form-label">Teacher's Remarks</label>
                <textarea className="form-control" id="teacherRemarks" rows="3" placeholder="Enter teacher's remarks"></textarea>
              </div>
            </div>
          </div>
          
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="principalSignature" className="form-label">Principal's Signature</label>
                <input type="text" className="form-control" id="principalSignature" placeholder="Principal's signature" />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="date" className="form-label">Date</label>
                <input type="date" className="form-control" id="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Reports.defaultProps = {
  studentNameRef: null,
  averageRef: null
};

export default Reports;
