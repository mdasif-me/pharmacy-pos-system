import React, { useCallback, useMemo, useState } from 'react';
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
  { id: 'pos', label: 'POS', icon: 'P' },
  { id: 'all-stock', label: 'All Stock', icon: 'S' },
  { id: 'add-stock', label: 'Add Stock', icon: '+' },
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
          <div className="sidebar-brand">pharmacy pos</div>
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
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          logout
        </button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h2>{activeMenuLabel}</h2>
            {activeView === 'all-stock' && lastSync && (
              <p className="dashboard-sync-meta">last sync: {lastSync}</p>
            )}
          </div>
          <div className="dashboard-header-actions">
            <button
              type="button"
              className="dashboard-sync-button"
              onClick={handleSyncClick}
              disabled={isSyncDisabled}
            >
              {isSyncing ? 'syncing...' : 'sync'}
            </button>
          </div>
        </header>
        <main className="dashboard-content">{content}</main>
      </div>
    </div>
  );
};
