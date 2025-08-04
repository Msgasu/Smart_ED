import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import logo from '../assets/logo_nbg.png'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      toast.success('Welcome to Life International College Reports!')
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed')
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
          {/* Decorative Elements */}
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '40px',
            height: '40px',
            background: 'rgba(139,195,74,0.2)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            left: '-5px',
            width: '25px',
            height: '25px',
            background: 'rgba(139,195,74,0.3)',
            borderRadius: '50%'
          }} />
          
          {/* Logo */}
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
            Life International College
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.9rem',
            margin: 0,
            fontWeight: '500'
          }}>
            Student Reports Portal
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
              Welcome Back
            </h2>
            <p style={{
              color: '#666',
              fontSize: '0.9rem',
              margin: 0
            }}>
              Sign in to access your academic reports
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
                transform: loading ? 'none' : 'translateY(0)',
                marginTop: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(139,195,74,0.4)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 15px rgba(139,195,74,0.3)'
                }
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem'
          }}>
            <p style={{
              color: '#666',
              fontSize: '0.9rem',
              margin: 0
            }}>
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                style={{
                  color: '#8BC34A',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
              >
                Sign up here
              </Link>
            </p>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: '2rem',
            padding: '1rem',
            background: '#F3F4F6',
            borderRadius: '10px',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: '#8BC34A',
                borderRadius: '50%'
              }} />
              <small style={{
                color: '#666',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                Use your Life International College credentials
              </small>
            </div>
            <small style={{
              color: '#888',
              fontSize: '0.8rem'
            }}>
              Same login as your student portal account
            </small>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Login 