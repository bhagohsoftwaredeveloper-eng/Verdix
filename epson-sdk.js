const koffi = require('koffi');
const path = require('path');
const { execSync } = require('child_process');

let _sdk = null;
let printerHandle = null;

// DLL Path (Assuming x64 for Electron/Node environment)
const dllPath = path.join(__dirname, 'lib', 'sdk', 'x64', 'printer.sdk.dll');

// Windows API Types for Koffi
const HANDLE = koffi.pointer('void');
const LPTSTR = 'str';
const DWORD = 'uint32';
const LPDWORD = koffi.pointer('uint32');
const LPBYTE = koffi.pointer('uint8');

// Function prototypes from printersdk.h and printer.sdk.esc.h
let _InitPrinter;
let _ReleasePrinter;
let _OpenPort;
let _ClosePort;
let _WriteData;
let _ListPrinters;
let _CutPaper;
let _OpenCashDrawer;
let _GetPrinterState;

function initSdk() {
  if (_sdk) return true;

  try {
    console.log(`[epson-sdk] Loading DLL from: ${dllPath}`);
    _sdk = koffi.load(dllPath);

    // Common functions
    _InitPrinter = _sdk.func('InitPrinter', HANDLE, [LPTSTR]);
    _ReleasePrinter = _sdk.func('ReleasePrinter', 'int', [HANDLE]);
    _OpenPort = _sdk.func('OpenPort', 'int', [HANDLE, LPTSTR]);
    _ClosePort = _sdk.func('ClosePort', 'int', [HANDLE]);
    _WriteData = _sdk.func('WriteData', 'int', [HANDLE, LPBYTE, 'int']);
    _ListPrinters = _sdk.func('ListPrinters', 'int', [LPBYTE, 'uint32', LPDWORD]);

    // ESC/POS functions
    _CutPaper = _sdk.func('CutPaper', 'int', [HANDLE, 'int']);
    _OpenCashDrawer = _sdk.func('OpenCashDrawer', 'int', [HANDLE, 'int', 'int', 'int']);
    _GetPrinterState = _sdk.func('GetPrinterState', 'int', [HANDLE, LPDWORD]);

    return true;
  } catch (err) {
    console.error("[epson-sdk] Failed to load printer.sdk.dll:", err);
    return false;
  }
}

async function listPrinters() {
  if (!initSdk()) return [];

  try {
    let pcbNeeded = [0];
    
    // First call to get size
    _ListPrinters(null, 0, pcbNeeded);
    
    if (pcbNeeded[0] === 0) {
        // Fallback to PowerShell if SDK list is empty or fails
        console.log("[epson-sdk] SDK ListPrinters returned 0, using PowerShell fallback...");
        const cmd = 'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"';
        const output = execSync(cmd, { encoding: 'utf8' });
        return output.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
    }

    const buffer = Buffer.alloc(pcbNeeded[0]);
    const res = _ListPrinters(buffer, pcbNeeded[0], pcbNeeded);

    if (res < 0) {
        console.error(`[epson-sdk] ListPrinters failed with error code: ${res}`);
        return [];
    }

    // The SDK likely returns a list of printer names. 
    // printersdk.h defines PRINTERINFO struct, but ListPrinters takes a raw buffer.
    // Let's assume it's a null-separated or newline-separated string for now, or use PowerShell as it's more reliable for discovery.
    // For now, PowerShell is safer for discovery.
    const cmd = 'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"';
    const output = execSync(cmd, { encoding: 'utf8' });
    return output.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0);

  } catch (err) {
    console.error("[epson-sdk] Exception during listPrinters:", err);
    return [];
  }
}

async function connectPrinter(portSetting = "USB001") {
  console.log("[epson-sdk] CONNECT ATTEMPT TO:", portSetting);
  if (!initSdk()) return false;

  try {
    if (printerHandle) {
      _ClosePort(printerHandle);
      _ReleasePrinter(printerHandle);
      printerHandle = null;
    }

    // portSetting can be "USB001", "COM1,9600,N,8,1", or an IP address "192.168.1.100"
    // We assume the model name can be generic or based on portSetting
    printerHandle = _InitPrinter("POS-80"); // Generic model name
    
    if (!printerHandle) {
        console.error("[epson-sdk] InitPrinter failed.");
        return false;
    }

    const res = _OpenPort(printerHandle, portSetting);
    
    if (res !== 0) {
        console.error(`[epson-sdk] OpenPort Failed for ${portSetting}. Error code: ${res}`);
        _ReleasePrinter(printerHandle);
        printerHandle = null;
        return false;
    }

    console.log("[epson-sdk] Printer connected successfully to:", portSetting);
    return true;
  } catch (err) {
    console.error("[epson-sdk] Exception during connectPrinter:", err);
    return false;
  }
}

async function disconnectPrinter() {
  console.log("[epson-sdk] disconnectPrinter called");
  if (!printerHandle) return;
  
  try {
    _ClosePort(printerHandle);
    _ReleasePrinter(printerHandle);
    printerHandle = null;
  } catch(err) {
    console.error("[epson-sdk] Exception during disconnectPrinter:", err);
  }
}

function printData(bufferData) {
  if (!printerHandle) {
    console.error("[epson-sdk] Cannot print: No printer connected");
    return false;
  }

  try {
    // Decode incoming base64 string from IPC bridge
    const buffer = Buffer.from(bufferData, 'base64');
    const length = buffer.length;

    console.log(`[epson-sdk] Writing ${length} bytes...`);

    const res = _WriteData(printerHandle, buffer, length);
    
    if (res < 0) {
        console.error(`[epson-sdk] WriteData Failed. Error code: ${res}`);
        return false;
    }

    console.log("[epson-sdk] Successfully wrote data to printer.");
    return true;
  } catch(err) {
    console.error("[epson-sdk] Exception during printData:", err);
    return false;
  }
}

function cutPaper() {
    if (!printerHandle) return false;
    try {
        console.log("[epson-sdk] Cutting paper...");
        const res = _CutPaper(printerHandle, 0); // 0 for full cut, 1 for partial usually
        return res === 0;
    } catch (err) {
        console.error("[epson-sdk] Exception during cutPaper:", err);
        return false;
    }
}

function openCashDrawer() {
    if (!printerHandle) return false;
    try {
        console.log("[epson-sdk] Opening cash drawer...");
        // Parameters: handle, pinMode (0/1), onTime, offTime
        const res = _OpenCashDrawer(printerHandle, 0, 10, 10);
        return res === 0;
    } catch (err) {
        console.error("[epson-sdk] Exception during openCashDrawer:", err);
        return false;
    }
}

module.exports = {
  listPrinters,
  connectPrinter,
  disconnectPrinter,
  printData,
  cutPaper,
  openCashDrawer
};
