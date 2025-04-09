// src/pages/teacher/TeacherCourses.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { FaPlus, FaSearch } from 'react-icons/fa';
import CourseList from '../../components/teacher/CourseList';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import { getTeacherCourses, getCourseStats } from '../../backend/teachers/courses';
import '../../components/teacher/styles/CourseList.css';

const TeacherCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTeacherCourses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Use the backend service to get teacher courses
        const { data: coursesData, error } = await getTeacherCourses(user.id);

        if (error) throw error;

        // Fetch statistics for each course
        const coursesWithStats = await Promise.all(
          coursesData.map(async (course) => {
            const { data: stats, error: statsError } = await getCourseStats(course.course_id);
            if (statsError) throw statsError;
            return {
              ...course,
              stats: stats
            };
          })
        );

        setCourses(coursesWithStats || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherCourses();
  }, []);

  const filteredCourses = courses.filter(course => 
    course.courses.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.courses.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.courses.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TeacherLayout>
      <div className="page-header">
        <h1 className="page-title">My Courses</h1>
        <p className="page-subtitle">Manage your courses, assignments, and students</p>
      </div>
      
      <div className="courses-controls">
        <div className="search-container">
          <FaSearch />
          <input 
            type="text" 
            placeholder="Search courses..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

      </div>
      
      {loading ? (
        <div className="loading-spinner">
          <p>Loading your courses...</p>
        </div>
      ) : (
        <CourseList courses={filteredCourses} />
      )}
    </TeacherLayout>
  );
};

export default TeacherCourses;