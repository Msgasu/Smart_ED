import React, { useState, useEffect } from 'react';
import RoleOption from '../auth/RoleOption';
import SignupForm from '../auth/SignupForm';
import { toast } from 'react-hot-toast';

const AuthCard = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    // Log the selected role whenever it changes
    console.log("AuthCard - Selected Role:", selectedRole);
  }, [selectedRole]);

  const handleRoleChange = (role) => {
    console.log("Role selected in AuthCard:", role);
    setSelectedRole(role);
    setRoleError(''); // Clear any error when a role is selected
  };

  const validateRoleSelection = () => {
    if (!selectedRole) {
      setRoleError('Please select a role before proceeding');
      toast.error('Please select a role (Student, Guardian, or Faculty) before creating an account.', {
        duration: 4000,
        position: 'top-center',
        className: 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400'
      });
      return false;
    }
    return true;
  };

  return (
    <div className="login-card">
      <div className="roles-side">
        <h3>I am a ...</h3>
        {roleError && <div className="error-message">{roleError}</div>}
        <div className="role-selection">
          <RoleOption
            value="student"
            label="Student"
            selectedRole={selectedRole}
            onChange={handleRoleChange}
          />
          <RoleOption
            value="guardian"
            label="Guardian"
            selectedRole={selectedRole}
            onChange={handleRoleChange}
          />
          <RoleOption
            value="faculty"
            label="Faculty"
            selectedRole={selectedRole}
            onChange={handleRoleChange}
          />
        </div>
      </div>
      <div className="form-side">
        <SignupForm 
          selectedRole={selectedRole} 
          validateRole={validateRoleSelection}
        />
      </div>
    </div>
  );
};

export default AuthCard;
