import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { getStudentCourses } from '../../backend/students/courses';

const StudentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentCourses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Use the backend service to get student courses
        const { data, error } = await getStudentCourses(user.id);

        if (error) throw error;
        setCourses(data || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentCourses();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>My Courses</h1>
      <Link to="/student/dashboard">Back to Dashboard</Link>
      
      {courses.length === 0 ? (
        <p>No courses enrolled yet.</p>
      ) : (
        <div className="row">
          {courses.map(course => (
            <div key={course.course_id} className="col-md-4 mb-4">
              <div className="card">
                <div className="card-body">
                  <h3 className="card-title">{course.courses.code} - {course.courses.name}</h3>
                  <p className="card-text">{course.courses.description}</p>
                  <Link 
                    to={`/student/courses/${course.course_id}`}
                    className="btn btn-primary"
                  >
                    View Course Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentCourses;