import React, { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (token: AuthToken) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await window.electron.login({
        phoneNumber,
        password,
      });

      if (response.token) {
        // get the stored token info
        const tokenInfo = await window.electron.getAuthToken();
        if (tokenInfo) {
          onLoginSuccess(tokenInfo);
        }
      } else {
        setError('login failed');
      }
    } catch (err) {
      setError('network error or invalid credentials');
      console.error('login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>pharmacy pos login</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="phoneNumber">phone number</label>
            <input
              type="text"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="01616815056"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="enter password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'logging in...' : 'login'}
          </button>
        </form>

        <div className="login-info">
          <p>mediboy pharmacy pos system</p>
          <p>store products locally for offline access</p>
        </div>
      </div>
    </div>
  );
};