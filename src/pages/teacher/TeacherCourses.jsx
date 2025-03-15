// src/pages/teacher/TeacherCourses.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import CourseList from '../../components/teacher/CourseList';

const TeacherCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherCourses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase
          .from('faculty_courses')
          .select(`
            course_id,
            courses (
              id,
              code,
              name,
              description
            )
          `)
          .eq('faculty_id', user.id);

        if (error) throw error;
        setCourses(data || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherCourses();
  }, []);

  return (
    <div>
      <h1>My Courses</h1>
      <Link to="/teacher/dashboard">Back to Dashboard</Link>
      {loading ? (
        <p>Loading courses...</p>
      ) : (
        <CourseList courses={courses} />
        
      )}
    </div>
  );
};

export default TeacherCourses;