import React, { useState } from 'react';
import PasswordField from './PasswordField';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';
import { FaUser, FaLock } from 'react-icons/fa';

const SigninForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      console.log('User authenticated:', data);
      
      // Fetch user profile to determine role and redirect accordingly
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (profileError) throw profileError;
      
      // Store user data in local storage for app-wide access
      localStorage.setItem('user', JSON.stringify({
        ...data.user,
        profile: profileData
      }));
      
      // Update last_login timestamp
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          last_login: now,
          updated_at: now
        })
        .eq('id', data.user.id);
        
      if (updateError) {
        console.error('Error updating last_login:', updateError);
      }
      
      // Show success message
      Swal.fire({
        title: 'Login Successful!',
        text: `Welcome back, ${profileData.first_name}!`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        // Redirect based on role
        const role = profileData.role;
        if (role === 'admin') {
          navigate('/admin/dashboard');
        } else if (role === 'student') {
          navigate('/student/dashboard');
        } else if (role === 'faculty') {
          navigate('/teacher/dashboard');
        } else if (role === 'guardian') {
          navigate('/guardian/dashboard');
        } else {
          // Default fallback
          navigate('/admin/dashboard');
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      
      // Show error message
      Swal.fire({
        title: 'Login Failed',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'Try Again'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="form-title">Welcome Back</h2>
      <p className="form-subtitle">Sign in to continue to your account</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <div className="input-with-icon">
            <FaUser className="input-icon" />
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
        </div>
        
        <div className="mb-3">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="input-with-icon">
            <FaLock className="input-icon" />
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
        </div>
        
        <div className="forgot-password">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        
        <button type="submit" className="btn btn-login" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      
      <p className="signup-text">
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
    </>
  );
};

export default SigninForm;
