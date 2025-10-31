import { app, BrowserWindow, dialog } from 'electron';
import { apiService, LoginRequest } from './api/apiService.js';
import { dbManager } from './database/manager.js';
import { dbOperations } from './database/operations.js';
import { getPreloadPath, getUIPath } from './pathResolver.js';
import { ipcMainHandle, isDev } from './util.js';

setupGlobalErrorHandlers();

app.on('ready', () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: getPreloadPath(),
    },
    // disable window control buttons
    frame: true,
    titleBarStyle: 'default',
    minimizable: false,
    maximizable: false,
    closable: false,
  });
  if (isDev()) {
    mainWindow.loadURL('http://localhost:5123');
  } else {
    mainWindow.loadFile(getUIPath());
  }

  // initialize database
  dbManager.init().catch(console.error);

  // authentication handlers
  ipcMainHandle('login', async (credentials: LoginRequest) => {
    try {
      const response = await apiService.login(credentials);
      if (response.token) {
        const userName = `${response.user.firstName} ${response.user.lastName}`;
        await dbOperations.saveAuthToken(response.token, response.user.id, userName);
      }
      return response;
    } catch (error) {
      throw error;
    }
  });

  ipcMainHandle('logout', async () => {
    try {
      await apiService.logout();
      await dbOperations.clearAuthToken();
    } catch (error) {
      throw error;
    }
  });

  ipcMainHandle('getAuthToken', async () => {
    const auth = await dbOperations.getAuthToken();
    if (auth?.token) {
      apiService.setToken(auth.token);
    }
    return auth;
  });

  // product handlers
  ipcMainHandle('syncProducts', async () => {
    try {
      console.log('starting product sync...');
      const products = await apiService.getProducts();
      console.log('received products from api:', products?.length || 0);
      
      if (!Array.isArray(products)) {
        console.error('api did not return an array:', products);
        throw new Error('invalid products data from api');
      }
      
      await dbOperations.saveProducts(products);
      const localProducts = await dbOperations.getAllProducts();
      console.log('products saved to database successfully');
      return localProducts;
    } catch (error) {
      console.error('sync products error:', error);
      throw error;
    }
  });

  ipcMainHandle('getAllProducts', async () => {
    return await dbOperations.getAllProducts();
  });

  ipcMainHandle('searchProducts', async (searchTerm: string) => {
    return await dbOperations.searchProducts(searchTerm);
  });

  ipcMainHandle('getProductsByCompany', async (companyId: number) => {
    return await dbOperations.getProductsByCompany(companyId);
  });

  ipcMainHandle('getProductsByType', async (type: string) => {
    return await dbOperations.getProductsByType(type);
  });

  ipcMainHandle('getProductsByCategory', async (categoryId: number) => {
    return await dbOperations.getProductsByCategory(categoryId);
  });

  ipcMainHandle('getUniqueCompanies', async () => {
    return await dbOperations.getUniqueCompanies();
  });

  ipcMainHandle('getUniqueTypes', async () => {
    return await dbOperations.getUniqueTypes();
  });

  ipcMainHandle('getUniqueCategories', async () => {
    return await dbOperations.getUniqueCategories();
  });

  ipcMainHandle('updateProductStock', async (productId: number, newStock: number) => {
    return await dbOperations.updateProductStock(productId, newStock);
  });

  ipcMainHandle(
    'updateProductPrices',
    async (
      productId: number,
      payload: { discount_price: number; peak_hour_price: number }
    ) => {
      await apiService.updateProductPrices({
        product_id: productId,
        discount_price: payload.discount_price,
        peak_hour_price: payload.peak_hour_price,
      });

      return await dbOperations.updateProductPrices(
        productId,
        payload.discount_price,
        payload.peak_hour_price
      );
    }
  );

  // removed frame action handlers - no close/maximize/minimize functionality
  // removed tray and menu - not needed for pharmacy pos

  handleCloseEvents(mainWindow);
});

function handleCloseEvents(mainWindow: BrowserWindow) {
  let willClose = false;

  mainWindow.on('close', (e) => {
    if (willClose) {
      return;
    }
    e.preventDefault();
    mainWindow.hide();
    if (app.dock) {
      app.dock.hide();
    }
  });

  app.on('before-quit', () => {
    willClose = true;
  });

  mainWindow.on('show', () => {
    willClose = false;
  });
}

function setupGlobalErrorHandlers() {
  let showingDialog = false;

  const logError = (label: string, payload: unknown) => {
    console.error(`[global-error] ${label}:`, payload);
  };

  const showDialog = (message: string) => {
    if (showingDialog) {
      return;
    }
    showingDialog = true;
    const detail = message || 'no details available';
    if (app.isReady()) {
      dialog.showErrorBox('unexpected application error', detail);
    }
    showingDialog = false;
  };

  process.on('uncaughtException', (error: Error) => {
    logError('uncaught exception', error);
    showDialog(error?.message ?? 'uncaught exception');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logError('unhandled rejection', reason);
    const message = reason instanceof Error ? reason.message : String(reason);
    showDialog(message);
  });

  app.on('render-process-gone', (_event, details: any) => {
    logError('render process gone', details);
    showDialog(`renderer process terminated (${details?.reason ?? 'unknown'})`);
  });

  app.on('child-process-gone', (_event, details: any) => {
    logError('child process gone', details);
    showDialog(`supporting process terminated (${details?.reason ?? 'unknown'})`);
  });
}
