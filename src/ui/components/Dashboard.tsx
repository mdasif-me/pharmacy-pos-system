import React, { useCallback, useState } from 'react'
import addStock from '../assets/add-stock.svg'
import logo from '../assets/logo.png'
import logout from '../assets/logout.svg'
import pos from '../assets/pos.svg'
import stock from '../assets/stock.svg'
import { AddStockView } from './AddStockView'
import './Dashboard.css'
import { PosView } from './PosView'
import { Products } from './Products'
type DashboardView = 'pos' | 'all-stock' | 'add-stock'

type MenuItem = {
  id: DashboardView
  label: string
  icon: string
}

const menuItems: MenuItem[] = [
  { id: 'pos', label: 'POS', icon: pos },
  { id: 'all-stock', label: 'All Stock', icon: stock },
  { id: 'add-stock', label: 'Add Stock', icon: addStock },
]

interface DashboardProps {
  user: AuthToken
  onLogout: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState<DashboardView>('pos')
  const [syncRequestId, setSyncRequestId] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleMenuClick = useCallback((view: DashboardView) => {
    setActiveView(view)
  }, [])

  const handleSyncClick = useCallback(() => {
    if (activeView !== 'all-stock') {
      return
    }
    setSyncRequestId((prev) => prev + 1)
  }, [activeView])

  const handleSyncStatusChange = useCallback((status: { isSyncing: boolean; lastSync: string }) => {
    setIsSyncing(status.isSyncing)
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await window.electron.logout()
      onLogout()
    } catch (error) {
      console.error('logout failed:', error)
      alert('unable to logout. please try again.')
    }
  }, [onLogout])

  let content: React.ReactNode
  switch (activeView) {
    case 'pos':
      content = <PosView />
      break
    case 'add-stock':
      content = <AddStockView />
      break
    default:
      content = (
        <Products
          user={user}
          syncRequestId={syncRequestId}
          onSyncStatusChange={handleSyncStatusChange}
        />
      )
  }

  const isSyncDisabled = activeView !== 'all-stock' || isSyncing

  return (
    <div className="dashboard-root">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src={logo} alt="logo" />
          </div>
          <div className="sidebar-user">{user.user_name}</div>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link ${activeView === item.id ? 'is-active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
            >
              <img className="sidebar-icon" src={item.icon} alt={item.label} />
              <span className="sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div>
          <button
            type="button"
            className="sidebar-logout"
            onClick={() => {
              const confirmLogout = window.confirm('Are you sure you want to logout?')
              if (confirmLogout) {
                handleLogout()
              }
            }}
          >
            <img className="sidebar-icon" src={logout} alt="Log-out" />
            Log-out
          </button>
        </div>
      </aside>
      <div className="dashboard-main">
        <main className="dashboard-content">{content}</main>
      </div>
    </div>
  )
}
