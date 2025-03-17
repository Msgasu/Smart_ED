// src/pages/teacher/TeacherCourses.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import CourseList from '../../components/teacher/CourseList';
import TeacherLayout from '../../components/teacher/TeacherLayout';
import { getTeacherCourses } from '../../backend/teachers/courses';

const TeacherCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherCourses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Use the backend service to get teacher courses
        const { data, error } = await getTeacherCourses(user.id);

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
    <TeacherLayout>
      <h1 className="page-title">My Courses</h1>
      
      {loading ? (
        <div className="loading-spinner">Loading courses...</div>
      ) : (
        <CourseList courses={courses} />
      )}
    </TeacherLayout>
  );
};

export default TeacherCourses;