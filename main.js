const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const printerSdk = require('./printer-sdk');
const epsonSdk = require('./epson-sdk');

// Hardware acceleration enabled for better performance (User requested)
// app.disableHardwareAcceleration();

let serverProcess;
let splashWindow;

function createSplashScreen() {
  const { BrowserWindow } = require('electron');
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
    }
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          background: #1e1e2e;
          color: #cdd6f4;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #313244;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #f5c2e7;
          letter-spacing: 1px;
        }
        .subtitle {
          font-size: 14px;
          color: #a6adc8;
          margin-bottom: 24px;
        }
        .spinner {
          border: 4px solid #313244;
          border-top: 4px solid #f5c2e7;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="title">Stock Pilot</div>
      <div class="subtitle">Starting background services...</div>
      <div class="spinner"></div>
    </body>
    </html>
  `;

  splashWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(splashHtml));
}

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
  
  createSplashScreen();
  
  // Database setup removed as per user request to use working DB
  
  const http = require('http');
  const fs = require('fs');
  const logPath = path.join(app.getPath('userData'), 'server.log');
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

    // Wait for the server to actually respond before showing the window
    logStream.write('Waiting for server to become responsive...\n');
    let attempts = 0;
    let ready = false;
    while (attempts < 30) {
      ready = await checkServerRunning();
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (ready) {
      logStream.write('Server is ready. Creating window.\n');
      createWindow();
      if (splashWindow) splashWindow.close();
    } else {
      logStream.write('Server failed to respond within timeout.\n');
      if (splashWindow) splashWindow.close();
      dialog.showErrorBox('Server Error', 'Next.js server failed to respond within 30 seconds. Please check server.log.');
    }
  } catch (serverErr) {
    dialog.showErrorBox('Server Error', 'Exception while checking/starting server: ' + serverErr.message);
  }
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
