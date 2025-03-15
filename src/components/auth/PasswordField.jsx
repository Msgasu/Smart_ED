import React, { useState } from 'react';

const PasswordField = ({ value, onChange }) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="mb-3 password-field">
      <label htmlFor="password" className="form-label">
        Password
      </label>
      <input
        type={showPassword ? 'text' : 'password'}
        className="form-control"
        id="password"
        value={value}
        onChange={onChange}
        required
      />
      <button 
        type="button" 
        className="password-toggle"
        onClick={togglePasswordVisibility}
      >
        {showPassword ? '👁️' : '👁️‍🗨️'}
      </button>
    </div>
  );
};

export default PasswordField;
