import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/index.css'

// Check if electron API is available
if (!window.electron) {
  console.error('❌ CRITICAL: window.electron is not available!')
  console.error('This means the preload script did not load properly.')
  console.error('Check the following:')
  console.error('1. Is preload.cjs in the correct location?')
  console.error('2. Check Electron DevTools console for preload errors')
  console.error('3. Verify contextIsolation and preload path settings')
} else {
  console.log('✅ window.electron is available')
  console.log('Available methods:', Object.keys(window.electron))
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
