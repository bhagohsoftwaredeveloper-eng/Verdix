const koffi = require('koffi');

let _winspool = null;
let printerHandle = null;

// Windows API Types
const HANDLE = koffi.pointer('void');
const LPTSTR = 'str';
const DWORD = 'uint32';
const LPDWORD = koffi.pointer('uint32');
const LPBYTE = koffi.pointer('uint8');

// DOC_INFO_1 Structure definition
const DOC_INFO_1 = koffi.struct('DOC_INFO_1', {
  pDocName: 'str',
  pOutputFile: 'str',
  pDatatype: 'str'
});

let _OpenPrinter;
let _ClosePrinter;
let _StartDocPrinter;
let _EndDocPrinter;
let _StartPagePrinter;
let _EndPagePrinter;
let _WritePrinter;

function initSdk() {
  if (_winspool) return true;

  try {
    _winspool = koffi.load('winspool.drv');

    _OpenPrinter = _winspool.func('OpenPrinterA', 'int', [LPTSTR, koffi.out(koffi.pointer('void*')), 'void*']);
    _ClosePrinter = _winspool.func('ClosePrinter', 'int', [HANDLE]);
    _StartDocPrinter = _winspool.func('StartDocPrinterA', DWORD, [HANDLE, DWORD, koffi.pointer('DOC_INFO_1')]);
    _EndDocPrinter = _winspool.func('EndDocPrinter', 'int', [HANDLE]);
    _StartPagePrinter = _winspool.func('StartPagePrinter', 'int', [HANDLE]);
    _EndPagePrinter = _winspool.func('EndPagePrinter', 'int', [HANDLE]);
    _WritePrinter = _winspool.func('WritePrinter', 'int', [HANDLE, LPBYTE, DWORD, koffi.out(koffi.pointer('uint32'))]);

    return true;
  } catch (err) {
    console.error("[winspool] Failed to load winspool.drv DLL:", err);
    return false;
  }
}

async function connectPrinter(printerName = "XP-58-P") {
  console.log("[winspool] CONNECT TENDERED TO:", printerName);
  if (!initSdk()) return false;

  try {
    if (printerHandle) {
      _ClosePrinter(printerHandle);
      printerHandle = null;
    }

    // koffi.out array to receive the HANDLE pointer
    let handlePtr = [null];
    
    // Using OpenPrinterA - we pass null for printer defaults mapping
    const res = _OpenPrinter(printerName, handlePtr, null);
    
    if (res === 0 || !handlePtr[0]) {
        console.error(`[winspool] OpenPrinter Failed for ${printerName}. Check if name is exact.`);
        return false;
    }

    printerHandle = handlePtr[0];
    console.log("[winspool] Printer connected successfully to:", printerName);
    return true;
  } catch (err) {
    console.error("[winspool] Exception during connectPrinter:", err);
    return false;
  }
}

function disconnectPrinter() {
  console.log("[winspool] disconnectPrinter called");
  return new Promise((resolve) => {
    if (!printerHandle) return resolve();
    try {
      _ClosePrinter(printerHandle);
      printerHandle = null;
    } catch(err) {
      console.error("[winspool] Exception during disconnect Printer:", err);
    }
    resolve();
  });
}

function printData(bufferData) {
  if (!printerHandle) {
    console.error("[winspool] Cannot print: No printer connected");
    return false;
  }

  try {
    // Decode incoming base64 string from IPC bridge
    const buffer = Buffer.from(bufferData, 'base64');
    const length = buffer.length;

    console.log(`[winspool] Starting Document spool API for ${length} bytes...`);

    // Define RAW document to bypass Windows GDI graphics processing
    const docInfo = {
      pDocName: "StockPilot POS Receipt",
      pOutputFile: null,
      pDatatype: "RAW"
    };

    const docId = _StartDocPrinter(printerHandle, 1, docInfo);
    if (docId === 0) {
       console.error("[winspool] StartDocPrinter failed.");
       return false;
    }

    _StartPagePrinter(printerHandle);

    let bytesWrittenArr = [0];
    const writeRes = _WritePrinter(printerHandle, buffer, length, bytesWrittenArr);
    
    _EndPagePrinter(printerHandle);
    _EndDocPrinter(printerHandle);

    if (writeRes === 0 || bytesWrittenArr[0] !== length) {
        console.error(`[winspool] WritePrinter Failed. Wrote ${bytesWrittenArr[0]} of ${length} bytes.`);
        return false;
    }

    console.log("[winspool] Successfully flushed raw data to Windows Spooler queue.");
    return true;
  } catch(err) {
    console.error("[winspool] Exception during printData:", err);
    return false;
  }
}

module.exports = {
  connectPrinter,
  disconnectPrinter,
  printData
};
