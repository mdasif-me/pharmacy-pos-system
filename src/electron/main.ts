import { app, BrowserWindow } from 'electron'
import path from 'path'
import { API_CONFIG } from './core/config/api.config'
import { DATABASE_CONFIG } from './core/config/database.config'
import { DatabaseManager } from './database/core/connection.manager'
import { MigrationManager } from './database/core/migration.manager'
import { ProductRepository } from './database/repositories/product.repository'
import { AuthIpcHandler } from './ipc/handlers/auth.handler'
import { ProductIpcHandler } from './ipc/handlers/product.handler'
import { SearchIpcHandler } from './ipc/handlers/search.handler'
import { SocketIpcHandler } from './ipc/handlers/socket.handler'
import { StockQueueIpcHandler } from './ipc/handlers/stock-queue.handler'
import { StockIpcHandler } from './ipc/handlers/stock.handler'
import { SyncIpcHandler } from './ipc/handlers/sync.handler'
import { getPreloadPath, getUIPath } from './pathResolver'
import { SocketService } from './services/socket.service'
import { isDev } from './util'

let mainWindow: BrowserWindow | null = null
let db: any = null
let socketService: SocketService | null = null

function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
  })
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason)
  })
}

async function initializeDatabase() {
  try {
    console.log('Initializing database...')
    const dbManager = DatabaseManager.getInstance(DATABASE_CONFIG.path)
    db = dbManager.getDatabase()
    const migrationManager = new MigrationManager(db)
    await migrationManager.runMigrations()
    console.log('Database initialized')
  } catch (error) {
    console.error('Database init failed:', error)
    throw error
  }
}

function initializeIpcHandlers() {
  if (!db) throw new Error('Database not initialized')
  console.log('Initializing IPC handlers...')
  new ProductIpcHandler(db)
  new AuthIpcHandler(API_CONFIG.baseURL)
  new SyncIpcHandler(db)
  new SearchIpcHandler(db)
  new StockIpcHandler(db)
  new StockQueueIpcHandler(db)
  console.log('IPC handlers initialized')
}

function initializeSocketService() {
  console.log('[Main] Initializing Socket.IO service...')

  try {
    if (!db) {
      throw new Error('Database not initialized before socket service')
    }

    console.log('[Main] Creating ProductRepository for socket service...')
    const productRepo = new ProductRepository(db)

    console.log('[Main] Creating SocketService instance...')
    socketService = new SocketService(productRepo)

    console.log('[Main] Registering Socket IPC handlers...')
    new SocketIpcHandler(socketService)

    console.log('[Main] Attempting to connect to socket server...')
    socketService.connect()

    console.log('[Main] Socket.IO service initialized and connected')
  } catch (error) {
    console.error('[Main] Error during socket service initialization:', error)

    // If socket service fails, still create a minimal one for IPC handler
    if (!socketService) {
      try {
        console.log('[Main] Creating fallback socket service for IPC handler...')
        const productRepo = new ProductRepository(db)
        socketService = new SocketService(productRepo)
        new SocketIpcHandler(socketService)
        console.log('[Main] Socket.IO IPC handler registered (connection failed)')
      } catch (fallbackError) {
        console.error('[Main] Failed to create fallback socket service:', fallbackError)
      }
    }
  }
}

function createMainWindow() {
  console.log('[Main] Creating main window...')

  const preloadPath = getPreloadPath()
  console.log('[Main] Preload path:', preloadPath)

  // Verify preload exists
  const fs = require('fs')
  if (!fs.existsSync(preloadPath)) {
    console.error('[Main] ⚠️ WARNING: Preload script not found at:', preloadPath)
  } else {
    console.log('[Main] ✓ Preload script exists')
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false, // Allow loading local files in production
    },
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#ffffff',
  })

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Window ready to show')
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Failed to load:', errorCode, errorDescription)
  })

  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Page finished loading successfully')
  })

  // Log console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer]', message)
  })

  if (isDev()) {
    console.log('[Main] Loading dev URL: http://localhost:5123')
    mainWindow.loadURL('http://localhost:5123')
    mainWindow.webContents.openDevTools()
  } else {
    const uiPath = getUIPath()
    const indexPath = path.join(uiPath, 'index.html')
    console.log('[Main] UI Path:', uiPath)
    console.log('[Main] Index Path:', indexPath)
    console.log('[Main] App Path:', app.getAppPath())

    // Check if file exists
    const fs = require('fs')
    if (fs.existsSync(indexPath)) {
      console.log('[Main] ✓ index.html exists')
    } else {
      console.error('[Main] ✗ index.html NOT FOUND!')
    }

    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[Main] Error loading file:', err)
    })

    // Open DevTools in production to debug
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    console.log('[Main] Window closed')
    mainWindow = null
  })

  console.log('[Main] Main window created')
}

app.on('ready', async () => {
  console.log('[Main] ========== APP STARTING ==========')
  console.log('[Main] Platform:', process.platform)
  console.log('[Main] Electron version:', process.versions.electron)
  console.log('[Main] Node version:', process.versions.node)
  console.log('[Main] App path:', app.getAppPath())
  console.log('[Main] User data path:', app.getPath('userData'))

  try {
    console.log('[Main] Setting up error handlers...')
    setupGlobalErrorHandlers()

    console.log('[Main] Initializing database...')
    await initializeDatabase()

    console.log('[Main] Initializing IPC handlers...')
    initializeIpcHandlers()

    console.log('[Main] Initializing socket service...')
    try {
      initializeSocketService()
    } catch (socketError) {
      console.error('[Main] Socket initialization failed, but continuing:', socketError)
      // Don't fail the entire app if socket fails
    }

    console.log('[Main] Creating main window...')
    createMainWindow()

    console.log('[Main] ========== APP READY ==========')
  } catch (error) {
    console.error('[Main] ========== FATAL ERROR ==========')
    console.error('[Main] Failed to start app:', error)
    console.error('[Main] Stack:', error instanceof Error ? error.stack : 'No stack trace')

    // Show error dialog before quitting
    const { dialog } = require('electron')
    dialog.showErrorBox(
      'Pharmacy POS - Startup Error',
      `Failed to start application:\n\n${
        error instanceof Error ? error.message : String(error)
      }\n\nPlease contact support.`
    )

    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createMainWindow()
})

app.on('before-quit', () => {
  // Disconnect socket service
  if (socketService) {
    socketService.disconnect()
    console.log('Socket.IO service disconnected')
  }

  // Close database
  if (db) {
    try {
      db.close()
      console.log('Database closed')
    } catch (error) {
      console.error('Error closing database:', error)
    }
  }
})
