import React from 'react';
import { Outlet } from 'react-router-dom';
import FontSizeToggle from '../components/FontSizeToggle';

const TeacherLayout = ({ children }) => {
  return (
    <div className="teacher-layout" data-testid="teacher-layout">
      <FontSizeToggle />
      <div className="teacher-content">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default TeacherLayout; 