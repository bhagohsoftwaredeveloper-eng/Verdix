const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const printerSdk = require('./printer-sdk');
const epsonSdk = require('./epson-sdk');

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

  // Set App User Model ID for Windows Taskbar icon
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.stockpilot.pos');
  }

  const isAdmin = roleName === 'Admin Dashboard' || startRoute.includes('dashboard');

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Pass info to preload
      additionalArguments: [isAdmin ? '--is-admin=true' : '--is-admin=false']
    },
    title: `Stockpilot - ${roleName}`,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public', 'Stockpilot.png'),
    fullscreen: !isAdmin, // Only POS is true fullscreen
    frame: isAdmin,       // Admin has frame, POS is frameless
    resizable: true
  });

  if (isAdmin) {
    win.maximize();
  }

  win.setIcon(path.join(__dirname, 'public', 'Stockpilot.png'));

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

// Window Controls IPC Handlers
ipcMain.handle('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    } else if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.handle('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// Printer SDK IPC Handlers
ipcMain.handle('printer:list', async () => {
  return await printerSdk.listPrinters();
});

ipcMain.handle('printer:connect', async (event, portSetting) => {
  return await printerSdk.connectPrinter(portSetting);
});

ipcMain.handle('printer:print', async (event, buffer) => {
  return await printerSdk.printData(buffer);
});

ipcMain.handle('printer:disconnect', async (event) => {
  return await printerSdk.disconnectPrinter();
});

// Epson SDK IPC Handlers
ipcMain.handle('epson-printer:list', async () => {
  return await epsonSdk.listPrinters();
});

ipcMain.handle('epson-printer:connect', async (event, portSetting) => {
  return await epsonSdk.connectPrinter(portSetting);
});

ipcMain.handle('epson-printer:print', async (event, buffer) => {
  return await epsonSdk.printData(buffer);
});

ipcMain.handle('epson-printer:disconnect', async (event) => {
  return await epsonSdk.disconnectPrinter();
});

ipcMain.handle('epson-printer:cut', async () => {
  return epsonSdk.cutPaper();
});

ipcMain.handle('epson-printer:open-drawer', async () => {
  return epsonSdk.openCashDrawer();
});

app.whenReady().then(() => {
  createWindow();
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
