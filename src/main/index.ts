import { app, BrowserWindow, ipcMain, session, protocol, net } from 'electron';
import path from 'path';
import { dbService } from './db';
import { createLensServer } from './server';
import { getLocalIp } from './ip';
import { NewCoin, NewCoinImage } from '../common/types';

// Register custom protocol as privileged
protocol.registerSchemesAsPrivileged([
  { scheme: 'patina-img', privileges: { secure: true, supportFetchAPI: true, standard: true, bypassCSP: true } }
]);

let lensServer: ReturnType<typeof createLensServer> | null = null;

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
  // Define image root path
  const isDev = !app.isPackaged;
  const imageRoot = isDev 
    ? path.join(process.cwd(), 'data', 'images')
    : path.join(app.getPath('userData'), 'images');

  // Handle patina-img:// protocol
  protocol.handle('patina-img', (request) => {
    const url = request.url.replace('patina-img://', '');
    // Decode URI component to handle spaces and special chars
    const decodedUrl = decodeURIComponent(url);
    
    // Path sanitization: Prevent directory traversal
    const normalizedPath = path.normalize(decodedUrl).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(imageRoot, normalizedPath);

    // Ensure the resolved path is still within the image root (extra safety)
    if (!fullPath.startsWith(imageRoot)) {
      return new Response('Access Denied', { status: 403 });
    }

    return net.fetch(`file://${fullPath}`);
  });

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

  // Lens Server IPC Handlers
  ipcMain.handle('lens:start', async () => {
    if (lensServer) {
      lensServer.stop();
    }

    lensServer = createLensServer({
      onUpload: (filePath) => {
        // Notify all windows (usually just one)
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('lens:image-received', filePath);
        });
      }
    });

    try {
      const { port, token } = await lensServer.start();
      const ip = getLocalIp();
      const url = `http://${ip}:${port}/lens/${token}`;
      return { url, status: 'active' };
    } catch (error) {
      console.error('Failed to start Lens server:', error);
      throw error;
    }
  });

  ipcMain.handle('lens:stop', () => {
    if (lensServer) {
      lensServer.stop();
      lensServer = null;
    }
    return { status: 'stopped' };
  });

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
