import React from 'react';
import { Link } from 'react-router-dom';
import LogoutButton from '../../components/auth/logoutbutton';

const TeacherDashboard = () => {
  return (
    <div>
      <h1>Teacher Dashboard</h1>
      <nav>
        <ul>
          <li><Link to="/teacher/courses">My Courses</Link></li>
          <li><Link to="/teacher/students">My Students</Link></li>
        </ul>
      </nav>
      <LogoutButton />
    </div>
  );
};

export default TeacherDashboard;