import { contextBridge, ipcRenderer } from 'electron';
import { NewCoin, NewCoinImage } from '../common/types';
import type { VocabField } from '../common/validation';

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
  exportToPdf: (locale: 'en' | 'es') => ipcRenderer.invoke('export:toPdf', { locale }),

  // Vocabulary API
  getVocab: (field: VocabField, locale?: 'en' | 'es'): Promise<string[]> =>
    ipcRenderer.invoke('vocab:get', { field, locale }),

  addVocabEntry: (field: VocabField, value: string): Promise<void> =>
    ipcRenderer.invoke('vocab:add', { field, value }),

  searchVocab: (field: VocabField, query: string, locale?: 'en' | 'es'): Promise<string[]> =>
    ipcRenderer.invoke('vocab:search', { field, query, locale }),

  incrementVocabUsage: (field: VocabField, value: string): Promise<void> =>
    ipcRenderer.invoke('vocab:increment', { field, value }),

  resetVocab: (field?: VocabField): Promise<void> =>
    ipcRenderer.invoke('vocab:reset', { field }),

  // Preference API
  getPreference: (key: 'language'): Promise<string | null> =>
    ipcRenderer.invoke('pref:get', { key }),

  setPreference: (key: 'language', value: 'en' | 'es'): Promise<void> =>
    ipcRenderer.invoke('pref:set', { key, value }),

  // Field Visibility API
  prefsGetVisibility: () =>
    ipcRenderer.invoke('prefs:getVisibility'),

  prefsSetVisibility: (key: string, visible: boolean): Promise<void> =>
    ipcRenderer.invoke('prefs:setVisibility', { key, visible }),

  prefsResetVisibility: () =>
    ipcRenderer.invoke('prefs:resetVisibility'),
});
