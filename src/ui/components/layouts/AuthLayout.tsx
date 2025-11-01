import React from 'react'
import './AuthLayout.css'

interface AuthLayoutProps {
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-layout">
      <div className="auth-layout-content">{children}</div>
    </div>
  )
}
