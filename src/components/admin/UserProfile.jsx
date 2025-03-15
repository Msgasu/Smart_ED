import React from 'react';
import './styles/AdminLayout.css';

const UserProfile = ({ name, role, profileImage }) => {
  return (
    <div className="user-profile">
      <div className="user-info">
        <div className="user-name">{name || 'Admin Name'}</div>
        <div className="user-role">{role || 'Administrator'}</div>
      </div>
      <img src={profileImage || "/path/to/profile.jpg"} alt="Profile" />
    </div>
  );
};

export default UserProfile;
