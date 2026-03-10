const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const printerSdk = require('./printer-sdk');

function createWindow() {
  const isDev = !app.isPackaged;
  
  // Parse command line arguments
  // Arguments usually look like: [path-to-electron, current-dir, --route=/dashboard, --role=Admin]
  const args = process.argv;
  let startRoute = '/pos';
  let roleName = 'POS Terminal';

  args.forEach(arg => {
    if (arg.startsWith('--route=')) {
      startRoute = arg.split('=')[1];
    }
    if (arg.startsWith('--role=')) {
      roleName = arg.split('=')[1];
    }
  });

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: `Stock Pilot - ${roleName}`,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // Load the specific route
  const startUrl = `http://localhost:3000${startRoute}`; 

  win.loadURL(startUrl);

  // PREVENT navigating away from the app
  win.webContents.on('will-navigate', (event, url) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname !== 'localhost') {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch (e) {
      // Ignored
    }
  });

  // Also handle links that try to open new windows
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname !== 'localhost') {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    } catch (e) {
      // Ignored
    }
    return { action: 'allow' };
  });

  if (isDev) {
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  createWindow();

  // Register Printer SDK IPC Handlers
  ipcMain.handle('printer:connect', async (event, portSetting) => {
    return await printerSdk.connectPrinter(portSetting);
  });

  ipcMain.handle('printer:print', async (event, buffer) => {
    return await printerSdk.printData(buffer);
  });

  ipcMain.handle('printer:disconnect', async (event) => {
    return await printerSdk.disconnectPrinter();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
