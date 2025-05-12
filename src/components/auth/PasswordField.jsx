import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const PasswordField = ({ value, onChange, placeholder }) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <input
        type={showPassword ? 'text' : 'password'}
        className="form-control"
        id="password"
        value={value}
        onChange={onChange}
        placeholder={placeholder || "Password"}
        required
        style={{ paddingRight: '40px' }}
        autoComplete="current-password"
      />
      <button 
        type="button" 
        className="password-toggle"
        onClick={togglePasswordVisibility}
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </button>
    </>
  );
};

export default PasswordField;
