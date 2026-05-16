import React, { useState } from 'react';
import PasswordField from './PasswordField';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';
import { FaEnvelope, FaLock } from 'react-icons/fa';

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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...data.user,
          profile: profileData,
        })
      );

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          last_login: now,
          updated_at: now,
        })
        .eq('id', data.user.id);

      if (updateError) {
        console.error('Error updating last_login:', updateError);
      }

      Swal.fire({
        title: 'Login Successful!',
        text: `Welcome back, ${profileData.first_name}!`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
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
          navigate('/admin/dashboard');
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);

      Swal.fire({
        title: 'Login Failed',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Try Again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="signin-form-header">
        <h2 className="signin-form-title form-title">Welcome back</h2>
        <p className="signin-form-subtitle form-subtitle">
          Sign in to your SmartED account
        </p>
      </header>

      {error ? (
        <p className="signin-error error-message" role="alert">
          {error}
        </p>
      ) : null}

      <form className="signin-form" onSubmit={handleSubmit}>
        <div className="signin-field">
          <label htmlFor="email" className="signin-label form-label">
            Email address
          </label>
          <div className="signin-input-wrap input-with-icon">
            <FaEnvelope className="signin-input-icon input-icon" aria-hidden="true" />
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="signin-field">
          <label htmlFor="password" className="signin-label form-label">
            Password
          </label>
          <div className="signin-input-wrap signin-input-wrap--password input-with-icon">
            <FaLock className="signin-input-icon input-icon" aria-hidden="true" />
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
        </div>

        <div className="signin-forgot forgot-password">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button type="submit" className="signin-submit btn btn-login" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="signin-footer signup-text">
        Don&apos;t have an account?
        <Link to="/signup">Create one</Link>
      </p>
    </>
  );
};

export default SigninForm;
