import { app, BrowserWindow, ipcMain, session, protocol, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { dbService } from './db';
import { createLensServer } from './server';
import { getLocalIp } from './ip';
import { NewCoin, NewCoinImage } from '../common/types';
import { ExportOptionsSchema, PdfExportOptionsSchema, VocabGetSchema, VocabAddSchema, VocabSearchSchema, VocabIncrementSchema, VocabResetSchema, PreferenceGetSchema, PreferenceSetSchema, SetVisibilitySchema, LOCKED_VISIBILITY_KEYS, ZipExecuteSchema } from '../common/validation';
import { exportToZip } from './export/zip';
import { exportToPdf } from './export/pdf';
import { previewZip, processZipImport } from './import/zip';
import { logger } from './logger';
import { timedHandler } from './ipc-utils';
import { z } from 'zod';

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

// Two-phase import: stagedZipPath is set by import:zipPreview and consumed by import:zipExecute.
// Cleared in a finally block after execute, or by import:cancel.
let stagedZipPath: string | null = null;

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
    win.loadFile(path.join(__dirname, '../../renderer/index.html'));
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
        logger.warn({ origin: parsedUrl.origin }, 'security:navBlocked');
        event.preventDefault();
      }
    } else if (parsedUrl.protocol !== 'file:') {
      logger.warn({ protocol: parsedUrl.protocol }, 'security:navBlocked');
      event.preventDefault();
    }
  });

  // Window opening control: Block all unauthorized window creation
  contents.setWindowOpenHandler(({ url }) => {
    const origin = (() => { try { return new URL(url).origin; } catch { return url; } })();
    logger.warn({ origin }, 'security:windowBlocked');
    return { action: 'deny' };
  });
});

function validateIpc<T>(schema: z.ZodSchema<T>, data: unknown, channel?: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues.map(i => i.message).join(', ');
    logger.warn({ channel, errors: msg }, 'ipc:invalid');
    throw new Error(`Validation failed: ${msg}`);
  }
  return result.data;
}

