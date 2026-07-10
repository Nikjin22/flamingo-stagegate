import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1 = enter email, 2 = enter token + new password
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetToken, setResetToken] = useState('')

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setResetToken(res.data.resetToken)
      toast.success('Reset token generated successfully')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate reset token')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token: token || resetToken,
        newPassword
      })
      toast.success('Password reset successfully')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2027 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Segoe UI, sans-serif'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '48px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #1e3a5f, #2196F3)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '28px'
          }}>💊</div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e3a5f' }}>
            Flamingo Pharma
          </h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            {step === 1 ? 'Reset your password' : 'Set new password'}
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: step >= s ? '#2196F3' : '#e0e0e0',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>

        {/* Step 1 — Enter email */}
        {step === 1 && (
          <form onSubmit={handleForgot}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@flamingopharma.com"
                required
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1.5px solid #ddd', borderRadius: '8px',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#ccc' : 'linear-gradient(135deg, #1e3a5f, #2196F3)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Generating...' : 'Generate Reset Token'}
            </button>
          </form>
        )}

        {/* Step 2 — Enter token + new password */}
        {step === 2 && (
          <form onSubmit={handleReset}>
            {resetToken && (
              <div style={{
                background: '#E8F5E9', border: '1px solid #4CAF50',
                borderRadius: '8px', padding: '12px 16px', marginBottom: '20px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#2E7D32', marginBottom: '4px' }}>
                  Your reset token (copy this):
                </div>
                <div style={{
                  fontSize: '11px', color: '#1B5E20', fontFamily: 'monospace',
                  wordBreak: 'break-all', background: 'white',
                  padding: '8px', borderRadius: '4px', marginTop: '4px'
                }}>
                  {resetToken}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                  ⏱ Valid for 1 hour
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                Reset Token
              </label>
              <input
                value={token || resetToken}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your reset token here"
                required
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1.5px solid #ddd', borderRadius: '8px',
                  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1.5px solid #ddd', borderRadius: '8px',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                required
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1.5px solid #ddd', borderRadius: '8px',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#ccc' : 'linear-gradient(135deg, #1e3a5f, #2196F3)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Back to login */}
        <button
          onClick={() => navigate('/login')}
          style={{
            width: '100%', marginTop: '16px', padding: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#2196F3', fontSize: '14px', fontWeight: '500'
          }}
        >
          ← Back to Login
        </button>
      </div>
    </div>
  )
}