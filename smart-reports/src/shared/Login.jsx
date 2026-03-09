import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import logo from '../assets/logo_nbg.png'
import './Login.css'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        toast.error('Error loading user profile')
        return
      }

      toast.success(`Welcome, ${profileData.first_name || 'User'}!`)
      setTimeout(() => navigate('/'), 300)
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page" role="main" aria-label="Sign in">
      <div className="login-page-pattern" aria-hidden />

      <div className="login-card">
        <header className="login-card-header">
          <span className="login-card-header-dot login-card-header-dot--top" aria-hidden />
          <span className="login-card-header-dot login-card-header-dot--bottom" aria-hidden />
          <div className="login-card-logo-wrap">
            <img src={logo} alt="" className="login-card-logo" />
          </div>
          <h1 className="login-card-title">Life International College</h1>
          <p className="login-card-subtitle">Student Reports Portal</p>
        </header>

        <div className="login-card-body">
          <div className="login-card-heading">
            <h2>Welcome Back</h2>
            <p>Sign in to access your academic reports</p>
          </div>

          <form onSubmit={handleLogin} className="login-form" noValidate>
            <div className="login-form-group">
              <label htmlFor="login-email" className="login-form-label">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-form-input"
                placeholder="you@example.com"
                required
                disabled={loading}
                aria-invalid={false}
              />
            </div>

            <div className="login-form-group">
              <label htmlFor="login-password" className="login-form-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-form-input"
                required
                disabled={loading}
              />
            </div>

            <div className="login-form-footer">
              <Link to="/forgot-password" className="login-link">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <span className="login-btn-spinner">
                  <span className="login-btn-spinner-dot" aria-hidden />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="login-signup">
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="login-link">Sign up here</Link>
            </p>
          </div>

          <div className="login-note">
            <div className="login-note-inner">
              <span className="login-note-dot" aria-hidden />
              <small>Use your Life International College credentials to sign in</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
