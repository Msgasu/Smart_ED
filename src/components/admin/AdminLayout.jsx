import React from 'react';
import Sidebar from './Sidebar';
import './styles/AdminLayout.css';
import NotificationsIcon from '../common/NotificationsIcon';

const AdminLayout = ({ children }) => {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="content-wrapper">
        <header className="admin-header">
          <div className="header-title">
            {/* Page title could be dynamic if needed */}
          </div>
          <div className="header-actions">
            <NotificationsIcon />
            {/* Other header actions can be added here */}
          </div>
        </header>
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 