const path = require('path');

// Mock Electron `app` object so printer-sdk.js or epson-sdk.js doesn't crash in standard Node
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === 'electron') {
    return { app: { isPackaged: false } };
  }
  return originalRequire.apply(this, arguments);
};

const epsonSdk = require('./epson-sdk.js');

async function test() {
    console.log("Starting Epson SDK test...");
    
    try {
        console.log("Attempting to list printers...");
        const printers = await epsonSdk.listPrinters();
        console.log("Found printers:", printers);

        // We won't actually connect or print in a generic environment 
        // unless we know for sure there's an Epson printer on a specific port.
        // But we can at least check if initSdk() succeeds internally.
        
        console.log("Test completed (SDK initialization check).");
    } catch (err) {
        console.error("Test failed:", err);
    }
}

test().catch(console.error);
