import { app, BrowserWindow, ipcMain } from 'electron';
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
    },
    title: 'Patina - Historical Coin Archive',
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
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