process.on('uncaughtException', (error) => {
  logger.error({ message: error.message, stack: error.stack }, 'app:uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ message: String(reason) }, 'app:unhandledRejection');
});

app.whenReady().then(() => {
  logger.info({ version: app.getVersion(), platform: process.platform, isDev: !app.isPackaged }, 'app:ready');
  dbService.seedVocabularies();
  dbService.seedFieldVisibility();

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
  ipcMain.handle('db:getCoins', () => timedHandler(logger, 'db:getCoins', () => dbService.getCoins()));
  ipcMain.handle('db:getCoinById', (_, id: number) => timedHandler(logger, 'db:getCoinById', () => dbService.getCoinById(id)));
  ipcMain.handle('db:addCoin', (_, coin: NewCoin) => timedHandler(logger, 'db:addCoin', () => dbService.addCoin(coin)));
  ipcMain.handle('db:updateCoin', (_, id: number, coin: Partial<NewCoin>) => timedHandler(logger, 'db:updateCoin', () => dbService.updateCoin(id, coin)));
  ipcMain.handle('db:deleteCoin', (_, id: number) => timedHandler(logger, 'db:deleteCoin', () => dbService.deleteCoin(id)));
  ipcMain.handle('db:addImage', (_, image: NewCoinImage) => timedHandler(logger, 'db:addImage', () => dbService.addImage(image)));
  ipcMain.handle('db:getImagesByCoinId', (_, coinId: number) => timedHandler(logger, 'db:getImagesByCoinId', () => dbService.getImagesByCoinId(coinId)));
  ipcMain.handle('db:deleteImage', (_, id: number) => timedHandler(logger, 'db:deleteImage', () => dbService.deleteImage(id)));

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
      logger.error({ message: (error as Error).message }, 'lens:startFailed');
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
  ipcMain.handle('export:toZip', (_, options: unknown) =>
    timedHandler(logger, 'export:toZip', async () => {
      const validated = validateExportOptions(options);
      const result = await dialog.showSaveDialog({
        title: 'Export Archive',
        defaultPath: `patina-export-${Date.now()}.zip`,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      });
      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled' };
      }
      return exportToZip(result.filePath, validated.includeImages, validated.includeCsv, validated.coinIds);
    })
  );

  ipcMain.handle('export:toPdf', (_, data: unknown) =>
    timedHandler(logger, 'export:toPdf', async () => {
      const { locale, coinIds } = validateIpc(PdfExportOptionsSchema, data, 'export:toPdf');
      const result = await dialog.showSaveDialog({
        title: 'Export PDF Catalog',
        defaultPath: `patina-catalog-${Date.now()}.pdf`,
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
      });
      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled' };
      }
      return exportToPdf(result.filePath, locale, coinIds);
    })
  );

  // Vocabulary IPC Handlers
  ipcMain.handle('vocab:get', (_, data: unknown) =>
    timedHandler(logger, 'vocab:get', () => {
      const { field, locale } = validateIpc(VocabGetSchema, data, 'vocab:get');
      return dbService.getVocabularies(field, locale);
    })
  );

  ipcMain.handle('vocab:add', (_, data: unknown) =>
    timedHandler(logger, 'vocab:add', () => {
      const { field, value, locale } = validateIpc(VocabAddSchema, data, 'vocab:add');
      dbService.addVocabulary(field, value, locale);
    })
  );

  ipcMain.handle('vocab:search', (_, data: unknown) =>
    timedHandler(logger, 'vocab:search', () => {
      const { field, query, locale } = validateIpc(VocabSearchSchema, data, 'vocab:search');
      return dbService.searchVocabularies(field, query, locale);
    })
  );

  ipcMain.handle('pref:get', (_, data: unknown) =>
    timedHandler(logger, 'pref:get', () => {
      const { key } = validateIpc(PreferenceGetSchema, data, 'pref:get');
      return dbService.getPreference(key);
    })
  );

  ipcMain.handle('pref:set', (_, data: unknown) =>
    timedHandler(logger, 'pref:set', () => {
      const { key, value } = validateIpc(PreferenceSetSchema, data, 'pref:set');
      dbService.setPreference(key, value);
    })
  );

  ipcMain.handle('vocab:increment', (_, data: unknown) =>
    timedHandler(logger, 'vocab:increment', () => {
      const { field, value } = validateIpc(VocabIncrementSchema, data, 'vocab:increment');
      dbService.incrementVocabularyUsage(field, value);
    })
  );

  ipcMain.handle('vocab:reset', (_, data: unknown) =>
    timedHandler(logger, 'vocab:reset', () => {
      const { field } = validateIpc(VocabResetSchema, data, 'vocab:reset');
      dbService.resetVocabularies(field);
    })
  );

  // Field Visibility IPC Handlers
  ipcMain.handle('prefs:getVisibility', () =>
    timedHandler(logger, 'prefs:getVisibility', () => dbService.getFieldVisibility())
  );

  ipcMain.handle('prefs:setVisibility', (_event, raw: unknown) =>
    timedHandler(logger, 'prefs:setVisibility', () => {
      const { key, visible } = validateIpc(SetVisibilitySchema, raw, 'prefs:setVisibility');
      if (LOCKED_VISIBILITY_KEYS.has(key)) return;
      dbService.setFieldVisibility(key, visible);
    })
  );

  ipcMain.handle('prefs:resetVisibility', () =>
    timedHandler(logger, 'prefs:resetVisibility', () => dbService.resetFieldVisibility())
  );

  // Image Import IPC Handler
  ipcMain.handle('image:importFromFile', () =>
    timedHandler(logger, 'image:importFromFile', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Image',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
      });

      if (canceled || filePaths.length === 0) return null;

      const sourcePath = filePaths[0];
      const ext = path.extname(sourcePath).toLowerCase();
      const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

      if (!ALLOWED_EXTS.has(ext)) {
        throw new Error('Unsupported file type. Only JPEG, PNG, and WebP are accepted.');
      }

      const imagesDir = isDev
        ? path.join(process.cwd(), 'data', 'images', 'coins')
        : path.join(app.getPath('userData'), 'images', 'coins');

      await fs.promises.mkdir(imagesDir, { recursive: true });

      const uniqueName = `import-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const destPath = path.join(imagesDir, uniqueName);

      await fs.promises.copyFile(path.resolve(sourcePath), destPath);

      return path.join('coins', uniqueName);
    })
  );

  // Coin Import IPC Handlers (two-phase: preview → execute)
  ipcMain.handle('import:zipPreview', () =>
    timedHandler(logger, 'import:zipPreview', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Patina Archive',
        properties: ['openFile'],
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      });
      if (canceled || !filePaths[0]) return { cancelled: true };
      stagedZipPath = filePaths[0];
      return previewZip(stagedZipPath);
    })
  );

  ipcMain.handle('import:zipExecute', (_, data: unknown) =>
    timedHandler(logger, 'import:zipExecute', async () => {
      const options = validateIpc(ZipExecuteSchema, data, 'import:zipExecute');
      try {
        if (!stagedZipPath) throw new Error('No staged ZIP path');
        return await processZipImport(stagedZipPath, options, imageRoot);
      } finally {
        stagedZipPath = null;
      }
    })
  );

  ipcMain.handle('import:cancel', () => {
    stagedZipPath = null;
  });

  // Renderer ErrorBoundary relay
  const rendererLogSchema = z.object({
    message: z.string().max(500),
    stack: z.string().max(1000).optional(),
  }).strict();

  ipcMain.handle('log:error', (_, data: unknown) => {
    const { message, stack } = validateIpc(rendererLogSchema, data, 'log:error');
    logger.error({ message, stack }, 'renderer:error');
  });

  ipcMain.handle('ping', () => 'pong');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => logger.info('app:quit'));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
