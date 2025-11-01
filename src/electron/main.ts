import { app, BrowserWindow } from 'electron'
import path from 'path'
import { API_CONFIG } from './core/config/api.config'
import { DATABASE_CONFIG } from './core/config/database.config'
import { DatabaseManager } from './database/core/connection.manager'
import { MigrationManager } from './database/core/migration.manager'
import { AuthIpcHandler } from './ipc/handlers/auth.handler'
import { ProductIpcHandler } from './ipc/handlers/product.handler'
import { SearchIpcHandler } from './ipc/handlers/search.handler'
import { StockIpcHandler } from './ipc/handlers/stock.handler'
import { SyncIpcHandler } from './ipc/handlers/sync.handler'
import { getPreloadPath, getUIPath } from './pathResolver'
import { isDev } from './util'

let mainWindow: BrowserWindow | null = null
let db: any = null

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
  if (db) {
    try {
      db.close()
      console.log('Database closed')
    } catch (error) {
      console.error('Error closing database:', error)
    }
  }
})
