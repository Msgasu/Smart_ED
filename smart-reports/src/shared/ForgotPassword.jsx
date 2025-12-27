import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import logo from '../assets/logo_nbg.png'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const navigate = useNavigate()

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get the current origin for redirect URL
      const redirectTo = `${window.location.origin}/reset-password`
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo
      })

      if (error) throw error

      setEmailSent(true)
      toast.success('Password reset email sent! Check your inbox.')
    } catch (error) {
      console.error('Password reset error:', error)
      toast.error(error.message || 'Failed to send password reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {/* Background Pattern */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 2px, transparent 2px)',
        backgroundSize: '50px 50px',
        zIndex: 0
      }} />
      
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 20px rgba(139,195,74,0.2)',
        width: '100%',
        maxWidth: '450px',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden'
      }}>
        {/* Header with Logo */}
        <div style={{
          background: 'linear-gradient(135deg, #722F37 0%, #5A252A 100%)',
          padding: '2rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1rem',
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            <img 
              src={logo} 
              alt="Life International College" 
              style={{ width: '70px', height: '70px' }}
            />
          </div>
          
          <h1 style={{
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            Reset Password
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.9rem',
            margin: 0,
            fontWeight: '500'
          }}>
            Enter your email to receive a reset link
          </p>
        </div>

        <div style={{ padding: '2rem' }}>
          {!emailSent ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{
                  color: '#722F37',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  margin: '0 0 0.5rem 0'
                }}>
                  Forgot Your Password?
                </h2>
                <p style={{
                  color: '#666',
                  fontSize: '0.9rem',
                  margin: 0
                }}>
                  No worries! Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#722F37',
                    fontSize: '0.9rem'
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email address"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #E5E7EB',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease',
                      outline: 'none',
                      background: '#F9FAFB'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#8BC34A'
                      e.target.style.boxShadow = '0 0 0 3px rgba(139,195,74,0.1)'
                      e.target.style.background = 'white'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E5E7EB'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = '#F9FAFB'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: loading ? '#94A3B8' : 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(139,195,74,0.3)',
                    marginTop: '0.5rem'
                  }}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1.5rem',
                background: '#D1FAE5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '2.5rem' }}>✓</span>
              </div>
              <h2 style={{
                color: '#722F37',
                fontSize: '1.3rem',
                fontWeight: '600',
                margin: '0 0 1rem 0'
              }}>
                Check Your Email
              </h2>
              <p style={{
                color: '#666',
                fontSize: '0.95rem',
                marginBottom: '2rem',
                lineHeight: '1.6'
              }}>
                We've sent a password reset link to <strong>{email}</strong>. 
                Please check your inbox and click the link to reset your password.
              </p>
              <p style={{
                color: '#888',
                fontSize: '0.85rem',
                marginBottom: '2rem'
              }}>
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  color: '#8BC34A',
                  border: '2px solid #8BC34A',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#8BC34A'
                  e.target.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.color = '#8BC34A'
                }}
              >
                Try Another Email
              </button>
            </div>
          )}

          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem'
          }}>
            <Link 
              to="/login" 
              style={{
                color: '#8BC34A',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword

