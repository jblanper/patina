import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // We'll expose DB operations and Lens bridge events here
  ping: () => ipcRenderer.invoke('ping'),
});
