import { contextBridge, ipcRenderer } from 'electron';
import { NewCoin, NewCoinImage } from '../common/types';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  
  // Database API
  getCoins: () => ipcRenderer.invoke('db:getCoins'),
  getCoinById: (id: number) => ipcRenderer.invoke('db:getCoinById', id),
  addCoin: (coin: NewCoin) => ipcRenderer.invoke('db:addCoin', coin),
  updateCoin: (id: number, coin: Partial<NewCoin>) => ipcRenderer.invoke('db:updateCoin', id, coin),
  deleteCoin: (id: number) => ipcRenderer.invoke('db:deleteCoin', id),
  addImage: (image: NewCoinImage) => ipcRenderer.invoke('db:addImage', image),
  getImagesByCoinId: (coinId: number) => ipcRenderer.invoke('db:getImagesByCoinId', coinId),
  deleteImage: (id: number) => ipcRenderer.invoke('db:deleteImage', id),

  // Lens API
  startLens: () => ipcRenderer.invoke('lens:start'),
  stopLens: () => ipcRenderer.invoke('lens:stop'),
  onLensImageReceived: (callback: (filePath: string) => void) => ipcRenderer.on('lens:image-received', (_, filePath) => callback(filePath)),
  removeLensListeners: () => ipcRenderer.removeAllListeners('lens:image-received'),

  // Export API
  exportToZip: (options: { includeImages?: boolean; includeCsv?: boolean }) => ipcRenderer.invoke('export:toZip', options),
  exportToPdf: () => ipcRenderer.invoke('export:toPdf'),
});
