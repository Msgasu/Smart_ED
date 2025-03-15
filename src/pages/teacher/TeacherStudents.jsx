// src/pages/teacher/TeacherStudents.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const TeacherStudents = () => {
  const [courseStudents, setCourseStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Get the current teacher's ID from the session
        const { data: { user } } = await supabase.auth.getUser();
        
        // First, get the courses assigned to the teacher
        const { data: teacherCourses, error: courseError } = await supabase
          .from('faculty_courses')
          .select('course_id')
          .eq('faculty_id', user.id);

        if (courseError) throw courseError;

        if (teacherCourses && teacherCourses.length > 0) {
          // Get the course IDs assigned to the teacher
          const courseIds = teacherCourses.map(tc => tc.course_id);

          // Fetch course details
          const { data: coursesData, error: coursesError } = await supabase
            .from('courses')
            .select('id, name, code')
            .in('id', courseIds);
            
          if (coursesError) throw coursesError;
          
          // Fetch student enrollments for these courses
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from('student_courses')
            .select('student_id, course_id')
            .in('course_id', courseIds);
            
          if (enrollmentsError) throw enrollmentsError;
          
          // Get unique student IDs
          const studentIds = [...new Set(enrollmentsData.map(e => e.student_id))];
          
          // Fetch student profiles
          const { data: studentsProfiles, error: studentsError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', studentIds);
            
          if (studentsError) throw studentsError;
          
          // Fetch student-specific data
          const { data: studentsData, error: studentDetailsError } = await supabase
            .from('students')
            .select('profile_id, student_id')
            .in('profile_id', studentIds);
            
          if (studentDetailsError) throw studentDetailsError;
          
          // Group students by course
          const groupedData = coursesData.map(course => {
            const courseEnrollments = enrollmentsData.filter(e => e.course_id === course.id);
            const studentCourses = courseEnrollments.map(enrollment => {
              const profile = studentsProfiles.find(p => p.id === enrollment.student_id);
              const studentDetails = studentsData.find(s => s.profile_id === enrollment.student_id);
              
              return {
                profiles: {
                  ...profile,
                  student_id: studentDetails?.student_id
                }
              };
            });
            
            return {
              course_id: course.id,
              courses: course,
              student_courses: studentCourses
            };
          });

          setCourseStudents(groupedData);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>My Students</h1>
      <Link to="/teacher/dashboard">Back to Dashboard</Link>
      
      {courseStudents.length === 0 ? (
        <p>No students found in your courses.</p>
      ) : (
        courseStudents.map(courseData => (
          <div key={courseData.course_id} className="course-section">
            <h2>{courseData.courses.code} - {courseData.courses.name}</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courseData.student_courses.map((enrollment, index) => (
                  <tr key={index}>
                    <td>{enrollment.profiles.student_id}</td>
                    <td>{enrollment.profiles.first_name} {enrollment.profiles.last_name}</td>
                    <td>{enrollment.profiles.email}</td>
                    <td>
                      <Link to={`/teacher/students/${enrollment.profiles.id}/analysis`}>
                        View Analysis
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

export default TeacherStudents;