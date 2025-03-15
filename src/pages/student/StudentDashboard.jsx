import React from 'react';
import { Link } from 'react-router-dom';
import LogoutButton from '../../components/auth/logoutbutton';
import '../../components/student/style/StudentDashboard.css';

const StudentDashboard = () => {
  return (
    <div>
      <h1>Student Dashboard</h1>
      <nav>
        <ul>
          <li><Link to="/student/courses">My Courses</Link></li>
          <li><Link to="/student/assignments">My Assignments</Link></li>
        </ul>
      </nav>
      <LogoutButton />
    </div>
  );
};

export default StudentDashboard;