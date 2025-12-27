import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import logo from '../assets/logo_nbg.png'

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [canReset, setCanReset] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is in password recovery mode
    const checkRecoveryMode = async () => {
      // Check URL hash parameters (Supabase sends recovery tokens in hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')
      
      if (type === 'recovery' && accessToken) {
        // Supabase will automatically handle the hash and set the session
        setCanReset(true)
        return
      }
      
      // Check URL query parameters (fallback)
      const urlParams = new URLSearchParams(window.location.search)
      const urlType = urlParams.get('type')
      if (urlType === 'recovery') {
        setCanReset(true)
        return
      }
      
      // Check if there's an active session (user might already be authenticated from recovery)
      const { data: { session } } = await supabase.auth.getSession()
      if (session && session.user) {
        setCanReset(true)
      }
    }

    checkRecoveryMode()

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCanReset(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      toast.success('Password updated successfully! Redirecting to login...')
      
      // Sign out to force re-login with new password
      await supabase.auth.signOut()
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login')
      }, 1500)

    } catch (error) {
      console.error('Password reset error:', error)
      toast.error(error.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  if (!canReset) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '450px',
          padding: '3rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1.5rem',
            background: '#FEE2E2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '2.5rem' }}>⚠️</span>
          </div>
          <h2 style={{
            color: '#722F37',
            fontSize: '1.3rem',
            fontWeight: '600',
            margin: '0 0 1rem 0'
          }}>
            Invalid Reset Link
          </h2>
          <p style={{
            color: '#666',
            fontSize: '0.95rem',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            This password reset link is invalid or has expired. Please request a new password reset link.
          </p>
          <button
            onClick={() => navigate('/forgot-password')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Request New Reset Link
          </button>
        </div>
      </div>
    )
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
            Set New Password
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.9rem',
            margin: 0,
            fontWeight: '500'
          }}>
            Choose a strong password for your account
          </p>
        </div>

        <div style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{
              color: '#722F37',
              fontSize: '1.3rem',
              fontWeight: '600',
              margin: '0 0 0.5rem 0'
            }}>
              Create New Password
            </h2>
            <p style={{
              color: '#666',
              fontSize: '0.9rem',
              margin: 0
            }}>
              Your password must be at least 6 characters long
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
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Enter new password"
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

            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#722F37',
                fontSize: '0.9rem'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Confirm new password"
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

            {password && confirmPassword && password !== confirmPassword && (
              <div style={{
                padding: '0.75rem',
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#DC2626',
                fontSize: '0.875rem'
              }}>
                Passwords do not match
              </div>
            )}

            <button
              type="submit"
              disabled={loading || password !== confirmPassword || password.length < 6}
              style={{
                width: '100%',
                padding: '1rem',
                background: (loading || password !== confirmPassword || password.length < 6) 
                  ? '#94A3B8' 
                  : 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: (loading || password !== confirmPassword || password.length < 6) 
                  ? 'not-allowed' 
                  : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(139,195,74,0.3)',
                marginTop: '0.5rem'
              }}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>

          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem'
          }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8BC34A',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword

