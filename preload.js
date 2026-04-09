const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listPrinters: () => ipcRenderer.invoke('printer:list'),
  connectPrinter: (portSetting) => ipcRenderer.invoke('printer:connect', portSetting),
  printData: (buffer) => ipcRenderer.invoke('printer:print', buffer),
  disconnectPrinter: () => ipcRenderer.invoke('printer:disconnect'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close')
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Stockpilot Electron Preload Loaded');
});
