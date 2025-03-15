// src/components/teacher/StudentList.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const StudentList = ({ students }) => {
  return (
    <div>
      {students.map(courseData => (
        <div key={courseData.course_id} className="mb-4">
          <h2>{courseData.courses.name}</h2>
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
              {courseData.students.map(student => (
                <tr key={student.id}>
                  <td>{student.student_id}</td>
                  <td>{student.first_name} {student.last_name}</td>
                  <td>{student.email}</td>
                  <td>
                    <Link 
                      to={`/teacher/students/${student.id}/analysis`}
                      className="btn btn-sm btn-info"
                    >
                      View Analysis
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default StudentList;