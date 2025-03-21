import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaSearch, FaUserGraduate, FaSortAmountDown, FaSortAmountUp, FaEye, FaFileAlt } from 'react-icons/fa';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import { getCourseDetails } from '../../backend/teachers/courses';
import { getStudentsWithPerformance } from '../../backend/teachers/students';
import '../../components/teacher/styles/TeacherStudents.css';

const TeacherStudents = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    const fetchCourseAndStudents = async () => {
      try {
        setLoading(true);
        
        // Fetch course details using the backend service
        const { data: courseData, error: courseError } = await getCourseDetails(courseId);
          
        if (courseError) throw courseError;
        setCourse(courseData);
        
        // Fetch students with performance metrics using the backend service
        const { data: studentsData, error: studentsError } = await getStudentsWithPerformance(courseId);
          
        if (studentsError) throw studentsError;
        
        // Process students data for the component
        const processedStudents = studentsData.map(student => ({
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          email: student.email,
          averageScore: student.gradePercentage,
          completionRate: student.completionRate,
          submissionsCount: student.completedAssignments
        }));
        
        setStudents(processedStudents);
      } catch (error) {
        console.error('Error fetching course and students:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourseAndStudents();
  }, [courseId]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'email') {
      comparison = a.email.localeCompare(b.email);
    } else if (sortField === 'averageScore') {
      comparison = a.averageScore - b.averageScore;
    } else if (sortField === 'completionRate') {
      comparison = a.completionRate - b.completionRate;
    } else if (sortField === 'submissionsCount') {
      comparison = a.submissionsCount - b.submissionsCount;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getGradeClass = (score) => {
    if (score >= 90) return 'grade-a';
    if (score >= 80) return 'grade-b';
    if (score >= 70) return 'grade-c';
    return 'grade-d';
  };

  return (
    <TeacherLayout>
      <div className="page-header">
        <h1 className="page-title">Course Students</h1>
        {course && (
          <p className="page-subtitle">{course.code}: {course.name}</p>
        )}
      </div>

      {loading ? (
        <div className="loading-spinner">
          <p>Loading students...</p>
        </div>
      ) : (
        <div className="students-container">
          <div className="students-header">
            <div className="search-container">
              <FaSearch />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {sortedStudents.length > 0 ? (
            <div className="students-table-container">
              <table className="students-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} className="sortable">
                      Student
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                      )}
                    </th>
                    <th onClick={() => handleSort('email')} className="sortable">
                      Email
                      {sortField === 'email' && (
                        sortDirection === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                      )}
                    </th>
                    <th onClick={() => handleSort('averageScore')} className="sortable">
                      Average Score
                      {sortField === 'averageScore' && (
                        sortDirection === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                      )}
                    </th>
                    <th onClick={() => handleSort('completionRate')} className="sortable">
                      Completion
                      {sortField === 'completionRate' && (
                        sortDirection === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                      )}
                    </th>
                    <th onClick={() => handleSort('submissionsCount')} className="sortable">
                      Submissions
                      {sortField === 'submissionsCount' && (
                        sortDirection === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                      )}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map(student => (
                    <tr key={student.id}>
                      <td>
                        <div className="student-name">
                          <div className="student-avatar">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="student-info">
                            <span className="name">{student.name}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="student-info">
                          <span className="email">{student.email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="performance-metric">
                          <span className={`metric-value ${getGradeClass(student.averageScore)}`}>
                            {student.averageScore}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="progress-container">
                          <div 
                            className="progress-bar" 
                            style={{width: `${student.completionRate}%`}}
                          >
                            {student.completionRate}%
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="performance-metric">
                          <span className="metric-value">{student.submissionsCount}</span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <Link to={`/teacher/students/${student.id}`} className="btn-view">
                            <FaEye /> View
                          </Link>
                          <Link to={`/teacher/students/${student.id}/assignments`} className="btn-view">
                            <FaFileAlt /> Assignments
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <FaUserGraduate />
              <h3>No Students Found</h3>
              <p>There are no students enrolled in this course yet.</p>
            </div>
          )}
        </div>
      )}
    </TeacherLayout>
  );
};

export default TeacherStudents; 