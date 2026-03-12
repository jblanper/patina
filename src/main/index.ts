import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { dbService } from './db';
import { NewCoin, NewCoinImage } from '../common/types';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'Patina - Historical Coin Archive',
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.on('web-contents-created', (_, contents) => {
  // Navigation control: Prevent unauthorized top-level navigation
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    
    if (devServerUrl) {
      const devOrigin = new URL(devServerUrl).origin;
      if (parsedUrl.origin !== devOrigin && parsedUrl.protocol !== 'file:') {
        console.warn(`Blocked unauthorized navigation to: ${navigationUrl}`);
        event.preventDefault();
      }
    } else if (parsedUrl.protocol !== 'file:') {
      console.warn(`Blocked unauthorized navigation to: ${navigationUrl}`);
      event.preventDefault();
    }
  });

  // Window opening control: Block all unauthorized window creation
  contents.setWindowOpenHandler(({ url }) => {
    console.warn(`Blocked unauthorized window opening to: ${url}`);
    return { action: 'deny' };
  });
});

app.whenReady().then(() => {
  // Set permission request handler to deny all by default
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    return callback(false);
  });
  // Database IPC Handlers
  ipcMain.handle('db:getCoins', () => dbService.getCoins());
  ipcMain.handle('db:getCoinById', (_, id: number) => dbService.getCoinById(id));
  ipcMain.handle('db:addCoin', (_, coin: NewCoin) => dbService.addCoin(coin));
  ipcMain.handle('db:updateCoin', (_, id: number, coin: Partial<NewCoin>) => dbService.updateCoin(id, coin));
  ipcMain.handle('db:deleteCoin', (_, id: number) => dbService.deleteCoin(id));
  ipcMain.handle('db:addImage', (_, image: NewCoinImage) => dbService.addImage(image));
  ipcMain.handle('db:getImagesByCoinId', (_, coinId: number) => dbService.getImagesByCoinId(coinId));
  ipcMain.handle('db:deleteImage', (_, id: number) => dbService.deleteImage(id));

  ipcMain.handle('ping', () => 'pong');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
