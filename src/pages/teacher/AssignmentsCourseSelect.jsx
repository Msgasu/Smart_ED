import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBook, FaClipboardList, FaPlus } from 'react-icons/fa';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';
import { supabase } from '../../lib/supabase';
import '../../components/teacher/styles/TeacherLayout.css';

const AssignmentsCourseSelect = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        const { data, error } = await supabase
          .from('courses')
          .select(`
            id,
            title,
            description,
            code,
            created_at,
            (
              select count(*) 
              from assignments 
              where course_id = courses.id
            ) as assignment_count
          `)
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setCourses(data || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourses();
  }, []);

  return (
    <TeacherLayout>
      <div className="page-header">
        <h1 className="page-title">Select a Course</h1>
        <p className="page-subtitle">Choose a course to view and manage its assignments</p>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <FaClipboardList className="spinner-icon" />
          <p>Loading courses...</p>
        </div>
      ) : (
        <div className="course-grid">
          {courses.length > 0 ? (
            courses.map(course => (
              <div className="course-card" key={course.id}>
                <div className="course-icon">
                  <FaBook />
                </div>
                <div className="course-details">
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <div className="course-meta">
                    <span className="course-code">{course.code}</span>
                    <span className="assignment-count">
                      <FaClipboardList /> {course.assignment_count} Assignments
                    </span>
                  </div>
                </div>
                <div className="course-actions">
                  <Link 
                    to={`/teacher/courses/${course.id}/assignments`}
                    className="btn btn-primary"
                  >
                    Manage Assignments
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <FaBook className="empty-icon" />
              <h3>No Courses Found</h3>
              <p>You don't have any courses yet. Create your first course to get started.</p>
              <Link to="/teacher/courses/new" className="btn btn-primary">
                <FaPlus /> Create Course
              </Link>
            </div>
          )}
        </div>
      )}
    </TeacherLayout>
  );
};

export default AssignmentsCourseSelect; 