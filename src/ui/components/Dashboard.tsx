import React, { useCallback, useMemo, useState } from 'react'
import addStock from '../assets/add-stock.svg'
import logo from '../assets/logo.png'
import logout from '../assets/logout.svg'
import pos from '../assets/pos.svg'
import stock from '../assets/stock.svg'
import { useSaleModeSocket } from '../hooks/useSaleModeSocket'
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
      <button
        type="button"
        className="dashboard-sync-button"
        onClick={handleSyncClick}
        disabled={isSyncDisabled}
      >
        <svg
          className={isSyncing ? 'spin' : ''}
          xmlns="http://www.w3.org/2000/svg"
          width="25"
          height="25"
          viewBox="0 0 25 25"
          fill="none"
        >
          <path
            d="M24.0396 3.73331e-07H21.7246C21.6453 -8.91913e-05 21.5667 0.0159375 21.4938 0.0471087C21.4208 0.0782798 21.3549 0.123946 21.3001 0.181338C21.2453 0.23873 21.2028 0.306652 21.175 0.380985C21.1473 0.455318 21.1349 0.534514 21.1387 0.61377L21.334 4.65479C20.1984 3.31664 18.7849 2.24198 17.1919 1.50557C15.5988 0.769166 13.8644 0.388693 12.1094 0.390625C5.43653 0.390625 -0.00487953 5.83643 3.28361e-06 12.5093C0.0048861 19.1929 5.42481 24.6094 12.1094 24.6094C15.1079 24.6136 18.0006 23.5011 20.2236 21.4888C20.283 21.4356 20.3309 21.3709 20.3645 21.2986C20.398 21.2263 20.4164 21.1479 20.4186 21.0683C20.4208 20.9886 20.4067 20.9093 20.3772 20.8353C20.3477 20.7613 20.3034 20.694 20.2471 20.6377L18.5869 18.9775C18.4818 18.8725 18.3408 18.8113 18.1923 18.8063C18.0438 18.8013 17.899 18.8529 17.7871 18.9507C16.4753 20.1048 14.8429 20.8317 13.1075 21.0344C11.3721 21.237 9.61609 20.9059 8.07364 20.0852C6.53119 19.2644 5.27556 17.993 4.47414 16.4405C3.67272 14.8879 3.36358 13.1279 3.58793 11.3951C3.81228 9.66238 4.55947 8.03918 5.72989 6.74191C6.9003 5.44464 8.43833 4.53495 10.139 4.1341C11.8396 3.73325 13.622 3.86029 15.2485 4.49829C16.8751 5.13628 18.2686 6.25492 19.2432 7.70508L14.2856 7.46729C14.2064 7.46352 14.1272 7.47588 14.0529 7.50364C13.9785 7.53139 13.9106 7.57395 13.8532 7.62874C13.7958 7.68353 13.7502 7.74941 13.719 7.82237C13.6878 7.89534 13.6718 7.97388 13.6719 8.05322V10.3682C13.6719 10.5236 13.7336 10.6726 13.8435 10.7825C13.9534 10.8924 14.1024 10.9541 14.2578 10.9541H24.0396C24.195 10.9541 24.344 10.8924 24.4539 10.7825C24.5638 10.6726 24.6255 10.5236 24.6255 10.3682V0.585938C24.6255 0.430538 24.5638 0.281502 24.4539 0.171617C24.344 0.0617329 24.195 3.73331e-07 24.0396 3.73331e-07Z"
            fill="#F5F5F5"
          />
        </svg>
      </button>
    </div>
  )
}
