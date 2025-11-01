import React, { useState } from 'react'
import logo from '../assets/logo_mediboy.png'
import '../styles/Login.css'

interface LoginProps {
  onLoginSuccess: (token: AuthToken) => void
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await window.electron.login({
        phoneNumber,
        password,
      })

      if (response.token) {
        // get the stored token info
        const tokenInfo = await window.electron.getAuthToken()
        if (tokenInfo) {
          onLoginSuccess(tokenInfo)
        }
      } else {
        setError('login failed')
      }
    } catch (err) {
      setError('network error or invalid credentials')
      console.error('login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <div className="loginLogo">
          <img src={logo} alt="" />
          <h2>Login to Your Account</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="text"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter your phoneNumber"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'logging in...' : 'Login'}
          </button>
          <div></div>
        </form>

        <div className="login-info">
          <p>Alright reserve @mediboy</p>
        </div>
      </div>
    </div>
  )
}
