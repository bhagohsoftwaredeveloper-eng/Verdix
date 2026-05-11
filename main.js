const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const printerSdk = require('./printer-sdk');
const epsonSdk = require('./epson-sdk');

// Disable hardware acceleration to prevent lag on some systems
app.disableHardwareAcceleration();

let serverProcess;

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

  const startUrl = `http://localhost:3000${startRoute}`; 
  win.loadURL(startUrl);

  // Retry loading if it fails (e.g. server not ready yet)
  win.webContents.on('did-fail-load', () => {
    console.log('Failed to load, retrying in 2 seconds...');
    setTimeout(() => {
      win.loadURL(startUrl);
    }, 2000);
  });

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

  // win.webContents.openDevTools(); // Force open for debugging

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

app.whenReady().then(async () => {
  const { dialog } = require('electron');
  
  // Database setup removed as per user request to use working DB
  
  const http = require('http');
  const fs = require('fs');
  const logPath = app.isPackaged 
    ? path.join(app.getPath('userData'), 'server.log')
    : path.join(__dirname, 'server.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  
  logStream.write(`\n\n--- App started at ${new Date().toISOString()} ---\n`);

  function checkServerRunning() {
    return new Promise((resolve) => {
      const req = http.get('http://localhost:3000', (res) => {
        resolve(true);
      });
      req.on('error', () => {
        resolve(false);
      });
      req.end();
    });
  }

  try {
    const isRunning = await checkServerRunning();
    
    if (isRunning) {
      logStream.write('Server is already running on port 3000. Skipping spawn.\n');
      console.log('Server is already running on port 3000. Skipping spawn.');
    } else {
      logStream.write('Server not detected. Spawning Next.js server...\n');
      console.log('Server not detected. Spawning Next.js server...');
      
      const { spawn } = require('child_process');
      const dotenv = require('dotenv');
      const envPath = path.join(process.resourcesPath, '..', '.env');
      let envConfig = {};
      
      if (fs.existsSync(envPath)) {
        envConfig = dotenv.parse(fs.readFileSync(envPath));
        logStream.write(`Loaded .env from: ${envPath}\n`);
      } else {
        logStream.write(`.env file not found at: ${envPath}\n`);
      }
      
      serverProcess = spawn('node', ['server.js'], { 
        shell: true, 
        cwd: path.join(process.resourcesPath, '..'),
        env: { ...process.env, ...envConfig }
      });
      
      serverProcess.stdout.pipe(logStream);
      serverProcess.stderr.pipe(logStream);
      
      serverProcess.on('error', (err) => {
        dialog.showErrorBox('Server Error', 'Failed to start Next.js server. Please ensure Node.js/NPM is installed.\n\nError: ' + err.message);
      });
    }
  } catch (serverErr) {
    dialog.showErrorBox('Server Error', 'Exception while checking/starting server: ' + serverErr.message);
  }
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Server persists after quit as per user request

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
