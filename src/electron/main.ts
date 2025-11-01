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
  new StockIpcHandler()
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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: true,
    frame: true,
  })

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5123')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(getUIPath(), 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', async () => {
  try {
    setupGlobalErrorHandlers()
    await initializeDatabase()
    initializeIpcHandlers()
    initializeSocketService()
    createMainWindow()
    console.log('App ready')
  } catch (error) {
    console.error('Failed to start:', error)
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
