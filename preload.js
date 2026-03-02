const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  connectPrinter: (portSetting) => ipcRenderer.invoke('printer:connect', portSetting),
  printData: (buffer) => ipcRenderer.invoke('printer:print', buffer),
  disconnectPrinter: () => ipcRenderer.invoke('printer:disconnect')
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Stock Pilot Electron Preload Loaded');
});
