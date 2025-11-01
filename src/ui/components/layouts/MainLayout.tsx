import React from 'react'
import './MainLayout.css'

interface MainLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, sidebar, header }) => {
  return (
    <div className="main-layout">
      {header && <div className="main-layout-header">{header}</div>}
      <div className="main-layout-body">
        {sidebar && <div className="main-layout-sidebar">{sidebar}</div>}
        <div className="main-layout-content">{children}</div>
      </div>
    </div>
  )
}
