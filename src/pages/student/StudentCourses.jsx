import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { getStudentCourses } from '../../backend/students/courses';
import StudentLayout from '../../components/student/StudentLayout';
import './styles/StudentCourses.css';

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

  if (loading) return (
    <StudentLayout>
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading courses...</div>
      </div>
    </StudentLayout>
  );

  return (
    <StudentLayout>
      <div className="courses-container">
        <h1>My Courses</h1>
        
        {courses.length === 0 ? (
          <div className="no-courses">
            <p>No courses enrolled yet.</p>
            <button 
              className="browse-courses-btn"
              onClick={() => window.location.href = '/student/courses/browse'}
            >
              Browse Available Courses
            </button>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map(course => (
              <div key={course.course_id} className="course-card">
                <div className="course-card-content">
                  <h3 className="course-title">{course.courses.code} - {course.courses.name}</h3>
                  <p className="course-description">{course.courses.description}</p>
                  <Link 
                    to={`/student/courses/${course.course_id}`}
                    className="view-course-btn"
                  >
                    View Course Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentCourses;