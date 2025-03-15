// src/components/auth/LogoutButton.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/signin');
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  };

  return (
    <button 
      onClick={handleLogout} 
      className="logout-btn"
      type="button"
    >
      <i className="bi bi-box-arrow-right"></i>
      Logout
    </button>
  );
};

export default LogoutButton;