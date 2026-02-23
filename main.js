const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: "Stock Pilot - POS Terminal",
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // Load the POS specific route
  const startUrl = isDev 
    ? 'http://localhost:3001/pos' 
    : `file://${path.join(__dirname, '../build/index.html')}`; 

  win.loadURL(startUrl);

  // PREVENT navigating away from the POS in Electron
  // If a link goes to a different page (like /dashboard), open it in the default browser instead
  win.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    // Allow navigation within /pos or /api, but intercept others
    if (!parsedUrl.pathname.startsWith('/pos') && !parsedUrl.pathname.startsWith('/api')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Also handle links that try to open new windows
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
    app.quit();
  });
}

app.whenReady().then(createWindow);

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
