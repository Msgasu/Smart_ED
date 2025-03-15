// src/components/teacher/CourseList.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const CourseList = ({ courses }) => {
  return (
    <div>
      <h2>Assigned Courses</h2>
      {courses.length === 0 ? (
        <p>No courses assigned yet.</p>
      ) : (
        <div className="row">
          {courses.map(course => (
            <div key={course.course_id} className="col-md-4 mb-4">
              <div className="card">
                <div className="card-body">
                  <h3 className="card-title">{course.courses.code} - {course.courses.name}</h3>
                  <p className="card-text">{course.courses.description}</p>
                  <div className="d-flex flex-column">
                    <Link 
                      to={`/teacher/courses/${course.course_id}/students`}
                      className="btn btn-primary mb-2"
                    >
                      View Students
                    </Link>
                    <Link 
                      to={`/teacher/courses/${course.course_id}/assignments`}
                      className="btn btn-secondary"
                    >
                      Manage Assignments
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseList;