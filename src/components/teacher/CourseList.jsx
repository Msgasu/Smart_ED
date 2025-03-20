// src/components/teacher/CourseList.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserGraduate, FaClipboardList, FaCalendarAlt, FaBook } from 'react-icons/fa';
import './styles/CourseList.css';

const CourseList = ({ courses }) => {
  return (
    <div className="course-container">
      {courses.length === 0 ? (
        <div className="empty-courses">
          <FaBook className="empty-icon" />
          <h3>No Courses Found</h3>
          <p>You don't have any courses assigned yet.</p>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map(course => (
            <div key={course.course_id} className="course-card">
              <div className="course-header">
                <div className="course-code">{course.courses.code}</div>
                <div className="course-status">Active</div>
              </div>
              <div className="course-body">
                <h3 className="course-title">{course.courses.name}</h3>
                <p className="course-description">{course.courses.description}</p>
                
                <div className="course-stats">
                  <div className="stat">
                    <FaUserGraduate />
                    <span>{course.stats?.students || 0} Students</span>
                  </div>
                  <div className="stat">
                    <FaClipboardList />
                    <span>{course.stats?.assignments || 0} Assignments</span>
                  </div>
                  <div className="stat">
                    <FaCalendarAlt />
                    <span>{course.stats?.submissions || 0} Submissions</span>
                  </div>
                </div>
              </div>
              <div className="course-actions">
                <Link 
                  to={`/teacher/courses/${course.course_id}/students`}
                  className="course-action-btn students-btn"
                >
                  <FaUserGraduate /> View Students
                </Link>
                <Link 
                  to={`/teacher/courses/${course.course_id}/assignments`}
                  className="course-action-btn assignments-btn"
                >
                  <FaClipboardList /> Manage Assignments
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseList;