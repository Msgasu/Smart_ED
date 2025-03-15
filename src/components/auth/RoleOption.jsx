import React from 'react';

const RoleOption = ({ value, label, selectedRole, onChange }) => {
  const handleChange = () => {
    console.log(`Role option selected: ${value}`);
    onChange(value);
  };

  return (
    <label className={`role-option ${selectedRole === value ? 'selected' : ''}`}>
      <input
        type="radio"
        name="role"
        value={value}
        checked={selectedRole === value}
        onChange={handleChange}
      />
      <span>{label}</span>
    </label>
  );
};

export default RoleOption;
