import { app, BrowserWindow, ipcMain, session, protocol, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { dbService } from './db';
import { createLensServer } from './server';
import { getLocalIp } from './ip';
import { NewCoin, NewCoinImage } from '../common/types';
import { ExportOptionsSchema, PdfExportOptionsSchema, VocabGetSchema, VocabAddSchema, VocabSearchSchema, VocabIncrementSchema, VocabResetSchema, PreferenceGetSchema, PreferenceSetSchema } from '../common/validation';
import { exportToZip } from './export/zip';
import { exportToPdf } from './export/pdf';

function validateExportOptions(data: unknown) {
  const result = ExportOptionsSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.issues.map(issue => issue.message).join(', ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }
  return result.data;
}

// Register custom protocol as privileged
protocol.registerSchemesAsPrivileged([
  { scheme: 'patina-img', privileges: { secure: true, supportFetchAPI: true, standard: true } }
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

function validateIpc<T>(schema: import('zod').ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues.map(i => i.message).join(', ');
    throw new Error(`Validation failed: ${msg}`);
  }
  return result.data;
}

app.whenReady().then(() => {
  dbService.seedVocabularies();

  // Define image root path
  const isDev = !app.isPackaged;
  const imageRoot = isDev 
    ? path.join(process.cwd(), 'data', 'images')
    : path.join(app.getPath('userData'), 'images');

  // Handle patina-img:// protocol
  protocol.handle('patina-img', async (request) => {
    const url = request.url.replace('patina-img://', '');
    const decodedUrl = decodeURIComponent(url);
    const normalizedPath = path.normalize(decodedUrl).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(imageRoot, normalizedPath);

    if (!fullPath.startsWith(imageRoot)) {
      return new Response('Access Denied', { status: 403 });
    }

    try {
      const fileBuffer = await fs.promises.readFile(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp'
      };
      const mimeType = mimeMap[ext] || 'application/octet-stream';
      return new Response(fileBuffer, {
        headers: { 'Content-Type': mimeType }
      });
    } catch {
      return new Response('Image not found', { status: 404 });
    }
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

    const locale = (dbService.getPreference('language') ?? 'es') as 'en' | 'es';

    lensServer = createLensServer({
      locale,
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

  // Export IPC Handlers
  ipcMain.handle('export:toZip', async (_, options: unknown) => {
    const validated = validateExportOptions(options);
    const result = await dialog.showSaveDialog({
      title: 'Export Archive',
      defaultPath: `patina-export-${Date.now()}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
    });
    
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' };
    }
    
    return exportToZip(result.filePath, validated.includeImages, validated.includeCsv);
  });

  ipcMain.handle('export:toPdf', async (_, data: unknown) => {
    const { locale } = validateIpc(PdfExportOptionsSchema, data);
    const result = await dialog.showSaveDialog({
      title: 'Export PDF Catalog',
      defaultPath: `patina-catalog-${Date.now()}.pdf`,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    return exportToPdf(result.filePath, locale);
  });

  // Vocabulary IPC Handlers
  ipcMain.handle('vocab:get', (_, data: unknown) => {
    const { field, locale } = validateIpc(VocabGetSchema, data);
    return dbService.getVocabularies(field, locale);
  });

  ipcMain.handle('vocab:add', (_, data: unknown) => {
    const { field, value, locale } = validateIpc(VocabAddSchema, data);
    dbService.addVocabulary(field, value, locale);
  });

  ipcMain.handle('vocab:search', (_, data: unknown) => {
    const { field, query, locale } = validateIpc(VocabSearchSchema, data);
    return dbService.searchVocabularies(field, query, locale);
  });

  ipcMain.handle('pref:get', (_, data: unknown) => {
    const { key } = validateIpc(PreferenceGetSchema, data);
    return dbService.getPreference(key);
  });

  ipcMain.handle('pref:set', (_, data: unknown) => {
    const { key, value } = validateIpc(PreferenceSetSchema, data);
    dbService.setPreference(key, value);
  });

  ipcMain.handle('vocab:increment', (_, data: unknown) => {
    const { field, value } = validateIpc(VocabIncrementSchema, data);
    dbService.incrementVocabularyUsage(field, value);
  });

  ipcMain.handle('vocab:reset', (_, data: unknown) => {
    const { field } = validateIpc(VocabResetSchema, data);
    dbService.resetVocabularies(field);
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
