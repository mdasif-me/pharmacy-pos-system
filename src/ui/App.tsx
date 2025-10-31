import { useEffect, useRef, useState } from 'react';
import './App.css';
import { Login } from './components/Login';
import { Products } from './components/Products';

function App() {
  const [currentUser, setCurrentUser] = useState<AuthToken | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const hasAlertedRef = useRef(false);

  // check if user is already logged in
  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('window error captured:', event.error ?? event.message);
      if (!hasAlertedRef.current) {
        alert('an unexpected error occurred. please restart the application.');
        hasAlertedRef.current = true;
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('unhandled rejection captured:', event.reason);
      if (!hasAlertedRef.current) {
        alert('a background error occurred. please restart the application.');
        hasAlertedRef.current = true;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const tokenInfo = await window.electron.getAuthToken();
      if (tokenInfo) {
        setCurrentUser(tokenInfo);
      }
    } catch (error) {
      console.error('failed to check auth status:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLoginSuccess = (user: AuthToken) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>checking authentication...</p>
        </div>
      </div>
    );
  }

  // show login or products based on auth status
  return (
    <div className="App">
      {currentUser ? (
        <Products user={currentUser} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

// main pharmacy pos app component

export default App;
