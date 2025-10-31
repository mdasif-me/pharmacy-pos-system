import React, { useCallback, useMemo, useState } from 'react';
import addStock from '../assets/add-stock.svg';
import logo from "../assets/logo.png";
import logout from '../assets/logout.svg';
import pos from '../assets/pos.svg';
import stock from '../assets/stock.svg';
import { AddStockView } from './AddStockView';
import './Dashboard.css';
import { PosView } from './PosView';
import { Products } from './Products';

type DashboardView = 'pos' | 'all-stock' | 'add-stock';

type MenuItem = {
  id: DashboardView;
  label: string;
  icon: string;
};

const menuItems: MenuItem[] = [
  { id: 'pos', label: 'POS', icon: pos },
  { id: 'all-stock', label: 'All Stock', icon: stock },
  { id: 'add-stock', label: 'Add Stock', icon: addStock },
];

interface DashboardProps {
  user: AuthToken;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState<DashboardView>('pos');
  const [syncRequestId, setSyncRequestId] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('');

  const activeMenuLabel = useMemo(() => {
    const match = menuItems.find(item => item.id === activeView);
    return match ? match.label : 'Dashboard';
  }, [activeView]);

  const handleMenuClick = useCallback((view: DashboardView) => {
    setActiveView(view);
  }, []);

  const handleSyncClick = useCallback(() => {
    if (activeView !== 'all-stock') {
      return;
    }
    setSyncRequestId(prev => prev + 1);
  }, [activeView]);

  const handleSyncStatusChange = useCallback((status: { isSyncing: boolean; lastSync: string }) => {
    setIsSyncing(status.isSyncing);
    setLastSync(status.lastSync ?? '');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await window.electron.logout();
      onLogout();
    } catch (error) {
      console.error('logout failed:', error);
      alert('unable to logout. please try again.');
    }
  }, [onLogout]);

  let content: React.ReactNode;
  switch (activeView) {
    case 'pos':
      content = <PosView />;
      break;
    case 'add-stock':
      content = <AddStockView />;
      break;
    default:
      content = (
        <Products
          user={user}
          syncRequestId={syncRequestId}
          onSyncStatusChange={handleSyncStatusChange}
        />
      );
  }

  const isSyncDisabled = activeView !== 'all-stock' || isSyncing;

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
          {menuItems.map(item => (
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
        <button type="button" className="sidebar-logout" onClick={() => {
          const confirmLogout = window.confirm('Are you sure you want to logout?');
          if (confirmLogout) {
            handleLogout();
          }
        }}>
          <img className="sidebar-icon" src={logout} alt="Log-out" />
          Log-out
        </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h2>{activeMenuLabel}</h2>
            {activeView === 'all-stock' && lastSync && (
              <p className="dashboard-sync-meta">last sync: {lastSync}</p>
            )}
          </div>
            <button
              type="button"
              className="dashboard-sync-button"
              onClick={handleSyncClick}
              disabled={isSyncDisabled}
            >
              <svg className='dashboard-sync-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none">
    <path d="M21 12.5V5C21 3.34315 19.6569 2 18 2H5C3.34315 2 2 3.34315 2 5V18C2 19.6569 3.34315 21 5 21H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M12.5 6.5L16.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <circle cx="7.75" cy="6.75" r="1.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle>
    <circle cx="7.75" cy="16.25" r="1.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle>
    <path d="M2.5 11.5H20.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
    <path d="M20.6632 17C20.1014 15.8175 18.8962 15 17.5 15C15.7368 15 14.2426 16.3039 14 18L13 16M14.3368 20C14.8985 21.1825 16.1038 22 17.5 22C19.2632 22 20.7574 20.6961 21 19L22 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>
         <p>     {isSyncing ? 'syncing...' : 'sync'}</p>
            </button>
        </header>
        <main className="dashboard-content">{content}</main>
      </div>
    </div>
  );
};
